import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Ruler, Bot, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const BASE_TABS = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/history', label: 'HISTORY', icon: CalendarDays },
  { to: '/measurements', label: 'BODY', icon: Ruler },
  { to: '/coach', label: 'COACH', icon: Bot },
];

export function BottomNav() {
  const { user } = useAuth();

  const tabs = useMemo(() => {
    if (user?.role === 'admin') {
      return [...BASE_TABS, { to: '/admin', label: 'ADMIN', icon: Shield }];
    }
    return BASE_TABS;
  }, [user?.role]);

  return (
    <nav
      className="lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        inset: '0 0 0 0',
        zIndex: 50,
        display: 'flex',
        borderTop: '3px solid #38d8ff',
        background: 'linear-gradient(180deg, rgba(4,8,29,.88), rgba(4,8,29,.96))',
        backdropFilter: 'blur(8px)',
        height: 64,
        top: 'auto',
      }}
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                height: '100%',
                padding: '8px 4px',
                background: isActive ? '#ff2233' : 'transparent',
                borderRight: '2px solid rgba(28,82,214,.35)',
                color: isActive ? '#f4f6ff' : '#38d8ff',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              <Icon size={18} />
              <span style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 10,
                letterSpacing: 2,
              }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
