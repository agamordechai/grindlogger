import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useMemo, useState, useRef, useEffect } from 'react';
import { RestTimerButton } from '../timer/RestTimerButton';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'HOME' },
  { to: '/history', label: 'HISTORY' },
  { to: '/measurements', label: 'BODY' },
  { to: '/coach', label: 'COACH' },
];

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const navItems = useMemo(() => {
    if (user?.role === 'admin') {
      return [...BASE_NAV_ITEMS, { to: '/admin', label: 'ADMIN' }];
    }
    return BASE_NAV_ITEMS;
  }, [user?.role]);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 28px',
        borderBottom: '3px solid #38d8ff',
        background: 'linear-gradient(180deg, rgba(4,8,29,.92), rgba(4,8,29,.75))',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            background: '#ff2233',
            border: '3px solid #f4f6ff',
            boxShadow: '4px 4px 0 #38d8ff',
            display: 'grid',
            placeItems: 'center',
            transform: 'rotate(-4deg)',
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f4f6ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </div>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontStyle: 'italic', fontSize: 26, letterSpacing: 2, lineHeight: 0.9 }}>
          GRIND<span style={{ color: '#ff2233' }}>/</span>LOGGER
          <small style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontStyle: 'normal', fontWeight: 700, fontSize: 8, letterSpacing: 4, color: '#38d8ff', marginTop: 3 }}>
            SYS.v2 // TRAINING LOG
          </small>
        </div>
      </div>

      {/* Desktop nav */}
      <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="hidden lg:flex">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <span
                style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 800,
                  fontStyle: 'italic',
                  fontSize: 14,
                  letterSpacing: 2,
                  color: isActive ? '#0a1240' : '#f4f6ff',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  display: 'inline-block',
                  background: isActive ? '#f4f6ff' : 'transparent',
                  boxShadow: isActive ? '4px 4px 0 #ff2233' : 'none',
                  clipPath: isActive ? 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' : 'none',
                  transition: 'color 0.12s',
                  cursor: 'pointer',
                }}
              >
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right side: timer + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RestTimerButton />
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            style={{
              border: '2px solid rgba(56,216,255,.4)',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              borderRadius: 0,
              display: 'block',
            }}
            aria-label="User menu"
          >
            {user?.picture_url ? (
              <img
                src={user.picture_url}
                alt=""
                style={{ width: 34, height: 34, display: 'block', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{
                width: 34, height: 34,
                background: '#ff2233',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f4f6ff', fontSize: 13, fontWeight: 700,
                fontFamily: "'Anton', sans-serif",
              }}>
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 8,
                  width: 220,
                  background: '#0a1240',
                  border: '3px solid #1c52d6',
                  boxShadow: '6px 6px 0 #1438a8',
                  zIndex: 60,
                }}
              >
                <div style={{ padding: '10px 14px', borderBottom: '2px solid rgba(28,82,214,.4)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f4f6ff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#38d8ff', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {[
                    { icon: Settings, label: 'Settings', onClick: () => { navigate('/settings'); setMenuOpen(false); } },
                    { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light mode' : 'Dark mode', onClick: toggleTheme },
                  ].map(({ icon: Icon, label, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', fontSize: 12, color: '#38d8ff',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        textAlign: 'left',
                        transition: 'background 0.1s, color 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d1b58'; (e.currentTarget as HTMLElement).style.color = '#f4f6ff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#38d8ff'; }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid rgba(28,82,214,.4)', padding: '4px 0' }}>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px', fontSize: 12, color: '#ff2233',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d1b58'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
