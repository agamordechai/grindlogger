import { useState, useEffect, useCallback } from 'react';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import {
  getCalendarSyncStatus,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  updateCalendarSyncSettings,
} from '../../api/client';

export function CalendarSyncSection() {
  const [connected, setConnected] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getCalendarSyncStatus();
      setConnected(status.connected);
      setEnabled(status.enabled);
    } catch {
      // Silently handle — user may not have calendar feature
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const google = (window as any).google;
    if (!clientId || !google?.accounts?.oauth2) {
      return;
    }

    setConnecting(true);

    const client = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: async (response: { code: string }) => {
        try {
          await connectGoogleCalendar(response.code, window.location.origin);
          await fetchStatus();
        } catch {
          // Error handled by API client
        } finally {
          setConnecting(false);
        }
      },
      ux_mode: 'popup',
    });

    client.requestCode();
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar();
      setConnected(false);
      setEnabled(false);
    } catch {
      // Error handled by API client
    }
  };

  const handleToggleEnabled = async () => {
    try {
      const result = await updateCalendarSyncSettings(null, !enabled);
      setEnabled(result.enabled);
    } catch {
      // Error handled by API client
    }
  };

  // Load the Google Identity Services SDK if not already loaded
  useEffect(() => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  if (loading) {
    return (
      <div className="py-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-ember" />
          <h3 className="text-sm font-bold text-chalk">Google Calendar Sync</h3>
        </div>
        <div className="flex items-center gap-2 text-steel text-xs">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">Google Calendar Sync</h3>
      </div>

      {connected ? (
        <div className="space-y-3">
          {/* Connection status */}
          <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2.5">
            <Check size={14} className="text-green-400" />
            <span className="text-sm text-chalk flex-1">Connected to Google Calendar</span>
            <GlowButton variant="danger" size="sm" onClick={handleDisconnect}>
              Disconnect
            </GlowButton>
          </div>

          {/* Enable/disable toggle */}
          <button
            onClick={handleToggleEnabled}
            className="flex items-center justify-between w-full bg-surface-2 rounded-xl px-3 py-2.5"
          >
            <span className="text-sm text-chalk">Sync workouts to calendar</span>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${
                enabled ? 'bg-ember' : 'bg-zinc-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

          <p className="text-xs text-steel">
            {enabled
              ? 'Workout sessions will be added to your primary Google Calendar.'
              : 'Toggle on to sync workout sessions to your Google Calendar.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-steel mb-3">
            Connect your Google Calendar to automatically add workout events when you log a session.
          </p>
          <GlowButton onClick={handleConnect} disabled={connecting} className="w-full">
            {connecting ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Connecting...
              </span>
            ) : (
              'Connect Google Calendar'
            )}
          </GlowButton>
        </>
      )}
    </div>
  );
}
