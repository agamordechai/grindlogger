import { TrendingUp } from 'lucide-react';
import type { StreakInfo } from '../../types/session';

interface StreakBadgeProps {
  streak: StreakInfo | null;
  loading?: boolean;
}

function weekLabel(weekStart: string, isThisWeek: boolean): string {
  if (isThisWeek) return 'This wk';
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function StreakBadge({ streak, loading }: StreakBadgeProps) {
  if (loading || !streak) {
    return (
      <div className="card p-4 flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-surface-2" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-20 bg-surface-2 rounded" />
          <div className="h-3 w-32 bg-surface-2 rounded" />
        </div>
      </div>
    );
  }

  const { weekly_trend, this_week, total_workouts } = streak;
  const maxWorkouts = Math.max(...weekly_trend.map(w => w.workouts), 1);

  // Determine trend direction
  const prevWeek = weekly_trend.length >= 2 ? weekly_trend[weekly_trend.length - 2].workouts : 0;
  const trendUp = this_week >= prevWeek;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          this_week > 0 ? 'bg-gradient-to-br from-ember to-ember-dark' : 'bg-surface-2'
        }`}>
          <TrendingUp size={24} className={this_week > 0 ? 'text-white' : 'text-steel'} />
        </div>

        {/* Numbers */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-chalk font-mono">{this_week}</span>
            <span className="text-sm text-steel">this week</span>
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-steel">
            <span>Total: <span className="font-mono text-chalk">{total_workouts}</span> workouts</span>
            {weekly_trend.length >= 2 && (
              <span className={trendUp ? 'text-green-400' : 'text-steel'}>
                {trendUp ? '↑' : '↓'} vs last week
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4-week trend bars */}
      {weekly_trend.length > 0 && (
        <div className="mt-4 flex items-end gap-2">
          {weekly_trend.map((week, i) => {
            const isThisWeek = i === weekly_trend.length - 1;
            const barHeight = week.workouts > 0
              ? Math.max(16, (week.workouts / maxWorkouts) * 48)
              : 4;

            return (
              <div key={week.week_start} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-mono text-chalk">{week.workouts}</span>
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    isThisWeek
                      ? 'bg-gradient-to-t from-ember to-amber-500'
                      : week.workouts > 0
                        ? 'bg-surface-3'
                        : 'bg-surface-2'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
                <span className="text-[10px] text-steel whitespace-nowrap">
                  {weekLabel(week.week_start, isThisWeek)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
