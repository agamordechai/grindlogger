import { useState, useEffect } from 'react';
import { Check, Minus, Plus, Trophy, Link } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GlowButton } from '../ui/GlowButton';
import { ALL_DAYS } from '../../lib/constants';
import { getWeightUnit, toDisplayWeight, toKg } from '../../hooks/useUnits';
import type { Exercise } from '../../types/exercise';
import type { CreateWorkoutSession, CreateSessionExercise, WorkoutSession } from '../../types/session';

interface ExerciseEntry {
  exercise_name: string;
  sets_completed: number;
  reps_completed: number;
  weight_used: number | null;
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
  /** When set, the sheet opens in edit mode pre-filled with this session's data. */
  editSession?: WorkoutSession | null;
}

export function CompleteWorkoutSheet({ open, onClose, onSubmit, allExercises, defaultDate, editSession }: CompleteWorkoutSheetProps) {
  const unit = getWeightUnit();
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState('');

  // Get available days that have exercises
  const availableDays = [...new Set(allExercises.map(ex => {
    const d = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
    return d;
  }))].sort((a, b) => {
    const order = [...ALL_DAYS, 'None'];
    return order.indexOf(a) - order.indexOf(b);
  });

  // Build entries for a day — all unchecked by default
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
        sets_completed: ex.sets,
        reps_completed: ex.reps,
        weight_used: ex.weight != null ? (toDisplayWeight(ex.weight, unit) ?? 0) : null,
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
        // Edit mode: pre-fill from existing session
        setSelectedDay(editSession.workout_day);
        setDate(editSession.date);
        setNotes(editSession.notes || '');
        setDuration(editSession.duration_minutes || '');
        setEntries(
          editSession.exercises.map((ex, i) => ({
            exercise_name: ex.exercise_name,
            sets_completed: ex.sets_completed,
            reps_completed: ex.reps_completed,
            weight_used: ex.weight_used != null ? (toDisplayWeight(ex.weight_used, unit) ?? 0) : null,
            one_rep_max: ex.one_rep_max != null ? (toDisplayWeight(ex.one_rep_max, unit) ?? 0) : null,
            order: i,
            selected: true,
            superset_group: null,
          }))
        );
      } else {
        // Create mode: blank slate
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

  const updateEntry = (index: number, field: keyof ExerciseEntry, value: number | null) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const selected = entries.filter(e => e.selected);
      const sessionExercises: CreateSessionExercise[] = selected.map((entry, i) => ({
        exercise_name: entry.exercise_name,
        sets_completed: entry.sets_completed,
        reps_completed: entry.reps_completed,
        weight_used: entry.weight_used != null ? toKg(entry.weight_used, unit) : null,
        one_rep_max: entry.one_rep_max != null && entry.one_rep_max > 0
          ? toKg(entry.one_rep_max, unit)
          : null,
        order: i,
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
            // Detect start of a superset group
            const isFirstInSuperset =
              entry.superset_group != null &&
              (i === 0 || entries[i - 1].superset_group !== entry.superset_group);
            // Count exercises in this superset group
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

              {/* Fields — only shown when selected */}
              {entry.selected && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Sets</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateEntry(i, 'sets_completed', Math.max(0, entry.sets_completed - 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={entry.sets_completed}
                          onChange={e => updateEntry(i, 'sets_completed', Number(e.target.value))}
                          className="input font-mono text-center text-sm flex-1 min-w-0 px-1"
                        />
                        <button
                          type="button"
                          onClick={() => updateEntry(i, 'sets_completed', entry.sets_completed + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Reps</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateEntry(i, 'reps_completed', Math.max(0, entry.reps_completed - 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={entry.reps_completed}
                          onChange={e => updateEntry(i, 'reps_completed', Number(e.target.value))}
                          className="input font-mono text-center text-sm flex-1 min-w-0 px-1"
                        />
                        <button
                          type="button"
                          onClick={() => updateEntry(i, 'reps_completed', entry.reps_completed + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-steel mb-1">Weight ({unit})</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={entry.weight_used ?? ''}
                        onChange={e => updateEntry(i, 'weight_used', e.target.value ? Number(e.target.value) : null)}
                        placeholder="BW"
                        className="input font-mono text-center text-sm"
                      />
                    </div>
                  </div>
                  {/* 1RM row */}
                  <div className="flex items-center gap-2">
                    <Trophy size={12} className="text-amber-500 shrink-0" />
                    <label className="text-[11px] text-steel shrink-0">1RM ({unit})</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={entry.one_rep_max ?? ''}
                      onChange={e => updateEntry(i, 'one_rep_max', e.target.value ? Number(e.target.value) : null)}
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
