import { useState, useCallback } from 'react';
import {
  createSession,
  getSession,
  deleteSession,
  getCalendarSessions,
} from '../api/client';
import type {
  WorkoutSession,
  CreateWorkoutSession,
  WorkoutSessionSummary,
} from '../types/session';

export function useWorkoutSessions() {
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCalendarSessions(year, month);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSession = useCallback(async (sessionId: number) => {
    try {
      setLoading(true);
      const data = await getSession(sessionId);
      setSelectedSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleComplete = useCallback(async (data: CreateWorkoutSession) => {
    const result = await createSession(data);
    return result;
  }, []);

  const handleDelete = useCallback(async (sessionId: number) => {
    await deleteSession(sessionId);
    setSelectedSession(null);
  }, []);

  return {
    sessions,
    selectedSession,
    loading,
    error,
    fetchCalendar,
    fetchSession,
    handleComplete,
    handleDelete,
  };
}
