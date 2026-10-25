import { useState } from 'react';
import { forgotPassword, apiErrorMessage } from '../../api/authEmail';
import { AuthShell } from './AuthShell';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

/** Ask for a reset email. Shown from the login page; the server answers the same for unknown addresses. */
export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset email. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a link to set a new one">
      {sent ? (
        <p className="text-chalk text-sm text-center">
          If that email is registered, a reset link is on its way. It expires in an hour.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
          />
          {error && <p className="text-danger text-xs">{error}</p>}
          <button type="submit" className="btn btn-ember w-full" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-steel">
        <button onClick={onBack} className="text-ember hover:underline font-medium">
          Back to sign in
        </button>
      </p>
    </AuthShell>
  );
}
