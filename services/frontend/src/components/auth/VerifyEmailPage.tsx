import { useEffect, useRef, useState } from 'react';
import { verifyEmail, apiErrorMessage } from '../../api/authEmail';
import { AuthShell, goHome } from './AuthShell';

/** Landing page for the emailed verification link (/auth/verify?token=...). */
export default function VerifyEmailPage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    verifyEmail(token)
      .then(() => setState('done'))
      .catch((err) => {
        setState('error');
        setMessage(apiErrorMessage(err, 'This verification link is invalid or has expired.'));
      });
  }, []);

  return (
    <AuthShell title="Verify email">
      {state === 'working' && <p className="text-steel text-sm text-center">Confirming your email address...</p>}
      {state === 'done' && (
        <>
          <p className="text-chalk text-sm text-center">Your email is verified. You're all set.</p>
          <button className="btn btn-ember w-full" onClick={goHome}>
            Continue
          </button>
        </>
      )}
      {state === 'error' && (
        <>
          <p className="text-danger text-sm text-center">{message}</p>
          <button className="btn btn-ember w-full" onClick={goHome}>
            Back to GrindLogger
          </button>
        </>
      )}
    </AuthShell>
  );
}
