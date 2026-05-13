import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertTriangle, FolderOpen, Archive } from 'lucide-react';
import { useExercises } from '../hooks/useExercises';
import { useExerciseNames } from '../hooks/useExerciseNames';
import { useTemplates } from '../hooks/useTemplates';
import { restoreExercise, createExercise, deleteExercise } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../components/ui/ConfirmDialog';
import { PageShell } from '../components/ui/PageShell';
import { CardSkeleton } from '../components/ui/Skeleton';
import { VolumeChart } from '../components/stats/VolumeChart';
import { SplitDistribution } from '../components/stats/SplitDistribution';
import { CreateSheet } from '../components/workout/CreateSheet';
import { EmptyState } from '../components/workout/EmptyState';
import { SaveTemplateModal } from '../components/workout/SaveTemplateModal';
import { LoadTemplateModal } from '../components/workout/LoadTemplateModal';
import { TemplateOverrideModal } from '../components/workout/TemplateOverrideModal';
import { ArchiveModal } from '../components/workout/ArchiveModal';
import { useCycleDays } from '../hooks/useCycleDays';
import { getBodyweightKg } from '../hooks/useBodyweight';
import { getWeightUnit, toDisplayWeight, formatWeight } from '../hooks/useUnits';
import { useStreak } from '../hooks/useStreak';
import type { WorkoutTemplate, TemplateExercise } from '../hooks/useTemplates';
import type { Exercise } from '../types/exercise';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

const DAY_TAGS: Record<string, string> = {
  A: 'PUSH',
  B: 'PULL',
  C: 'LEGS',
  D: 'UPPER',
  E: 'BACK',
  F: 'ARMS',
  G: 'CARDIO',
  Daily: 'CONDITIONING',
};

/* ─── Stat Tile ─── */
function StatTile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#0d1b58',
        border: '3px solid #38d8ff',
        padding: '14px 16px',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)',
        boxShadow: '4px 4px 0 #1438a8',
        overflow: 'hidden',
      }}
    >
      {/* Red top-left accent bar */}
      <div style={{ position: 'absolute', top: -2, left: -2, width: 38, height: 6, background: '#ff2233' }} />
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#38d8ff', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 38, lineHeight: 0.95, letterSpacing: 1, marginTop: 4, fontStyle: 'italic' }}>
        {value}
      </div>
      {unit && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: '#7eecff', textTransform: 'uppercase', marginTop: 3 }}>
          {unit}
        </div>
      )}
    </div>
  );
}

/* ─── Day Slab (left list) ─── */
function DaySlab({
  day,
  exercises,
  rank,
  roman,
  active,
  onClick,
}: {
  day: string;
  exercises: Exercise[];
  rank: number;
  roman: string;
  active: boolean;
  onClick: () => void;
}) {
  const tag = DAY_TAGS[day] || day.toUpperCase();
  const estTime = Math.round(exercises.length * 3.5 + 8);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '58px 1fr auto',
        alignItems: 'stretch',
        background: active ? '#f4f6ff' : '#1438a8',
        border: `3px solid ${active ? '#f4f6ff' : '#1c52d6'}`,
        color: active ? '#0a1240' : '#f4f6ff',
        cursor: 'pointer',
        boxShadow: active ? '8px 8px 0 #ff2233' : '5px 5px 0 #04081d',
        clipPath: 'polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)',
        minHeight: 58,
        overflow: 'hidden',
        transition: 'transform 0.14s cubic-bezier(.2,.85,.2,1), box-shadow 0.14s',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform = 'translate(-3px, -3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '10px 10px 0 #ff2233'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 #04081d'; } }}
    >
      {/* Roman numeral column */}
      <div style={{
        display: 'grid',
        placeItems: 'center',
        background: '#04081d',
        color: '#38d8ff',
        fontFamily: "'Anton', sans-serif",
        fontStyle: 'italic',
        fontSize: 20,
        letterSpacing: 1,
        borderRight: '3px solid #1c52d6',
      }}>
        {roman}
      </div>

      {/* Day info */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: 20,
          letterSpacing: 1.5,
          lineHeight: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          DAY {day} · {tag}
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          letterSpacing: 2,
          marginTop: 3,
          color: active ? '#1438a8' : '#7eecff',
          textTransform: 'uppercase',
        }}>
          {exercises.length} EXERCISES · EST {estTime}M
        </div>
      </div>

      {/* Rank column */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 14px 0 18px',
        borderLeft: `3px solid ${active ? '#ff2233' : '#1c52d6'}`,
        background: active ? '#ff2233' : 'rgba(4,8,29,.35)',
        fontFamily: "'Big Shoulders Display', sans-serif",
        fontStyle: 'italic',
        fontWeight: 900,
        fontSize: 11,
        letterSpacing: 2,
        color: active ? '#f4f6ff' : '#38d8ff',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 8, letterSpacing: 2, lineHeight: 1.2 }}>RANK</div>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 24, lineHeight: 0.85, letterSpacing: 1 }}>{rank}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Exercise Queue Row ─── */
function QueueRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const isBW = exercise.weight == null || exercise.weight === 0;
  const unit = getWeightUnit();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'rgba(20,56,168,.2)',
        borderLeft: '4px solid #38d8ff',
        transition: 'background 0.12s, transform 0.12s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(20,56,168,.45)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(20,56,168,.2)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1, color: '#38d8ff', fontWeight: 700 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#f4f6ff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {exercise.name}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: '#7eecff', textTransform: 'uppercase', marginTop: 2 }}>
          {exercise.sets}×{exercise.reps}
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </div>
      </div>
      <div style={{
        fontFamily: "'Anton', sans-serif",
        fontStyle: 'italic',
        fontSize: 16,
        letterSpacing: 1,
        color: isBW ? '#38d8ff' : '#f4f6ff',
        textAlign: 'right',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {isBW ? 'BW' : formatWeight(exercise.weight!)}
        <div style={{ fontFamily: "'Space Mono', monospace", fontStyle: 'normal', fontSize: 8, letterSpacing: 1.5, color: '#38d8ff', marginTop: 2 }}>
          {isBW ? '' : unit.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

/* ─── Main DashboardPage ─── */
export default function DashboardPage() {
  const {
    exercises, loading, error, fetchExercises, handleCreate, handleDelete,
    handleSeed,
  } = useExercises();
  const { getNameStatus, fetchNames } = useExerciseNames();
  const { user } = useAuth();
  const activeDays = useCycleDays();
  const { streak } = useStreak();
  const unit = getWeightUnit();
  const bwKg = getBodyweightKg() ?? 0;
  const { templates, addTemplate, deleteTemplate } = useTemplates();
  const { alert: showAlert } = useDialog();

  const [selectedDay, setSelectedDay] = useState(() => {
    try {
      const raw = localStorage.getItem('dashboard_selectedDay');
      if (raw) {
        const { value, expiry } = JSON.parse(raw);
        if (Date.now() < expiry) return value;
      }
    } catch { /* ignore */ }
    return 'All';
  });

  const [activeDayDetail, setActiveDayDetail] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultDay, setCreateDefaultDay] = useState('A');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{
    open: boolean;
    duplicates: { templateExercise: TemplateExercise; existingExercise: Exercise }[];
    newExercises: TemplateExercise[];
  }>({ open: false, duplicates: [], newExercises: [] });

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    setActiveDayDetail(null);
    localStorage.setItem('dashboard_selectedDay', JSON.stringify({ value: day, expiry: Date.now() + 30 * 60 * 1000 }));
  };

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of exercises) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      counts[day] = (counts[day] || 0) + 1;
    }
    return counts;
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    if (selectedDay === 'All') return exercises;
    return exercises.filter(ex => {
      const mapped = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      return mapped === selectedDay;
    });
  }, [exercises, selectedDay]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const ex of filteredExercises) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      if (!groups[day]) groups[day] = [];
      groups[day].push(ex);
    }
    const order = [...activeDays, 'Daily'];
    return Object.entries(groups).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  }, [filteredExercises, activeDays]);

  const currentActiveDay = activeDayDetail ?? (groupedExercises[0]?.[0] ?? null);
  const queueExercises = useMemo(() => {
    if (!currentActiveDay) return [];
    return groupedExercises.find(([day]) => day === currentActiveDay)?.[1] ?? [];
  }, [currentActiveDay, groupedExercises]);

  // Stats
  const totalSets = filteredExercises.reduce((sum, ex) => sum + ex.sets, 0);
  const totalVolumeKg = filteredExercises.reduce((sum, ex) => {
    const w = ex.weight != null ? ex.weight : bwKg;
    return sum + ex.sets * ex.reps * w * (ex.per_side ? 2 : 1);
  }, 0);
  const totalVolume = toDisplayWeight(totalVolumeKg, unit) ?? 0;
  const formatVol = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v));

  const handleRestoreFromCreate = async (id: number) => {
    await restoreExercise(id);
    await fetchExercises();
    await fetchNames();
  };

  const handleLoadTemplate = async (template: WorkoutTemplate) => {
    const existingMap = new Map<string, Exercise>();
    for (const ex of exercises) {
      existingMap.set(`${ex.name.toLowerCase()}::${ex.workout_day}`, ex);
    }
    const newExercises: TemplateExercise[] = [];
    const duplicates: { templateExercise: TemplateExercise; existingExercise: Exercise }[] = [];
    for (const ex of template.exercises) {
      const key = `${ex.name.toLowerCase()}::${ex.workout_day}`;
      const existing = existingMap.get(key);
      if (existing) duplicates.push({ templateExercise: ex, existingExercise: existing });
      else newExercises.push(ex);
    }
    if (duplicates.length === 0) {
      for (const ex of newExercises) {
        await createExercise({ name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, workout_day: ex.workout_day });
      }
      await fetchExercises();
      await fetchNames();
      await showAlert({ title: 'Template loaded', message: `Added ${newExercises.length} exercise${newExercises.length !== 1 ? 's' : ''}.` });
    } else {
      setOverrideModal({ open: true, duplicates, newExercises });
    }
  };

  const handleOverrideConfirm = async (overrideIds: Set<number>) => {
    const { duplicates, newExercises } = overrideModal;
    setOverrideModal({ open: false, duplicates: [], newExercises: [] });
    for (const ex of newExercises) {
      await createExercise({ name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, workout_day: ex.workout_day });
    }
    for (const dup of duplicates) {
      if (overrideIds.has(dup.existingExercise.id)) {
        await deleteExercise(dup.existingExercise.id);
        await createExercise({ name: dup.templateExercise.name, sets: dup.templateExercise.sets, reps: dup.templateExercise.reps, weight: dup.templateExercise.weight, workout_day: dup.templateExercise.workout_day });
      }
    }
    await fetchExercises();
    await fetchNames();
    const parts = [];
    if (newExercises.length > 0) parts.push(`${newExercises.length} added`);
    if (overrideIds.size > 0) parts.push(`${overrideIds.size} overridden`);
    await showAlert({ title: 'Template loaded', message: parts.join(', ') + '.' });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING,';
    if (h < 18) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  })();

  const dayLabel = (() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${days[now.getDay()]} · ${hh}:${mm}`;
  })();

  const firstName = user?.name?.split(' ')[0]?.toUpperCase() || 'ATHLETE';

  /* ── Loading / Error / Empty states ── */
  if (error) {
    return (
      <PageShell noPadding>
        <div style={{ padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,34,51,.1)', border: '2px solid #ff2233', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={24} color="#ff2233" />
          </div>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 28, letterSpacing: 2, color: '#f4f6ff', margin: '0 0 8px' }}>CONNECTION ERROR</h2>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#38d8ff', whiteSpace: 'pre-line', marginBottom: 20 }}>{error}</p>
          <button
            onClick={fetchExercises}
            className="glow-button"
          >
            RETRY
          </button>
        </div>
      </PageShell>
    );
  }

  if (loading && exercises.length === 0) {
    return (
      <PageShell noPadding>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageShell>
    );
  }

  if (exercises.length === 0) {
    return (
      <PageShell noPadding>
        <EmptyState onSeed={handleSeed} onCreateClick={() => setShowCreate(true)} />
        <CreateSheet
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          onRestore={handleRestoreFromCreate}
          onDelete={handleDelete}
          exercises={exercises}
          defaultDay={createDefaultDay}
          getNameStatus={getNameStatus}
        />
      </PageShell>
    );
  }

  const tabs = ['All', ...activeDays];

  return (
    <PageShell noPadding>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative',
        padding: '32px 28px 28px',
        borderBottom: '3px solid #1c52d6',
        overflow: 'hidden',
      }}>
        {/* Speed lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'repeating-linear-gradient(105deg, transparent 0 22px, rgba(56,216,255,.05) 22px 24px), repeating-linear-gradient(105deg, transparent 0 60px, rgba(56,216,255,.03) 60px 62px)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: 5,
            color: '#38d8ff', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <span style={{ width: 32, height: 3, background: '#38d8ff', display: 'block', flexShrink: 0 }} />
            {dayLabel}
          </div>

          {/* Greeting */}
          <h1 style={{
            fontFamily: "'Anton', sans-serif", fontSize: 'clamp(52px, 8vw, 80px)',
            lineHeight: 0.88, letterSpacing: 1, fontStyle: 'italic', textTransform: 'uppercase', margin: 0,
          }}>
            <span style={{ color: 'rgba(244,246,255,.5)' }}>{greeting}</span>
            <br />
            <span style={{ color: '#f4f6ff', position: 'relative', display: 'inline-block' }}>
              {firstName}.
              <span style={{
                content: '', position: 'absolute', left: -4, right: -4, bottom: 8,
                height: 14, background: '#ff2233', zIndex: -1, transform: 'skewX(-12deg)',
                display: 'block',
              }} />
            </span>
          </h1>

          {/* Callout banner */}
          <div style={{
            marginTop: 18, display: 'inline-flex', alignItems: 'center',
            background: '#f4f6ff', color: '#0a1240',
            fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 16, letterSpacing: 2.5, padding: '8px 28px 8px 16px',
            position: 'relative', transform: 'skewX(-12deg)',
            boxShadow: '6px 6px 0 #1438a8', textTransform: 'uppercase',
          }}>
            <span style={{ position: 'absolute', left: -3, top: -3, bottom: -3, width: 8, background: '#ff2233', display: 'block' }} />
            <span style={{ display: 'inline-block', transform: 'skewX(12deg)' }}>TRAINING SPLIT AT A GLANCE</span>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setCreateDefaultDay('A'); setShowCreate(true); }}
              className="glow-button"
            >
              <Plus size={14} />
              ADD EXERCISE
            </button>
            <button
              onClick={() => setShowLoadTemplate(true)}
              style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900, fontStyle: 'italic', fontSize: 13, letterSpacing: 2,
                textTransform: 'uppercase', padding: '9px 16px',
                border: '3px solid #f4f6ff', background: 'transparent', color: '#f4f6ff',
                cursor: 'pointer', boxShadow: '4px 4px 0 #1438a8',
                display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1,
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '7px 7px 0 #ff2233'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #1438a8'; }}
            >
              <FolderOpen size={14} />
              LOAD TEMPLATE
            </button>
            <button
              onClick={() => setShowArchive(true)}
              style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900, fontStyle: 'italic', fontSize: 13, letterSpacing: 2,
                textTransform: 'uppercase', padding: '9px 16px',
                border: '3px solid rgba(244,246,255,.35)', background: 'transparent', color: 'rgba(244,246,255,.6)',
                cursor: 'pointer', boxShadow: '4px 4px 0 rgba(20,56,168,.5)',
                display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1,
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(244,246,255,.6)'; }}
            >
              <Archive size={14} />
              ARCHIVE
            </button>
          </div>
        </div>
      </section>

      {/* ── STAT STRIP ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        padding: '20px 28px',
        borderBottom: '3px solid #1c52d6',
      }}
        className="max-sm:grid-cols-2"
      >
        <StatTile label="EXERCISES" value={filteredExercises.length} unit="PROGRAMMED" />
        <StatTile label="TOTAL SETS" value={totalSets} unit="ACROSS SPLIT" />
        <StatTile label={`VOLUME`} value={formatVol(totalVolume)} unit={`${unit.toUpperCase()} · SPLIT`} />
        <StatTile label="THIS WEEK" value={streak?.this_week ?? '—'} unit="SESSIONS LOGGED" />
      </section>

      {/* ── FILTER TABS ── */}
      <div style={{ padding: '18px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
          <span style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 13, letterSpacing: 3, color: '#38d8ff', textTransform: 'uppercase' }}>
            FILTER //
          </span>
          <span style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #38d8ff, transparent)', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, scrollbarWidth: 'thin' }} className="scrollbar-thin">
          {tabs.map(day => {
            const isActive = selectedDay === day;
            const count = day === 'All'
              ? Object.values(dayCounts).reduce((a, b) => a + b, 0)
              : (dayCounts[day] || 0);
            return (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                style={{
                  flexShrink: 0,
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900, fontStyle: 'italic', fontSize: 13, letterSpacing: 2,
                  textTransform: 'uppercase', padding: '9px 16px',
                  border: '3px solid #38d8ff',
                  background: isActive ? '#f4f6ff' : 'transparent',
                  color: isActive ? '#0a1240' : '#f4f6ff',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 7, lineHeight: 1,
                  clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
                  transition: 'transform 0.12s, background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {day === 'All' ? 'ALL' : `DAY ${day}`}
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9, fontWeight: 700, fontStyle: 'normal',
                  background: isActive ? '#ff2233' : '#04081d',
                  color: isActive ? '#f4f6ff' : '#38d8ff',
                  padding: '2px 5px', letterSpacing: 1,
                }}>
                  {count || '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN BODY: Day list + Queue panel ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '0.9fr 1.1fr',
        gap: 0,
        padding: '0 28px 28px',
      }}
        className="max-md:grid-cols-1"
      >
        {/* Left: LIST */}
        <div style={{ paddingRight: 18 }} className="max-md:pr-0">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '22px 0 14px' }}>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 48, letterSpacing: 2, lineHeight: 0.88, textTransform: 'uppercase', margin: 0 }}>
              LIST<span style={{ color: '#38d8ff' }}>.</span>
            </h2>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 12, letterSpacing: 3, color: '#38d8ff', textTransform: 'uppercase', paddingBottom: 8 }}>
              // TRAINING SPLIT
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupedExercises.map(([day, dayExercises], i) => (
              <DaySlab
                key={day}
                day={day}
                exercises={dayExercises}
                rank={i + 1}
                roman={ROMAN[i] || String(i + 1)}
                active={currentActiveDay === day}
                onClick={() => setActiveDayDetail(day)}
              />
            ))}
          </div>

          {/* More menu actions (desktop) */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }} className="hidden sm:flex">
            <button
              onClick={() => setShowSaveTemplate(true)}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2,
                color: '#38d8ff', background: 'transparent', border: '2px solid rgba(56,216,255,.3)',
                padding: '7px 12px', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; (e.currentTarget as HTMLElement).style.borderColor = '#38d8ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#38d8ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.3)'; }}
            >
              SAVE TEMPLATE
            </button>
            <button
              onClick={fetchExercises}
              disabled={loading}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2,
                color: '#38d8ff', background: 'transparent', border: '2px solid rgba(56,216,255,.3)',
                padding: '7px 12px', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; (e.currentTarget as HTMLElement).style.borderColor = '#38d8ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#38d8ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.3)'; }}
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Right: QUEUE */}
        <div style={{ marginLeft: 18 }} className="max-md:ml-0 max-md:mt-4">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '22px 0 14px' }}>
            <h2 style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 48, letterSpacing: 2, lineHeight: 0.88, textTransform: 'uppercase', margin: 0 }}>
              QUEUE<span style={{ color: '#38d8ff' }}>.</span>
            </h2>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 12, letterSpacing: 3, color: '#38d8ff', textTransform: 'uppercase', paddingBottom: 8 }}>
              {currentActiveDay ? `// DAY ${currentActiveDay} · ${DAY_TAGS[currentActiveDay] || currentActiveDay}` : '// SELECT A DAY'}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentActiveDay && (
              <motion.div
                key={currentActiveDay}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: 'linear-gradient(180deg, rgba(13,27,88,.65), rgba(4,8,29,.85))',
                  border: '3px solid #38d8ff',
                  boxShadow: '6px 6px 0 #1438a8',
                  padding: '16px 18px',
                  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)',
                  position: 'relative',
                }}
              >
                {/* Red top-left accent */}
                <div style={{ position: 'absolute', top: -3, left: -3, width: 48, height: 8, background: '#ff2233' }} />

                {/* Queue header */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 28, letterSpacing: 2, lineHeight: 0.9, textTransform: 'uppercase' }}>
                    DAY {currentActiveDay} <span style={{ color: '#38d8ff' }}>{DAY_TAGS[currentActiveDay] || ''}</span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#38d8ff', textTransform: 'uppercase' }}>
                    <strong style={{ color: '#f4f6ff' }}>{queueExercises.length} LIFTS</strong> · EST {Math.round(queueExercises.length * 3.5 + 8)}M
                  </div>
                </div>

                {/* Exercise list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {queueExercises.map((ex, idx) => (
                    <QueueRow key={ex.id} exercise={ex} index={idx} />
                  ))}
                </div>

                {/* Add to day button */}
                <button
                  onClick={() => { setCreateDefaultDay(currentActiveDay); setShowCreate(true); }}
                  style={{
                    marginTop: 12,
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontStyle: 'italic', fontWeight: 900,
                    fontSize: 12, letterSpacing: 2, color: '#04081d',
                    background: '#38d8ff', padding: '8px 14px',
                    border: '3px solid #f4f6ff', cursor: 'pointer',
                    boxShadow: '4px 4px 0 #1438a8', textTransform: 'uppercase', lineHeight: 1,
                    transition: 'transform 0.12s, box-shadow 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '7px 7px 0 #ff2233'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #1438a8'; }}
                >
                  <Plus size={13} strokeWidth={3} />
                  ADD TO DAY {currentActiveDay}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── CHARTS ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 18,
        padding: '0 28px 40px',
      }}
        className="max-sm:grid-cols-1"
      >
        <VolumeChart exercises={exercises} />
        <SplitDistribution exercises={exercises} />
      </section>

      {/* Footer wordmark */}
      <div style={{
        textAlign: 'center',
        padding: '24px 18px',
        fontFamily: "'Anton', sans-serif",
        fontStyle: 'italic',
        fontSize: 'clamp(32px, 6vw, 64px)',
        letterSpacing: 8,
        color: 'transparent',
        WebkitTextStroke: '2px rgba(28,82,214,.5)',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        GRIND/LOGGER
      </div>

      {/* Modals / Sheets */}
      <CreateSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        onRestore={handleRestoreFromCreate}
        onDelete={handleDelete}
        exercises={exercises}
        defaultDay={createDefaultDay}
        getNameStatus={getNameStatus}
      />
      <SaveTemplateModal
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        exercises={exercises}
        onSave={addTemplate}
      />
      <LoadTemplateModal
        open={showLoadTemplate}
        onClose={() => setShowLoadTemplate(false)}
        templates={templates}
        onLoad={handleLoadTemplate}
        onDelete={deleteTemplate}
      />
      <TemplateOverrideModal
        open={overrideModal.open}
        onClose={() => setOverrideModal({ open: false, duplicates: [], newExercises: [] })}
        duplicates={overrideModal.duplicates}
        newExercises={overrideModal.newExercises}
        onConfirm={handleOverrideConfirm}
      />
      <ArchiveModal
        open={showArchive}
        onClose={() => setShowArchive(false)}
        onRestored={() => { setTimeout(fetchExercises, 0); }}
      />
    </PageShell>
  );
}
