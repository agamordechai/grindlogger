import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Archive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GlowButton } from '../ui/GlowButton';
import { useCycleDays } from '../../hooks/useCycleDays';
import { searchArchivedExercises, permanentDeleteExercise } from '../../api/client';
import { searchLibrary, getMuscleGroupColor } from '../../lib/exerciseLibrary';
import { getWeightUnit, toDisplayWeight, toKg } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import type { LibraryExercise } from '../../lib/exerciseLibrary';
import type { Exercise, CreateExerciseRequest, ArchivedExerciseSuggestion } from '../../types/exercise';

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExerciseRequest) => Promise<void>;
  onRestore?: (id: number) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  exercises?: Exercise[];
  defaultDay?: string;
  getNameStatus?: (name: string) => 'active' | 'archived' | 'new';
}

export function CreateSheet({ open, onClose, onSubmit, onDelete, exercises = [], defaultDay = 'A', getNameStatus }: CreateSheetProps) {
  const { confirm } = useDialog();
  const activeDays = useCycleDays();
  const letterDays = activeDays.filter(d => d !== 'Daily');
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [day, setDay] = useState(defaultDay);
  const [perSide, setPerSide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<ArchivedExerciseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const unit = getWeightUnit();
  const librarySuggestions = useMemo(() => searchLibrary(name), [name]);

  const nameStatus = getNameStatus && name.trim().length >= 2 ? getNameStatus(name.trim()) : null;
  const borderClass = nameStatus === 'new' ? 'border-emerald-500' : nameStatus === 'archived' ? 'border-amber-500' : nameStatus === 'active' ? 'border-red-500' : '';
  const dotClass = nameStatus === 'new' ? 'bg-emerald-500' : nameStatus === 'archived' ? 'bg-amber-500' : nameStatus === 'active' ? 'bg-red-500' : '';
  const statusText = nameStatus === 'new' ? 'New exercise' : nameStatus === 'archived' ? 'Exists in archive' : nameStatus === 'active' ? 'Already in your routine' : '';

  useEffect(() => {
    if (open) setDay(defaultDay);
  }, [open, defaultDay]);

  // Search archived exercises as user types
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchArchivedExercises(trimmed);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  // Clear suggestions when modal closes
  useEffect(() => {
    if (!open) setSuggestions([]);
  }, [open]);

  const reset = () => {
    setName('');
    setSets(3);
    setReps(10);
    setWeight(0);
    setDay(defaultDay);
    setPerSide(false);
    setSuggestions([]);
    setPendingDeleteId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const duplicate = exercises.find(
      (ex) => ex.name.toLowerCase() === trimmedName.toLowerCase() && ex.workout_day === day
    );

    if (duplicate) {
      const confirmed = await confirm({
        title: 'Duplicate exercise',
        message: `"${duplicate.name}" already exists on Day ${day}. Override with new values?`,
        confirmText: 'Override',
      });
      if (!confirmed) return;

      setSaving(true);
      try {
        if (onDelete) await onDelete(duplicate.id);
        await onSubmit({
          name: trimmedName,
          sets,
          reps,
          weight: weight ? toKg(weight, unit) : null,
          workout_day: day,
          per_side: perSide,
        });
        reset();
        onClose();
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        sets,
        reps,
        weight: weight || null,
        workout_day: day,
        per_side: perSide,
      });
      if (pendingDeleteId !== null) {
        await permanentDeleteExercise(pendingDeleteId);
      }
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleFillFromArchive = (s: ArchivedExerciseSuggestion) => {
    setName(s.name);
    setSets(s.sets);
    setReps(s.reps);
    setWeight(s.weight != null ? (toDisplayWeight(s.weight, unit) ?? 0) : 0);
    setPerSide(s.per_side);
    const validDay = (s.workout_day === 'None' || letterDays.includes(s.workout_day))
      ? s.workout_day
      : letterDays[0] ?? 'A';
    setDay(validDay);
    setPendingDeleteId(s.id);
    setShowSuggestions(false);
  };

  const handleSelectLibrary = (ex: LibraryExercise) => {
    setName(ex.name);
    setSets(ex.defaultSets);
    setReps(ex.defaultReps);
    setWeight(0);
    setShowSuggestions(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise" description="Create a new exercise for your routine">
      <form onSubmit={handleSubmit} className="space-y-4">
        {pendingDeleteId !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <Archive size={13} />
            Filling from archived exercise — submitting will remove it from archive
            <button type="button" onClick={() => { setPendingDeleteId(null); reset(); }} className="ml-auto text-steel hover:text-chalk">✕</button>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Exercise Name</label>
          <div className="relative">
            <input
              value={name}
              onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              placeholder="e.g. Bench Press"
              className={`input ${borderClass ? `border-2 ${borderClass}` : ''}`}
              autoFocus
            />
            {showSuggestions && (librarySuggestions.length > 0 || suggestions.length > 0) && nameStatus !== 'active' && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-ember/60 bg-surface-1 shadow-lg overflow-y-auto max-h-[min(16rem,40dvh)]">
                {librarySuggestions.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => handleSelectLibrary(ex)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
                  >
                    <Dumbbell size={14} className="text-ember shrink-0" />
                    <span className="text-sm text-chalk flex-1 min-w-0 truncate">{ex.name}</span>
                    <span className={`text-[11px] ${getMuscleGroupColor(ex.muscleGroup)} shrink-0`}>
                      {ex.muscleGroup}
                    </span>
                    <span className="text-xs text-steel font-mono shrink-0">
                      {ex.defaultSets}&times;{ex.defaultReps}
                    </span>
                  </button>
                ))}
                {suggestions.length > 0 && (
                  <>
                    {librarySuggestions.length > 0 && <div className="border-t border-border/50" />}
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleFillFromArchive(s)}
                        disabled={saving}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
                      >
                        <Archive size={14} className="text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-chalk">{s.name}</span>
                          <span className="text-xs text-steel ml-2 font-mono">
                            {s.sets}&times;{s.reps}
                            {s.weight != null && s.weight > 0 && ` ${toDisplayWeight(s.weight, unit)}${unit}`}
                            {' · '}{s.workout_day === 'None' ? 'Daily' : `Day ${s.workout_day}`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          {nameStatus && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${dotClass}`} />
              <span className="text-[11px] text-steel">{statusText}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-steel mb-1.5">Sets</label>
            <input type="number" min={1} value={sets} onChange={e => setSets(Number(e.target.value))} className="input font-mono text-center" />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel mb-1.5">Reps</label>
            <input type="number" min={1} value={reps} onChange={e => setReps(Number(e.target.value))} className="input font-mono text-center" />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel mb-1.5">Weight ({unit})</label>
            <input type="number" min={0} step={0.5} value={weight} onChange={e => setWeight(Number(e.target.value))} className="input font-mono text-center" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Workout Day</label>
          <select value={day} onChange={e => setDay(e.target.value)} className="input">
            {activeDays.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="None">Unassigned</option>
          </select>
        </div>

        <label className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
          perSide
            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
            : 'bg-surface-2 border-border text-steel hover:border-steel/40'
        }`}>
          <input
            type="checkbox"
            checked={perSide}
            onChange={e => setPerSide(e.target.checked)}
            className="sr-only"
          />
          <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${perSide ? 'bg-violet-500 border-violet-500' : 'border-steel/50'}`}>
            {perSide && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </span>
          Per side <span className="text-steel/50">(unilateral — doubles volume)</span>
        </label>

        <GlowButton type="submit" disabled={saving || !name.trim()} className="w-full">
          {saving ? 'Creating...' : 'Create Exercise'}
        </GlowButton>
      </form>
    </Modal>
  );
}
