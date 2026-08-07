import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { GlowButton } from '../ui/GlowButton';
import { formatWeight } from '../../hooks/useUnits';
import type { TemplateExercise } from '../../hooks/useTemplates';
import type { Exercise } from '../../types/exercise';

interface DuplicateEntry {
  templateExercise: TemplateExercise;
  existingExercise: Exercise;
}

interface TemplateOverrideModalProps {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateEntry[];
  newExercises: TemplateExercise[];
  onConfirm: (overrideIds: Set<number>) => void;
}

export function TemplateOverrideModal({ open, onClose, duplicates, newExercises, onConfirm }: TemplateOverrideModalProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggleAll = () => {
    if (selected.size === duplicates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(duplicates.map((d) => d.existingExercise.id)));
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(selected);
    setSelected(new Set());
  };

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Template Conflicts" description={`${newExercises.length} new exercise${newExercises.length !== 1 ? 's' : ''} will be added. ${duplicates.length} already exist — select which to override.`}>
      <div className="space-y-4">
        {/* New exercises summary */}
        {newExercises.length > 0 && (
          <div>
            <p className="text-xs font-medium text-steel mb-1.5">Will be added ({newExercises.length})</p>
            <div className="flex flex-wrap gap-1">
              {newExercises.map((ex, i) => (
                <span key={i} className="text-[11px] text-success bg-success/10 border border-success/20 rounded-md px-2 py-0.5">
                  {ex.name} <span className="text-success/60">Day {ex.workout_day}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Duplicates selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-steel">Duplicates — override with template values?</p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] text-ember hover:text-ember/80 transition-colors"
            >
              {selected.size === duplicates.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/30 divide-y divide-border/50 max-h-[40vh] overflow-y-auto">
            {duplicates.map((dup) => {
              const isSelected = selected.has(dup.existingExercise.id);
              return (
                <label
                  key={dup.existingExercise.id}
                  className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-2/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(dup.existingExercise.id)}
                    className="mt-0.5 accent-ember"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-chalk">{dup.existingExercise.name}</p>
                    <p className="text-[11px] text-steel mt-0.5">
                      Day {dup.existingExercise.workout_day}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-steel/70 font-mono">
                        Current: {dup.existingExercise.sets}&times;{dup.existingExercise.reps}
                        {dup.existingExercise.weight != null && dup.existingExercise.weight > 0 && ` ${formatWeight(dup.existingExercise.weight)}`}
                      </span>
                      <span className="text-[11px] text-steel/40">&rarr;</span>
                      <span className={`text-[11px] font-mono ${isSelected ? 'text-ember' : 'text-steel/70'}`}>
                        New: {dup.templateExercise.sets}&times;{dup.templateExercise.reps}
                        {dup.templateExercise.weight != null && dup.templateExercise.weight > 0 && ` ${formatWeight(dup.templateExercise.weight)}`}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <GlowButton
            onClick={handleConfirm}
            className="flex-1"
          >
            {selected.size > 0
              ? `Add ${newExercises.length} + Override ${selected.size}`
              : `Add ${newExercises.length} exercise${newExercises.length !== 1 ? 's' : ''}`}
          </GlowButton>
        </div>
      </div>
    </Modal>
  );
}
