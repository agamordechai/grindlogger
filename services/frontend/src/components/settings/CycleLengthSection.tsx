import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GlowButton } from '../ui/GlowButton';
import { useDialog } from '../ui/ConfirmDialog';
import { listExercises, archiveExercise } from '../../api/client';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function CycleLengthSection() {
  const { user, updateProfile } = useAuth();
  const { confirm } = useDialog();
  const [length, setLength] = useState<number>(user?.cycle_length ?? 7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const currentLength = user?.cycle_length ?? 7;

    if (length < currentLength) {
      const removedDays = Array.from(
        { length: currentLength - length },
        (_, i) => LETTERS[length + i]
      );

      const confirmed = await confirm({
        title: 'Shorten split?',
        message: `Days ${removedDays.join(', ')} will be removed. Any exercises on those days will be archived and can be restored later.`,
        confirmText: 'Shorten split',
        type: 'danger',
      });
      if (!confirmed) return;

      setSaving(true);
      setError(null);
      setSaved(false);
      try {
        const { items } = await listExercises({ page_size: 200 });
        const affected = items.filter(ex => removedDays.includes(ex.workout_day));
        if (affected.length > 0) {
          await Promise.all(affected.map(ex => archiveExercise(ex.id)));
        }
        await updateProfile({ cycle_length: length });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      setError(null);
      setSaved(false);
      try {
        await updateProfile({ cycle_length: length });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    }
  };

  const previewDays = Array.from({ length }, (_, i) => LETTERS[i]).join(', ');

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <Repeat size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">Training Split</h3>
      </div>
      <p className="text-xs text-steel mb-4">
        Set how many training days are in your split (1–14). Days are labelled A, B, C… "Daily" is always available.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => { setLength(n); setSaved(false); }}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              length === n
                ? 'bg-ember text-white shadow-lg shadow-ember/20'
                : 'bg-surface-2 text-steel border border-border hover:text-chalk'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-steel">
        Active days: <span className="text-chalk">{previewDays}, Daily</span>
      </p>

      <div className="mt-4">
        <GlowButton size="sm" onClick={handleSave} disabled={saving || length === user?.cycle_length}>
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </GlowButton>
      </div>
    </div>
  );
}
