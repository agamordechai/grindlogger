/**
 * A small in-memory stand-in for the GrindLogger API, installed as global `fetch`.
 * Implements just the endpoints the sync layer uses, with the real server's behaviour that matters
 * (server-assigned ids and updated_at, archived rows hidden unless include_archived, superset id allocation).
 */

import { vi } from 'vitest';

export const BASE = 'https://srv.test/api';

type Json = Record<string, unknown>;

export interface FakeExercise extends Json {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
  notes: string | null;
  per_side: boolean;
  archived: boolean;
  sort_order: number;
  superset_group: number | null;
  updated_at: string;
}

export interface FakeSession extends Json {
  id: number;
  date: string;
  workout_day: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  exercises: Json[];
}

export interface FakeMeasurement extends Json {
  id: number;
  date: string;
  weight_kg: number | null;
  updated_at: string;
}

export class FakeServer {
  exercises = new Map<number, FakeExercise>();
  sessions = new Map<number, FakeSession>();
  measurements = new Map<number, FakeMeasurement>();
  profile: {
    email: string;
    picture_url: string | null;
    name: string;
    cycle_length: number;
    units: string | null;
    profile_updated_at: string | null;
  } = {
    email: 'me@example.com',
    picture_url: null,
    name: 'Server Name',
    cycle_length: 7,
    units: null,
    profile_updated_at: '2026-01-01T00:00:00.000Z',
  };
  /** Every request as "METHOD /path?query" */
  calls: string[] = [];
  /** Make the next request to a path fail with this status (once). */
  failOnce = new Map<string, number>();
  /** The account's AI coach settings (null = none saved). */
  aiProvider: { api_key: string; base_url: string | null; model: string | null } | null = null;
  /** Answer this many requests to a path ("METHOD /path") with 429 before serving them. */
  rateLimited = new Map<string, number>();

  private nextId = 1;
  private clock = 0;

  private stamp(): string {
    this.clock += 1;
    return new Date(Date.UTC(2026, 5, 1, 0, 0, this.clock)).toISOString();
  }

  private id(): number {
    return this.nextId++;
  }

  addExercise(partial: Partial<FakeExercise> & { name: string }): FakeExercise {
    const ex: FakeExercise = {
      id: this.id(),
      sets: 3,
      reps: 10,
      weight: null,
      workout_day: 'A',
      notes: null,
      per_side: false,
      archived: false,
      sort_order: 0,
      superset_group: null,
      updated_at: this.stamp(),
      ...partial,
    };
    this.exercises.set(ex.id, ex);
    return ex;
  }

  addSession(date: string, workoutDay = 'A', exercises: Json[] = []): FakeSession {
    const s: FakeSession = {
      id: this.id(),
      date,
      workout_day: workoutDay,
      notes: null,
      duration_minutes: null,
      created_at: this.stamp(),
      updated_at: this.stamp(),
      exercises,
    };
    this.sessions.set(s.id, s);
    return s;
  }

  addMeasurement(date: string, weightKg: number | null = null): FakeMeasurement {
    // The real API always returns every column (null when unset).
    const m: FakeMeasurement = {
      id: this.id(),
      date,
      weight_kg: weightKg,
      body_fat_pct: null,
      chest_cm: null,
      waist_cm: null,
      hips_cm: null,
      bicep_left_cm: null,
      bicep_right_cm: null,
      thigh_left_cm: null,
      thigh_right_cm: null,
      neck_cm: null,
      shoulders_cm: null,
      forearm_cm: null,
      calf_cm: null,
      notes: null,
      updated_at: this.stamp(),
    };
    this.measurements.set(m.id, m);
    return m;
  }

  /** Bump an exercise as if it had been edited on the website. */
  touchExercise(id: number, changes: Partial<FakeExercise>): void {
    const ex = this.exercises.get(id);
    if (!ex) throw new Error(`no exercise ${id}`);
    Object.assign(ex, changes, { updated_at: this.stamp() });
  }

  install(): void {
    vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => this.handle(input, init));
  }

  private respond(status: number, body?: unknown): Response {
    return new Response(body === undefined || status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handle(url: string, init: RequestInit): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase();
    const full = new URL(url);
    const path = full.pathname.replace(/^\/api/, '');
    this.calls.push(`${method} ${path}${full.search}`);

    const failKey = `${method} ${path}`;
    const forced = this.failOnce.get(failKey);
    if (forced) {
      this.failOnce.delete(failKey);
      return this.respond(forced, { detail: 'forced failure' });
    }
    const limited = this.rateLimited.get(failKey) ?? 0;
    if (limited > 0) {
      this.rateLimited.set(failKey, limited - 1);
      return this.respond(429, { detail: 'Rate limit exceeded. Try again in 60 seconds.', retry_after: 60 });
    }

    const body: Json = init.body ? JSON.parse(init.body as string) : {};
    const q = full.searchParams;
    let m: RegExpMatchArray | null;

    if (method === 'POST' && path === '/auth/refresh') {
      return this.respond(200, { access_token: 'access', token_type: 'bearer', expires_in: 1800, refresh_token: 'refresh2' });
    }
    if (path === '/auth/me') {
      if (method === 'PATCH') {
        this.profile = { ...this.profile, ...body, profile_updated_at: this.stamp() } as typeof this.profile;
      }
      return this.respond(200, this.profile);
    }

    // ---- AI provider (hint format as in services/api/src/api.py)
    if (path === '/auth/ai-provider/credentials' && method === 'GET') {
      if (!this.aiProvider) return this.respond(404, { detail: 'No AI provider configured' });
      return this.respond(200, this.aiProvider);
    }
    if (path === '/auth/ai-provider') {
      if (method === 'PUT') this.aiProvider = body as typeof this.aiProvider;
      if (method === 'DELETE') {
        this.aiProvider = null;
        return this.respond(204);
      }
      const p = this.aiProvider;
      return this.respond(200, {
        has_key: !!p,
        key_hint: p ? (p.api_key.length <= 12 ? '****' : `${p.api_key.slice(0, 7)}...${p.api_key.slice(-4)}`) : null,
        base_url: p?.base_url ?? null,
        model: p?.model ?? null,
      });
    }

    // ---- exercises
    if (method === 'GET' && path === '/exercises') {
      const includeArchived = q.get('include_archived') === 'true';
      const pageSize = Number(q.get('page_size') ?? 20);
      const page = Number(q.get('page') ?? 1);
      const all = [...this.exercises.values()]
        .filter((e) => includeArchived || !e.archived)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      return this.respond(200, {
        page,
        page_size: pageSize,
        total: all.length,
        items: all.slice((page - 1) * pageSize, page * pageSize),
      });
    }
    if (method === 'POST' && path === '/exercises') {
      return this.respond(201, this.addExercise(body as Partial<FakeExercise> & { name: string }));
    }
    if (method === 'POST' && path === '/exercises/superset') {
      const ids = body.exercise_ids as number[];
      const group = Math.max(0, ...[...this.exercises.values()].map((e) => e.superset_group ?? 0)) + 1;
      for (const id of ids) this.touchExercise(id, { superset_group: group });
      return this.respond(200, { superset_group: group });
    }
    if (method === 'DELETE' && path === '/exercises') {
      this.exercises.clear();
      return this.respond(204);
    }
    if ((m = path.match(/^\/exercises\/(\d+)$/))) {
      const id = Number(m[1]);
      const ex = this.exercises.get(id);
      if (!ex) return this.respond(404, { detail: 'Exercise not found' });
      if (method === 'PATCH') {
        this.touchExercise(id, body as Partial<FakeExercise>);
        return this.respond(200, this.exercises.get(id));
      }
      if (method === 'DELETE') {
        this.exercises.delete(id);
        return this.respond(204);
      }
    }

    // ---- sessions
    if (method === 'GET' && path === '/sessions/index') {
      return this.respond(
        200,
        [...this.sessions.values()].map((s) => ({
          id: s.id,
          date: s.date,
          workout_day: s.workout_day,
          updated_at: s.updated_at,
        })),
      );
    }
    if (method === 'POST' && path === '/sessions') {
      const s = this.addSession(body.date as string, body.workout_day as string, (body.exercises as Json[]) ?? []);
      s.notes = (body.notes as string | null) ?? null;
      return this.respond(201, s);
    }
    if ((m = path.match(/^\/sessions\/(\d+)$/))) {
      const id = Number(m[1]);
      const s = this.sessions.get(id);
      if (!s) return this.respond(404, { detail: 'Session not found' });
      if (method === 'GET') return this.respond(200, s);
      if (method === 'PUT') {
        Object.assign(s, body, { updated_at: this.stamp() });
        return this.respond(200, s);
      }
      if (method === 'DELETE') {
        this.sessions.delete(id);
        return this.respond(204);
      }
    }

    // ---- measurements
    if (method === 'GET' && path === '/measurements') return this.respond(200, [...this.measurements.values()]);
    if (method === 'POST' && path === '/measurements') {
      const row = this.addMeasurement(body.date as string, (body.weight_kg as number | null) ?? null);
      Object.assign(row, body);
      return this.respond(201, row);
    }
    if ((m = path.match(/^\/measurements\/(\d+)$/))) {
      const id = Number(m[1]);
      const row = this.measurements.get(id);
      if (!row) return this.respond(404, { detail: 'Measurement not found' });
      if (method === 'PUT') {
        Object.assign(row, body, { updated_at: this.stamp() });
        return this.respond(200, row);
      }
      if (method === 'DELETE') {
        this.measurements.delete(id);
        return this.respond(204);
      }
    }

    return this.respond(404, { detail: `unhandled ${method} ${path}` });
  }
}
