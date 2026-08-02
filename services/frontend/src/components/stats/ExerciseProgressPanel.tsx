import { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { getExerciseProgressBatch } from '../../api/client';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import { useExercises } from '../../hooks/useExercises';

interface ExerciseProgressPanelProps {
  metric: 'weight' | 'volume' | 'one_rep_max';
}

const COLORS = [
  '#FF6B1A', '#14C8FF', '#3DE84F', '#FFD400', '#B24BF3',
  '#FF3D8A', '#00E5D0', '#FF3B30', '#7CFF4F', '#5B8CFF',
];

interface DayChartData {
  day: string;
  exerciseNames: string[];
  rows: Record<string, string | number>[];
}

export function ExerciseProgressPanel({ metric }: ExerciseProgressPanelProps) {
  const unit = getWeightUnit();
  const { exercises } = useExercises();
  const [dayCharts, setDayCharts] = useState<DayChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // Group active exercises by workout day
  const exercisesByDay = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const ex of exercises) {
      if (ex.archived) continue;
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(ex.name);
    }
    return grouped;
  }, [exercises]);

  useEffect(() => {
    const days = Object.keys(exercisesByDay);
    if (days.length === 0) {
      setDayCharts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Single batch request for all exercises
    const allNames = days.flatMap(d => exercisesByDay[d]);
    getExerciseProgressBatch(allNames, metric)
      .then(batch => {
        if (cancelled) return;

        // Convert to display units
        const progressMap: Record<string, { date: string; value: number }[]> = {};
        for (const [name, points] of Object.entries(batch.exercises)) {
          progressMap[name] = points.map(pt => ({
            date: pt.date,
            value: Math.round((toDisplayWeight(pt.value, unit) ?? pt.value) * 10) / 10,
          }));
        }

        // Build chart data per day
        const charts: DayChartData[] = [];
        for (const day of days.sort()) {
          const names = exercisesByDay[day];
          const byDate: Record<string, Record<string, number>> = {};

          for (const name of names) {
            const pts = progressMap[name];
            if (!pts) continue;
            for (const pt of pts) {
              if (!byDate[pt.date]) byDate[pt.date] = {};
              byDate[pt.date][name] = pt.value;
            }
          }

          const sorted = Object.keys(byDate).sort();
          if (sorted.length === 0) continue;

          charts.push({
            day,
            exerciseNames: names,
            rows: sorted.map(date => ({
              date: new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              ...byDate[date],
            })),
          });
        }

        setDayCharts(charts);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [exercisesByDay, metric, unit]);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-ember" />
          <h3 className="text-sm font-bold text-chalk">Progress</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-steel text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  if (dayCharts.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-ember" />
          <h3 className="text-sm font-bold text-chalk">Progress</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-steel text-xs">
            {exercises.length === 0
              ? 'Add exercises to track progress'
              : 'No data yet — log workouts to see progress'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayCharts.map(({ day, exerciseNames, rows }) => (
        <div key={day} className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-ember" />
            <h3 className="text-sm font-bold text-chalk">Day {day}</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9C948A', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9C948A', fontSize: 10 }}
                  width={45}
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, opacity: 1 }}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0',
                    color: 'var(--color-chalk)',
                    fontSize: '12px',
                    opacity: 1,
                  }}
                  labelStyle={{ color: 'var(--color-chalk)' }}
                  itemStyle={{ color: 'var(--color-chalk)' }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} ${unit}`,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#9C948A' }}
                />
                {exerciseNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[i % COLORS.length], r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
