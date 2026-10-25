/**
 * Local safety snapshots. Before connecting to a server (which can replace matching local rows with the
 * server's version) the workout tables are copied, as JSON, into the `sync_snapshots` table of the same
 * database, so the phone's pre-connect data can always be restored — no file access or share sheet needed.
 * Only the most recent few are kept.
 */

import { all, one, run, tx } from './database';

/** Tables copied into a snapshot, parents before children (restore re-inserts in this order). */
const TABLES = ['exercises', 'workout_sessions', 'session_exercises', 'set_details', 'body_measurements'] as const;
const KEEP_SNAPSHOTS = 3;

type Row = Record<string, unknown>;

interface SnapshotPayload {
  version: 1;
  tables: Record<(typeof TABLES)[number], Row[]>;
}

export interface SnapshotInfo {
  id: number;
  taken_at: string;
  reason: string;
}

export async function takeSnapshot(reason: string): Promise<SnapshotInfo> {
  const tables = {} as SnapshotPayload['tables'];
  for (const table of TABLES) {
    tables[table] = await all<Row>(`SELECT * FROM ${table}`, []);
  }
  const payload: SnapshotPayload = { version: 1, tables };
  const res = await run('INSERT INTO sync_snapshots (reason, data) VALUES (?, ?)', [reason, JSON.stringify(payload)]);
  await run(
    `DELETE FROM sync_snapshots WHERE id NOT IN (SELECT id FROM sync_snapshots ORDER BY id DESC LIMIT ${KEEP_SNAPSHOTS})`,
    [],
  );
  const info = await one<SnapshotInfo>('SELECT id, taken_at, reason FROM sync_snapshots WHERE id = ?', [res.lastId]);
  return info!;
}

export async function latestSnapshot(): Promise<SnapshotInfo | null> {
  return one<SnapshotInfo>('SELECT id, taken_at, reason FROM sync_snapshots ORDER BY id DESC LIMIT 1', []);
}

export async function deleteSnapshots(): Promise<void> {
  await run('DELETE FROM sync_snapshots', []);
}

/** Remove all workout data (no sync tombstones are written). */
export async function wipeWorkoutData(): Promise<void> {
  for (const table of [...TABLES].reverse()) {
    await run(`DELETE FROM ${table}`, []);
  }
}

/** Replace the workout tables with a snapshot's contents. Sync linkage in the snapshot is stale by design. */
export async function restoreSnapshot(id: number): Promise<void> {
  const row = await one<{ data: string }>('SELECT data FROM sync_snapshots WHERE id = ?', [id]);
  if (!row) throw new Error('Snapshot not found');
  const payload = JSON.parse(row.data) as SnapshotPayload;
  if (payload.version !== 1) throw new Error('Unsupported snapshot version');

  await wipeWorkoutData();
  await tx(async (db) => {
    for (const table of TABLES) {
      for (const r of payload.tables[table] ?? []) {
        const cols = Object.keys(r);
        if (cols.length === 0) continue;
        await db.run(
          `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => r[c]) as never[],
        );
      }
    }
  });
}

/** The snapshot as a JSON string, for saving to a file. */
export async function snapshotAsJson(id: number): Promise<string> {
  const row = await one<{ data: string }>('SELECT data FROM sync_snapshots WHERE id = ?', [id]);
  if (!row) throw new Error('Snapshot not found');
  return row.data;
}
