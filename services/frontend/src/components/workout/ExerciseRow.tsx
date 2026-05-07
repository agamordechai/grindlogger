import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Archive, Trash2, StickyNote, GitBranch } from 'lucide-react';
import type { Exercise, UpdateExerciseRequest } from '../../types/exercise';
import { ALL_DAYS } from '../../lib/constants';
import { formatWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import { ExerciseEditor } from './ExerciseEditor';
import { getLibraryVariants } from '../../lib/exerciseLibrary';

interface ExerciseRowProps {
  exercise: Exercise;
  onUpdate: (id: number, data: UpdateExerciseRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onArchive?: (id: number) => Promise<void>;
}

export function ExerciseRow({ exercise, onUpdate, onDelete, onArchive }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const { confirm } = useDialog();

  const variants = useMemo(() => getLibraryVariants(exercise.name), [exercise.name]);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-chalk truncate">{exercise.name}</p>
          <p className="text-xs text-steel font-mono mt-0.5">
            {exercise.sets}&times;{exercise.reps}
            {exercise.weight != null && exercise.weight > 0 && (
              <span className="text-ember ml-2">{formatWeight(exercise.weight)}</span>
            )}
            {(exercise.weight == null || exercise.weight === 0) && (
              <span className="text-steel/60 ml-2">BW</span>
            )}
            {exercise.per_side && (
              <span className="text-violet-400 ml-2">/ side</span>
            )}
          </p>
          {exercise.notes && (
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              <StickyNote size={10} className="text-steel/70 shrink-0" />
              <span className="text-[11px] text-steel/70 truncate">{exercise.notes}</span>
            </div>
          )}
        </div>
        {variants.length > 0 && (
          <GitBranch size={12} className="text-cyan-400 shrink-0" />
        )}
        <ChevronRight
          size={16}
          className={`text-steel shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ExerciseEditor
              exercise={exercise}
              days={['A', ...ALL_DAYS.filter(d => d !== 'A'), 'None']}
              onSave={async (data) => {
                await onUpdate(exercise.id, data);
                setExpanded(false);
              }}
              onCancel={() => setExpanded(false)}
            />
            {variants.length > 0 && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => setShowVariants(!showVariants)}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <GitBranch size={12} />
                  Try a variant ({variants.length})
                  <ChevronRight
                    size={12}
                    className={`transition-transform duration-200 ${showVariants ? 'rotate-90' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {showVariants && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 divide-y divide-cyan-400/10">
                        {variants.map(v => (
                          <div key={v.name} className="flex items-center gap-3 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-chalk truncate">{v.name}</p>
                              <p className="text-[11px] text-steel font-mono">
                                {v.defaultSets}&times;{v.defaultReps}
                              </p>
                            </div>
                            <span className="text-[10px] text-steel/70 shrink-0">{v.muscleGroup}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="px-4 pb-3 flex items-center gap-4">
              {onArchive && (
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Archive exercise', message: `Move "${exercise.name}" to archive?`, confirmText: 'Archive' })) {
                      await onArchive(exercise.id);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
                >
                  <Archive size={12} />
                  Archive
                </button>
              )}
              <button
                onClick={async () => {
                  if (await confirm({ title: 'Delete exercise', message: `Permanently delete "${exercise.name}"?`, type: 'danger', confirmText: 'Delete' })) {
                    await onDelete(exercise.id);
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
