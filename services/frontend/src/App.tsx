import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import OAuthCallback from './components/auth/OAuthCallback';
import { SideMenu } from './components/nav/SideMenu';
import { Skeleton } from './components/ui/Skeleton';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { RestTimerButton } from './components/timer/RestTimerButton';
import DashboardPage from './pages/DashboardPage';
import CoachPage from './pages/CoachPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import MeasurementsPage from './pages/MeasurementsPage';

const DESKTOP_BREAKPOINT = 1024;

const ROUTE_LABELS: Record<string, string> = {
  '/':             'DASHBOARD',
  '/history':      'HISTORY',
  '/measurements': 'BODY',
  '/coach':        'COACH',
  '/settings':     'SETTINGS',
  '/admin':        'ADMIN',
};

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: '#04081d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48,
          background: '#ff2233',
          border: '3px solid #f4f6ff',
          boxShadow: '4px 4px 0 #38d8ff',
          display: 'grid', placeItems: 'center',
          transform: 'rotate(-4deg)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f4f6ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

const LAST_ROUTE_KEY = 'last_route';
const ROUTE_TTL_MS = 30 * 60 * 1000;
const SKIP_PATHS = ['/auth/'];

function usePersistRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(LAST_ROUTE_KEY);
    if (!raw) { restored.current = true; return; }
    try {
      const { path, ts } = JSON.parse(raw);
      if (Date.now() - ts < ROUTE_TTL_MS && path !== '/' && path !== location.pathname) {
        navigate(path, { replace: true });
      }
    } catch { /* ignore corrupt data */ }
    restored.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!restored.current) return;
    if (SKIP_PATHS.some((p) => location.pathname.startsWith(p))) return;
    localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ path: location.pathname, ts: Date.now() }));
  }, [location.pathname]);
}

/* ── Page header strip (hamburger + breadcrumb + timer + user chip) ── */
function PageHeader({ onToggleMenu, user }: { onToggleMenu: () => void; user: { name?: string | null; picture_url?: string | null } | null }) {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname] ?? 'GRINDLOGGER';

  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
      borderBottom: '3px solid #38d8ff',
      background: 'rgba(4,8,29,.88)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
    }}>
      {/* Hamburger */}
      <button
        onClick={onToggleMenu}
        aria-label="Toggle menu"
        style={{
          background: 'transparent', color: '#38d8ff',
          border: '2px solid rgba(56,216,255,.35)',
          width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#38d8ff'; (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.35)'; (e.currentTarget as HTMLElement).style.color = '#38d8ff'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#38d8ff', flexShrink: 0 }}>
          GL /
        </span>
        <span style={{ fontFamily: "'Anton', sans-serif", fontStyle: 'italic', fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', color: '#f4f6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>

      {/* Rest timer */}
      <RestTimerButton />

      {/* User chip */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '3px 10px 3px 3px',
          border: '2px solid rgba(56,216,255,.3)',
          clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)',
          flexShrink: 0,
        }}>
          {user.picture_url ? (
            <img src={user.picture_url} alt="" referrerPolicy="no-referrer"
              style={{ width: 22, height: 22, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: 22, height: 22, background: '#ff2233', color: '#f4f6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Anton', sans-serif", fontSize: 11, fontStyle: 'italic',
            }}>
              {(user.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: '#f4f6ff' }}>
            {user.name?.split(' ')[0]}
          </span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  if (window.location.pathname === '/auth/github/callback') return <OAuthCallback provider="github" />;
  if (window.location.pathname === '/auth/discord/callback') return <OAuthCallback provider="discord" />;
  if (window.location.pathname === '/auth/reddit/callback') return <OAuthCallback provider="reddit" />;

  if (!isAuthenticated) return <LoginPage />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  usePersistRoute();
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);

  // Track viewport, auto-open on desktop / auto-close on mobile
  useEffect(() => {
    const onResize = () => {
      const nowMobile = window.innerWidth < DESKTOP_BREAKPOINT;
      setIsMobile(nowMobile);
      if (!nowMobile) setMenuOpen(true);
      else setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <SideMenu
        isOpen={menuOpen}
        isMobile={isMobile}
        onClose={() => setMenuOpen(false)}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <PageHeader onToggleMenu={() => setMenuOpen(prev => !prev)} user={user} />
        <main style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="measurements" element={<MeasurementsPage />} />
              <Route path="coach" element={<CoachPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Routes>
          </AnimatePresence>
        </main>
        <ScrollToTop />
      </div>
    </div>
  );
}
