import { useState } from 'react';
import { GlowButton } from '../ui/GlowButton';
import { getOverloadSuggestions } from '../../api/client';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import type { OverloadSuggestions, ReadinessStatus } from '../../types/aiCoach';

const READINESS_STYLES: Record<ReadinessStatus, { label: string; badge: string; icon: string }> = {
  ready_to_increase: { label: 'Ready to Increase', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '↑' },
  maintaining:       { label: 'Maintaining',       badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: '→' },
  needs_more_data:   { label: 'Needs More Data',   badge: 'bg-steel/15 text-steel border-steel/30',               icon: '?' },
  deload_suggested:  { label: 'Deload Suggested',  badge: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: '↓' },
};

export function OverloadReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useSessionStorage<OverloadSuggestions | null>('coach_overload', null);
  const unit = getWeightUnit();

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await getOverloadSuggestions();
      setData(result);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('API key required. Please set your key in Settings.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to get suggestions');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatWeight = (kg: number | undefined | null) => {
    if (kg == null) return null;
    return `${toDisplayWeight(kg, unit)}${unit}`;
  };

  if (error) {
    return (
      <div className="card">
        <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
        <GlowButton variant="secondary" onClick={() => setError(null)}>Try Again</GlowButton>
      </div>
    );
  }

  if (data) {
    return (
      <div className="card space-y-5">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-chalk mb-1">Summary</h3>
          <p className="text-sm text-steel">{data.summary}</p>
        </div>

        {/* Per-exercise suggestions */}
        {data.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-chalk">Exercise Recommendations</h4>
            {data.suggestions.map((s, idx) => {
              const style = READINESS_STYLES[s.readiness] || READINESS_STYLES.needs_more_data;
              return (
                <div key={idx} className="rounded-xl border border-border bg-surface-2/30 p-3 space-y-2">
                  {/* Exercise name + badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-chalk truncate">{s.exercise_name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                      {style.icon} {style.label}
                    </span>
                  </div>

                  {/* Weight suggestion */}
                  {s.current_weight != null && s.suggested_weight != null && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-steel">Weight:</span>
                      <span className="font-mono text-steel">{formatWeight(s.current_weight)}</span>
                      <span className="text-ember">→</span>
                      <span className="font-mono text-emerald-400 font-semibold">{formatWeight(s.suggested_weight)}</span>
                    </div>
                  )}

                  {/* Volume suggestion */}
                  {s.current_volume && s.suggested_volume && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-steel">Volume:</span>
                      <span className="font-mono text-steel">{s.current_volume}</span>
                      <span className="text-ember">→</span>
                      <span className="font-mono text-emerald-400 font-semibold">{s.suggested_volume}</span>
                    </div>
                  )}

                  {/* Sessions count */}
                  {s.sessions_at_current != null && (
                    <div className="text-[11px] text-steel">
                      {s.sessions_at_current} session{s.sessions_at_current !== 1 ? 's' : ''} at current level
                    </div>
                  )}

                  {/* Reasoning */}
                  <p className="text-xs text-steel/80">{s.reasoning}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* General tips */}
        {data.general_tips.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-chalk mb-1">Tips</h4>
            <ul className="space-y-1">
              {data.general_tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-steel flex gap-2">
                  <span className="text-ember shrink-0">*</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <GlowButton variant="secondary" onClick={() => setData(null)} className="w-full">
          Check Again
        </GlowButton>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <p className="text-sm text-steel">
        Get AI-powered recommendations for when to increase weight or volume on each exercise, based on your logged workout history.
      </p>
      <ul className="space-y-1.5 text-sm text-steel">
        <li className="flex gap-2"><span className="text-emerald-400">↑</span> Ready to increase — specific weight suggestions</li>
        <li className="flex gap-2"><span className="text-amber-400">→</span> Maintaining — keep current programming</li>
        <li className="flex gap-2"><span className="text-steel">?</span> Needs more data — log more sessions</li>
        <li className="flex gap-2"><span className="text-red-400">↓</span> Deload suggested — reduce to recover</li>
      </ul>
      <GlowButton onClick={handleAnalyze} disabled={loading} className="w-full">
        {loading ? 'Analyzing History...' : 'Get Overload Suggestions'}
      </GlowButton>
    </div>
  );
}
