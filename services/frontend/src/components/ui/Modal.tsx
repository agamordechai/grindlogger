import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vpHeight, setVpHeight] = useState<number | null>(null);
  const [vpTop, setVpTop] = useState(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Track visual viewport to stay above the keyboard on mobile
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setVpHeight(vv.height);
      setVpTop(vv.offsetTop);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setVpHeight(null);
      setVpTop(0);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay always covers full screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Container sized to visual viewport so items-end sits above keyboard */}
          <div
            ref={containerRef}
            className="fixed inset-x-0 z-[101] flex items-end lg:items-center justify-center"
            style={{
              top: vpTop,
              height: vpHeight ?? '100dvh',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full lg:max-w-md bg-surface-1 border border-border rounded-t-2xl lg:rounded-2xl p-6 max-h-[85%] overflow-y-auto"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
              >
                <X size={16} />
              </button>

              {title && (
                <div className="mb-4 pr-8">
                  <h2 className="text-lg font-bold text-chalk">{title}</h2>
                  {description && <p className="text-steel text-sm mt-1">{description}</p>}
                </div>
              )}

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
