import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, AlertTriangle, Save, FolderOpen, Archive, MoreVertical } from 'lucide-react';
import { useExercises } from '../hooks/useExercises';
import { useExerciseNames } from '../hooks/useExerciseNames';
import { useTemplates } from '../hooks/useTemplates';
import { restoreExercise, createExercise, deleteExercise } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../components/ui/ConfirmDialog';
import { PageShell } from '../components/ui/PageShell';
import { GlowButton } from '../components/ui/GlowButton';
import { CardSkeleton } from '../components/ui/Skeleton';
import { StatsRow } from '../components/stats/StatsRow';
import { VolumeChart } from '../components/stats/VolumeChart';
import { SplitDistribution } from '../components/stats/SplitDistribution';
import { DayPills } from '../components/workout/DayPills';
import { SplitCard } from '../components/workout/SplitCard';
import { CreateSheet } from '../components/workout/CreateSheet';
import { EmptyState } from '../components/workout/EmptyState';
import { SaveTemplateModal } from '../components/workout/SaveTemplateModal';
import { LoadTemplateModal } from '../components/workout/LoadTemplateModal';
import { TemplateOverrideModal } from '../components/workout/TemplateOverrideModal';
import { ArchiveModal } from '../components/workout/ArchiveModal';
import { ALL_DAYS } from '../lib/constants';
import { containerStagger } from '../lib/motion';
import type { WorkoutTemplate, TemplateExercise } from '../hooks/useTemplates';
import type { Exercise } from '../types/exercise';

function MoreMenu({ onRefresh, onArchive, onSaveTemplate, onLoadTemplate, refreshing }: {
  onRefresh: () => void;
  onArchive: () => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  refreshing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    const id = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', handleClick); };
  }, [open]);

  const items = [
    { label: 'Refresh', icon: RefreshCw, onClick: onRefresh, spinning: refreshing },
    { label: 'Archive', icon: Archive, onClick: onArchive },
    { label: 'Save Template', icon: Save, onClick: onSaveTemplate },
    { label: 'Load Template', icon: FolderOpen, onClick: onLoadTemplate },
  ];

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-border rounded-xl py-1 shadow-xl shadow-black/30 z-[60]">
          {items.map(({ label, icon: Icon, onClick, spinning }) => (
            <button
              key={label}
              onClick={() => { onClick(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
            >
              <Icon size={16} className={spinning ? 'animate-spin' : ''} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { exercises, loading, error, fetchExercises, handleCreate, handleUpdate, handleDelete, handleArchive, handleSeed, handleReorder, handleCreateSuperset, handleRemoveSuperset } = useExercises();
  const { getNameStatus, fetchNames } = useExerciseNames();
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => {
    try {
      const raw = localStorage.getItem('dashboard_selectedDay');
      if (raw) {
        const { value, expiry } = JSON.parse(raw);
        if (Date.now() < expiry) return value;
      }
    } catch {}
    return 'All';
  });

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    localStorage.setItem('dashboard_selectedDay', JSON.stringify({
      value: day,
      expiry: Date.now() + 30 * 60 * 1000,
    }));
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultDay, setCreateDefaultDay] = useState('A');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const { templates, addTemplate, deleteTemplate } = useTemplates();
  const { alert: showAlert } = useDialog();

  // Override modal state
  const [overrideModal, setOverrideModal] = useState<{
    open: boolean;
    duplicates: { templateExercise: TemplateExercise; existingExercise: Exercise }[];
    newExercises: TemplateExercise[];
  }>({ open: false, duplicates: [], newExercises: [] });

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
    const groups: Record<string, typeof exercises> = {};
    const filtered = filteredExercises;

    for (const ex of filtered) {
      const day = (!ex.workout_day || ex.workout_day === 'None') ? 'Daily' : ex.workout_day;
      if (!groups[day]) groups[day] = [];
      groups[day].push(ex);
    }

    // Sort: days A-G, Daily, None
    const order = [...ALL_DAYS, 'None'];
    return Object.entries(groups).sort(([a], [b]) => {
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [filteredExercises]);

  const handleRestoreFromCreate = async (id: number) => {
    await restoreExercise(id);
    await fetchExercises();
    await fetchNames();
  };

  const handleLoadTemplate = async (template: WorkoutTemplate) => {
    // Build a map of existing name+day combos
    const existingMap = new Map<string, Exercise>();
    for (const ex of exercises) {
      existingMap.set(`${ex.name.toLowerCase()}::${ex.workout_day}`, ex);
    }

    const newExercises: TemplateExercise[] = [];
    const duplicates: { templateExercise: TemplateExercise; existingExercise: Exercise }[] = [];

    for (const ex of template.exercises) {
      const key = `${ex.name.toLowerCase()}::${ex.workout_day}`;
      const existing = existingMap.get(key);
      if (existing) {
        duplicates.push({ templateExercise: ex, existingExercise: existing });
      } else {
        newExercises.push(ex);
      }
    }

    if (duplicates.length === 0) {
      // No conflicts — add all directly
      for (const ex of newExercises) {
        await createExercise({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          workout_day: ex.workout_day,
        });
      }
      await fetchExercises();
      await fetchNames();
      await showAlert({ title: 'Template loaded', message: `Added ${newExercises.length} exercise${newExercises.length !== 1 ? 's' : ''}.` });
    } else {
      // Show override selection modal
      setOverrideModal({ open: true, duplicates, newExercises });
    }
  };

  const handleOverrideConfirm = async (overrideIds: Set<number>) => {
    const { duplicates, newExercises } = overrideModal;
    setOverrideModal({ open: false, duplicates: [], newExercises: [] });

    // Add new exercises
    for (const ex of newExercises) {
      await createExercise({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        workout_day: ex.workout_day,
      });
    }

    // Override selected duplicates: delete old, create new
    for (const dup of duplicates) {
      if (overrideIds.has(dup.existingExercise.id)) {
        await deleteExercise(dup.existingExercise.id);
        await createExercise({
          name: dup.templateExercise.name,
          sets: dup.templateExercise.sets,
          reps: dup.templateExercise.reps,
          weight: dup.templateExercise.weight,
          workout_day: dup.templateExercise.workout_day,
        });
      }
    }

    await fetchExercises();
    await fetchNames();

    const overridden = overrideIds.size;
    const added = newExercises.length;
    const parts = [];
    if (added > 0) parts.push(`${added} added`);
    if (overridden > 0) parts.push(`${overridden} overridden`);
    await showAlert({ title: 'Template loaded', message: parts.join(', ') + '.' });
  };

  const handleAddToDay = (day: string) => {
    setCreateDefaultDay(day);
    setShowCreate(true);
  };


  if (error) {
    return (
      <PageShell>
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <h2 className="text-lg font-bold text-chalk mb-2">Connection Error</h2>
          <p className="text-steel text-sm mb-1 whitespace-pre-line max-w-md mx-auto">{error}</p>
          <p className="text-steel/60 text-xs mb-6">
            Make sure the FastAPI server is running.
          </p>
          <GlowButton onClick={fetchExercises}>Retry Connection</GlowButton>
        </div>
      </PageShell>
    );
  }

  if (loading && exercises.length === 0) {
    return (
      <PageShell className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (exercises.length === 0) {
    return (
      <PageShell>
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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <PageShell className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-chalk">
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-steel text-sm mt-0.5">Your training split at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop: individual icon buttons */}
          <button
            onClick={() => setShowLoadTemplate(true)}
            title="Load template"
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
          >
            <FolderOpen size={16} />
          </button>
          <button
            onClick={() => setShowSaveTemplate(true)}
            title="Save as template"
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
          >
            <Save size={16} />
          </button>
          <button
            onClick={() => setShowArchive(true)}
            title="Archive"
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={fetchExercises}
            disabled={loading}
            title="Refresh"
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Mobile: three-dot dropdown */}
          <MoreMenu
            onRefresh={fetchExercises}
            onArchive={() => setShowArchive(true)}
            onSaveTemplate={() => setShowSaveTemplate(true)}
            onLoadTemplate={() => setShowLoadTemplate(true)}
            refreshing={loading}
          />
          <GlowButton onClick={() => { setCreateDefaultDay('A'); setShowCreate(true); }}>
            <Plus size={16} />
            <span className="hidden sm:inline">Add Exercise</span>
          </GlowButton>
        </div>
      </div>

      {/* Stats */}
      <StatsRow exercises={filteredExercises} />

      {/* Day pills */}
      <DayPills selected={selectedDay} onChange={handleDayChange} dayCounts={dayCounts} />

      {/* Main content grid: splits + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Split cards */}
        <motion.div
          variants={containerStagger}
          initial="initial"
          animate="animate"
          className="lg:col-span-2 space-y-4"
        >
          {groupedExercises.map(([day, dayExercises]) => (
            <SplitCard
              key={day}
              day={day}
              exercises={dayExercises}
              onReorder={handleReorder}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onAddToDay={handleAddToDay}
              onCreateSuperset={handleCreateSuperset}
              onRemoveSuperset={handleRemoveSuperset}
            />
          ))}
        </motion.div>

        {/* Charts sidebar */}
        <div className="space-y-4">
          <VolumeChart exercises={exercises} />
          <SplitDistribution exercises={exercises} />
        </div>
      </div>

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
