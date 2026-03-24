import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';
import { GlowButton } from '../components/ui/GlowButton';
import { CalendarGrid } from '../components/history/CalendarGrid';
import { SessionDetail } from '../components/history/SessionDetail';
import { StreakBadge } from '../components/history/StreakBadge';
import { ExerciseProgressPanel } from '../components/stats/ExerciseProgressPanel';
import { CompleteWorkoutSheet } from '../components/workout/CompleteWorkoutSheet';
import { useWorkoutSessions } from '../hooks/useWorkoutSessions';
import { useExercises } from '../hooks/useExercises';
import { useStreak } from '../hooks/useStreak';
import { useAuth } from '../contexts/AuthContext';
import { createSession, updateSession } from '../api/client';
import type { WorkoutSession } from '../types/session';

export default function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogWorkout, setShowLogWorkout] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);
  const [metric, setMetric] = useState<'weight' | 'volume' | 'one_rep_max'>('weight');

  const { exercises } = useExercises();
  const { sessions, loading: sessionsLoading, fetchCalendar, handleDelete } = useWorkoutSessions();
  const { streak, loading: streakLoading, refetch: refetchStreak } = useStreak();

  // Fetch calendar data when month changes
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar, isAuthenticated]);

  const handlePrev = useCallback(() => {
    setSelectedDate(null);
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  }, [month]);

  const handleNext = useCallback(() => {
    setSelectedDate(null);
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  }, [month]);

  // Sessions for selected date
  const selectedSessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions.filter(s => s.date === selectedDate);
  }, [sessions, selectedDate]);

  const handleDeleteSession = async (sessionId: number) => {
    await handleDelete(sessionId);
    await fetchCalendar(year, month);
    await refetchStreak();
  };

  const handleRefresh = useCallback(async () => {
    await fetchCalendar(year, month);
    await refetchStreak();
  }, [year, month, fetchCalendar, refetchStreak]);

  const handleLogWorkout = async (data: Parameters<typeof createSession>[0]) => {
    if (editingSession) {
      await updateSession(editingSession.id, data);
    } else {
      await createSession(data);
    }
    await handleRefresh();
  };

  return (
    <PageShell className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center">
              <CalendarDays size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-chalk">History</h1>
          </div>
          <p className="text-steel text-sm">Your workout history and progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={sessionsLoading}
            title="Refresh"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
          >
            <RefreshCw size={16} className={sessionsLoading ? 'animate-spin' : ''} />
          </button>
          <GlowButton onClick={() => setShowLogWorkout(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">Log Workout</span>
          </GlowButton>
        </div>
      </div>

      {/* Streak */}
      <StreakBadge streak={streak} loading={streakLoading} />

      {/* Calendar + Detail */}
      <div className="space-y-4">
        <CalendarGrid
          year={year}
          month={month}
          sessions={sessions}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* Selected date detail */}
        {selectedDate && selectedSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-steel mb-2">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <SessionDetail
              summaries={selectedSessions}
              onDelete={handleDeleteSession}
              onEdit={(session) => {
                setEditingSession(session);
                setShowLogWorkout(true);
              }}
            />
          </div>
        )}

        {selectedDate && selectedSessions.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-steel text-sm">No workouts logged on this day</p>
          </div>
        )}
      </div>

      {/* Progress charts */}
      <div className="space-y-4">
        {/* Metric toggle */}
        <div className="flex rounded-xl bg-surface-2 p-0.5">
          {([
            { value: 'weight' as const, label: 'Weight' },
            { value: 'volume' as const, label: 'Volume' },
            { value: 'one_rep_max' as const, label: '1RM' },
          ]).map(m => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium ${
                metric === m.value
                  ? 'bg-ember text-white'
                  : 'text-steel hover:text-chalk'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ExerciseProgressPanel metric={metric} />
      </div>
      <CompleteWorkoutSheet
        open={showLogWorkout}
        onClose={() => {
          setShowLogWorkout(false);
          setEditingSession(null);
        }}
        onSubmit={handleLogWorkout}
        allExercises={exercises}
        defaultDate={selectedDate || undefined}
        editSession={editingSession}
      />
    </PageShell>
  );
}
