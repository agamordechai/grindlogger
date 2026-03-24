import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getExerciseProgressData } from '../../api/client';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import type { ProgressPoint } from '../../types/session';

interface ProgressChartProps {
  exerciseName: string;
  metric: 'weight' | 'volume' | 'one_rep_max';
}

const METRIC_LABELS: Record<string, string> = {
  weight: 'Max Weight',
  volume: 'Volume',
  one_rep_max: '1RM',
};

export function ProgressChart({ exerciseName, metric }: ProgressChartProps) {
  const unit = getWeightUnit();
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getExerciseProgressData(exerciseName, metric);
        if (!cancelled) setData(result.data);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [exerciseName, metric]);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-steel text-xs">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-steel text-xs">No data yet — log workouts to see progress</p>
      </div>
    );
  }

  const chartData = data.map(p => {
    // Backend returns kg — convert to display unit
    const converted = toDisplayWeight(p.value, unit) ?? p.value;
    return {
      date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(converted * 10) / 10,
    };
  });

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1917',
              border: '1px solid rgba(87,83,78,0.4)',
              borderRadius: '12px',
              color: '#FAFAF9',
              fontSize: '12px',
            }}
            formatter={(value) => [
              `${Number(value).toLocaleString()} ${metric === 'volume' ? unit : unit}`,
              METRIC_LABELS[metric],
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#F97316"
            strokeWidth={2}
            dot={{ fill: '#F97316', r: 3 }}
            activeDot={{ r: 5, fill: '#EA580C' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
