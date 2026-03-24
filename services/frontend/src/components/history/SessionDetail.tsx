import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Clock, FileText, Trophy } from 'lucide-react';
import { getSession } from '../../api/client';
import { getDayColor, DAY_LABELS } from '../../lib/constants';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import { GlowButton } from '../ui/GlowButton';
import type { WorkoutSession, WorkoutSessionSummary } from '../../types/session';

interface SessionDetailProps {
  summaries: WorkoutSessionSummary[];
  onDelete: (sessionId: number) => Promise<void>;
  onEdit?: (session: WorkoutSession) => void;
}

export function SessionDetail({ summaries, onDelete, onEdit }: SessionDetailProps) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const { confirm } = useDialog();
  const unit = getWeightUnit();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results: WorkoutSession[] = [];
      for (const s of summaries) {
        try {
          const full = await getSession(s.id);
          if (!cancelled) results.push(full);
        } catch {
          // skip failed loads
        }
      }
      if (!cancelled) {
        setSessions(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [summaries]);

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <p className="text-steel text-sm">Loading session...</p>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {sessions.map(session => {
        const color = getDayColor(session.workout_day);
        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-0 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`w-1 self-stretch ${color.accent} rounded-l`} />
              <div className={`w-2.5 h-2.5 rounded-full ${color.accent}`} />
              <span className="text-sm font-bold text-chalk flex-1">
                {DAY_LABELS[session.workout_day] || session.workout_day}
              </span>
              {session.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-steel">
                  <Clock size={12} />
                  {session.duration_minutes}m
                </span>
              )}
              {onEdit && (
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(session)}
                >
                  <Pencil size={14} />
                </GlowButton>
              )}
              <GlowButton
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const yes = await confirm({
                    title: 'Delete session',
                    message: 'This will permanently remove this logged workout.',
                    confirmText: 'Delete',
                  });
                  if (yes) await onDelete(session.id);
                }}
              >
                <Trash2 size={14} />
              </GlowButton>
            </div>

            {/* Exercise table */}
            <div className="px-4 py-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-steel uppercase">
                    <th className="text-left py-1 font-medium">Exercise</th>
                    <th className="text-center py-1 font-medium w-16">Sets</th>
                    <th className="text-center py-1 font-medium w-16">Reps</th>
                    <th className="text-right py-1 font-medium w-20">Weight</th>
                    <th className="text-right py-1 font-medium w-20">1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {session.exercises.map(ex => (
                    <tr key={ex.id} className="border-t border-border/30">
                      <td className="py-2 text-chalk">{ex.exercise_name}</td>
                      <td className="py-2 text-center font-mono text-steel">{ex.sets_completed}</td>
                      <td className="py-2 text-center font-mono text-steel">{ex.reps_completed}</td>
                      <td className="py-2 text-right font-mono text-steel">
                        {ex.weight_used != null ? `${toDisplayWeight(ex.weight_used, unit)}${unit}` : 'BW'}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {ex.one_rep_max != null && ex.one_rep_max > 0 ? (
                          <span className="text-amber-400 flex items-center justify-end gap-1">
                            <Trophy size={11} />
                            {toDisplayWeight(ex.one_rep_max, unit)}{unit}
                          </span>
                        ) : (
                          <span className="text-steel/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {session.notes && (
              <div className="px-4 py-2 border-t border-border/30 flex items-start gap-2">
                <FileText size={12} className="text-steel mt-0.5 shrink-0" />
                <p className="text-xs text-steel">{session.notes}</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
