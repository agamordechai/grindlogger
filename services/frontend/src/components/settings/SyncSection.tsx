import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, History } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { useDialog } from '../ui/ConfirmDialog';
import { signIn, signUp, normalizeUrl, type SyncSession } from '../../sync/auth';
import { runSync } from '../../sync/engine';
import {
  applyFirstConnect,
  preparePlan,
  sumCounts,
  type ConnectAction,
  type ConnectSummary,
  type Counts,
  type FirstConnectPlan,
} from '../../sync/firstConnect';
import { getSyncConfig, clearSync } from '../../sync/tokenStore';
import { latestSnapshot, restoreSnapshot, type SnapshotInfo } from '../../db/snapshot';

const DEFAULT_SERVER_URL = 'https://grindlogger.com/api';

function formatLastSynced(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString();
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "12 exercises, 40 sessions" — skipping zeros. */
function describeCounts(c: Counts): string {
  const parts = [
    c.exercises > 0 ? plural(c.exercises, 'exercise', 'exercises') : null,
    c.sessions > 0 ? plural(c.sessions, 'session', 'sessions') : null,
    c.measurements > 0 ? plural(c.measurements, 'measurement', 'measurements') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'nothing';
}

function summarize(s: ConnectSummary): string {
  const parts: string[] = [];
  if (sumCounts(s.downloaded) > 0) parts.push(`Fetched ${describeCounts(s.downloaded)}`);
  if (sumCounts(s.uploaded) > 0) parts.push(`uploaded ${describeCounts(s.uploaded)}`);
  if (sumCounts(s.linked) > 0) parts.push(`matched ${describeCounts(s.linked)} already on both`);
  if (parts.length === 0) return 'Connected. There was no data to sync yet.';
  const text = parts.join('; ');
  return `Connected. ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

type Mode = 'signin' | 'register';

export function SyncSection() {
  const { confirm } = useDialog();

  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>('signin');
  const [formUrl, setFormUrl] = useState(DEFAULT_SERVER_URL);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Set while the user is deciding how to combine the phone's data with a non-empty account.
  const [pending, setPending] = useState<{ session: SyncSession; plan: FirstConnectPlan } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const cfg = await getSyncConfig();
    setConnected(!!(cfg.serverUrl && cfg.refreshToken));
    setServerUrl(cfg.serverUrl);
    setLastSyncedAt(cfg.lastSyncedAt);
    setSnapshot(await latestSnapshot());
  }, []);

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
  }, [refreshStatus]);

  const finishConnect = async (session: SyncSession, plan: FirstConnectPlan, action: ConnectAction) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const summary = await applyFirstConnect(session, plan, action);
      setPending(null);
      setPassword('');
      if (summary.syncError) {
        setError(`Connected, but the first sync did not finish: ${summary.syncError}. It will retry automatically.`);
      } else {
        setMessage(summarize(summary));
      }
      window.dispatchEvent(new Event('data-synced'));
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    if (!formUrl.trim() || !email.trim() || !password || (mode === 'register' && !name.trim())) {
      setError(
        mode === 'register'
          ? 'Server URL, name, email and password are all required'
          : 'Server URL, email and password are all required',
      );
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const url = normalizeUrl(formUrl);
      const session =
        mode === 'register'
          ? await signUp(url, email.trim(), name.trim(), password)
          : await signIn(url, email.trim(), password);
      const plan = await preparePlan(session);

      if (plan.scenario === 'merge') {
        // Both sides hold data: let the user confirm before anything is changed or saved.
        setPending({ session, plan });
        setPassword('');
        setBusy(false);
        return;
      }
      await finishConnect(session, plan, 'merge');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setBusy(false);
    }
  };

  const handleAdvanced = async (action: Exclude<ConnectAction, 'merge'>) => {
    if (!pending) return;
    const { plan, session } = pending;
    const replace = action === 'replace-local';
    const ok = await confirm({
      title: replace ? 'Replace this phone\'s data?' : 'Overwrite the server\'s data?',
      message: replace
        ? `This deletes ${describeCounts(plan.local)} on this phone and downloads ${describeCounts(plan.remote)} from the server. A copy of the phone's data is kept so you can restore it.`
        : `This permanently deletes ${describeCounts(plan.remote)} on the server (your website data) and uploads ${describeCounts(plan.local)} from this phone. This cannot be undone.`,
      confirmText: replace ? 'Replace phone data' : 'Overwrite server',
      type: 'danger',
    });
    if (ok) await finishConnect(session, plan, action);
  };

  const handleCancelPending = () => {
    setPending(null);
    setMessage(null);
    setError(null);
  };

  const handleSyncNow = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await runSync();
      if (result.ok) setMessage('Synced.');
      else setError(result.error ?? 'Sync failed');
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: 'Disconnect from the server?',
      message:
        'This phone keeps all of its data and stops syncing. If you connect again later, your data is matched against the account again.',
      confirmText: 'Disconnect',
      type: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await clearSync();
      await refreshStatus();
      setMessage(null);
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!snapshot) return;
    const ok = await confirm({
      title: 'Restore the data from before connecting?',
      message: `This replaces the data on this phone with the copy taken ${new Date(snapshot.taken_at + 'Z').toLocaleString()} and disconnects from the server. The server is not changed.`,
      confirmText: 'Restore and disconnect',
      type: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await restoreSnapshot(snapshot.id);
      await clearSync();
      setMessage('Restored and disconnected. Reloading...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="text-ember" />
          <h3 className="text-sm font-bold text-chalk">Data Sync</h3>
        </div>
        <p className="text-xs text-steel">Loading...</p>
      </div>
    );
  }

  const restoreLink = snapshot && (
    <button
      type="button"
      onClick={handleRestoreSnapshot}
      disabled={busy}
      className="flex items-center gap-1.5 text-xs text-steel hover:text-chalk transition-colors mt-3 disabled:opacity-60"
    >
      <History size={12} />
      Restore this phone&apos;s data from before connecting
    </button>
  );

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">Data Sync</h3>
      </div>

      {error && <p className="text-xs text-danger mb-2">{error}</p>}
      {message && (
        <p className="text-xs text-ember mb-2 flex items-center gap-1.5">
          <Check size={12} /> {message}
        </p>
      )}

      {connected ? (
        <div className="space-y-3">
          <div className="bg-surface-2 rounded-xl px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-steel">Server:</span>
              <code className="text-xs text-chalk font-mono truncate">{serverUrl}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-steel">Last synced:</span>
              <span className="text-xs text-chalk">{formatLastSynced(lastSyncedAt)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <GlowButton onClick={handleSyncNow} disabled={busy} className="flex-1">
              {busy ? 'Syncing...' : 'Sync Now'}
            </GlowButton>
            <GlowButton variant="danger" onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </GlowButton>
          </div>
          {restoreLink}
        </div>
      ) : pending ? (
        <MergePreview
          plan={pending.plan}
          busy={busy}
          onMerge={() => finishConnect(pending.session, pending.plan, 'merge')}
          onCancel={handleCancelPending}
          onAdvanced={handleAdvanced}
        />
      ) : (
        <>
          <p className="text-xs text-steel mb-3">
            Connect to your GrindLogger account to back up this data and keep it in sync with the website and your
            other devices. The app works fully offline either way — sync is optional. If you edit the same entry on two
            devices around the same time, the most recent edit wins.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              {(['signin', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    mode === m
                      ? 'bg-ember text-white'
                      : 'bg-surface-2 text-steel border border-border hover:text-chalk'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="Server URL"
              autoCapitalize="none"
              autoCorrect="off"
              className="input w-full"
            />
            {mode === 'register' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                autoComplete="name"
                className="input w-full"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoComplete="email"
              className="input w-full"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="input w-full"
            />
            <GlowButton onClick={handleConnect} disabled={busy} className="w-full">
              {busy ? 'Connecting...' : mode === 'register' ? 'Create account & connect' : 'Connect'}
            </GlowButton>
          </div>
          {restoreLink}
        </>
      )}
    </div>
  );
}

interface MergePreviewProps {
  plan: FirstConnectPlan;
  busy: boolean;
  onMerge: () => void;
  onCancel: () => void;
  onAdvanced: (action: Exclude<ConnectAction, 'merge'>) => void;
}

function MergePreview({ plan, busy, onMerge, onCancel, onAdvanced }: MergePreviewProps) {
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
