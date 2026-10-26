import { useState } from 'react';
import { resetPassword, apiErrorMessage } from '../../api/authEmail';
import { AuthShell, goHome } from './AuthShell';

/** Landing page for the emailed reset link (/auth/reset?token=...). */
export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'This reset link is invalid or has expired.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <p className="text-chalk text-sm text-center">You can now sign in with your new password.</p>
        <button className="btn btn-ember w-full" onClick={goHome}>
          Sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="New password" subtitle="Choose a new password for your account">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <button type="submit" className="btn btn-ember w-full" disabled={submitting}>
          {submitting ? 'Saving...' : 'Set password'}
        </button>
      </form>
    </AuthShell>
  );
}
