/**
 * In-memory SQLite (sql.js) standing in for src/db/database.ts in tests. Same helper API
 * (all / one / run / tx / ...), the real schema, and a fresh database per `resetDb()`.
 * Tests opt in with:  vi.mock('../db/database', () => import('../test/fakeDb'))
 */

import initSqlJs, { type Database } from 'sql.js';
import { SCHEMA_SQL, LOCAL_USER_ID } from '../db/schema';

let db: Database | null = null;

function conn(): Database {
  if (!db) throw new Error('resetDb() was not called');
  return db;
}

export async function resetDb(): Promise<void> {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.exec(SCHEMA_SQL);
  db.run('INSERT INTO users (id, email, name, role, cycle_length) VALUES (?, ?, ?, ?, ?)', [
    LOCAL_USER_ID,
    'me@grindlogger.local',
    'Me',
    'admin',
    7,
  ]);
}

export async function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const stmt = conn().prepare(sql);
  try {
    stmt.bind(params as never[]);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    return rows;
  } finally {
    stmt.free();
  }
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export interface RunResult {
  changes: number;
  lastId?: number;
}

export async function run(sql: string, params: unknown[] = []): Promise<RunResult> {
  conn().run(sql, params as never[]);
  const changes = conn().getRowsModified();
  const lastId = conn().exec('SELECT last_insert_rowid()')[0].values[0][0] as number;
  return { changes, lastId };
}

export async function tx(fn: (db: unknown) => Promise<void>): Promise<void> {
  await fn({
    run: async (sql: string, params: unknown[] = []) => {
      const r = await run(sql, params);
      return { changes: { changes: r.changes, lastId: r.lastId } };
    },
  });
}

export async function getDb(): Promise<unknown> {
  return conn();
}

export function toBool(v: unknown): boolean {
  return v === 1 || v === '1' || v === true;
}

export async function logDeletionIfSynced(table: string, localId: number): Promise<void> {
  const row = await one<{ remote_id: number | null }>(`SELECT remote_id FROM ${table} WHERE id = ?`, [localId]);
  if (row?.remote_id != null) {
    await run('INSERT INTO sync_deletions (table_name, remote_id) VALUES (?, ?)', [table, row.remote_id]);
  }
}

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
