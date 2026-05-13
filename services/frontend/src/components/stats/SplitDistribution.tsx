import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Exercise } from '../../types/exercise';

const DAY_COLORS_P3BL = ['#38d8ff', '#7eecff', '#1c52d6', '#ff2233', '#f4f6ff', '#1438a8', '#ffd60a', '#69d837'];

interface SplitDistributionProps {
  exercises: Exercise[];
}

export function SplitDistribution({ exercises }: SplitDistributionProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of exercises) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      counts[day] = (counts[day] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);
  }, [exercises]);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

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
        SPLIT <span style={{ color: '#38d8ff' }}>DIST.</span>
      </h3>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: '#38d8ff', marginBottom: 8, textTransform: 'uppercase' }}>
        EXERCISES PER DAY
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Donut */}
        <div style={{ width: 130, height: 130, flexShrink: 0, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="day"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.day} fill={DAY_COLORS_P3BL[i % DAY_COLORS_P3BL.length]} />
                ))}
              </Pie>
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
                labelStyle={{ color: '#38d8ff', fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900 }}
                itemStyle={{ color: '#f4f6ff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 28, lineHeight: 0.9, letterSpacing: 1 }}>
              {total}
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, letterSpacing: 2, color: '#38d8ff', marginTop: 3, textTransform: 'uppercase' }}>
              LIFTS
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data.map(({ day, count }, i) => (
            <div key={day} style={{
              display: 'grid',
              gridTemplateColumns: '14px 1fr auto',
              gap: 7,
              alignItems: 'center',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              paddingBottom: 4,
              borderBottom: '1px dashed rgba(56,216,255,.2)',
            }}>
              <span style={{ width: 14, height: 14, background: DAY_COLORS_P3BL[i % DAY_COLORS_P3BL.length], border: '2px solid #f4f6ff', display: 'block', flexShrink: 0 }} />
              <span style={{ color: '#38d8ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {day === 'Daily' ? 'DAILY' : `DAY ${day}`}
              </span>
              <span style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontStyle: 'italic', color: '#f4f6ff', fontSize: 13 }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
