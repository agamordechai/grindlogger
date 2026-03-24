import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDayColor } from '../../lib/constants';
import type { WorkoutSessionSummary } from '../../types/session';

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  sessions: WorkoutSessionSummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  // Sunday = 0, Saturday = 6
  const startDow = firstDay.getDay();

  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthLast = new Date(year, month - 1, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month - 1 <= 0 ? 12 : month - 1;
    const y = month - 1 <= 0 ? year - 1 : year;
    days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding (fill to complete last row)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month + 1 > 12 ? 1 : month + 1;
      const y = month + 1 > 12 ? year + 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }
  }

  return days;
}

export function CalendarGrid({ year, month, sessions, selectedDate, onSelectDate, onPrev, onNext }: CalendarGridProps) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const today = new Date().toISOString().split('T')[0];

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSessionSummary[]>();
    for (const s of sessions) {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    }
    return map;
  }, [sessions]);

  return (
    <div className="card p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-chalk">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={onNext}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-steel py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-7 gap-1"
        >
          {days.map(({ date, day, isCurrentMonth }) => {
            const daySessions = sessionsByDate.get(date) || [];
            const isSelected = date === selectedDate;
            const isToday = date === today;

            return (
              <button
                key={date}
                onClick={() => onSelectDate(date)}
                className={`
                  relative flex flex-col items-center justify-center py-2 rounded-lg text-sm transition-colors
                  ${!isCurrentMonth ? 'text-steel/30' : isSelected ? 'bg-ember/20 text-ember' : isToday ? 'text-ember font-bold' : 'text-chalk hover:bg-surface-2'}
                `}
              >
                <span className={isToday && !isSelected ? 'underline underline-offset-2' : ''}>
                  {day}
                </span>
                {/* Workout dots */}
                {daySessions.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {daySessions.slice(0, 3).map((s, i) => {
                      const color = getDayColor(s.workout_day);
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${color.accent}`}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
