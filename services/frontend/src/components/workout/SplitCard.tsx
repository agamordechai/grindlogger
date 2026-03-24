import { useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, Plus, GripVertical } from 'lucide-react';
import { getDayColor, DAY_LABELS } from '../../lib/constants';
import type { Exercise, UpdateExerciseRequest } from '../../types/exercise';
import { ExerciseRow } from './ExerciseRow';

interface SplitCardProps {
  day: string;
  exercises: Exercise[];
  editMode?: boolean;
  onReorder?: (exercises: Exercise[]) => void;
  onUpdate: (id: number, data: UpdateExerciseRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onArchive?: (id: number) => Promise<void>;
  onAddToDay: (day: string) => void;
}

function DraggableRow({ exercise }: { exercise: Exercise }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 bg-surface-1 touch-none select-none"
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-steel hover:text-chalk transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-chalk text-sm font-medium truncate">{exercise.name}</p>
        <p className="text-steel text-xs">
          {exercise.sets}×{exercise.reps}
          {exercise.weight != null ? ` · ${exercise.weight} kg` : ''}
        </p>
      </div>
    </Reorder.Item>
  );
}

export function SplitCard({ day, exercises, editMode, onReorder, onUpdate, onDelete, onArchive, onAddToDay }: SplitCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = getDayColor(day);

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
              <Reorder.Group
                axis="y"
                values={exercises}
                onReorder={onReorder ?? (() => {})}
                className="ml-1"
              >
                {exercises.map(ex => (
                  <DraggableRow key={ex.id} exercise={ex} />
                ))}
              </Reorder.Group>
            ) : (
              <div className="ml-1">
                {exercises.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onArchive={onArchive}
                  />
                ))}

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
