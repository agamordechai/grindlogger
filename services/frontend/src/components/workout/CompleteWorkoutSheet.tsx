import { useState, useEffect } from 'react';
import { Check, Plus, Trophy, Link, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GlowButton } from '../ui/GlowButton';
import { useCycleDays } from '../../hooks/useCycleDays';
import { getWeightUnit, toDisplayWeight, toKg } from '../../hooks/useUnits';
import type { Exercise } from '../../types/exercise';
import type { CreateWorkoutSession, CreateSessionExercise, WorkoutSession, SetType } from '../../types/session';

const SET_TYPE_OPTIONS: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'warm_up', label: 'Warm-up' },
  { value: 'drop_set', label: 'Drop' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'failure', label: 'Failure' },
];

interface SetRow {
  reps: number;
  weight: number | null;
  set_type: SetType;
}

interface ExerciseEntry {
  exercise_name: string;
  sets: SetRow[];
  one_rep_max: number | null;
  order: number;
  selected: boolean;
  superset_group: number | null;
}

interface CompleteWorkoutSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkoutSession) => Promise<void>;
  allExercises: Exercise[];
  defaultDay?: string;
  defaultDate?: string;
  editSession?: WorkoutSession | null;
}

export function CompleteWorkoutSheet({ open, onClose, onSubmit, allExercises, defaultDate, editSession }: CompleteWorkoutSheetProps) {
  const unit = getWeightUnit();
  const activeDays = useCycleDays();
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState('');

  const availableDays = [...new Set(allExercises.map(ex => {
    const d = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
    return d;
  }))].sort((a, b) => {
    const order = [...activeDays, 'None'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const fillEntries = (day: string) => {
    if (!day) {
      setEntries([]);
      return;
    }
    const dayExercises = allExercises.filter(ex => {
      const mapped = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      return mapped === day;
    });
    setEntries(
      dayExercises.map((ex, i) => ({
        exercise_name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: ex.reps,
          weight: ex.weight != null ? (toDisplayWeight(ex.weight, unit) ?? 0) : null,
          set_type: 'normal' as SetType,
        })),
        one_rep_max: null,
        order: i,
        selected: false,
        superset_group: ex.superset_group,
      }))
    );
  };

  useEffect(() => {
    if (open) {
      if (editSession) {
        setSelectedDay(editSession.workout_day);
        setDate(editSession.date);
        setNotes(editSession.notes || '');
        setDuration(editSession.duration_minutes || '');
        setEntries(
          editSession.exercises.map((ex, i) => ({
            exercise_name: ex.exercise_name,
            sets: ex.sets && ex.sets.length > 0
              ? ex.sets.map(s => ({
                  reps: s.reps,
                  weight: s.weight != null ? (toDisplayWeight(s.weight, unit) ?? 0) : null,
                  set_type: s.set_type,
                }))
              : Array.from({ length: ex.sets_completed || 1 }, () => ({
                  reps: ex.sets_completed > 0 ? Math.round(ex.reps_completed / ex.sets_completed) : ex.reps_completed,
                  weight: ex.weight_used != null ? (toDisplayWeight(ex.weight_used, unit) ?? 0) : null,
                  set_type: 'normal' as SetType,
                })),
            one_rep_max: ex.one_rep_max != null ? (toDisplayWeight(ex.one_rep_max, unit) ?? 0) : null,
            order: i,
            selected: true,
            superset_group: null,
          }))
        );
      } else {
        setSelectedDay('');
        setEntries([]);
        setNotes('');
        setDuration('');
        setDate(defaultDate || new Date().toISOString().split('T')[0]);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    fillEntries(day);
  };

  const toggleEntry = (index: number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, selected: !e.selected } : e));
  };

  const toggleAll = () => {
    const allSelected = entries.every(e => e.selected);
    setEntries(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  const addSet = (exIndex: number) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== exIndex) return e;
      const lastSet = e.sets[e.sets.length - 1];
      return {
        ...e,
        sets: [...e.sets, {
          reps: lastSet?.reps ?? 0,
          weight: lastSet?.weight ?? null,
          set_type: 'normal' as SetType,
        }],
      };
    }));
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== exIndex || e.sets.length <= 1) return e;
      return { ...e, sets: e.sets.filter((_, j) => j !== setIndex) };
    }));
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetRow, value: number | string | null) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== exIndex) return e;
      return {
        ...e,
        sets: e.sets.map((s, j) => j === setIndex ? { ...s, [field]: value } : s),
      };
    }));
  };

  const updateOneRepMax = (exIndex: number, value: number | null) => {
    setEntries(prev => prev.map((e, i) => i === exIndex ? { ...e, one_rep_max: value } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selected = entries.filter(e => e.selected);
      const sessionExercises: CreateSessionExercise[] = selected.map((entry, i) => ({
        exercise_name: entry.exercise_name,
        one_rep_max: entry.one_rep_max != null && entry.one_rep_max > 0
          ? toKg(entry.one_rep_max, unit)
          : null,
        order: i,
        sets: entry.sets.map((s, j) => ({
          set_number: j + 1,
          reps: s.reps,
          weight: s.weight != null ? toKg(s.weight, unit) : null,
          set_type: s.set_type,
        })),
      }));

      await onSubmit({
        date,
        workout_day: selectedDay,
        notes: notes.trim() || null,
        duration_minutes: duration || null,
        exercises: sessionExercises,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = entries.filter(e => e.selected).length;
  const allSelected = entries.length > 0 && entries.every(e => e.selected);

  return (
    <Modal open={open} onClose={onClose} title={editSession ? 'Edit Workout' : 'Log Workout'} description={editSession ? 'Update this workout session' : 'Record a completed workout session'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Day selector */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Workout Day</label>
          <select
            value={selectedDay}
            onChange={e => handleDayChange(e.target.value)}
            className="input"
          >
            <option value="">Select a day</option>
            {availableDays.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-steel">Exercises</label>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-ember hover:text-ember-dark transition-colors"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          {entries.map((entry, i) => {
            const isFirstInSuperset =
              entry.superset_group != null &&
              (i === 0 || entries[i - 1].superset_group !== entry.superset_group);
            const supersetCount = isFirstInSuperset
              ? entries.filter(e => e.superset_group === entry.superset_group).length
              : 0;

            return (
            <div key={i}>
              {isFirstInSuperset && supersetCount > 1 && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Link size={10} className="text-violet-400" />
                  <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                    Superset
                  </span>
                </div>
              )}
            <div
              className={`rounded-xl border p-3 space-y-2 transition-colors ${
                entry.selected
                  ? entry.superset_group != null
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-ember/50 bg-surface-2/80'
                  : 'border-border bg-surface-2/30 opacity-60'
              }`}
            >
              {/* Exercise name + checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.selected}
                  onChange={() => toggleEntry(i)}
                  className="w-4 h-4 rounded border-border accent-ember"
                />
                <span className="text-sm font-medium text-chalk truncate">{entry.exercise_name}</span>
              </label>

              {/* Per-set rows — only shown when selected */}
              {entry.selected && (
                <>
                  {/* Set header */}
                  <div className="grid grid-cols-[2rem_1fr_1fr_5rem_1.5rem] gap-1.5 items-center px-0.5">
                    <span className="text-[10px] text-steel text-center">#</span>
                    <span className="text-[10px] text-steel">Reps</span>
                    <span className="text-[10px] text-steel">Weight ({unit})</span>
                    <span className="text-[10px] text-steel">Type</span>
                    <span />
                  </div>

                  {/* Set rows */}
                  {entry.sets.map((set, j) => (
                    <div key={j} className="grid grid-cols-[2rem_1fr_1fr_5rem_1.5rem] gap-1.5 items-center">
                      <span className="text-xs text-steel text-center font-mono">{j + 1}</span>
                      <input
                        type="number"
                        min={0}
                        value={set.reps}
                        onChange={e => updateSet(i, j, 'reps', Number(e.target.value))}
                        className="input font-mono text-center text-sm px-1"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={set.weight ?? ''}
                        onChange={e => updateSet(i, j, 'weight', e.target.value ? Number(e.target.value) : null)}
                        placeholder="BW"
                        className="input font-mono text-center text-sm px-1"
                      />
                      <select
                        value={set.set_type}
                        onChange={e => updateSet(i, j, 'set_type', e.target.value)}
                        className="input text-[11px] px-1 py-1"
                      >
                        {SET_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSet(i, j)}
                        disabled={entry.sets.length <= 1}
                        className="w-5 h-5 flex items-center justify-center text-steel hover:text-red-400 disabled:opacity-20 disabled:hover:text-steel transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {/* Add set button */}
                  <button
                    type="button"
                    onClick={() => addSet(i)}
                    className="flex items-center gap-1 text-xs text-ember hover:text-ember-dark transition-colors mt-1"
                  >
                    <Plus size={12} />
                    Add Set
                  </button>

                  {/* 1RM row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Trophy size={12} className="text-amber-500 shrink-0" />
                    <label className="text-[11px] text-steel shrink-0">1RM ({unit})</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={entry.one_rep_max ?? ''}
                      onChange={e => updateOneRepMax(i, e.target.value ? Number(e.target.value) : null)}
                      placeholder="Optional"
                      className="input font-mono text-center text-sm flex-1"
                    />
                  </div>
                </>
              )}
            </div>
            </div>
            );
          })}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Duration (minutes)</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={e => setDuration(e.target.value ? Number(e.target.value) : '')}
            placeholder="Optional"
            className="input font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it go?"
            rows={2}
            className="input resize-none"
          />
        </div>

        <GlowButton type="submit" disabled={saving || (!selectedDay && !editSession)} className="w-full">
          <Check size={16} />
          {saving
            ? 'Saving...'
            : editSession
              ? 'Save Changes'
              : selectedCount > 0
                ? `Log ${selectedCount} Exercise${selectedCount > 1 ? 's' : ''}`
                : 'Mark Day Complete'}
        </GlowButton>
      </form>
    </Modal>
  );
}
