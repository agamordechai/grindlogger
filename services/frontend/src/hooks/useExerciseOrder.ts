import { useState, useCallback } from 'react';
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

  const setOrder = useCallback((day: string, exercises: Exercise[]) => {
    setOrderMap(prev => {
      const next = { ...prev, [day]: exercises.map(e => e.id) };
      saveOrder(next);
      return next;
    });
  }, []);

  return { applyOrder, setOrder };
}
