import { RotateCcw, Trash2, Archive } from 'lucide-react';
import { useArchivedExercises } from '../hooks/useArchivedExercises';
import { PageShell } from '../components/ui/PageShell';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatWeight } from '../hooks/useUnits';
import { useDialog } from '../components/ui/ConfirmDialog';

export default function ArchivePage() {
  const { exercises, loading, error, handleRestore, handlePermanentDelete } = useArchivedExercises();
  const { confirm } = useDialog();

  if (loading) {
    return (
      <PageShell className="space-y-4">
        <h1 className="text-2xl font-bold text-chalk">Archive</h1>
        <CardSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold text-chalk mb-4">Archive</h1>
        <div className="card text-center py-8">
          <p className="text-danger text-sm">{error}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4">
      <h1 className="text-2xl font-bold text-chalk">Archive</h1>

      {exercises.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Archive size={24} className="text-steel" />
          </div>
          <p className="text-steel text-sm">No archived exercises</p>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-border/50">
          {exercises.map((ex) => (
            <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-chalk truncate">{ex.name}</p>
                <p className="text-xs text-steel font-mono mt-0.5">
                  {ex.sets}&times;{ex.reps}
                  {ex.weight != null && ex.weight > 0 && (
                    <span className="text-ember ml-2">{formatWeight(ex.weight)}</span>
                  )}
                  <span className="text-steel/60 ml-2">Day {ex.workout_day}</span>
                </p>
              </div>
              <button
                onClick={() => handleRestore(ex.id)}
                className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
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
          ))}
        </div>
      )}
    </PageShell>
  );
}
