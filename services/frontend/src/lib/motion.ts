import type { Variants, Transition } from 'framer-motion';

/* ─── Kinetic motion presets (Persona-style slash / impact) ─── */

// Snappy overshoot easing used across page + element reveals
export const kineticEase = [0.16, 1, 0.3, 1] as const;

// Page transition — shear-slam in, slash out
export const pageVariants: Variants = {
  initial: { opacity: 0, x: -28, skewX: -6 },
  animate: { opacity: 1, x: 0, skewX: 0 },
  exit: { opacity: 0, x: 20, skewX: 4 },
};

export const pageTransition: Transition = {
  duration: 0.28,
  ease: kineticEase,
};

// Alias for readability at call sites
export const pageSlash = pageVariants;

export const containerStagger: Variants = {
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const shardStagger = containerStagger;

// List item — slashes in from the left
export const itemSlideUp: Variants = {
  initial: { opacity: 0, x: -20, skewX: -8 },
  animate: { opacity: 1, x: 0, skewX: 0, transition: { duration: 0.28, ease: kineticEase } },
};

// Heading / label — clip-path wipe reveal
export const slashIn: Variants = {
  initial: { opacity: 0, clipPath: 'inset(0 100% 0 0)', x: -12 },
  animate: {
    opacity: 1,
    clipPath: 'inset(0 0% 0 0)',
    x: 0,
    transition: { duration: 0.35, ease: kineticEase },
  },
};

// Impact hit — fire when a set / workout is logged
export const impactHit: Variants = {
  rest: { x: 0, y: 0, rotate: 0 },
  hit: {
    x: [0, -4, 4, -3, 2, 0],
    y: [0, 2, -2, 1, -1, 0],
    rotate: [0, -0.6, 0.6, -0.4, 0.3, 0],
    transition: { duration: 0.4, ease: [0.36, 0.07, 0.19, 0.97] },
  },
};

export const tapScale = { scale: 0.96 };

export const expandCollapse: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: { height: 'auto', opacity: 1, overflow: 'hidden' },
};

export const navSpring: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 32,
};
