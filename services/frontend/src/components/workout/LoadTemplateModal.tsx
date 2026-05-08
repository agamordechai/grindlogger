import { useState } from 'react';
import { Trash2, Upload, ChevronLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import { getDayColor } from '../../lib/constants';
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
  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const handleLoad = async (template: WorkoutTemplate) => {
    if (await confirm({ title: 'Load routine', message: `Add ${template.exercises.length} exercise${template.exercises.length !== 1 ? 's' : ''} from "${template.name}" to your routine?`, confirmText: 'Load' })) {
      onLoad(template);
      handleClose();
    }
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (await confirm({ title: 'Delete routine', message: `Delete "${template.name}"? This cannot be undone.`, type: 'danger', confirmText: 'Delete' })) {
      onDelete(template.id);
      setSelected(null);
    }
  };

  const groupByDay = (template: WorkoutTemplate) => {
    const map = new Map<string, typeof template.exercises>();
    for (const ex of template.exercises) {
      if (!map.has(ex.workout_day)) map.set(ex.workout_day, []);
      map.get(ex.workout_day)!.push(ex);
    }
    return map;
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={selected ? selected.name : 'Saved Routines'}
      description={selected ? `Saved ${new Date(selected.createdAt).toLocaleDateString()}` : 'Select a routine to preview or load'}
    >
      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-xs text-steel hover:text-chalk mb-4 transition-colors"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {[...groupByDay(selected).entries()].map(([day, exercises]) => {
              const color = getDayColor(day);
              return (
                <div key={day}>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold mb-2 border ${color.bg} ${color.text} ${color.border}`}>
                    {day === 'None' ? 'Daily' : `Day ${day}`}
                  </div>
                  <div className="space-y-1">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/50">
                        <span className="text-sm text-chalk">{ex.name}</span>
                        <span className="text-xs text-steel font-mono">
                          {ex.sets}&times;{ex.reps}
                          {ex.weight != null && ex.weight > 0 && ` · ${formatWeight(ex.weight)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => handleLoad(selected)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-ember/15 text-ember border border-ember/30 hover:bg-ember/25 transition-colors"
            >
              <Upload size={13} />
              Load Routine
            </button>
            <button
              onClick={() => handleDelete(selected)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-steel text-sm">No saved routines yet</p>
          <p className="text-steel/60 text-xs mt-1">Save your current routine to create one</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {templates.map((template) => {
            const days = [...new Set(template.exercises.map((ex) => ex.workout_day))];
            return (
              <button
                key={template.id}
                onClick={() => setSelected(template)}
                className="w-full text-left rounded-xl border border-border bg-surface-2/30 hover:bg-surface-2/60 hover:border-ember/30 transition-all px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-chalk">{template.name}</h4>
                  <span className="text-[11px] text-steel">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-steel mb-2">
                  {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''} · {days.length} day{days.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {days.map((day) => {
                    const color = getDayColor(day);
                    return (
                      <span key={day} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color.bg} ${color.text} ${color.border}`}>
                        {day === 'None' ? 'Daily' : day}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
