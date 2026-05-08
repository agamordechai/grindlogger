import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveDays } from '../lib/constants';

export function useCycleDays(): string[] {
  const { user } = useAuth();
  return useMemo(() => getActiveDays(user?.cycle_length ?? 7), [user?.cycle_length]);
}
