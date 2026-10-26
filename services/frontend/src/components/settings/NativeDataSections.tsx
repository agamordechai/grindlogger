import { SyncSection } from './SyncSection';
import { RestoreBackupSection } from './RestoreBackupSection';

/**
 * Settings sections that only exist in the native app (they talk to the on-device database).
 * SettingsPage loads this lazily and only on the native target, so the website bundle excludes it.
 */
export default function NativeDataSections() {
  return (
    <>
      <SyncSection />
      <RestoreBackupSection />
    </>
  );
}
