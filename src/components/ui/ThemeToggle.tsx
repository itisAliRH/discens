'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LuSun, LuMoon, LuMonitor, LuCheck } from '@/components/ui/icons';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeConfig {
  value: ThemeOption;
  label: string;
  icon: typeof LuSun;
}

const themes: ThemeConfig[] = [
  { value: 'light', label: 'Light', icon: LuSun },
  { value: 'dark', label: 'Dark', icon: LuMoon },
  { value: 'system', label: 'System', icon: LuMonitor },
];

/**
 * Enable smooth transitions when changing theme
 */
function enableTransitions() {
  const doc = document.documentElement;
  doc.classList.add('theme-transition');
  // Remove after transitions complete
  setTimeout(() => doc.classList.remove('theme-transition'), 300);
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeChange = (newTheme: ThemeOption) => {
    enableTransitions();
    setTheme(newTheme);
    setIsOpen(false);
  };

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const currentIcon = resolvedTheme === 'dark' ? LuMoon : LuSun;
  const CurrentIcon = currentIcon;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="py-1">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleThemeChange(value);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  theme === value
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{label}</span>
                {theme === value && <LuCheck className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple toggle version (cycles through light -> dark -> system)
 */
export function ThemeToggleSimple() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const cycleTheme = () => {
    enableTransitions();
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getIcon = () => {
    if (theme === 'system') return <LuMonitor className="w-4 h-4" />;
    return resolvedTheme === 'dark' ? <LuMoon className="w-4 h-4" /> : <LuSun className="w-4 h-4" />;
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={`Current theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </button>
  );
}
