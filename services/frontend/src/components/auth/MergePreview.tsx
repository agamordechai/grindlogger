import { GlowButton } from '../ui/GlowButton';
import { sumCounts, type ConnectAction, type ConnectSummary, type Counts, type FirstConnectPlan } from '../../sync/firstConnect';

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "12 exercises, 40 sessions" — skipping zeros. */
export function describeCounts(c: Counts): string {
  const parts = [
    c.exercises > 0 ? plural(c.exercises, 'exercise', 'exercises') : null,
    c.sessions > 0 ? plural(c.sessions, 'session', 'sessions') : null,
    c.measurements > 0 ? plural(c.measurements, 'measurement', 'measurements') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'nothing';
}

export function summarize(s: ConnectSummary): string {
  const parts: string[] = [];
  if (sumCounts(s.downloaded) > 0) parts.push(`Fetched ${describeCounts(s.downloaded)}`);
  if (sumCounts(s.uploaded) > 0) parts.push(`uploaded ${describeCounts(s.uploaded)}`);
  if (sumCounts(s.linked) > 0) parts.push(`matched ${describeCounts(s.linked)} already on both`);
  if (parts.length === 0) return 'Signed in. There was no data to sync yet.';
  const text = parts.join('; ');
  return `Signed in. ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

interface MergePreviewProps {
  plan: FirstConnectPlan;
  busy: boolean;
  onMerge: () => void;
  onCancel: () => void;
  onAdvanced: (action: Exclude<ConnectAction, 'merge'>) => void;
}

/** Shown on first sign-in when both this phone and the account already hold data. */
export function MergePreview({ plan, busy, onMerge, onCancel, onAdvanced }: MergePreviewProps) {
  const rows: { label: string; key: keyof Counts }[] = [
    { label: 'Exercises', key: 'exercises' },
    { label: 'Workouts', key: 'sessions' },
    { label: 'Measurements', key: 'measurements' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-steel">
        Both this phone and your account already have data. Merging keeps everything from both sides: items that are
        only here are uploaded, items that are only on the server are downloaded, and items that are on both keep
        the server&apos;s version. A copy of this phone&apos;s data is saved first.
      </p>

      <div className="bg-surface-2 rounded-xl px-3 py-2.5">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-xs">
          <span />
          <span className="text-steel text-right">Phone</span>
          <span className="text-steel text-right">Server</span>
          <span className="text-steel text-right">Both</span>
          {rows.map(({ label, key }) => (
            <div key={key} className="contents">
              <span className="text-chalk">{label}</span>
              <span className="text-chalk text-right">{plan.local[key]}</span>
              <span className="text-chalk text-right">{plan.remote[key]}</span>
              <span className="text-chalk text-right">{plan.matched[key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <GlowButton onClick={onMerge} disabled={busy} className="flex-1">
          {busy ? 'Merging...' : 'Merge'}
        </GlowButton>
        <GlowButton variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </GlowButton>
      </div>

      <details className="text-xs">
        <summary className="text-steel cursor-pointer hover:text-chalk">Advanced options</summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-steel mb-2">
              Use the server&apos;s data only. This phone&apos;s {describeCounts(plan.local)} will be deleted from the
              phone (a copy is kept).
            </p>
            <GlowButton variant="danger" size="sm" onClick={() => onAdvanced('replace-local')} disabled={busy}>
              Replace phone data with server
            </GlowButton>
          </div>
          <div>
            <p className="text-steel mb-2">
              Use this phone&apos;s data only. The server&apos;s {describeCounts(plan.remote)} will be permanently
              deleted, including what you entered on the website.
            </p>
            <GlowButton variant="danger" size="sm" onClick={() => onAdvanced('overwrite-server')} disabled={busy}>
              Overwrite server with phone data
            </GlowButton>
          </div>
        </div>
      </details>
    </div>
  );
}
