import { useState, useCallback } from 'react';
import {
  listMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  getMeasurementProgress,
} from '../api/client';
import type { BodyMeasurement, CreateBodyMeasurement, MeasurementProgress, MeasurementMetric } from '../types/measurement';

export function useBodyMeasurements() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [progress, setProgress] = useState<MeasurementProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listMeasurements();
      setMeasurements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load measurements');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProgress = useCallback(async (metric: MeasurementMetric) => {
    try {
      const data = await getMeasurementProgress(metric);
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    }
  }, []);

  const handleCreate = useCallback(async (data: CreateBodyMeasurement) => {
    const result = await createMeasurement(data);
    setMeasurements(prev => [result, ...prev]);
    return result;
  }, []);

  const handleUpdate = useCallback(async (id: number, data: CreateBodyMeasurement) => {
    const result = await updateMeasurement(id, data);
    setMeasurements(prev => prev.map(m => (m.id === id ? result : m)));
    return result;
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    await deleteMeasurement(id);
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    measurements,
    progress,
    loading,
    error,
    fetchAll,
    fetchProgress,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
