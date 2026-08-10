import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { login } from '../../sync/auth';
import { runSync } from '../../sync/engine';
import { getSyncConfig, clearSync } from '../../sync/tokenStore';

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
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formUrl, setFormUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const cfg = await getSyncConfig();
    setConnected(!!(cfg.serverUrl && cfg.refreshToken));
    setServerUrl(cfg.serverUrl);
    setLastSyncedAt(cfg.lastSyncedAt);
  }, []);

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
  }, [refreshStatus]);

  const handleConnect = async () => {
    if (!formUrl.trim() || !email.trim() || !password) {
      setError('Server URL, email and password are all required');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await login(formUrl.trim(), email.trim(), password);
      setPassword('');
      await refreshStatus();
      const result = await runSync();
      if (result.ok) setMessage('Connected and synced.');
      else setError(`Connected, but the first sync failed: ${result.error}`);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setBusy(false);
    }
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
        </div>
      ) : (
        <>
          <p className="text-xs text-steel mb-3">
            Connect to a GrindLogger server to back up and sync this data with other devices. The app
            works fully offline either way — sync is optional. If you edit the same entry on two devices
            around the same time, the most recent edit wins.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="Server URL (e.g. https://grindlogger.example.com)"
              className="input w-full"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="input w-full"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input w-full"
            />
            <GlowButton onClick={handleConnect} disabled={busy} className="w-full">
              {busy ? 'Connecting...' : 'Connect'}
            </GlowButton>
          </div>
        </>
      )}
    </div>
  );
}
