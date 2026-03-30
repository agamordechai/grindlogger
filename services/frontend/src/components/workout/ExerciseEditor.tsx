import { useState, useMemo } from 'react';
import { Dumbbell } from 'lucide-react';
import type { Exercise, UpdateExerciseRequest } from '../../types/exercise';
import { GlowButton } from '../ui/GlowButton';
import { getWeightUnit, toDisplayWeight, toKg } from '../../hooks/useUnits';
import { searchLibrary, getMuscleGroupColor } from '../../lib/exerciseLibrary';
import type { LibraryExercise } from '../../lib/exerciseLibrary';

interface ExerciseEditorProps {
  exercise: Exercise;
  days: string[];
  onSave: (data: UpdateExerciseRequest) => Promise<void>;
  onCancel: () => void;
}

export function ExerciseEditor({ exercise, days, onSave, onCancel }: ExerciseEditorProps) {
  const unit = getWeightUnit();
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(exercise.sets);
  const [reps, setReps] = useState(exercise.reps);
  const [weight, setWeight] = useState(toDisplayWeight(exercise.weight, unit) ?? 0);
  const [day, setDay] = useState(exercise.workout_day);
  const [notes, setNotes] = useState(exercise.notes || '');
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const librarySuggestions = useMemo(() => searchLibrary(name), [name]);
  const nameChanged = name.trim().toLowerCase() !== exercise.name.toLowerCase();

  const handleSelectLibrary = (ex: LibraryExercise) => {
    setName(ex.name);
    setSets(ex.defaultSets);
    setReps(ex.defaultReps);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        sets,
        reps,
        weight: weight ? toKg(weight, unit) : null,
        workout_day: day,
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-3 space-y-3">
      <div>
        <label className="block text-xs font-medium text-steel mb-1">Name</label>
        <div className="relative">
          <input
            value={name}
            onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            className="input"
          />
          {showSuggestions && nameChanged && librarySuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-surface-1 shadow-lg overflow-y-auto max-h-[min(16rem,40dvh)]">
              {librarySuggestions.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => handleSelectLibrary(ex)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
                >
                  <Dumbbell size={13} className="text-ember shrink-0" />
                  <span className="text-sm text-chalk flex-1 min-w-0 truncate">{ex.name}</span>
                  <span className={`text-[11px] ${getMuscleGroupColor(ex.muscleGroup)} shrink-0`}>
                    {ex.muscleGroup}
                  </span>
                  <span className="text-xs text-steel font-mono shrink-0">
                    {ex.defaultSets}&times;{ex.defaultReps}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-steel mb-1">Sets</label>
          <input type="number" min={1} value={sets} onChange={e => setSets(Number(e.target.value))} className="input font-mono text-center" />
        </div>
        <div>
          <label className="block text-xs font-medium text-steel mb-1">Reps</label>
          <input type="number" min={1} value={reps} onChange={e => setReps(Number(e.target.value))} className="input font-mono text-center" />
        </div>
        <div>
          <label className="block text-xs font-medium text-steel mb-1">Weight ({unit})</label>
          <input type="number" min={0} step={0.5} value={weight} onChange={e => setWeight(Number(e.target.value))} className="input font-mono text-center" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-steel mb-1">Day</label>
        <select value={day} onChange={e => setDay(e.target.value)} className="input">
          {days.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-steel mb-1">Notes</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Cues, reminders..."
          className="input text-sm"
          maxLength={500}
        />
      </div>

      <div className="flex gap-2">
        <GlowButton onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
          {saving ? 'Saving...' : 'Save'}
        </GlowButton>
        <GlowButton variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </GlowButton>
      </div>
    </div>
  );
}
