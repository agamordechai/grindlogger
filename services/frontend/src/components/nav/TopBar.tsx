import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Home, CalendarDays, Ruler, Bot, Settings, Shield, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useMemo, useState, useRef, useEffect } from 'react';
import { RestTimerButton } from '../timer/RestTimerButton';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/measurements', label: 'Body', icon: Ruler },
  { to: '/coach', label: 'Coach', icon: Bot },
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
      return [...BASE_NAV_ITEMS, { to: '/admin', label: 'Admin', icon: Shield }];
    }
    return BASE_NAV_ITEMS;
  }, [user?.role]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center shadow-lg shadow-ember/20">
            <Flame size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-chalk hidden sm:block">GRINDLOGGER</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="relative"
            >
              {({ isActive }) => (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-chalk' : 'text-steel hover:text-chalk'
                }`}>
                  <Icon size={16} />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-surface-2 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Timer + Avatar Menu */}
        <div className="flex items-center gap-2">
          <RestTimerButton />
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="cursor-pointer"
              aria-label="User menu"
            >
              {user?.picture_url ? (
                <img
                  src={user.picture_url}
                  alt=""
                  className="w-8 h-8 rounded-full ring-2 ring-ember/30 transition-shadow hover:ring-ember/60"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center text-white text-xs font-bold ring-2 ring-ember/30 transition-shadow hover:ring-ember/60">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-surface-1 border border-ember/60 rounded-xl py-1 shadow-xl shadow-black/30 z-[60]"
                >
                  {/* User info */}
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-medium text-chalk truncate">{user?.name}</p>
                    <p className="text-xs text-steel truncate">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <button
                      onClick={() => { toggleTheme(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-steel hover:text-chalk hover:bg-surface-2 transition-colors"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-surface-2 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
