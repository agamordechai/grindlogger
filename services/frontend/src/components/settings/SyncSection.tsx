import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, History } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { useDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { runSync } from '../../sync/engine';
import { showSignIn, signOut } from '../../sync/account';
import { getSyncConfig, clearSync } from '../../sync/tokenStore';
import { latestSnapshot, restoreSnapshot, type SnapshotInfo } from '../../db/snapshot';
import { useAccount, useSyncWaiting } from '../../native/useAccount';

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

export function SyncSection() {
  const { confirm } = useDialog();
  const { user } = useAuth();
  const account = useAccount();
  const waiting = useSyncWaiting();

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLastSyncedAt((await getSyncConfig()).lastSyncedAt);
    setSnapshot(await latestSnapshot());
  }, []);

  useEffect(() => {
    void refreshStatus();
    window.addEventListener('data-synced', refreshStatus);
    return () => window.removeEventListener('data-synced', refreshStatus);
  }, [refreshStatus]);

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

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'This phone keeps all of its data and stops syncing until you sign in again.',
      confirmText: 'Sign out',
      type: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!snapshot) return;
    const ok = await confirm({
      title: 'Restore the data from before signing in?',
      message: `This replaces the data on this phone with the copy taken ${new Date(snapshot.taken_at + 'Z').toLocaleString()} and signs out. The server is not changed.`,
      confirmText: 'Restore and sign out',
      type: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await restoreSnapshot(snapshot.id);
      await clearSync();
      setMessage('Restored and signed out. Reloading...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
      setBusy(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2 mb-4">
      <RefreshCw size={16} className="text-ember" />
      <h3 className="text-sm font-bold text-chalk">Account &amp; Sync</h3>
    </div>
  );

  if (!account) {
    return (
      <div className="py-6 border-b border-border">
        {header}
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
      Restore this phone&apos;s data from before signing in
    </button>
  );

  return (
    <div className="py-6 border-b border-border">
      {header}

      {error && <p className="text-xs text-danger mb-2">{error}</p>}
      {busy && waiting > 0 && (
        <p className="text-xs text-steel mb-2">
          The server limits uploads; continuing in {waiting}s...
        </p>
      )}
      {message && (
        <p className="text-xs text-ember mb-2 flex items-center gap-1.5">
          <Check size={12} /> {message}
        </p>
      )}

      {account.signedIn ? (
        <div className="space-y-3">
          <div className="bg-surface-2 rounded-xl px-3 py-2.5 flex items-center gap-3">
            {user?.picture_url ? (
              <img src={user.picture_url} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-chalk truncate">{user?.name}</p>
              <p className="text-xs text-steel truncate">{user?.email}</p>
              <p className="text-xs text-steel">Last synced: {formatLastSynced(lastSyncedAt)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <GlowButton onClick={handleSyncNow} disabled={busy} className="flex-1">
              {busy ? 'Syncing...' : 'Sync Now'}
            </GlowButton>
            <GlowButton variant="danger" onClick={handleSignOut} disabled={busy}>
              Sign out
            </GlowButton>
          </div>
          {restoreLink}
        </div>
      ) : (
        <>
          <p className="text-xs text-steel mb-3">
            Sign in to your GrindLogger account to back up this data and keep it in sync with the website and your
            other devices. The app works fully offline either way. If you edit the same entry on two devices around
            the same time, the most recent edit wins.
          </p>
          <GlowButton onClick={() => void showSignIn()} className="w-full">
            Sign in
          </GlowButton>
          {restoreLink}
        </>
      )}
    </div>
  );
}
