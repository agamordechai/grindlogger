import { Flame } from 'lucide-react';
import type { StreakInfo } from '../../types/session';

interface StreakBadgeProps {
  streak: StreakInfo | null;
  loading?: boolean;
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

  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        {/* Flame icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          streak.current_streak > 0 ? 'bg-gradient-to-br from-ember to-ember-dark' : 'bg-surface-2'
        }`}>
          <Flame size={24} className={streak.current_streak > 0 ? 'text-white' : 'text-steel'} />
        </div>

        {/* Numbers */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-chalk font-mono">{streak.current_streak}</span>
            <span className="text-sm text-steel">day streak</span>
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-steel">
            <span>Best: <span className="font-mono text-chalk">{streak.best_streak}</span></span>
            <span>Total: <span className="font-mono text-chalk">{streak.total_workouts}</span> workouts</span>
          </div>
        </div>
      </div>

      {/* Progress bar toward best streak */}
      {streak.best_streak > 0 && streak.current_streak > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-steel mb-1">
            <span>Progress to best</span>
            <span className="font-mono">{Math.min(100, Math.round((streak.current_streak / streak.best_streak) * 100))}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember to-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (streak.current_streak / streak.best_streak) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
