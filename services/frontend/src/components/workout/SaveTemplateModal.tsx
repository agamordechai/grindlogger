import { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatWeight } from '../../hooks/useUnits';
import { DAY_LABELS } from '../../lib/constants';
import type { Exercise } from '../../types/exercise';
import type { TemplateExercise } from '../../hooks/useTemplates';

interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSave: (name: string, exercises: TemplateExercise[]) => void;
}

export function SaveTemplateModal({ open, onClose, exercises, onSave }: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  // Select all by default when modal opens
  useEffect(() => {
    if (open) {
      setSelected(new Set(exercises.map((ex) => ex.id)));
      setName('');
      setSaved(false);
    }
  }, [open, exercises]);

  const grouped = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      if (!groups[day]) groups[day] = [];
      groups[day].push(ex);
    }
    return Object.entries(groups);
  }, [exercises]);

  const toggleExercise = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDay = (dayExercises: Exercise[]) => {
    const ids = dayExercises.map((ex) => ex.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === exercises.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(exercises.map((ex) => ex.id)));
    }
  };

  const canSave = name.trim().length > 0 && selected.size > 0;

  const handleSave = () => {
    if (!canSave) return;

    const templateExercises: TemplateExercise[] = exercises
      .filter((ex) => selected.has(ex.id))
      .map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        workout_day: ex.workout_day,
      }));

    onSave(name.trim(), templateExercises);
    setSaved(true);
    setTimeout(() => {
      setName('');
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Save as Template" description="Select exercises to include in the template">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">
            Template Name <span className="text-ember">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PPL Week 1, Hypertrophy Block"
            className={`input ${!name.trim() ? 'border-2 border-ember/40' : ''}`}
            autoFocus
          />
          {!name.trim() && (
            <p className="text-[11px] text-ember/70 mt-1">Enter a name to save</p>
          )}
        </div>

        {/* Select all toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-steel">
            {selected.size} of {exercises.length} selected
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-ember hover:text-ember-dark transition-colors font-medium"
          >
            {selected.size === exercises.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* Exercise list grouped by day */}
        <div className="max-h-[45vh] overflow-y-auto space-y-2 -mx-1 px-1">
          {grouped.map(([day, dayExercises]) => {
            const dayIds = dayExercises.map((ex) => ex.id);
            const allDaySelected = dayIds.every((id) => selected.has(id));
            const someDaySelected = dayIds.some((id) => selected.has(id));

            return (
              <div key={day} className="rounded-lg border border-border bg-surface-2/30 overflow-hidden">
                {/* Day header */}
                <button
                  type="button"
                  onClick={() => toggleDay(dayExercises)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-2/50 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    allDaySelected
                      ? 'bg-ember border-ember'
                      : someDaySelected
                        ? 'border-ember/50 bg-ember/20'
                        : 'border-border'
                  }`}>
                    {allDaySelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-chalk flex-1 text-left">
                    {DAY_LABELS[day] || day}
                  </span>
                  <span className="text-[11px] text-steel">
                    {dayIds.filter((id) => selected.has(id)).length}/{dayExercises.length}
                  </span>
                </button>

                {/* Exercises */}
                {dayExercises.map((ex) => {
                  const isSelected = selected.has(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => toggleExercise(ex.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 hover:bg-surface-2/50 transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-ember border-ember' : 'border-border'
                      }`}>
                        {isSelected && <Check size={9} className="text-white" />}
                      </div>
                      <span className={`text-xs flex-1 text-left truncate ${isSelected ? 'text-chalk' : 'text-steel'}`}>
                        {ex.name}
                      </span>
                      <span className="text-[11px] text-steel font-mono shrink-0">
                        {ex.sets}&times;{ex.reps}
                        {ex.weight != null && ex.weight > 0 && ` ${formatWeight(ex.weight)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saved}
          className={`btn w-full ${saved ? 'btn-secondary text-success border-success/30' : 'btn-ember'}`}
        >
          {saved ? 'Saved!' : `Save ${selected.size} exercise${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </Modal>
  );
}
