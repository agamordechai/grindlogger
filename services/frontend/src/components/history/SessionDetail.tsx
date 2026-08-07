import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Clock, FileText, Trophy, ChevronDown } from 'lucide-react';
import { getSession } from '../../api/client';
import { getDayColor, DAY_LABELS } from '../../lib/constants';
import { getWeightUnit, toDisplayWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import { GlowButton } from '../ui/GlowButton';
import type { WorkoutSession, WorkoutSessionSummary, SetType } from '../../types/session';

const SET_TYPE_STYLES: Record<SetType, { label: string; cls: string }> = {
  normal:   { label: 'Normal',  cls: 'text-steel' },
  warm_up:  { label: 'Warm-up', cls: 'text-arc' },
  drop_set: { label: 'Drop',    cls: 'text-epic' },
  amrap:    { label: 'AMRAP',   cls: 'text-hazard' },
  failure:  { label: 'Failure', cls: 'text-danger' },
};

interface SessionDetailProps {
  summaries: WorkoutSessionSummary[];
  onDelete: (sessionId: number) => Promise<void>;
  onEdit?: (session: WorkoutSession) => void;
}

export function SessionDetail({ summaries, onDelete, onEdit }: SessionDetailProps) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set());
  const { confirm } = useDialog();
  const unit = getWeightUnit();

  const toggleExpand = (exerciseId: number) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

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
            <div className="overflow-x-auto">
              <div className="px-4 py-2 min-w-[380px]">
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
                  {session.exercises.map(ex => {
                    const hasSets = ex.sets && ex.sets.length > 0;
                    const isExpanded = expandedExercises.has(ex.id);
                    return (
                      <tr key={ex.id} className="border-t border-border/30">
                        <td colSpan={5} className="p-0">
                          {/* Main exercise row */}
                          <div
                            className={`grid grid-cols-[1fr_4rem_4rem_5rem_5rem] items-center py-2 ${hasSets ? 'cursor-pointer hover:bg-surface-2/30 transition-colors' : ''}`}
                            onClick={() => hasSets && toggleExpand(ex.id)}
                          >
                            <span className="text-chalk flex items-center gap-1.5">
                              {hasSets && (
                                <ChevronDown
                                  size={13}
                                  className={`text-steel transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                              )}
                              {ex.exercise_name}
                            </span>
                            <span className="text-center font-mono text-steel">{ex.sets_completed}</span>
                            <span className="text-center font-mono text-steel">{ex.reps_completed}</span>
                            <span className="text-right font-mono text-steel">
                              {ex.weight_used != null ? `${toDisplayWeight(ex.weight_used, unit)}${unit}` : 'BW'}
                            </span>
                            <span className="text-right font-mono">
                              {ex.one_rep_max != null && ex.one_rep_max > 0 ? (
                                <span className="text-hazard flex items-center justify-end gap-1">
                                  <Trophy size={11} />
                                  {toDisplayWeight(ex.one_rep_max, unit)}{unit}
                                </span>
                              ) : (
                                <span className="text-steel/30">—</span>
                              )}
                            </span>
                          </div>

                          {/* Expanded per-set breakdown */}
                          <AnimatePresence>
                            {hasSets && isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-6 pr-2 pb-2">
                                  <div className="rounded-lg bg-surface-1/50 border border-border/20 overflow-hidden">
                                    <div className="grid grid-cols-[2rem_1fr_1fr_1fr] text-[10px] text-steel uppercase px-2 py-1 border-b border-border/20">
                                      <span className="text-center">#</span>
                                      <span>Reps</span>
                                      <span>Weight</span>
                                      <span>Type</span>
                                    </div>
                                    {ex.sets.map(set => {
                                      const style = SET_TYPE_STYLES[set.set_type] || SET_TYPE_STYLES.normal;
                                      return (
                                        <div key={set.id} className="grid grid-cols-[2rem_1fr_1fr_1fr] text-xs px-2 py-1 border-b border-border/10 last:border-0">
                                          <span className="text-center font-mono text-steel">{set.set_number}</span>
                                          <span className="font-mono text-chalk">{set.reps}</span>
                                          <span className="font-mono text-chalk">
                                            {set.weight != null ? `${toDisplayWeight(set.weight, unit)}${unit}` : 'BW'}
                                          </span>
                                          <span className={`text-[11px] font-medium ${style.cls}`}>
                                            {style.label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
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
