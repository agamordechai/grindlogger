import { motion } from 'framer-motion';
import { getDayColor } from '../../lib/constants';
import { useCycleDays } from '../../hooks/useCycleDays';

interface DayPillsProps {
  selected: string;
  onChange: (day: string) => void;
  dayCounts: Record<string, number>;
}

export function DayPills({ selected, onChange, dayCounts }: DayPillsProps) {
  const activeDays = useCycleDays();
  const tabs = ['All', ...activeDays];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((day) => {
        const isActive = selected === day;
        const color = day === 'All' ? null : getDayColor(day);
        const count = day === 'All'
          ? Object.values(dayCounts).reduce((a, b) => a + b, 0)
          : (dayCounts[day] || 0);

        return (
          <button
            key={day}
            onClick={() => onChange(day)}
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 [clip-path:var(--clip-tag)] text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors shrink-0"
          >
            {isActive && (
              <motion.div
                layoutId="day-pill"
                className={`absolute inset-0 [clip-path:var(--clip-tag)] ${
                  color ? `${color.bg} border ${color.border}` : 'bg-surface-2 border border-border'
                }`}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            )}
            <span className={`relative ${isActive ? (color ? color.text : 'text-chalk') : 'text-steel'}`}>
              {day}
            </span>
            {count > 0 && (
              <span className={`relative text-[10px] font-mono ${isActive ? (color ? color.text : 'text-chalk') : 'text-steel/60'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
