/**
 * On-device SQLite schema for GrindLogger.
 *
 * Mirrors the FastAPI/Postgres tables in
 * services/api/src/database/db_models.py 1:1 (column names preserved) so the
 * Phase-3 data import from the EC2 dump maps directly. Booleans are stored as
 * INTEGER 0/1, dates/datetimes as ISO-8601 TEXT.
 *
 * Single-user app: user_id is always LOCAL_USER_ID (1).
 */

export const LOCAL_USER_ID = 1;

export const DB_NAME = 'grindlogger';
export const DB_VERSION = 1;

/**
 * Full schema as one executable script. Idempotent via IF NOT EXISTS so it can
 * run on every launch.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL DEFAULT 'me@grindlogger.local',
  name TEXT NOT NULL DEFAULT 'Me',
  picture_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  cycle_length INTEGER NOT NULL DEFAULT 7,
  google_calendar_id TEXT,
  google_calendar_enabled INTEGER NOT NULL DEFAULT 0,
  ai_base_url TEXT,
  ai_model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL,
  workout_day TEXT NOT NULL DEFAULT 'A',
  notes TEXT,
  user_id INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  superset_group INTEGER,
  per_side INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_exercises_user ON exercises(user_id);
CREATE INDEX IF NOT EXISTS ix_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS ix_exercises_archived ON exercises(archived);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  workout_date TEXT NOT NULL,
  workout_day TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  google_calendar_event_id TEXT
);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_date ON workout_sessions(workout_date);

CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  reps_completed INTEGER NOT NULL DEFAULT 0,
  weight_used REAL,
  one_rep_max REAL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_session_exercises_session ON session_exercises(session_id);

CREATE TABLE IF NOT EXISTS set_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_set_details_ex ON set_details(session_exercise_id);

CREATE TABLE IF NOT EXISTS body_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  measurement_date TEXT NOT NULL,
  weight_kg REAL,
  body_fat_pct REAL,
  chest_cm REAL,
  waist_cm REAL,
  hips_cm REAL,
  bicep_left_cm REAL,
  bicep_right_cm REAL,
  thigh_left_cm REAL,
  thigh_right_cm REAL,
  neck_cm REAL,
  shoulders_cm REAL,
  forearm_cm REAL,
  calf_cm REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_measurements_user ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS ix_measurements_date ON body_measurements(measurement_date);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_conversations_user ON conversations(user_id);
`;
