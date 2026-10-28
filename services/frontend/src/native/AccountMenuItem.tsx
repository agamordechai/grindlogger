import { LogIn, LogOut } from 'lucide-react';
import { useDialog } from '../components/ui/ConfirmDialog';
import { showSignIn, signOut } from '../sync/account';
import { useAccount } from './useAccount';

/** Native app: "Sign in" / "Sign out" in the profile menu. */
export default function AccountMenuItem({ onDone }: { onDone: () => void }) {
  const account = useAccount();
  const { confirm } = useDialog();
  if (!account) return null;

  const handleSignOut = async () => {
    onDone();
    const ok = await confirm({
      title: 'Sign out?',
      message: 'This phone keeps all of its data and stops syncing until you sign in again.',
      confirmText: 'Sign out',
      type: 'danger',
    });
    if (ok) await signOut();
  };

  return (
    <div className="border-t border-border py-1">
      {account.signedIn ? (
        <button
          onClick={() => void handleSignOut()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-surface-2 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      ) : (
        <button
          onClick={() => {
            onDone();
            void showSignIn();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ember hover:bg-surface-2 transition-colors"
        >
          <LogIn size={16} />
          Sign in
        </button>
      )}
    </div>
  );
}
