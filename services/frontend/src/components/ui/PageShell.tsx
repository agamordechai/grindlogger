import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/motion';
import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageShell({ children, className = '', noPadding = false }: PageShellProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={`${noPadding ? '' : 'page-content'} ${className}`}
    >
      {children}
    </motion.div>
  );
}
