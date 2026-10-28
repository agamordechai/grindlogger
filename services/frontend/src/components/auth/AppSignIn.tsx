import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthShell } from './AuthShell';
import { MergePreview, describeCounts } from './MergePreview';
import { useDialog } from '../ui/ConfirmDialog';
import { requestPasswordReset, signIn, signUp, type SyncSession } from '../../sync/auth';
import { applyFirstConnect, preparePlan, type ConnectAction, type FirstConnectPlan } from '../../sync/firstConnect';
import { markSignedIn, skipSignIn } from '../../sync/account';
import { useSyncWaiting } from '../../native/useAccount';

type Mode = 'signin' | 'register' | 'forgot';

/**
 * Native app sign-in screen: signs in to the GrindLogger account (the one sync server) and links this
 * phone's data to it. The app also works without an account.
 */
export default function AppSignIn() {
  const { confirm } = useDialog();
  const waiting = useSyncWaiting();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Set while the user decides how to combine the phone's data with a non-empty account.
  const [pending, setPending] = useState<{ session: SyncSession; plan: FirstConnectPlan } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    setConfirmPassword('');
  };

  const finishConnect = async (session: SyncSession, plan: FirstConnectPlan, action: ConnectAction) => {
    setBusy(true);
    setError(null);
    try {
      // The first sync can take a while for a long history; it keeps retrying in the background if it fails.
      await applyFirstConnect(session, plan, action);
      window.dispatchEvent(new Event('data-synced'));
      await markSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign in');
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'forgot') {
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        setNotice('If that email has an account, a reset link is on its way. Set the new password, then sign in here.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const session =
        mode === 'register' ? await signUp(email.trim(), name.trim(), password) : await signIn(email.trim(), password);
      const plan = await preparePlan(session);
      setPassword('');
      setConfirmPassword('');
      if (plan.scenario === 'merge') {
        // Both sides hold data: let the user confirm before anything is changed or saved.
        setPending({ session, plan });
        setBusy(false);
        return;
      }
      await finishConnect(session, plan, 'merge');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const handleAdvanced = async (action: Exclude<ConnectAction, 'merge'>) => {
    if (!pending) return;
    const { plan, session } = pending;
    const replace = action === 'replace-local';
    const ok = await confirm({
      title: replace ? "Replace this phone's data?" : "Overwrite the server's data?",
      message: replace
        ? `This deletes ${describeCounts(plan.local)} on this phone and downloads ${describeCounts(plan.remote)} from the server. A copy of the phone's data is kept so you can restore it.`
        : `This permanently deletes ${describeCounts(plan.remote)} on the server (your website data) and uploads ${describeCounts(plan.local)} from this phone. This cannot be undone.`,
      confirmText: replace ? 'Replace phone data' : 'Overwrite server',
      type: 'danger',
    });
    if (ok) await finishConnect(session, plan, action);
  };

  if (pending) {
    return (
      <AuthShell title="Merge Data">
        <MergePreview
          plan={pending.plan}
          busy={busy}
          onMerge={() => finishConnect(pending.session, pending.plan, 'merge')}
          onCancel={() => setPending(null)}
          onAdvanced={handleAdvanced}
        />
        {waiting > 0 && <SyncWaitingNote seconds={waiting} />}
        <ErrorNote error={error} />
      </AuthShell>
    );
  }

  const title = mode === 'register' ? 'Enlist' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back';
  const subtitle =
    mode === 'forgot'
      ? "We'll email you a link to set a new password"
      : 'Sign in to sync your workouts with grindlogger.com';
  const submitLabel = busy
    ? mode === 'register'
      ? 'Creating account...'
      : mode === 'forgot'
        ? 'Sending...'
        : 'Signing in...'
    : mode === 'register'
      ? 'Create account'
      : mode === 'forgot'
        ? 'Send reset link'
        : 'Sign in';

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="input"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoCapitalize="none"
          autoComplete="email"
          className="input"
        />
        {mode !== 'forgot' && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="input"
          />
        )}
        {mode === 'register' && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        )}
        <button type="submit" className="btn btn-ember w-full" disabled={busy}>
          {submitLabel}
        </button>
        {mode === 'signin' && (
          <p className="text-center text-xs">
            <button type="button" onClick={() => switchMode('forgot')} className="text-steel hover:text-ember hover:underline">
              Forgot password?
            </button>
          </p>
        )}
      </form>

      {busy && waiting > 0 && <SyncWaitingNote seconds={waiting} />}
      {notice && <p className="text-xs text-ember">{notice}</p>}
      <ErrorNote error={error} />

      <p className="text-center text-sm text-steel">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => switchMode('register')} className="text-ember hover:underline font-medium">
              Register
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchMode('signin')} className="text-ember hover:underline font-medium">
            Back to sign in
          </button>
        )}
      </p>

      <div className="border-t border-border pt-4 text-center">
        <button
          type="button"
          onClick={() => void skipSignIn()}
          disabled={busy}
          className="text-xs text-steel hover:text-chalk transition-colors disabled:opacity-60"
        >
          Continue without an account
        </button>
        <p className="text-[11px] text-steel/70 mt-1">Your data stays on this phone. You can sign in later in Settings.</p>
      </div>
    </AuthShell>
  );
}

function SyncWaitingNote({ seconds }: { seconds: number }) {
  return (
    <p className="text-xs text-steel">
      Syncing your history — the server limits uploads, so this pauses for {seconds}s at a time and then continues.
    </p>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="bg-danger/10 border border-danger/30 text-danger text-xs [clip-path:var(--clip-tag)] px-3 py-2"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
