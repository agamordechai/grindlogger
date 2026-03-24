import { useState, useCallback } from 'react';
import { reorderExercises } from '../api/client';
import type { Exercise } from '../types/exercise';

const STORAGE_KEY = 'exercise-order-v1';

type OrderMap = Record<string, number[]>; // day -> exercise IDs in order

function loadOrder(): OrderMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveOrder(map: OrderMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useExerciseOrder() {
  const [orderMap, setOrderMap] = useState<OrderMap>(() => loadOrder());

  // Apply cached local order on top of backend-fetched exercises.
  // Exercises already come sorted by sort_order from the API, so this
  // only matters during the current session (optimistic updates).
  const applyOrder = useCallback(
    (day: string, exercises: Exercise[]): Exercise[] => {
      const ids = orderMap[day];
      if (!ids || ids.length === 0) return exercises;
      const idSet = new Set(ids);
      const ordered = ids
        .map(id => exercises.find(e => e.id === id))
        .filter((e): e is Exercise => e != null);
      const unordered = exercises.filter(e => !idSet.has(e.id));
      return [...ordered, ...unordered];
    },
    [orderMap],
  );

  const setOrder = useCallback(async (day: string, exercises: Exercise[]) => {
    // Optimistic local update so UI is instant
    setOrderMap(prev => {
      const next = { ...prev, [day]: exercises.map(e => e.id) };
      saveOrder(next);
      return next;
    });

    // Persist to backend (syncs across devices)
    try {
      const items = exercises.map((ex, i) => ({ id: ex.id, sort_order: i }));
      await reorderExercises(items);
    } catch {
      // Silent fail — order is still saved locally for this session
    }
  }, []);

  return { applyOrder, setOrder };
}
