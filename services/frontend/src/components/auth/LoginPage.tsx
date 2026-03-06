import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/emailValidation';
import axios from 'axios';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

function GitHubButton() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) return null;

  const handleClick = () => {
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-[300px] mx-auto h-10 rounded border border-[#d0d7de] bg-[#f6f8fa] hover:bg-[#eaeef2] text-[#24292f] text-sm font-medium transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
      Sign in with GitHub
    </button>
  );
}

function DiscordButton() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) return null;

  const handleClick = () => {
    const redirectUri = `${window.location.origin}/auth/discord/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
    });
    window.location.href = `https://discord.com/oauth2/authorize?${params}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-[300px] mx-auto h-10 rounded border border-[#5865F2]/40 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
      Sign in with Discord
    </button>
  );
}

export default function LoginPage() {
  const { login, loginWithEmail, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef(login);

  useEffect(() => {
    loginRef.current = login;
  }, [login]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=en';
    script.async = true;
    script.defer = true;

    const initializeGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (window.google && googleButtonRef.current && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              await loginRef.current(response.credential);
            } catch (err) {
              console.error('Google login failed:', err);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          width: 300,
          locale: 'en',
        });
      }
    };

    script.onload = initializeGoogle;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setEmailSuggestion(null);

    if (isRegister) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error || 'Invalid email');
        if (emailValidation.suggestion) {
          setEmailSuggestion(emailValidation.suggestion);
        }
        return;
      }
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, name, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ember/8 via-background to-ember-dark/5 animate-gradient-mesh" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-ember/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-ember-dark/5 rounded-full blur-3xl" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm mx-4"
      >
        <div className="card space-y-6 p-6">
          {/* Logo + title */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center mx-auto mb-4 shadow-lg shadow-ember/30">
              <Flame size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-chalk">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-steel text-sm mt-1">
              {isRegister ? 'Start your training journey' : 'Sign in to the Forge'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                  setEmailSuggestion(null);
                }}
                required
                autoComplete="email"
                className={`input ${emailError ? 'border-danger!' : ''}`}
              />
              <AnimatePresence>
                {emailError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1"
                  >
                    <p className="text-danger text-xs">{emailError}</p>
                    {emailSuggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(emailSuggestion);
                          setEmailError(null);
                          setEmailSuggestion(null);
                        }}
                        className="text-xs text-ember hover:underline mt-1"
                      >
                        Use {emailSuggestion}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isRegister && (
              <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="input" />
            )}
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} className="input" />
            {isRegister && (
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="input" />
            )}
            <button type="submit" className="btn btn-ember w-full" disabled={submitting}>
              {submitting
                ? (isRegister ? 'Creating account...' : 'Signing in...')
                : (isRegister ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-steel">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); setEmailError(null); setEmailSuggestion(null); setConfirmPassword(''); }}
              className="text-ember hover:underline font-medium"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-steel text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-center">
              <div ref={googleButtonRef}></div>
            </div>
            <GitHubButton />
            <DiscordButton />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl px-3 py-2"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
