import { useEffect, useState } from 'react';
import { getAccountState, subscribeAccount, type AccountState } from '../sync/account';

/** The native app's sign-in state; null while it loads. */
export function useAccount(): AccountState | null {
  const [state, setState] = useState<AccountState | null>(null);
  useEffect(() => {
    void getAccountState().then(setState);
    return subscribeAccount(setState);
  }, []);
  return state;
}

/** Seconds sync is waiting out a server rate limit (0 when not waiting). */
export function useSyncWaiting(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const onWaiting = (e: Event) => setSeconds((e as CustomEvent<{ seconds: number }>).detail.seconds);
    window.addEventListener('sync-waiting', onWaiting);
    return () => window.removeEventListener('sync-waiting', onWaiting);
  }, []);
  return seconds;
}
