import { useState, useEffect, useCallback } from 'react';
import {
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  archiveExercise,
  seedExercises,
  reorderExercises,
  createSuperset,
  removeSuperset,
} from '../api/client';
import type { Exercise, CreateExerciseRequest, UpdateExerciseRequest } from '../types/exercise';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY = 'exercises_cache';

function readCache(): Exercise[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Exercise[];
  } catch {}
  return [];
}

function writeCache(exercises: Exercise[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(exercises));
  } catch {}
}

export function useExercises() {
  const { isAuthenticated } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>(readCache);
  const [loading, setLoading] = useState(() => readCache().length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    try {
      // don't flip loading back on if we already have cached data visible
      setError(null);
      const data = await listExercises({ page_size: 200, sort_by: 'sort_order' });
      // Only update state if data actually changed to avoid unnecessary re-renders
      setExercises(prev => {
        const next = data.items;
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        writeCache(next);
        return next;
      });
    } catch (err) {
      setError(
        `Failed to connect to the API. Is the backend running?\n${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchExercises();
    const interval = setInterval(fetchExercises, 30000);
    return () => clearInterval(interval);
  }, [fetchExercises, isAuthenticated]);

  const handleCreate = async (data: CreateExerciseRequest) => {
    await createExercise(data);
    await fetchExercises();
  };

  const handleUpdate = async (exerciseId: number, data: UpdateExerciseRequest) => {
    await updateExercise(exerciseId, data);
    await fetchExercises();
  };

  const handleDelete = async (exerciseId: number) => {
    try {
      await deleteExercise(exerciseId);
      await fetchExercises();
    } catch (err) {
      setError(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleArchive = async (exerciseId: number) => {
    try {
      await archiveExercise(exerciseId);
      await fetchExercises();
    } catch (err) {
      setError(`Failed to archive: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSeed = async (split: 'ppl' | 'ab' | 'fullbody') => {
    await seedExercises(split);
    await fetchExercises();
  };

  // Optimistically reorder exercises in local state, then persist to backend.
  // Backend is the source of truth — no localStorage involved.
  const handleReorder = useCallback(async (reordered: Exercise[]) => {
    const ids = new Set(reordered.map(e => e.id));
    setExercises(prev => {
      const rest = prev.filter(e => !ids.has(e.id));
      return [...reordered, ...rest];
    });
    try {
      await reorderExercises(reordered.map((ex, i) => ({ id: ex.id, sort_order: i })));
    } catch {
      // Revert to server state on failure
      fetchExercises();
    }
  }, [fetchExercises]);

  const handleCreateSuperset = useCallback(async (exerciseIds: number[]) => {
    await createSuperset(exerciseIds);
    await fetchExercises();
  }, [fetchExercises]);

  const handleRemoveSuperset = useCallback(async (exerciseIds: number[]) => {
    await removeSuperset(exerciseIds);
    await fetchExercises();
  }, [fetchExercises]);

  return {
    exercises,
    loading,
    error,
    fetchExercises,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleArchive,
    handleSeed,
    handleReorder,
    handleCreateSuperset,
    handleRemoveSuperset,
  };
}
