import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Full-screen card used by the pre-login pages (verify email, forgot / reset password). */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-ember/10 via-background to-arc/5 animate-gradient-mesh" />
      <div className="absolute inset-0 scanlines opacity-[0.12] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, x: -30, skewX: -6 }}
        animate={{ opacity: 1, x: 0, skewX: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm min-w-0"
      >
        <div className="card border-2 border-ember space-y-6 p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 hazard" />
          <div className="text-center">
            <div className="w-14 h-14 [clip-path:var(--clip-shard)] bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center mx-auto mb-4 [filter:drop-shadow(3px_3px_0_#000)]">
              <Flame size={24} className="text-void" />
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wide text-chalk">{title}</h1>
            {subtitle && <p className="text-steel text-sm mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Hard navigation back to the app root (re-reads the stored session). */
export function goHome() {
  window.location.assign('/');
}
