import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { GlowButton } from '../ui/GlowButton';
import type { BodyMeasurement, CreateBodyMeasurement } from '../../types/measurement';

interface MetricField {
  key: keyof CreateBodyMeasurement;
  label: string;
  unit: string;
  step: string;
}

// Basic mode fields — combined biceps & thighs use virtual keys (_biceps, _thighs)
const BASIC_FIELDS: { key: string; label: string; unit: string; step: string }[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', step: '0.1' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', step: '0.1' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', step: '0.1' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', step: '0.1' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', step: '0.1' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm', step: '0.1' },
  { key: '_biceps', label: 'Biceps', unit: 'cm', step: '0.1' },
  { key: '_thighs', label: 'Thighs', unit: 'cm', step: '0.1' },
];

// Advanced mode — all individual fields
const ADVANCED_FIELDS: MetricField[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', step: '0.1' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', step: '0.1' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', step: '0.1' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', step: '0.1' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', step: '0.1' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm', step: '0.1' },
  { key: 'neck_cm', label: 'Neck', unit: 'cm', step: '0.1' },
  { key: 'bicep_left_cm', label: 'Bicep (L)', unit: 'cm', step: '0.1' },
  { key: 'bicep_right_cm', label: 'Bicep (R)', unit: 'cm', step: '0.1' },
  { key: 'forearm_cm', label: 'Forearm', unit: 'cm', step: '0.1' },
  { key: 'thigh_left_cm', label: 'Thigh (L)', unit: 'cm', step: '0.1' },
  { key: 'thigh_right_cm', label: 'Thigh (R)', unit: 'cm', step: '0.1' },
  { key: 'calf_cm', label: 'Calf', unit: 'cm', step: '0.1' },
];

// All real DB fields — used for export to page
export const METRIC_FIELDS: MetricField[] = ADVANCED_FIELDS;

/** Average two nullable numbers: both → avg, one → that one, neither → null */
function avg(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a != null && b != null) return Math.round(((a + b) / 2) * 10) / 10;
  return a ?? b ?? null;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Compute display rows for a measurement in history (smart combined fields). */
export function getDisplayFields(m: BodyMeasurement): { label: string; value: number; unit: string }[] {
  const rows: { label: string; value: number; unit: string }[] = [];
  const push = (label: string, v: number | null, unit: string) => {
    if (v != null) rows.push({ label, value: v, unit });
  };

  push('Weight', m.weight_kg, 'kg');
  push('Body Fat', m.body_fat_pct, '%');
  push('Chest', m.chest_cm, 'cm');
  push('Waist', m.waist_cm, 'cm');
  push('Hips', m.hips_cm, 'cm');
  push('Shoulders', m.shoulders_cm, 'cm');
  push('Neck', m.neck_cm, 'cm');

  // Biceps: show combined if both equal, L/R separately if different, or single if only one
  const bL = m.bicep_left_cm;
  const bR = m.bicep_right_cm;
  if (bL != null && bR != null && bL === bR) {
    push('Biceps', bL, 'cm');
  } else {
    push('Bicep (L)', bL, 'cm');
    push('Bicep (R)', bR, 'cm');
  }

  push('Forearm', m.forearm_cm, 'cm');

  // Thighs: same logic
  const tL = m.thigh_left_cm;
  const tR = m.thigh_right_cm;
  if (tL != null && tR != null && tL === tR) {
    push('Thighs', tL, 'cm');
  } else {
    push('Thigh (L)', tL, 'cm');
    push('Thigh (R)', tR, 'cm');
  }

  push('Calf', m.calf_cm, 'cm');
  return rows;
}

interface LogMeasurementSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBodyMeasurement) => Promise<void>;
  editMeasurement?: BodyMeasurement | null;
}

export function LogMeasurementSheet({ open, onClose, onSubmit, editMeasurement }: LogMeasurementSheetProps) {
  const [formDate, setFormDate] = useState(todayISO());
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      if (editMeasurement) {
        setFormDate(editMeasurement.date);
        const vals: Record<string, string> = {};

        // Populate real fields
        for (const f of ADVANCED_FIELDS) {
          const v = editMeasurement[f.key as keyof BodyMeasurement];
          if (v != null) vals[f.key] = String(v);
        }

        // Populate virtual combined fields from avg
        const bicepsAvg = avg(editMeasurement.bicep_left_cm, editMeasurement.bicep_right_cm);
        if (bicepsAvg != null) vals._biceps = String(bicepsAvg);
        const thighsAvg = avg(editMeasurement.thigh_left_cm, editMeasurement.thigh_right_cm);
        if (thighsAvg != null) vals._thighs = String(thighsAvg);

        setFormValues(vals);
        setFormNotes(editMeasurement.notes || '');

        // Auto-enable advanced if entry has advanced-only fields
        const hasAdvancedData =
          editMeasurement.neck_cm != null ||
          editMeasurement.forearm_cm != null ||
          editMeasurement.calf_cm != null ||
          (editMeasurement.bicep_left_cm != null &&
            editMeasurement.bicep_right_cm != null &&
            editMeasurement.bicep_left_cm !== editMeasurement.bicep_right_cm) ||
          (editMeasurement.thigh_left_cm != null &&
            editMeasurement.thigh_right_cm != null &&
            editMeasurement.thigh_left_cm !== editMeasurement.thigh_right_cm);
        setAdvanced(!!hasAdvancedData);
      } else {
        setFormDate(todayISO());
        setFormValues({});
        setFormNotes('');
        setAdvanced(false);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: CreateBodyMeasurement = { date: formDate, notes: formNotes || null };

      if (advanced) {
        // Advanced: read all individual fields directly
        for (const f of ADVANCED_FIELDS) {
          const val = formValues[f.key];
          (data as any)[f.key] = val ? parseFloat(val) : null;
        }
      } else {
        // Basic: read shared fields, then expand virtual biceps/thighs to both L/R
        for (const f of BASIC_FIELDS) {
          if (f.key.startsWith('_')) continue; // skip virtual keys
          const val = formValues[f.key];
          (data as any)[f.key] = val ? parseFloat(val) : null;
        }
        if (formValues._biceps) {
          const v = parseFloat(formValues._biceps);
          data.bicep_left_cm = v;
          data.bicep_right_cm = v;
        }
        if (formValues._thighs) {
          const v = parseFloat(formValues._thighs);
          data.thigh_left_cm = v;
          data.thigh_right_cm = v;
        }
      }

      await onSubmit(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fields = advanced ? ADVANCED_FIELDS : BASIC_FIELDS;
  const hasAnyValue = Object.entries(formValues).some(
    ([, v]) => v !== undefined && v !== '',
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editMeasurement ? 'Edit Measurement' : 'Log Measurement'}
      description={editMeasurement ? 'Update this measurement entry' : 'Record your body measurements'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Date</label>
          <input
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Advanced toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-chalk font-medium">{advanced ? 'Advanced' : 'Basic'}</p>
            <p className="text-xs text-steel mt-0.5">
              {advanced ? 'Individual L/R, neck, forearm, calf' : 'Combined biceps & thighs'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdvanced(v => !v)}
            className="relative w-12 h-7 rounded-full transition-colors duration-200"
            style={{
              background: advanced
                ? 'var(--color-ember)'
                : 'var(--color-surface-3)',
            }}
            aria-label="Toggle advanced measurements"
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{
                transform: advanced ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {/* Measurement fields */}
        <div className="grid grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] text-steel mb-1">
                {f.label} <span className="text-steel/50">({f.unit})</span>
              </label>
              <input
                type="number"
                step={f.step}
                min="0"
                value={formValues[f.key] ?? ''}
                onChange={e =>
                  setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))
                }
                placeholder="—"
                className="input w-full font-mono text-sm"
              />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-steel mb-1.5">Notes</label>
          <textarea
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            maxLength={500}
            placeholder="Optional notes..."
            rows={2}
            className="input resize-none"
          />
        </div>

        <GlowButton type="submit" disabled={saving || !hasAnyValue} className="w-full">
          <Check size={16} />
          {saving ? 'Saving...' : editMeasurement ? 'Save Changes' : 'Save Measurement'}
        </GlowButton>
      </form>
    </Modal>
  );
}
