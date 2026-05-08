import { useState, useEffect } from 'react';
import { Dumbbell, CheckCircle, Bookmark, BookmarkCheck } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { Badge } from '../ui/Badge';
import { getWorkoutRecommendation, appendExercisesToRoutine, clearExercises, listExercises } from '../../api/client';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, getDayColor, TRAINING_GOALS, EXPERIENCE_LEVELS } from '../../lib/constants';
import { useCycleDays } from '../../hooks/useCycleDays';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useTemplates } from '../../hooks/useTemplates';
import type { WorkoutRecommendation, MuscleGroup, RecommendationRequest } from '../../types/aiCoach';

type ImportState = { selected: boolean; day: string };

export function WorkoutGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<MuscleGroup | 'other'>('full_body');
  const activeDays = useCycleDays();
  const [customFocus, setCustomFocus] = useState('');
  const [duration, setDuration] = useState(45);
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells', 'cables', 'bodyweight']);
  const [goal, setGoal] = useState('hypertrophy');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [experience, setExperience] = useState('intermediate');
  const [exercisesPerSession, setExercisesPerSession] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useSessionStorage<WorkoutRecommendation | null>('coach_workout_recommendation', null);
  const [importStates, setImportStates] = useState<ImportState[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [savedTemplate, setSavedTemplate] = useState(false);
  const { addTemplate } = useTemplates();

  // Re-initialize importStates when recommendation is restored from sessionStorage
  useEffect(() => {
    if (recommendation && importStates.length === 0) {
      setImportStates(recommendation.exercises.map(ex => ({ selected: true, day: ex.workout_day || 'A' })));
    }
  }, [recommendation]);

  const handleEquipmentToggle = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRecommendation(null);
    setImportedCount(null);
    try {
      const request: RecommendationRequest = {
        session_duration_minutes: duration,
        equipment_available: equipment,
        training_goal: goal,
        training_days_per_week: daysPerWeek,
        experience_level: experience,
        ...(exercisesPerSession !== null && { exercises_per_session: exercisesPerSession }),
      };
      if (focusArea === 'other') {
        if (customFocus.trim()) request.custom_focus_area = customFocus.trim();
      } else {
        request.focus_area = focusArea;
      }
      const result = await getWorkoutRecommendation(request);
      setRecommendation(result);
      setImportStates(result.exercises.map(ex => ({ selected: true, day: ex.workout_day || 'A' })));
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Anthropic API key required. Please set your key in Settings.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to get recommendation');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (idx: number) => {
    setImportStates(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const setDay = (idx: number, day: string) => {
    setImportStates(prev => prev.map((s, i) => i === idx ? { ...s, day } : s));
  };

  const selectAll = () => setImportStates(prev => prev.map(s => ({ ...s, selected: true })));
  const deselectAll = () => setImportStates(prev => prev.map(s => ({ ...s, selected: false })));

  const selectedCount = importStates.filter(s => s.selected).length;

  const getSelectedExercises = () => {
    if (!recommendation) return [];
    return recommendation.exercises
      .map((ex, i) => ({ ...ex, workout_day: importStates[i].day, _selected: importStates[i].selected }))
      .filter(ex => ex._selected)
      .map(({ _selected, ...ex }) => ex);
  };

  const handleImport = async (replace: boolean) => {
    if (!recommendation) return;
    setImporting(true);
    try {
      const toImport = getSelectedExercises();
      if (replace) {
        // Save current routine as a template before replacing
        const current = await listExercises({ page_size: 200 });
        if (current.items.length > 0) {
          const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          addTemplate(
            `Backup — ${timestamp}`,
            current.items.map(ex => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              workout_day: ex.workout_day,
            }))
          );
        }
        await clearExercises();
      }
      await appendExercisesToRoutine(toImport);
      setImportedCount(toImport.length);
      window.dispatchEvent(new CustomEvent('coach-action'));
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to import exercises');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!recommendation) return;
    const parseReps = (reps: string) => parseInt(reps.split('-')[0]) || 10;
    const parseWeight = (ws: string | null | undefined): number | null => {
      if (!ws) return null;
      const n = parseFloat(ws.replace(/[^\d.]/g, ''));
      return isNaN(n) ? null : n;
    };
    const exercises = getSelectedExercises().map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: parseReps(ex.reps),
      weight: parseWeight(ex.weight_suggestion),
      workout_day: ex.workout_day,
    }));
    addTemplate(recommendation.title, exercises);
    setSavedTemplate(true);
  };

  if (error) {
    return (
      <div className="card">
        <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
        <GlowButton variant="secondary" onClick={() => setError(null)}>Try Again</GlowButton>
      </div>
    );
  }

  if (recommendation) {
    // Group exercises by day for display
    const days = [...new Set(recommendation.exercises.map(ex => ex.workout_day))].sort();

    return (
      <div className="card space-y-5">
        <div>
          <h3 className="text-lg font-bold text-chalk">{recommendation.title}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge day={recommendation.difficulty} size="md" />
            <span className="text-xs text-steel font-mono">
              {recommendation.estimated_duration_minutes} min/session
            </span>
            {recommendation.split_type && (
              <span className="text-xs text-ember font-mono bg-ember/10 px-2 py-0.5 rounded-lg">
                {recommendation.split_type}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-steel">{recommendation.description}</p>

        {/* Exercise selection grouped by day */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-chalk">Exercises</h4>
            <div className="flex gap-3 text-xs">
              <button onClick={selectAll} className="text-ember hover:underline">All</button>
              <button onClick={deselectAll} className="text-steel hover:text-chalk hover:underline">None</button>
            </div>
          </div>

          <div className="space-y-4">
            {days.map(dayLabel => {
              const dayExercises = recommendation.exercises
                .map((ex, idx) => ({ ex, idx }))
                .filter(({ ex }) => ex.workout_day === dayLabel);
              const dc = getDayColor(dayLabel);

              return (
                <div key={dayLabel}>
                  <div className={`text-xs font-semibold mb-1.5 px-1 ${dc.text}`}>
                    Day {dayLabel}
                  </div>
                  <div className="space-y-2">
                    {dayExercises.map(({ ex, idx }) => {
                      const state = importStates[idx];
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border transition-all ${state?.selected
                            ? 'bg-surface-2 border-border'
                            : 'bg-surface-2/40 border-border/40 opacity-50'
                            }`}
                        >
                          <div className="flex items-start gap-3 p-3 pb-2">
                            <button
                              type="button"
                              onClick={() => toggleSelected(idx)}
                              className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${state?.selected
                                ? 'bg-ember border-ember'
                                : 'border-steel/40 bg-transparent'
                                }`}
                            >
                              {state?.selected && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-chalk flex items-center gap-1.5">
                                <Dumbbell size={13} className="text-ember shrink-0" />
                                {ex.name}
                              </span>
                              <p className="text-xs text-steel font-mono mt-0.5">
                                {ex.sets} sets x {ex.reps}
                                {ex.weight_suggestion && (
                                  <span className="text-ember ml-1">@ {ex.weight_suggestion}</span>
                                )}
                              </p>
                              {ex.notes && <p className="text-xs text-steel/50 mt-0.5">{ex.notes}</p>}
                            </div>
                          </div>

                          {/* Day selector */}
                          <div className="px-3 pb-2.5 flex items-center gap-2">
                            <span className="text-[11px] text-steel/60 shrink-0">Import to:</span>
                            <div className="flex flex-wrap gap-1">
                              {activeDays.filter(d => d !== 'Daily').map(d => {
                                const dayColor = getDayColor(d);
                                const active = state?.day === d;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDay(idx, d)}
                                    disabled={!state?.selected}
                                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border transition-all ${active
                                      ? `${dayColor.bg} ${dayColor.text} ${dayColor.border}`
                                      : 'bg-transparent border-border/40 text-steel/40 hover:border-steel/30 hover:text-steel/70'
                                      }`}
                                  >
                                    {d}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {recommendation.tips.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-chalk mb-2">Tips</h4>
            <ul className="space-y-1">
              {recommendation.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-steel flex gap-2">
                  <span className="text-ember shrink-0">-</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {importedCount !== null ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="shrink-0" />
            <span>
              {importedCount} exercise{importedCount !== 1 ? 's' : ''} added to your routine.
              {importedCount > 0 && <span className="text-emerald-400/60"> Previous routine saved as template.</span>}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleImport(true)}
              disabled={importing || selectedCount === 0 || importedCount !== null}
              className="flex-1 bg-ember/90 hover:bg-ember text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-40"
            >
              {importing ? 'Replacing...' : `Replace Routine (${selectedCount})`}
            </button>
            <button
              onClick={() => handleImport(false)}
              disabled={importing || selectedCount === 0 || importedCount !== null}
              className="flex-1 bg-surface-2 hover:bg-surface-2/80 text-chalk text-sm font-semibold rounded-xl px-4 py-2 transition-colors border border-border disabled:opacity-40"
            >
              {importing ? 'Adding...' : `Add to Existing (${selectedCount})`}
            </button>
          </div>
          <button
            onClick={handleSaveTemplate}
            disabled={selectedCount === 0 || savedTemplate}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 transition-all border disabled:opacity-40 ${
              savedTemplate
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-surface-2 border-border text-steel hover:text-chalk hover:border-steel/40'
            }`}
          >
            {savedTemplate ? (
              <><BookmarkCheck size={15} /> Saved as Template</>
            ) : (
              <><Bookmark size={15} /> Save as Template</>
            )}
          </button>
          <GlowButton variant="secondary" onClick={() => { setRecommendation(null); setSavedTemplate(false); }} className="w-full">
            Generate Another
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      {/* Training Goal */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">Training Goal</label>
        <div className="flex flex-wrap gap-1.5">
          {TRAINING_GOALS.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                goal === g.value
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-surface-2 border-border text-steel hover:border-steel/40'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Days Per Week */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">
          Days Per Week: <span className="text-ember font-semibold font-mono">{daysPerWeek}</span>
        </label>
        <div className="flex gap-1.5">
          {[2, 3, 4, 5, 6].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysPerWeek(d)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border ${
                daysPerWeek === d
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-surface-2 border-border text-steel hover:border-steel/40'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">Experience Level</label>
        <div className="flex gap-1.5">
          {EXPERIENCE_LEVELS.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setExperience(l.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border flex-1 ${
                experience === l.value
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-surface-2 border-border text-steel hover:border-steel/40'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Area */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">Focus Area</label>
        <select
          value={focusArea}
          onChange={e => setFocusArea(e.target.value as MuscleGroup | 'other')}
          className="input"
        >
          {MUSCLE_GROUPS.map(mg => (
            <option key={mg.value} value={mg.value}>{mg.label}</option>
          ))}
        </select>
        {focusArea === 'other' && (
          <input
            type="text"
            value={customFocus}
            onChange={e => setCustomFocus(e.target.value)}
            placeholder="e.g. Athlete conditioning, Mobility, Grip strength..."
            className="input mt-2"
            maxLength={200}
            autoFocus
          />
        )}
      </div>

      {/* Session Duration */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">
          Session Duration: <span className="text-ember font-semibold font-mono">{duration} min</span>
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {[30, 45, 60, 75, 90, 120].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border flex-1 ${
                duration === d
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-surface-2 border-border text-steel hover:border-steel/40'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Exercises per session */}
      <div>
        <label className="block text-xs font-medium text-steel mb-1.5">
          Exercises per Session:{' '}
          <span className="text-ember font-semibold font-mono">
            {exercisesPerSession ?? 'auto'}
          </span>
        </label>
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setExercisesPerSession(null)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border flex-1 ${
              exercisesPerSession === null
                ? 'bg-ember/10 border-ember/30 text-ember'
                : 'bg-surface-2 border-border text-steel hover:border-steel/40'
            }`}
          >
            Auto
          </button>
          {[3, 4, 5, 6, 7, 8].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setExercisesPerSession(n)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border flex-1 ${
                exercisesPerSession === n
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-surface-2 border-border text-steel hover:border-steel/40'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-xs font-medium text-steel mb-2">Available Equipment</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EQUIPMENT_OPTIONS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => handleEquipmentToggle(item)}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-all border ${equipment.includes(item)
                ? 'bg-ember/10 border-ember/30 text-ember'
                : 'bg-surface-2 border-border text-steel hover:border-steel/40'
                }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <GlowButton
        onClick={handleGenerate}
        disabled={loading || equipment.length === 0 || (focusArea === 'other' && !customFocus.trim())}
        className="w-full"
      >
        {loading ? 'Generating...' : 'Generate Routine'}
      </GlowButton>
    </div>
  );
}
