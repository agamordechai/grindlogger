import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X } from 'lucide-react';

type DialogType = 'confirm' | 'alert' | 'danger';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextValue {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: Omit<DialogOptions, 'cancelText'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

interface DialogState extends DialogOptions {
  resolve: (value: boolean) => void;
  isAlert: boolean;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const showConfirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve, isAlert: false });
    });
  }, []);

  const showAlert = useCallback((options: Omit<DialogOptions, 'cancelText'>): Promise<void> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        resolve: () => resolve(),
        isAlert: true,
      });
    });
  }, []);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const type = dialog?.type ?? 'confirm';
  const iconColor = type === 'danger' ? 'text-danger' : type === 'alert' ? 'text-ember' : 'text-ember';
  const confirmColor = type === 'danger' ? 'btn-danger' : 'btn-ember';

  return (
    <DialogContext.Provider value={{ confirm: showConfirm, alert: showAlert }}>
      {children}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handleClose(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-[calc(100%-2rem)] max-w-sm bg-surface-1 border border-ember/60 rounded-2xl p-6 shadow-2xl"
            >
              <button
                onClick={() => handleClose(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
              >
                <X size={14} />
              </button>

              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  type === 'danger' ? 'bg-danger/15' : 'bg-ember/15'
                }`}>
                  {type === 'danger' ? (
                    <AlertTriangle size={20} className={iconColor} />
                  ) : (
                    <Info size={20} className={iconColor} />
                  )}
                </div>
                <div className="pr-6">
                  <h3 className="text-sm font-bold text-chalk">{dialog.title}</h3>
                  <p className="text-xs text-steel mt-1 leading-relaxed">{dialog.message}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!dialog.isAlert && (
                  <button
                    onClick={() => handleClose(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {dialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={() => handleClose(true)}
                  className={`btn ${dialog.isAlert ? 'btn-ember' : confirmColor} flex-1`}
                  autoFocus
                >
                  {dialog.confirmText || (dialog.isAlert ? 'OK' : 'Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
