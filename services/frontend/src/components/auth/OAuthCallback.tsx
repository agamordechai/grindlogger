import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface OAuthCallbackProps {
  provider: 'github' | 'discord';
}

export default function OAuthCallback({ provider }: OAuthCallbackProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGithub, loginWithDiscord } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authorization was denied. Please try again.');
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/${provider}/callback`;

    const doLogin = provider === 'github'
      ? loginWithGithub(code, redirectUri)
      : loginWithDiscord(code, redirectUri);

    doLogin
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setError(detail || 'Sign-in failed. Please try again.');
      });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="card p-6 max-w-sm mx-4 space-y-4 text-center">
          <p className="text-danger text-sm">{error}</p>
          <button onClick={() => navigate('/', { replace: true })} className="btn btn-ember w-full">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center shadow-lg shadow-ember/20 animate-ember-pulse">
          <Flame size={20} className="text-white" />
        </div>
        <p className="text-steel text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
