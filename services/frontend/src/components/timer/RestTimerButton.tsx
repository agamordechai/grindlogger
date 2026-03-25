import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Timer, Plus, Trash2, Play, Pause, X, ListOrdered, ChevronLeft, GripVertical, Pencil } from 'lucide-react';
import { useRestTimer } from '../../contexts/RestTimerContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const PRESETS = [30, 60, 90, 120];
const STEP_DURATIONS = [5, 10, 15, 30, 45, 60, 90, 120];

export interface SavedSequence {
  name: string;
  steps: number[];
}

interface BuilderStep {
  id: string;
  duration: number;
}

let stepIdCounter = 0;
function makeStep(duration: number): BuilderStep {
  return { id: `s-${++stepIdCounter}`, duration };
}

function DraggableStep({ step, onRemove }: { step: BuilderStep; onRemove: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={step}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 bg-surface-2 rounded-lg px-2 py-1 touch-none select-none"
    >
      <button
        onPointerDown={e => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 text-steel hover:text-chalk transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <span className="flex-1 text-[11px] font-semibold text-ember">{formatStepShort(step.duration)}</span>
      <button
        onClick={onRemove}
        className="w-5 h-5 flex items-center justify-center rounded text-steel hover:text-danger transition-colors"
      >
        <X size={10} />
      </button>
    </Reorder.Item>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatStepShort(s: number): string {
  return s >= 60 ? `${s / 60}m` : `${s}s`;
}

type PanelView = 'timer' | 'sequences' | 'builder';

export function RestTimerButton() {
  const {
    remaining, total, running, paused, finished,
    steps: activeSteps, currentStepIndex,
    start, startSequence, pause, resume, extend, skip, dismissFinished,
  } = useRestTimer();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>('timer');
  const containerRef = useRef<HTMLDivElement>(null);

  // Saved sequences
  const [savedSequences, setSavedSequences] = useLocalStorage<SavedSequence[]>(
    'rest-timer-sequences', []
  );

  // Builder state
  const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([]);
  const [builderName, setBuilderName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // Use pointerdown instead of click — by the time a click event reaches
    // the document, React may have re-rendered and removed the target node
    // (e.g. deleting a step), so contains() returns false and wrongly closes
    // the popup. Pointerdown fires before React processes the state update.
    const id = setTimeout(() => document.addEventListener('pointerdown', handlePointerDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (view !== 'timer') setView('timer');
        else setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, view]);

  // Auto-open popup when timer finishes
  useEffect(() => {
    if (finished) setOpen(true);
  }, [finished]);

  // Reset view when closing
  useEffect(() => {
    if (!open) setView('timer');
  }, [open]);

  const progress = total > 0 ? remaining / total : 0;
  const isSequenceRunning = activeSteps.length > 1;

  // SVG circle properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  function handleDeleteSequence(idx: number) {
    setSavedSequences(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSaveSequence() {
    if (builderSteps.length === 0) return;
    const name = builderName.trim() || `Custom ${savedSequences.length + 1}`;
    const durations = builderSteps.map(s => s.duration);
    if (editingIndex !== null) {
      setSavedSequences(prev => prev.map((s, i) => i === editingIndex ? { name, steps: durations } : s));
    } else {
      setSavedSequences(prev => [...prev, { name, steps: durations }]);
    }
    setBuilderSteps([]);
    setBuilderName('');
    setEditingIndex(null);
    setView('sequences');
  }

  function handleStartSequence(seq: SavedSequence) {
    startSequence(seq.steps);
    setView('timer');
  }

  function openBuilder() {
    setBuilderSteps([]);
    setBuilderName('');
    setEditingIndex(null);
    setView('builder');
  }

  function openEditor(idx: number) {
    const seq = savedSequences[idx];
    setBuilderSteps(seq.steps.map(d => makeStep(d)));
    setBuilderName(seq.name);
    setEditingIndex(idx);
    setView('builder');
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Timer icon button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`relative flex items-center gap-1.5 h-8 rounded-full px-2 transition-colors ${
          running && paused
            ? 'bg-amber-500/15 text-amber-500'
            : running
              ? 'bg-ember/15 text-ember'
              : finished
                ? 'bg-ember/25 text-ember'
                : 'text-steel hover:text-chalk hover:bg-surface-2'
        }`}
      >
        <Timer size={18} className={finished ? 'animate-pulse' : ''} />
        {(running || finished) && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="text-xs font-mono font-semibold"
          >
            {finished ? 'Done!' : formatTime(remaining)}
          </motion.span>
        )}
        {finished && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-ember"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </button>

      {/* Dropdown popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-72 bg-surface-1 border border-border rounded-2xl p-5 shadow-xl shadow-black/30 z-[60]"
          >
            <AnimatePresence mode="wait">
              {/* ─── Timer View ─── */}
              {view === 'timer' && (
                <motion.div
                  key="timer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Timer display */}
                  <div className="flex flex-col items-center mb-4">
                    <p className="text-xs font-medium text-steel mb-3 uppercase tracking-wider">Rest Timer</p>

                    {/* Step indicator for sequences */}
                    {isSequenceRunning && running && (
                      <div className="flex items-center gap-1 mb-2">
                        {activeSteps.map((stepDur, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <div
                              className={`flex items-center justify-center min-w-[28px] h-5 px-1 rounded text-[10px] font-semibold transition-colors ${
                                i < currentStepIndex
                                  ? 'bg-success/20 text-success'
                                  : i === currentStepIndex
                                    ? 'bg-ember/20 text-ember ring-1 ring-ember/40'
                                    : 'bg-surface-2 text-steel'
                              }`}
                            >
                              {formatStepShort(stepDur)}
                            </div>
                            {i < activeSteps.length - 1 && (
                              <span className="text-steel/30 text-[10px]">›</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Circular progress */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                        <circle
                          cx="40" cy="40" r={radius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-surface-3"
                        />
                        {(running || finished) && (
                          <motion.circle
                            cx="40" cy="40" r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeOffset}
                            className={finished ? 'text-success' : paused ? 'text-amber-500' : 'text-ember'}
                          />
                        )}
                      </svg>
                      <div className="flex flex-col items-center">
                        <span className={`text-2xl font-bold font-mono ${
                          finished ? 'text-success' : paused ? 'text-amber-500' : running ? 'text-chalk' : 'text-steel'
                        }`}>
                          {finished ? '0:00' : running ? formatTime(remaining) : '0:00'}
                        </span>
                        {paused && (
                          <span className="text-[10px] text-amber-500 font-semibold uppercase">Paused</span>
                        )}
                        {isSequenceRunning && running && !paused && (
                          <span className="text-[10px] text-steel font-medium">
                            Step {currentStepIndex + 1}/{activeSteps.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Finished state */}
                  {finished && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center mb-4"
                    >
                      <p className="text-success text-sm font-semibold">Time's up!</p>
                    </motion.div>
                  )}

                  {/* Preset buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESETS.map(s => (
                      <button
                        key={s}
                        onClick={() => { start(s); }}
                        className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                          running && total === s && remaining > 0 && !isSequenceRunning
                            ? 'bg-ember text-white'
                            : 'bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3'
                        }`}
                      >
                        {s >= 60 ? `${s / 60}m` : `${s}s`}
                      </button>
                    ))}
                  </div>

                  {/* Sequences button */}
                  <button
                    onClick={() => setView('sequences')}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3 transition-colors flex items-center justify-center gap-1.5 mb-3"
                  >
                    <ListOrdered size={14} />
                    Sequences{savedSequences.length > 0 ? ` (${savedSequences.length})` : ''}
                  </button>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {running && (
                      <>
                        <button
                          onClick={() => paused ? resume() : pause()}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                            paused
                              ? 'bg-ember text-white hover:bg-ember-dark'
                              : 'bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3'
                          }`}
                        >
                          {paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                        </button>
                        <button
                          onClick={() => extend(30)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                        >
                          +30s
                        </button>
                        <button
                          onClick={() => { skip(); }}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-surface-2 text-danger hover:bg-danger/10 transition-colors"
                        >
                          Skip
                        </button>
                      </>
                    )}
                    {finished && (
                      <button
                        onClick={() => { dismissFinished(); }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-ember text-white hover:bg-ember-dark transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── Sequences View ─── */}
              {view === 'sequences' && (
                <motion.div
                  key="sequences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setView('timer')}
                      className="text-steel hover:text-chalk transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <p className="text-xs font-medium text-steel uppercase tracking-wider">Sequences</p>
                    <button
                      onClick={openBuilder}
                      className="text-steel hover:text-chalk transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {savedSequences.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-steel text-xs mb-3">No saved sequences</p>
                      <button
                        onClick={openBuilder}
                        className="py-2 px-4 rounded-xl text-xs font-semibold bg-ember text-white hover:bg-ember-dark transition-colors"
                      >
                        Create One
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {savedSequences.map((seq, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-surface-2 rounded-xl p-2.5"
                        >
                          <button
                            onClick={() => handleStartSequence(seq)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-xs font-semibold text-chalk truncate">{seq.name}</p>
                            <p className="text-[10px] text-steel truncate">
                              {seq.steps.map(formatStepShort).join(' → ')}
                            </p>
                          </button>
                          <button
                            onClick={() => handleStartSequence(seq)}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-ember/15 text-ember hover:bg-ember/25 transition-colors"
                          >
                            <Play size={12} />
                          </button>
                          <button
                            onClick={() => openEditor(idx)}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteSequence(idx)}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-steel hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── Builder View ─── */}
              {view === 'builder' && (
                <motion.div
                  key="builder"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => { setEditingIndex(null); setView('sequences'); }}
                      className="text-steel hover:text-chalk transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <p className="text-xs font-medium text-steel uppercase tracking-wider">
                      {editingIndex !== null ? 'Edit Sequence' : 'New Sequence'}
                    </p>
                    <div className="w-4" />
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    placeholder="Sequence name"
                    value={builderName}
                    onChange={e => setBuilderName(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-xl text-xs bg-surface-2 border border-border text-chalk placeholder:text-steel/50 focus:outline-none focus:ring-1 focus:ring-ember/50"
                  />

                  {/* Current steps */}
                  <div className="min-h-[36px] mb-3">
                    {builderSteps.length === 0 ? (
                      <p className="text-[10px] text-steel/50 italic">Tap durations below to add steps</p>
                    ) : (
                      <Reorder.Group
                        axis="y"
                        values={builderSteps}
                        onReorder={setBuilderSteps}
                        className="space-y-1 max-h-32 overflow-y-auto"
                      >
                        {builderSteps.map(step => (
                          <DraggableStep
                            key={step.id}
                            step={step}
                            onRemove={() => setBuilderSteps(prev => prev.filter(s => s.id !== step.id))}
                          />
                        ))}
                      </Reorder.Group>
                    )}
                  </div>

                  {/* Duration buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {STEP_DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setBuilderSteps(prev => [...prev, makeStep(d)])}
                        className="py-1.5 rounded-lg text-[11px] font-semibold bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3 transition-colors"
                      >
                        +{formatStepShort(d)}
                      </button>
                    ))}
                  </div>

                  {/* Total time */}
                  {builderSteps.length > 0 && (
                    <p className="text-[10px] text-steel text-center mb-3">
                      Total: {formatTime(builderSteps.reduce((a, s) => a + s.duration, 0))} · {builderSteps.length} steps
                    </p>
                  )}

                  {/* Save & Play buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSequence}
                      disabled={builderSteps.length === 0}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {editingIndex !== null ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        if (builderSteps.length === 0) return;
                        const durations = builderSteps.map(s => s.duration);
                        handleSaveSequence();
                        startSequence(durations);
                        setView('timer');
                      }}
                      disabled={builderSteps.length === 0}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-ember text-white hover:bg-ember-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Play size={12} />
                      {editingIndex !== null ? 'Update & Start' : 'Save & Start'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
