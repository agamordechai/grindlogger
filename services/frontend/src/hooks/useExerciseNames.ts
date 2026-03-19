import { useState, useEffect, useCallback } from 'react';
import { getExerciseNames } from '../api/client';
import type { ExerciseNameStatus } from '../types/exercise';
import { useAuth } from '../contexts/AuthContext';

export function useExerciseNames() {
  const { isAuthenticated } = useAuth();
  const [names, setNames] = useState<ExerciseNameStatus[]>([]);

  const fetchNames = useCallback(async () => {
    try {
      const data = await getExerciseNames();
      setNames(data);
    } catch {
      // Silently fail — this is informational only
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNames();
  }, [fetchNames, isAuthenticated]);

  const getNameStatus = useCallback(
    (name: string): 'active' | 'archived' | 'new' => {
      const lower = name.toLowerCase().trim();
      if (!lower) return 'new';
      const match = names.find((n) => n.name === lower);
      if (!match) return 'new';
      return match.status;
    },
    [names],
  );

  return { names, fetchNames, getNameStatus };
}
