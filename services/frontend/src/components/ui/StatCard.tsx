import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { itemSlideUp } from '../../lib/motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <motion.div
      variants={itemSlideUp}
      className="card flex flex-col items-center text-center gap-1 p-3 sm:flex-row sm:text-left sm:gap-3 sm:p-4"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 [clip-path:var(--clip-tag)] bg-ember/15 flex items-center justify-center text-ember shrink-0 hidden sm:flex">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-mono font-bold text-chalk truncate leading-none">{value}</p>
        <p className="text-[10px] sm:text-xs text-steel truncate uppercase tracking-widest mt-1">{label}</p>
      </div>
    </motion.div>
  );
}
