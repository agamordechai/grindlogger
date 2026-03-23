import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from 'lucide-react';
import { useRestTimer } from '../../contexts/RestTimerContext';

const PRESETS = [30, 60, 90, 120];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestTimerButton() {
  const { remaining, total, running, finished, start, extend, skip, dismissFinished } = useRestTimer();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // Use timeout to avoid the opening click triggering close
    const id = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handleClick);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-open popup when timer finishes
  useEffect(() => {
    if (finished) setOpen(true);
  }, [finished]);

  const progress = total > 0 ? remaining / total : 0;

  // SVG circle properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div ref={containerRef} className="relative">
      {/* Timer icon button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`relative flex items-center gap-1.5 h-8 rounded-full px-2 transition-colors ${
          running
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
            className="absolute right-0 top-full mt-2 w-64 bg-surface-1 border border-border rounded-2xl p-5 shadow-xl shadow-black/30 z-[60]"
          >
            {/* Timer display */}
            <div className="flex flex-col items-center mb-4">
              <p className="text-xs font-medium text-steel mb-3 uppercase tracking-wider">Rest Timer</p>

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
                      className={finished ? 'text-success' : 'text-ember'}
                    />
                  )}
                </svg>
                <span className={`text-2xl font-bold font-mono ${
                  finished ? 'text-success' : running ? 'text-chalk' : 'text-steel'
                }`}>
                  {finished ? '0:00' : running ? formatTime(remaining) : '0:00'}
                </span>
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
                    running && total === s && remaining > 0
                      ? 'bg-ember text-white'
                      : 'bg-surface-2 text-steel hover:text-chalk hover:bg-surface-3'
                  }`}
                >
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {running && (
                <>
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
      </AnimatePresence>
    </div>
  );
}
