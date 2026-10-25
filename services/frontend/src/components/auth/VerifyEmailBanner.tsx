import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { resendVerification, apiErrorMessage } from '../../api/authEmail';

/** Nudge shown to email/password users who haven't confirmed their address yet. */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!user || user.email_verified !== false) return null;

  const handleResend = async () => {
    setState('sending');
    setError(null);
    try {
      await resendVerification();
      setState('sent');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the email.'));
      setState('idle');
    }
  };

  return (
    <div className="border-b border-ember/30 bg-ember/10">
      <div className="mx-auto max-w-6xl px-4 lg:px-6 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-chalk">
        <MailWarning size={14} className="text-ember shrink-0" />
        <span>Please verify your email address — check your inbox for the link.</span>
        {state === 'sent' ? (
          <span className="text-steel">Sent! Check your inbox.</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={state === 'sending'}
            className="text-ember hover:underline font-medium disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending...' : 'Resend email'}
          </button>
        )}
        {error && <span className="text-danger">{error}</span>}
      </div>
    </div>
  );
}
