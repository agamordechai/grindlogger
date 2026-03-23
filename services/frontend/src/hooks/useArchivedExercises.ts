import { useState, useEffect, useCallback } from 'react';
import { listArchivedExercises, restoreExercise, permanentDeleteExercise } from '../api/client';
import type { Exercise } from '../types/exercise';
import { useAuth } from '../contexts/AuthContext';

export function useArchivedExercises() {
  const { isAuthenticated } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArchived = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listArchivedExercises();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archived exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchArchived();
  }, [fetchArchived, isAuthenticated]);

  const handleRestore = async (exerciseId: number) => {
    // Optimistically remove from list
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    try {
      await restoreExercise(exerciseId);
    } catch (err) {
      setError(`Failed to restore: ${err instanceof Error ? err.message : 'Unknown error'}`);
      await fetchArchived(); // Revert on failure
    }
  };

  const handlePermanentDelete = async (exerciseId: number) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    try {
      await permanentDeleteExercise(exerciseId);
    } catch (err) {
      setError(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
      await fetchArchived();
    }
  };

  return {
    exercises,
    loading,
    error,
    fetchArchived,
    handleRestore,
    handlePermanentDelete,
  };
}
