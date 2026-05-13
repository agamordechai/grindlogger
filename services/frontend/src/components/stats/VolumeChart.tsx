import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getBodyweightKg } from '../../hooks/useBodyweight';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import type { Exercise } from '../../types/exercise';

const DAY_COLORS_P3BL = ['#38d8ff', '#7eecff', '#1c52d6', '#ff2233', '#f4f6ff', '#1438a8', '#ffd60a'];

interface VolumeChartProps {
  exercises: Exercise[];
}

export function VolumeChart({ exercises }: VolumeChartProps) {
  const unit = getWeightUnit();
  const data = useMemo(() => {
    const bwKg = getBodyweightKg() ?? 0;
    const byDay: Record<string, number> = {};
    for (const ex of exercises) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      const w = ex.weight != null ? ex.weight : bwKg;
      byDay[day] = (byDay[day] || 0) + ex.sets * ex.reps * w * (ex.per_side ? 2 : 1);
    }
    return Object.entries(byDay)
      .map(([day, volume]) => ({ day, volume: Math.round(toDisplayWeight(volume, unit) ?? 0) }))
      .sort((a, b) => b.volume - a.volume);
  }, [exercises, unit]);

  if (data.length === 0) return null;

  return (
    <div
      style={{
        background: '#0d1b58',
        border: '3px solid #1c52d6',
        boxShadow: '6px 6px 0 #1438a8',
        padding: '18px 20px',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: -3, left: -3, width: 48, height: 6, background: '#38d8ff' }} />
      <h3 style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 2px' }}>
        VOLUME <span style={{ color: '#38d8ff' }}>BY DAY</span>
      </h3>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: '#38d8ff', marginBottom: 14, textTransform: 'uppercase' }}>
        {unit.toUpperCase()} // SPLIT TOTAL
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#38d8ff', fontSize: 10, fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#38d8ff', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              width={38}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a1240',
                border: '3px solid #1c52d6',
                boxShadow: '4px 4px 0 #1438a8',
                borderRadius: 0,
                color: '#f4f6ff',
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
              }}
              labelStyle={{ color: '#38d8ff', fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 13 }}
              itemStyle={{ color: '#f4f6ff' }}
              formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`, 'Volume']}
            />
            <Bar dataKey="volume" radius={[0, 0, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={entry.day} fill={DAY_COLORS_P3BL[i % DAY_COLORS_P3BL.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
