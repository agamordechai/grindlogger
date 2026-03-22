import { Trash2, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import type { WorkoutTemplate } from '../../hooks/useTemplates';

interface LoadTemplateModalProps {
  open: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  onLoad: (template: WorkoutTemplate) => void;
  onDelete: (id: string) => void;
}

export function LoadTemplateModal({ open, onClose, templates, onLoad, onDelete }: LoadTemplateModalProps) {
  const { confirm } = useDialog();

  const handleLoad = async (template: WorkoutTemplate) => {
    if (await confirm({ title: 'Load template', message: `Add ${template.exercises.length} exercises from "${template.name}" to your routine?`, confirmText: 'Load' })) {
      onLoad(template);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Load Template" description="Load a saved routine into your tracker">
      {templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-steel text-sm">No saved templates yet</p>
          <p className="text-steel/60 text-xs mt-1">Save your current routine to create one</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {templates.map((template) => {
            const days = [...new Set(template.exercises.map((ex) => ex.workout_day))];
            return (
              <div
                key={template.id}
                className="rounded-xl border border-border bg-surface-2/30 overflow-hidden"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold text-chalk">{template.name}</h4>
                    <span className="text-[11px] text-steel">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-steel mb-2">
                    {template.exercises.length} exercises · {days.length} day{days.length !== 1 ? 's' : ''}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.exercises.slice(0, 6).map((ex, i) => (
                      <span key={i} className="text-[11px] text-chalk/80 bg-surface-3/50 rounded-md px-2 py-0.5">
                        {ex.name}
                        <span className="text-steel ml-1">
                          {ex.sets}&times;{ex.reps}
                          {ex.weight != null && ex.weight > 0 && ` ${formatWeight(ex.weight)}`}
                        </span>
                      </span>
                    ))}
                    {template.exercises.length > 6 && (
                      <span className="text-[11px] text-steel px-1">+{template.exercises.length - 6} more</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoad(template)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-ember/15 text-ember border border-ember/30 hover:bg-ember/25 transition-colors"
                    >
                      <Upload size={13} />
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm({ title: 'Delete template', message: `Delete template "${template.name}"?`, type: 'danger', confirmText: 'Delete' })) {
                          onDelete(template.id);
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
