import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Archive, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CardSkeleton } from '../ui/Skeleton';
import { useArchivedExercises } from '../../hooks/useArchivedExercises';
import { useCycleDays } from '../../hooks/useCycleDays';
import { formatWeight } from '../../hooks/useUnits';
import { getDayColor } from '../../lib/constants';
import { useDialog } from '../ui/ConfirmDialog';

interface ArchiveModalProps {
  open: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

export function ArchiveModal({ open, onClose, onRestored }: ArchiveModalProps) {
  const { exercises, loading, error, fetchArchived, handleRestore, handlePermanentDelete } = useArchivedExercises();
  const { confirm } = useDialog();
  const activeDays = useCycleDays();
  const letterDays = activeDays.filter(d => d !== 'Daily');

  // State for the inline day picker when restoring an out-of-cycle exercise
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [restoringDay, setRestoringDay] = useState<string>('');

  useEffect(() => {
    if (open) fetchArchived();
  }, [open, fetchArchived]);

  const isInCycle = (workout_day: string) =>
    workout_day === 'None' || activeDays.includes(workout_day);

  const handleRestoreClick = (id: number, workout_day: string) => {
    if (isInCycle(workout_day)) {
      handleRestore(id);
      onRestored?.();
    } else {
      setRestoringId(id);
      setRestoringDay(letterDays[0] ?? 'A');
    }
  };

  const confirmRestore = () => {
    if (restoringId === null) return;
    handleRestore(restoringId, restoringDay);
    onRestored?.();
    setRestoringId(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Archive" description="Restore or permanently delete archived exercises">
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-danger text-sm">{error}</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Archive size={24} className="text-steel" />
          </div>
          <p className="text-steel text-sm">No archived exercises</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 divide-y divide-border/50 -mx-1">
          {exercises.map((ex) => (
            <div key={ex.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-chalk truncate">{ex.name}</p>
                  <p className="text-xs text-steel font-mono mt-0.5">
                    {ex.sets}&times;{ex.reps}
                    {ex.weight != null && ex.weight > 0 && (
                      <span className="text-ember ml-2">{formatWeight(ex.weight)}</span>
                    )}
                    <span className="text-steel/60 ml-2">
                      {ex.workout_day === 'None' ? 'Daily' : `Day ${ex.workout_day}`}
                    </span>
                    {!isInCycle(ex.workout_day) && (
                      <span className="ml-2 text-hazard/80">· not in split</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRestoreClick(ex.id, ex.workout_day)}
                  className="p-2 rounded-lg text-success hover:bg-success/10 transition-colors"
                  title="Restore"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Permanent delete', message: `Delete "${ex.name}" forever? This cannot be undone.`, type: 'danger', confirmText: 'Delete forever' })) {
                      handlePermanentDelete(ex.id);
                    }
                  }}
                  className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                  title="Delete permanently"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Inline day picker for out-of-cycle exercises */}
              {restoringId === ex.id && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-hazard mb-2">
                    Day {ex.workout_day} is not in your current split. Pick a day to restore to:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {letterDays.map(d => {
                      const color = getDayColor(d);
                      const active = restoringDay === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setRestoringDay(d)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                            active ? `${color.bg} ${color.text} ${color.border}` : 'bg-surface-2 text-steel border-border hover:text-chalk'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setRestoringDay('None')}
                      className={`px-2.5 h-8 rounded-lg text-xs font-bold transition-all border ${
                        restoringDay === 'None' ? 'bg-steel/15 text-steel border-steel/30' : 'bg-surface-2 text-steel border-border hover:text-chalk'
                      }`}
                    >
                      Daily
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmRestore}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success border border-success/30 text-xs font-semibold hover:bg-success/25 transition-colors"
                    >
                      <Check size={12} />
                      Restore to Day {restoringDay === 'None' ? 'Daily' : restoringDay}
                    </button>
                    <button
                      onClick={() => setRestoringId(null)}
                      className="px-3 py-1.5 rounded-lg bg-surface-2 text-steel border border-border text-xs font-semibold hover:text-chalk transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
