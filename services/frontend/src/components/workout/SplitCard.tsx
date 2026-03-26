import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, Plus, GripVertical, Link, Unlink } from 'lucide-react';
import { getDayColor, DAY_LABELS } from '../../lib/constants';
import type { Exercise, UpdateExerciseRequest } from '../../types/exercise';
import { ExerciseRow } from './ExerciseRow';

interface SplitCardProps {
  day: string;
  exercises: Exercise[];
  onReorder?: (exercises: Exercise[]) => void;
  onUpdate: (id: number, data: UpdateExerciseRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onArchive?: (id: number) => Promise<void>;
  onAddToDay: (day: string) => void;
  onCreateSuperset?: (exerciseIds: number[]) => Promise<void>;
  onRemoveSuperset?: (exerciseIds: number[]) => Promise<void>;
}

/** A group of exercises — either a superset (multiple) or a standalone exercise. */
interface ExerciseGroup {
  supersetGroup: number | null;
  exercises: Exercise[];
}

/**
 * Re-sort exercises for display so superset members are adjacent
 * (placed at the position of the first member), without mutating sort_order.
 */
function sortForDisplay(exercises: Exercise[]): Exercise[] {
  const seen = new Set<number>();
  const result: Exercise[] = [];

  // Collect superset members by group id
  const supersetMap = new Map<number, Exercise[]>();
  for (const ex of exercises) {
    if (ex.superset_group != null) {
      let arr = supersetMap.get(ex.superset_group);
      if (!arr) {
        arr = [];
        supersetMap.set(ex.superset_group, arr);
      }
      arr.push(ex);
    }
  }

  for (const ex of exercises) {
    if (seen.has(ex.id)) continue;
    if (ex.superset_group != null) {
      // First time we see this group — insert all members here
      const members = supersetMap.get(ex.superset_group)!;
      for (const m of members) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          result.push(m);
        }
      }
    } else {
      seen.add(ex.id);
      result.push(ex);
    }
  }

  return result;
}

function groupExercises(exercises: Exercise[]): ExerciseGroup[] {
  const sorted = sortForDisplay(exercises);
  const groups: ExerciseGroup[] = [];
  let currentGroup: ExerciseGroup | null = null;

  for (const ex of sorted) {
    if (ex.superset_group != null) {
      if (currentGroup && currentGroup.supersetGroup === ex.superset_group) {
        currentGroup.exercises.push(ex);
      } else {
        currentGroup = { supersetGroup: ex.superset_group, exercises: [ex] };
        groups.push(currentGroup);
      }
    } else {
      currentGroup = null;
      groups.push({ supersetGroup: null, exercises: [ex] });
    }
  }

  return groups;
}

function DraggableRow({
  exercise,
  selected,
  onToggle,
  showCheckbox,
}: {
  exercise: Exercise;
  selected: boolean;
  onToggle: () => void;
  showCheckbox: boolean;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 bg-surface-1 touch-none select-none"
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-border accent-ember shrink-0"
        />
      )}
      <button
        onPointerDown={(e) => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-steel hover:text-chalk transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-chalk text-sm font-medium truncate">{exercise.name}</p>
          {exercise.superset_group != null && (
            <span className="text-[10px] font-semibold text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">
              SS
            </span>
          )}
        </div>
        <p className="text-steel text-xs">
          {exercise.sets}×{exercise.reps}
          {exercise.weight != null ? ` · ${exercise.weight} kg` : ''}
        </p>
      </div>
    </Reorder.Item>
  );
}

function SupersetWrapper({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="mx-2 my-1.5 rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      {label && (
        <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-500/20">
          <Link size={10} className="text-violet-400" />
          <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

export function SplitCard({
  day,
  exercises,
  onReorder,
  onUpdate,
  onDelete,
  onArchive,
  onAddToDay,
  onCreateSuperset,
  onRemoveSuperset,
}: SplitCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const color = getDayColor(day);

  const exerciseGroups = useMemo(() => groupExercises(exercises), [exercises]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasSelection = selectedIds.size >= 2;
  const selectedExercises = exercises.filter(e => selectedIds.has(e.id));
  const allSelectedInSameSuperset =
    selectedExercises.length > 0 &&
    selectedExercises.every(e => e.superset_group != null) &&
    new Set(selectedExercises.map(e => e.superset_group)).size === 1;

  const handleLink = async () => {
    if (onCreateSuperset && selectedIds.size >= 2) {
      await onCreateSuperset([...selectedIds]);
      setSelectedIds(new Set());
    }
  };

  const handleUnlink = async () => {
    if (onRemoveSuperset && selectedIds.size > 0) {
      await onRemoveSuperset([...selectedIds]);
      setSelectedIds(new Set());
    }
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-0 overflow-hidden"
    >
      {/* Colored accent bar + header */}
      <div className="flex items-center">
        <div className={`w-1 self-stretch ${color.accent} rounded-l-2xl`} />
        <button
          onClick={() => !editMode && setCollapsed(!collapsed)}
          className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-surface-2/30 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${color.accent}`} />
          <span className="text-sm font-bold text-chalk flex-1 text-left">
            {DAY_LABELS[day] || day}
          </span>
          <span className="text-xs text-steel font-mono">
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
          </span>
          {!editMode && (
            <ChevronDown
              size={16}
              className={`text-steel transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (editMode) exitEditMode();
            else {
              setEditMode(true);
              setCollapsed(false);
            }
          }}
          className={`px-3 py-3 text-xs font-semibold transition-colors ${
            editMode ? 'text-ember' : 'text-steel hover:text-chalk'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {(!collapsed || editMode) && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {editMode ? (
              <>
                {/* Superset action bar */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-surface-2/30">
                    <span className="text-xs text-steel">
                      {selectedIds.size} selected
                    </span>
                    <div className="flex-1" />
                    {hasSelection && !allSelectedInSameSuperset && (
                      <button
                        onClick={handleLink}
                        className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-400/10"
                      >
                        <Link size={12} />
                        Link Superset
                      </button>
                    )}
                    {selectedExercises.some(e => e.superset_group != null) && (
                      <button
                        onClick={handleUnlink}
                        className="flex items-center gap-1.5 text-xs font-medium text-steel hover:text-chalk transition-colors px-2 py-1 rounded-lg hover:bg-surface-3"
                      >
                        <Unlink size={12} />
                        Unlink
                      </button>
                    )}
                  </div>
                )}
                <Reorder.Group
                  axis="y"
                  values={exercises}
                  onReorder={onReorder ?? (() => {})}
                  className="ml-1"
                >
                  {exercises.map(ex => (
                    <DraggableRow
                      key={ex.id}
                      exercise={ex}
                      selected={selectedIds.has(ex.id)}
                      onToggle={() => toggleSelect(ex.id)}
                      showCheckbox={true}
                    />
                  ))}
                </Reorder.Group>
              </>
            ) : (
              <div className="ml-1">
                {exerciseGroups.map((group) => {
                  if (group.supersetGroup != null && group.exercises.length > 1) {
                    return (
                      <SupersetWrapper
                        key={`ss-${group.supersetGroup}`}
                        label="Superset"
                      >
                        {group.exercises.map((ex) => (
                          <ExerciseRow
                            key={ex.id}
                            exercise={ex}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onArchive={onArchive}
                          />
                        ))}
                      </SupersetWrapper>
                    );
                  }
                  // Standalone exercise(s)
                  return group.exercises.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onArchive={onArchive}
                    />
                  ));
                })}

                <button
                  onClick={() => onAddToDay(day)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium ${color.text} hover:bg-surface-2/30 transition-colors`}
                >
                  <Plus size={14} />
                  Add to {DAY_LABELS[day] || day}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
