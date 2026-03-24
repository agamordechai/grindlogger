import { useState, useEffect, useCallback } from 'react';
import { getStreak } from '../api/client';
import type { StreakInfo } from '../types/session';
import { useAuth } from '../contexts/AuthContext';

export function useStreak() {
  const { isAuthenticated } = useAuth();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStreak();
      setStreak(data);
    } catch {
      // Silently fail — streak is not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStreak();
  }, [fetchStreak, isAuthenticated]);

  return { streak, loading, refetch: fetchStreak };
}
