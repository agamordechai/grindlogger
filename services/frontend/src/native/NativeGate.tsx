import type { ReactNode } from 'react';
import AppSignIn from '../components/auth/AppSignIn';
import { useAccount } from './useAccount';

/** Native app: show the sign-in screen until the user signs in or chooses to continue without an account. */
export default function NativeGate({ children }: { children: ReactNode }) {
  const account = useAccount();
  if (!account) return null;
  if (!account.signedIn && !account.skipped) return <AppSignIn />;
  return <>{children}</>;
}
