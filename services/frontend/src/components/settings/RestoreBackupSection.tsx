import { useRef, useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { importBackup, isBackupData } from '../../db/import';

/**
 * Restore a GrindLogger backup (.json) into the on-device database. Used to
 * bring your existing history onto a fresh install.
 */
export function RestoreBackupSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('importing');
    setMessage('');
    try {
      const data = JSON.parse(await file.text());
      if (!isBackupData(data)) throw new Error('That file is not a valid GrindLogger backup.');
      const counts = await importBackup(data);
      setMessage(
        `Imported ${counts.exercises} exercises, ${counts.workout_sessions} sessions and ` +
          `${counts.body_measurements} measurements. Reloading…`,
      );
      setStatus('done');
      setTimeout(() => window.location.reload(), 1300);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <Upload size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">Restore from Backup</h3>
      </div>
      <p className="text-xs text-steel mb-3">
        Import a GrindLogger backup file (.json). This replaces your current exercises, sessions and
        measurements with the ones in the file.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
      <GlowButton
        onClick={() => inputRef.current?.click()}
        disabled={status === 'importing'}
        className="w-full"
      >
        {status === 'importing' ? (
          <span className="flex items-center gap-2 justify-center">
            <Loader2 size={14} className="animate-spin" />
            Importing…
          </span>
        ) : (
          'Choose Backup File'
        )}
      </GlowButton>
      {message && (
        <div
          className={`mt-3 text-xs rounded-xl px-3 py-2 flex items-center gap-2 ${
            status === 'error' ? 'bg-danger/10 text-danger' : 'bg-ember/10 text-ember'
          }`}
        >
          {status === 'done' && <Check size={14} />}
          {message}
        </div>
      )}
    </div>
  );
}
