import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';
import { ProfileSection } from '../components/settings/ProfileSection';
import { UnitsSection } from '../components/settings/UnitsSection';
import { CycleLengthSection } from '../components/settings/CycleLengthSection';
import { ApiKeySection } from '../components/settings/ApiKeySection';
import { BodyweightSection } from '../components/settings/BodyweightSection';
import { AccountSection } from '../components/settings/AccountSection';
import { CalendarSyncSection } from '../components/settings/CalendarSyncSection';
import { IS_WEB } from '../target';

// Native-only (talks to the on-device database); null on the website so the chunk is never built.
const NativeDataSections = IS_WEB ? null : lazy(() => import('../components/settings/NativeDataSections'));

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-steel hover:text-chalk transition-colors mb-3"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-chalk">Settings</h1>
        <p className="text-steel text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="card mt-6 p-0 px-4">
        <ProfileSection />
        <UnitsSection />
        <CycleLengthSection />
        <BodyweightSection />
        {IS_WEB && <CalendarSyncSection />}
        <ApiKeySection />
        {NativeDataSections && (
          <Suspense fallback={null}>
            <NativeDataSections />
          </Suspense>
        )}
        <AccountSection />
      </div>
    </PageShell>
  );
}
