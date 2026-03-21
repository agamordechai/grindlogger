import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeSection() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="py-6 border-b border-border">
      <h3 className="text-sm font-bold text-chalk mb-4">Appearance</h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? (
            <Moon size={18} className="text-steel" />
          ) : (
            <Sun size={18} className="text-amber-500" />
          )}
          <div>
            <p className="text-sm text-chalk font-medium">
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>
            <p className="text-xs text-steel mt-0.5">
              {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clean'}
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="relative w-12 h-7 rounded-full transition-colors duration-200"
          style={{
            background: theme === 'dark'
              ? 'var(--color-surface-3)'
              : 'var(--color-ember)',
          }}
          aria-label="Toggle theme"
        >
          <span
            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
            style={{
              transform: theme === 'light' ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>
    </div>
  );
}
