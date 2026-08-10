/**
 * On-device SQLite access layer.
 *
 * Wraps @capacitor-community/sqlite so the same code runs:
 *  - in the browser during development (jeep-sqlite web store, persisted to
 *    IndexedDB via saveToStore), and
 *  - natively on iOS (durable SQLite in the app container).
 *
 * All repositories go through the `all` / `one` / `run` helpers below.
 */

import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { DB_NAME, DB_VERSION, SCHEMA_SQL, LOCAL_USER_ID } from './schema';

const isWeb = Capacitor.getPlatform() === 'web';

let sqlite: SQLiteConnection | null = null;
let dbConn: SQLiteDBConnection | null = null;
let initPromise: Promise<SQLiteDBConnection> | null = null;

/** Ensure the web store (jeep-sqlite) is ready before any connection use. */
async function ensureWebStore(conn: SQLiteConnection): Promise<void> {
  if (!isWeb) return;
  // main.tsx registers the jeep-sqlite custom element and appends it.
  await customElements.whenDefined('jeep-sqlite');
  await conn.initWebStore();
}

async function doInit(): Promise<SQLiteDBConnection> {
  sqlite = new SQLiteConnection(CapacitorSQLite);
  await ensureWebStore(sqlite);

  // Reuse an existing connection if one is already open (hot reload safety).
  const retCC = (await sqlite.checkConnectionsConsistency()).result ?? false;
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result ?? false;

  const conn =
    retCC && isConn
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);

  await conn.open();
  await conn.execute(SCHEMA_SQL);
  await runMigrations(conn);
  await ensureDefaultUser(conn);

  if (isWeb) await sqlite.saveToStore(DB_NAME);

  dbConn = conn;
  return conn;
}

/** Lazily initialise (once) and return the open DB connection. */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbConn) return dbConn;
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

/** Persist the in-memory web DB to IndexedDB. No-op on native. */
async function persist(): Promise<void> {
  if (isWeb && sqlite) await sqlite.saveToStore(DB_NAME);
}

/** Add a column to a table if it isn't already present (idempotent). */
async function ensureColumn(
  conn: SQLiteDBConnection,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const res = await conn.query(`PRAGMA table_info(${table})`);
  const cols = (res.values ?? []).map((r: Record<string, unknown>) => r.name as string);
  if (!cols.includes(column)) {
    await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/** Lightweight, idempotent schema migrations for pre-existing databases. */
async function runMigrations(conn: SQLiteDBConnection): Promise<void> {
  // ai_api_key added after initial release — the API key now lives in the DB
  // rather than the Preferences plugin (more reliable in the iOS WebView).
  await ensureColumn(conn, 'users', 'ai_api_key', 'TEXT');

  // Sync layer bookkeeping — added after initial release. New columns only;
  // the sync_deletions table is created directly by SCHEMA_SQL since it's a
  // brand-new table (CREATE TABLE IF NOT EXISTS works retroactively for that).
  await ensureColumn(conn, 'users', 'sync_server_url', 'TEXT');
  await ensureColumn(conn, 'users', 'sync_last_synced_at', 'TEXT');
  for (const table of ['exercises', 'workout_sessions', 'body_measurements']) {
    await ensureColumn(conn, table, 'remote_id', 'INTEGER');
    await ensureColumn(conn, table, 'remote_updated_at', 'TEXT');
    await ensureColumn(conn, table, 'dirty', 'INTEGER NOT NULL DEFAULT 1');
  }
}

/** Guarantee the single local user row exists. */
async function ensureDefaultUser(conn: SQLiteDBConnection): Promise<void> {
  const res = await conn.query('SELECT id FROM users WHERE id = ?', [LOCAL_USER_ID]);
  if (!res.values || res.values.length === 0) {
    await conn.run(
      'INSERT INTO users (id, email, name, role, cycle_length) VALUES (?, ?, ?, ?, ?)',
      [LOCAL_USER_ID, 'me@grindlogger.local', 'Me', 'admin', 7],
    );
  }
}

/** Run a SELECT and return all rows typed as T. */
export async function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.query(sql, params as never[]);
  return (res.values ?? []) as T[];
}

/** Run a SELECT and return the first row (or null). */
export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export interface RunResult {
  changes: number;
  lastId?: number;
}

/** Execute an INSERT/UPDATE/DELETE, persisting on web. Returns changes + lastId. */
export async function run(sql: string, params: unknown[] = []): Promise<RunResult> {
  const db = await getDb();
  const res = await db.run(sql, params as never[]);
  await persist();
  return {
    changes: res.changes?.changes ?? 0,
    lastId: res.changes?.lastId,
  };
}

/**
 * Run several statements as a batch, then persist once. Each inner `db.run`
 * auto-commits (the plugin wraps statements in their own transaction on both
 * web and native), so we deliberately avoid an explicit begin/commit here —
 * the web implementation does not support a manual outer transaction. Persisting
 * a single time at the end avoids a save-per-row on web.
 */
export async function tx(fn: (db: SQLiteDBConnection) => Promise<void>): Promise<void> {
  const db = await getDb();
  await fn(db);
  await persist();
}

/** Convert a SQLite 0/1 integer column to a boolean. */
export function toBool(v: unknown): boolean {
  return v === 1 || v === '1' || v === true;
}

/**
 * Record a sync tombstone for a single row about to be hard-deleted, but only
 * if the server already knows about it (remote_id set). Call this BEFORE the
 * DELETE. Rows that were never synced need no bookkeeping — there's nothing
 * for the server to delete.
 */
export async function logDeletionIfSynced(table: string, localId: number): Promise<void> {
  const row = await one<{ remote_id: number | null }>(`SELECT remote_id FROM ${table} WHERE id = ?`, [localId]);
  if (row?.remote_id != null) {
    await run('INSERT INTO sync_deletions (table_name, remote_id) VALUES (?, ?)', [table, row.remote_id]);
  }
}

/**
 * Bulk variant of logDeletionIfSynced for "delete many at once" operations
 * (clear all exercises, wipe account). Call this BEFORE the bulk DELETE.
 */
export async function logDeletionsForUserRows(table: string, userId: number, extraWhere = ''): Promise<void> {
  const rows = await all<{ remote_id: number | null }>(
    `SELECT remote_id FROM ${table} WHERE user_id = ? ${extraWhere}`,
    [userId],
  );
  for (const r of rows) {
    if (r.remote_id != null) {
      await run('INSERT INTO sync_deletions (table_name, remote_id) VALUES (?, ?)', [table, r.remote_id]);
    }
  }
}
