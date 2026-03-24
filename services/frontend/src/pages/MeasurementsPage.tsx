import { useState, useEffect, useCallback } from 'react';
import { Ruler, Plus, Trash2, Pencil, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';
import { GlowButton } from '../components/ui/GlowButton';
import { LogMeasurementSheet, getDisplayFields } from '../components/measurements/LogMeasurementSheet';
import { useBodyMeasurements } from '../hooks/useBodyMeasurements';
import { useAuth } from '../contexts/AuthContext';
import type { BodyMeasurement, CreateBodyMeasurement, MeasurementMetric } from '../types/measurement';
import { MEASUREMENT_METRICS } from '../types/measurement';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MeasurementsPage() {
  const { isAuthenticated } = useAuth();
  const {
    measurements,
    progress,
    loading,
    fetchAll,
    fetchProgress,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useBodyMeasurements();

  const [showForm, setShowForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [chartMetric, setChartMetric] = useState<MeasurementMetric>('weight');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchAll();
  }, [isAuthenticated, fetchAll]);

  useEffect(() => {
    if (isAuthenticated) fetchProgress(chartMetric);
  }, [isAuthenticated, chartMetric, fetchProgress]);

  const refreshAfterMutation = useCallback(async () => {
    await fetchAll();
    await fetchProgress(chartMetric);
  }, [fetchAll, fetchProgress, chartMetric]);

  const handleSubmit = async (data: CreateBodyMeasurement) => {
    if (editingMeasurement) {
      await handleUpdate(editingMeasurement.id, data);
    } else {
      await handleCreate(data);
    }
    await refreshAfterMutation();
  };

  const onDelete = async (id: number) => {
    setDeletingId(id);
    await handleDelete(id);
    setDeletingId(null);
    await refreshAfterMutation();
  };

  // Delta from first entry to latest (overall progress)
  const latest = measurements[0] ?? null;
  const first = measurements.length > 1 ? measurements[measurements.length - 1] : null;

  function getDelta(field: keyof BodyMeasurement): number | null {
    if (!latest || !first) return null;
    const a = latest[field] as number | null;
    const b = first[field] as number | null;
    if (a == null || b == null) return null;
    return Math.round((a - b) * 10) / 10;
  }

  const chartData = progress?.data.map(p => ({
    date: new Date(p.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: p.value,
  })) ?? [];

  const currentMetricLabel = MEASUREMENT_METRICS.find(m => m.value === chartMetric)?.label ?? chartMetric;

  return (
    <PageShell className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center">
              <Ruler size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-chalk">Measurements</h1>
          </div>
          <p className="text-steel text-sm">Track your body measurements over time</p>
        </div>
        <GlowButton onClick={() => { setEditingMeasurement(null); setShowForm(true); }}>
          <Plus size={16} />
          <span className="hidden sm:inline">Log</span>
        </GlowButton>
      </div>

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Weight', field: 'weight_kg' as keyof BodyMeasurement, unit: 'kg' },
            { label: 'Body Fat', field: 'body_fat_pct' as keyof BodyMeasurement, unit: '%' },
            { label: 'Waist', field: 'waist_cm' as keyof BodyMeasurement, unit: 'cm' },
            { label: 'Chest', field: 'chest_cm' as keyof BodyMeasurement, unit: 'cm' },
          ]).map(({ label, field, unit }) => {
            const val = latest[field] as number | null;
            const delta = getDelta(field);
            if (val == null) return null;
            return (
              <div key={field} className="card p-3">
                <p className="text-steel text-xs mb-1">{label}</p>
                <p className="text-chalk text-lg font-bold">
                  {val} <span className="text-sm font-normal text-steel">{unit}</span>
                </p>
                {delta != null && (
                  <p className={`text-xs flex items-center gap-0.5 mt-0.5 ${delta < 0 ? 'text-green-400' : delta > 0 ? 'text-red-400' : 'text-steel'}`}>
                    {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : null}
                    {delta > 0 ? '+' : ''}{delta} {unit}
                  </p>
                )}
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* Progress Chart */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-medium text-chalk">Progress</h2>

        {/* Metric selector */}
        <div className="flex flex-wrap gap-1">
          {MEASUREMENT_METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => setChartMetric(m.value)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                chartMetric === m.value
                  ? 'bg-ember text-white'
                  : 'bg-surface-2 text-steel hover:text-chalk'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#aaa' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={currentMetricLabel}
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f97316' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-steel text-sm">
            {chartData.length === 1
              ? 'Add one more entry to see the trend'
              : `No ${currentMetricLabel.toLowerCase()} data yet`}
          </div>
        )}
      </div>

      {/* History list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-chalk">History</h2>
        {loading && measurements.length === 0 && (
          <div className="card p-6 text-center text-steel text-sm">Loading...</div>
        )}
        {!loading && measurements.length === 0 && (
          <div className="card p-6 text-center text-steel text-sm">
            No measurements yet. Tap "Log" to add your first entry.
          </div>
        )}
        {measurements.map(m => {
          const isExpanded = expandedId === m.id;
          const displayFields = getDisplayFields(m);
          const summaryFields = displayFields.slice(0, 3);
          const hasMore = displayFields.length > 3;

          return (
            <div key={m.id} className="card p-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-chalk text-sm font-medium">{formatDate(m.date)}</p>
                  <p className="text-steel text-xs truncate">
                    {summaryFields.map(f => `${f.label}: ${f.value}${f.unit}`).join(' · ')}
                    {hasMore && ` +${displayFields.length - 3} more`}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingMeasurement(m); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(m.id); }}
                    disabled={deletingId === m.id}
                    className="p-1.5 rounded-lg text-steel hover:text-red-400 hover:bg-surface-2 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-steel" /> : <ChevronDown size={14} className="text-steel" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {displayFields.map(f => (
                    <div key={f.label}>
                      <p className="text-steel text-xs">{f.label}</p>
                      <p className="text-chalk text-sm font-medium">
                        {f.value} <span className="text-steel text-xs">{f.unit}</span>
                      </p>
                    </div>
                  ))}
                  {m.notes && (
                    <div className="col-span-full">
                      <p className="text-steel text-xs">Notes</p>
                      <p className="text-chalk text-sm">{m.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Log/Edit Modal */}
      <LogMeasurementSheet
        open={showForm}
        onClose={() => { setShowForm(false); setEditingMeasurement(null); }}
        onSubmit={handleSubmit}
        editMeasurement={editingMeasurement}
      />
    </PageShell>
  );
}
