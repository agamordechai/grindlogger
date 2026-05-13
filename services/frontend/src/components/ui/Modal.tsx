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
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'relative',
                width: '100%',
                background: '#0a1240',
                border: '3px solid #1c52d6',
                boxShadow: '6px 6px 0 #1438a8',
                padding: 24,
                maxHeight: '85%',
                overflowY: 'auto',
              }}
              className="lg:max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Red accent top-left */}
              <div style={{ position: 'absolute', top: -3, left: -3, width: 48, height: 6, background: '#ff2233' }} />

              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#38d8ff', background: 'transparent',
                  border: '2px solid rgba(56,216,255,.3)',
                  cursor: 'pointer', transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; (e.currentTarget as HTMLElement).style.borderColor = '#38d8ff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#38d8ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.3)'; }}
              >
                <X size={14} />
              </button>

              {title && (
                <div style={{ marginBottom: 16, paddingRight: 32 }}>
                  <h2 style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: '#f4f6ff', margin: 0 }}>{title}</h2>
                  {description && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#38d8ff', marginTop: 4 }}>{description}</p>}
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
