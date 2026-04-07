import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import OAuthCallback from './components/auth/OAuthCallback';
import { TopBar } from './components/nav/TopBar';
import { BottomNav } from './components/nav/BottomNav';
import { Skeleton } from './components/ui/Skeleton';
import { ScrollToTop } from './components/ui/ScrollToTop';
import DashboardPage from './pages/DashboardPage';
import CoachPage from './pages/CoachPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import MeasurementsPage from './pages/MeasurementsPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center shadow-lg shadow-ember/20 animate-ember-pulse">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

const LAST_ROUTE_KEY = 'last_route';
const ROUTE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SKIP_PATHS = ['/auth/'];

function usePersistRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);

  // Restore on first mount — runs before save can overwrite
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

  // Save current route on every navigation — skip until restore is done
  useEffect(() => {
    if (!restored.current) return;
    if (SKIP_PATHS.some((p) => location.pathname.startsWith(p))) return;
    localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ path: location.pathname, ts: Date.now() }));
  }, [location.pathname]);
}

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  // OAuth callback routes must render regardless of auth state
  if (window.location.pathname === '/auth/github/callback') return <OAuthCallback provider="github" />;
  if (window.location.pathname === '/auth/discord/callback') return <OAuthCallback provider="discord" />;
  if (window.location.pathname === '/auth/reddit/callback') return <OAuthCallback provider="reddit" />;

  if (!isAuthenticated) return <LoginPage />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  usePersistRoute();

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 lg:px-6 py-6 pb-24 lg:pb-6">
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
      <BottomNav />
    </div>
  );
}
