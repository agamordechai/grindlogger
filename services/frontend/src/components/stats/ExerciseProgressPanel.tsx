import { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { getExerciseProgressData } from '../../api/client';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import { useExercises } from '../../hooks/useExercises';

interface ExerciseProgressPanelProps {
  metric: 'weight' | 'volume' | 'one_rep_max';
}

const COLORS = [
  '#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#84CC16', '#6366F1',
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

    // Fetch progress for all exercises across all days
    const allNames = days.flatMap(d => exercisesByDay[d]);
    Promise.all(
      allNames.map(name => getExerciseProgressData(name, metric).catch(() => null))
    ).then(results => {
      if (cancelled) return;

      // Build a lookup: exercise name -> progress points
      const progressMap: Record<string, { date: string; value: number }[]> = {};
      allNames.forEach((name, i) => {
        const res = results[i];
        if (!res) return;
        progressMap[name] = res.data.map(pt => ({
          date: pt.date,
          value: Math.round((toDisplayWeight(pt.value, unit) ?? pt.value) * 10) / 10,
        }));
      });

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
                  wrapperStyle={{ zIndex: 50, opacity: 1 }}
                  contentStyle={{
                    backgroundColor: '#1C1917',
                    border: '1px solid rgba(87,83,78,0.4)',
                    borderRadius: '12px',
                    color: '#FAFAF9',
                    fontSize: '12px',
                    opacity: 1,
                  }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} ${unit}`,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }}
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
