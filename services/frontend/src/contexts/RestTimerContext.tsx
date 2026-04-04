import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

// ─── Audio Engine ───
// Mobile browsers block AudioContext unless it's created/resumed during a user
// gesture. We create it once on the first tap (start), play a silent buffer to
// "unlock" it, then reuse it for the chime when the timer fires.

let audioCtx: AudioContext | null = null;

async function getAudioContext(): Promise<AudioContext | null> {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    // Resume if suspended (happens after tab backgrounding on mobile browsers).
    // Must be awaited — oscillators started before resume completes produce silence.
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Unlock audio on user gesture — play a silent buffer so the context is "warm" */
async function unlockAudio() {
  const ctx = await getAudioContext();
  if (!ctx) return;
  // Play a silent buffer to satisfy the user-gesture requirement
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

/** Play a two-tone chime using the pre-unlocked AudioContext */
async function playChime() {
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First tone — A5
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc1.start(now);
  osc1.stop(now + 0.5);

  // Second tone — D6
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1174.66, now + 0.15);
  gain2.gain.setValueAtTime(0.3, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.65);
}

/** Play a short single beep for step transitions */
async function playBeep() {
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046.5, now); // C6
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ─── Notifications ───

async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function showNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Prefer service worker notifications — they surface on the lock screen.
  // The Notification() constructor is foreground-only and will be delayed until
  // the user unlocks their phone.
  const swReg = await navigator.serviceWorker?.ready.catch(() => null);
  if (swReg) {
    swReg.showNotification('Rest Over', {
      body: 'Get back to it! 💪',
      icon: '/favicon-192.png',
      tag: 'rest-timer',
      requireInteraction: false,
    });
  } else {
    try {
      new Notification('Rest Over', {
        body: 'Get back to it! 💪',
        icon: '/favicon-192.png',
        tag: 'rest-timer',
        requireInteraction: false,
      });
    } catch {
      // Notification API unavailable
    }
  }
}

// ─── Vibration ───
// navigator.vibrate() also requires a recent user gesture on many mobile
// browsers. We "prime" it by calling vibrate(1) on start, which is imperceptible
// but satisfies the gesture requirement so the real vibration fires later.

function primeVibration() {
  if (navigator.vibrate) {
    navigator.vibrate(1);
  }
}

function vibrate() {
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

// ─── Context ───

interface RestTimerContextType {
  remaining: number;
  total: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  /** Sequence steps (empty for single timer) */
  steps: number[];
  /** Current step index within the sequence (0-based) */
  currentStepIndex: number;
  start: (seconds: number) => void;
  startSequence: (steps: number[]) => void;
  pause: () => void;
  resume: () => void;
  extend: (seconds: number) => void;
  skip: () => void;
  dismissFinished: () => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState<number[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const stepsRef = useRef<number[]>([]);
  const stepIndexRef = useRef(0);
  const pausedRemainingRef = useRef<number>(0);
  const notifyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  /** Schedule a notification via setTimeout for the exact end time.
   *  On iOS, setInterval gets throttled when backgrounded/locked but a
   *  single setTimeout scheduled while the page was still active has a
   *  much better chance of firing on time. */
  const scheduleNotification = useCallback((ms: number) => {
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    notifyTimeoutRef.current = setTimeout(() => {
      showNotification();
      vibrate();
    }, ms);
  }, []);

  const clearScheduledNotification = useCallback(() => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
      notifyTimeoutRef.current = undefined;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const tick = useCallback(() => {
    const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);

    if (left <= 0) {
      const hasMoreSteps =
        stepsRef.current.length > 0 &&
        stepIndexRef.current < stepsRef.current.length - 1;

      if (hasMoreSteps) {
        // Advance to next step — keep interval running
        const nextIndex = stepIndexRef.current + 1;
        stepIndexRef.current = nextIndex;
        setCurrentStepIndex(nextIndex);

        const nextDuration = stepsRef.current[nextIndex];
        setTotal(nextDuration);
        setRemaining(nextDuration);
        endTimeRef.current = Date.now() + nextDuration * 1000;

        // Schedule notification for remaining steps
        const remainingMs = stepsRef.current.slice(nextIndex).reduce((a, s) => a + s, 0) * 1000;
        scheduleNotification(remainingMs);

        // Short beep for step transition
        if (!document.hidden) playBeep();
        vibrate();
      } else {
        // Final step or single timer — done
        clearTimer();
        clearScheduledNotification();
        setRunning(false);
        setFinished(true);

        if (!document.hidden) {
          playChime();
        }
        vibrate();
        showNotification();
      }
    }
  }, [clearTimer]);

  const start = useCallback((seconds: number) => {
    clearTimer();
    setFinished(false);
    setPaused(false);
    setSteps([]);
    stepsRef.current = [];
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
    endTimeRef.current = Date.now() + seconds * 1000;
    intervalRef.current = setInterval(tick, 250);

    // Pre-schedule notification so it fires even if the browser throttles setInterval
    scheduleNotification(seconds * 1000);

    // Unlock audio + vibration during this user gesture so they work when timer fires
    unlockAudio();
    primeVibration();
    ensureNotificationPermission();
  }, [clearTimer, tick, scheduleNotification]);

  const startSequence = useCallback((seq: number[]) => {
    if (seq.length === 0) return;
    clearTimer();
    setFinished(false);
    setPaused(false);

    stepsRef.current = seq;
    stepIndexRef.current = 0;
    setSteps(seq);
    setCurrentStepIndex(0);

    const firstDuration = seq[0];
    setTotal(firstDuration);
    setRemaining(firstDuration);
    setRunning(true);
    endTimeRef.current = Date.now() + firstDuration * 1000;
    intervalRef.current = setInterval(tick, 250);

    // Pre-schedule notification for the total sequence duration
    const totalMs = seq.reduce((a, s) => a + s, 0) * 1000;
    scheduleNotification(totalMs);

    unlockAudio();
    primeVibration();
    ensureNotificationPermission();
  }, [clearTimer, tick, scheduleNotification]);

  const pause = useCallback(() => {
    if (!running || paused) return;
    clearTimer();
    clearScheduledNotification();
    // Snapshot the remaining ms so resume can rebuild endTime
    pausedRemainingRef.current = Math.max(0, endTimeRef.current - Date.now());
    setPaused(true);
  }, [running, paused, clearTimer, clearScheduledNotification]);

  const resume = useCallback(() => {
    if (!paused) return;
    endTimeRef.current = Date.now() + pausedRemainingRef.current;
    intervalRef.current = setInterval(tick, 250);
    scheduleNotification(pausedRemainingRef.current);
    setPaused(false);
  }, [paused, tick, scheduleNotification]);

  const extend = useCallback((seconds: number) => {
    if (!running) return;
    endTimeRef.current += seconds * 1000;
    setTotal(prev => prev + seconds);
    // Reschedule notification for new end time
    const msLeft = Math.max(0, endTimeRef.current - Date.now());
    scheduleNotification(msLeft);
    tick();
  }, [running, tick, scheduleNotification]);

  const skip = useCallback(() => {
    clearTimer();
    clearScheduledNotification();
    setRunning(false);
    setPaused(false);
    setRemaining(0);
    setTotal(0);
    setFinished(false);
    setSteps([]);
    stepsRef.current = [];
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);
  }, [clearTimer, clearScheduledNotification]);

  const dismissFinished = useCallback(() => {
    setFinished(false);
    setPaused(false);
    setRemaining(0);
    setTotal(0);
    setSteps([]);
    stepsRef.current = [];
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);
  }, []);

  useEffect(() => () => { clearTimer(); clearScheduledNotification(); }, [clearTimer, clearScheduledNotification]);

  return (
    <RestTimerContext.Provider value={{
      remaining, total, running, paused, finished,
      steps, currentStepIndex,
      start, startSequence, pause, resume, extend, skip, dismissFinished,
    }}>
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimer must be used within RestTimerProvider');
  return ctx;
}
