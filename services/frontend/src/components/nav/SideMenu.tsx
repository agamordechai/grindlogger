import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const PRIMARY_PAGES = [
  { to: '/',             label: 'DASHBOARD', index: '01' },
  { to: '/history',      label: 'HISTORY',   index: '02' },
  { to: '/measurements', label: 'BODY',       index: '03' },
  { to: '/coach',        label: 'COACH',      index: '04' },
];

const SECONDARY_PAGES = [
  { to: '/settings', label: 'SETTINGS', adminOnly: false },
  { to: '/admin',    label: 'ADMIN',    adminOnly: true  },
];

interface SideMenuProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, isMobile, onClose }: SideMenuProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const handleNav = (to: string) => {
    navigate(to);
    if (isMobile) onClose();
  };

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 280,
        zIndex: 100,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s cubic-bezier(.2,.7,.3,1)',
      }
    : {
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        width: isOpen ? 280 : 0,
        minWidth: isOpen ? 280 : 0,
        height: '100dvh',
        flexShrink: 0,
        overflow: 'hidden',
        borderRight: isOpen ? '3px solid #38d8ff' : 'none',
        boxShadow: isOpen ? '6px 0 0 #1438a8' : 'none',
        transition: 'width 0.2s cubic-bezier(.2,.7,.3,1), min-width 0.2s cubic-bezier(.2,.7,.3,1)',
      };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(4,8,29,.75)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <div style={containerStyle}>
        <div style={{
          width: 280, height: '100%',
          background: '#0a1240',
          color: '#f4f6ff',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient background slabs */}
          <div style={{
            position: 'absolute', top: '-15%', right: '-30%', width: '80%', height: '45%',
            background: 'rgba(20,56,168,.18)', transform: 'skewX(-12deg)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '15%', left: '-20%', width: '60%', height: '8%',
            background: 'rgba(255,34,51,.08)', transform: 'skewX(-12deg)',
            pointerEvents: 'none',
          }} />
          {/* Halftone dots */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(56,216,255,.06) 1.1px, transparent 1.4px)',
            backgroundSize: '10px 10px',
          }} />

          {/* ── Header ── */}
          <div style={{
            padding: '18px 18px 14px',
            borderBottom: '2px solid rgba(28,82,214,.4)',
            position: 'relative', flexShrink: 0,
          }}>
            {/* Brand row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Brand mark */}
                <div style={{
                  width: 38, height: 38,
                  background: '#ff2233',
                  border: '3px solid #f4f6ff',
                  boxShadow: '3px 3px 0 #38d8ff',
                  display: 'grid', placeItems: 'center',
                  transform: 'rotate(-4deg)',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f4f6ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </div>
                <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontStyle: 'italic', fontSize: 20, letterSpacing: 1.5, lineHeight: 0.9 }}>
                  GRIND<span style={{ color: '#ff2233' }}>/</span>LOGGER
                  <small style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontStyle: 'normal', fontWeight: 700, fontSize: 7, letterSpacing: 3, color: '#38d8ff', marginTop: 3 }}>
                    SYS.v2 // TRAINING LOG
                  </small>
                </div>
              </div>

            </div>

            {/* User card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              border: '2px solid rgba(28,82,214,.5)',
              background: 'rgba(20,56,168,.1)',
              boxShadow: '3px 3px 0 #04081d',
              clipPath: 'polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)',
            }}>
              {user?.picture_url ? (
                <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{
                  width: 32, height: 32, objectFit: 'cover', flexShrink: 0,
                  clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)',
                }} />
              ) : (
                <div style={{
                  width: 32, height: 32, background: '#ff2233', color: '#f4f6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Anton', sans-serif", fontSize: 15, fontStyle: 'italic',
                  clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)',
                  flexShrink: 0,
                }}>
                  {(user?.name?.[0] ?? '?').toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontStyle: 'italic', fontSize: 14, color: '#f4f6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name ?? 'User'}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, color: '#38d8ff', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                  {user?.role ?? 'member'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Primary nav ── */}
          <div style={{ padding: '12px 14px 6px', flex: 1, overflowY: 'auto', position: 'relative' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(56,216,255,.5)', padding: '2px 8px 8px', textTransform: 'uppercase' }}>
              NAVIGATE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PRIMARY_PAGES.map((item) => {
                const active = isActive(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => handleNav(item.to)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      border: `3px solid ${active ? '#f4f6ff' : 'rgba(28,82,214,.25)'}`,
                      background: active ? '#f4f6ff' : 'transparent',
                      color: active ? '#0a1240' : '#f4f6ff',
                      boxShadow: active ? '4px 4px 0 #ff2233' : 'none',
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontStyle: 'italic', fontWeight: 900,
                      fontSize: 14, letterSpacing: 2,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
                      transition: 'background 0.12s, border-color 0.12s, color 0.12s, transform 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.5)'; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(28,82,214,.25)'; } }}
                  >
                    {active && (
                      <span style={{ color: '#ff2233', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>▸</span>
                    )}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontStyle: 'normal', fontSize: 9, fontWeight: 700, color: active ? '#1438a8' : 'rgba(56,216,255,.5)', letterSpacing: 1 }}>
                      {item.index}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 12 }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(56,216,255,.5)', padding: '2px 8px 8px', textTransform: 'uppercase' }}>
              SYSTEM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SECONDARY_PAGES
                .filter(item => !item.adminOnly || user?.role === 'admin')
                .map((item) => {
                  const active = isActive(item.to);
                  return (
                    <button
                      key={item.to}
                      onClick={() => handleNav(item.to)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '8px 14px',
                        border: `2px solid ${active ? '#38d8ff' : 'rgba(28,82,214,.2)'}`,
                        background: active ? 'rgba(56,216,255,.08)' : 'transparent',
                        color: active ? '#38d8ff' : 'rgba(244,246,255,.55)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,216,255,.4)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = active ? '#38d8ff' : 'rgba(244,246,255,.55)'; (e.currentTarget as HTMLElement).style.borderColor = active ? '#38d8ff' : 'rgba(28,82,214,.2)'; }}
                    >
                      {active ? '› ' : '  '}{item.label}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '10px 14px 14px',
            borderTop: '2px solid rgba(28,82,214,.3)',
            display: 'flex', flexDirection: 'column', gap: 6,
            flexShrink: 0,
          }}>
            <button
              onClick={toggleTheme}
              style={{
                textAlign: 'left', padding: '8px 12px',
                border: '2px solid rgba(28,82,214,.4)',
                background: 'transparent', color: '#38d8ff',
                fontFamily: "'Space Mono', monospace",
                fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.1s, border-color 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(56,216,255,.08)'; (e.currentTarget as HTMLElement).style.borderColor = '#38d8ff'; (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(28,82,214,.4)'; (e.currentTarget as HTMLElement).style.color = '#38d8ff'; }}
            >
              {theme === 'dark' ? '◑ LIGHT MODE' : '◉ DARK MODE'}
            </button>
            <button
              onClick={logout}
              style={{
                textAlign: 'left', padding: '8px 12px',
                border: '2px solid rgba(28,82,214,.4)',
                background: 'transparent', color: '#38d8ff',
                fontFamily: "'Space Mono', monospace",
                fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: 'pointer',
                clipPath: 'polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)',
                boxShadow: '3px 3px 0 #04081d',
                transition: 'background 0.1s, border-color 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ff2233'; (e.currentTarget as HTMLElement).style.color = '#ff2233'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(28,82,214,.4)'; (e.currentTarget as HTMLElement).style.color = '#38d8ff'; }}
            >
              ↪ SIGN OUT
            </button>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(56,216,255,.4)', textAlign: 'center', marginTop: 2 }}>
              BUILD 2.0 · 2026
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
