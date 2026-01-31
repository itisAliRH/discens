'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LuSun, LuMoon, LuMonitor } from '@/components/ui/icons';

type ThemeOption = 'light' | 'dark' | 'system';

/**
 * Enable smooth transitions when changing theme
 */
function enableTransitions() {
  const doc = document.documentElement;
  doc.classList.add('theme-transition');
  // Remove after transitions complete
  setTimeout(() => doc.classList.remove('theme-transition'), 300);
}

/**
 * Theme toggle that cycles through options: light → dark → system → light
 */
export default function ThemeToggle() {
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

  const getLabel = () => {
    if (theme === 'light') return 'Light mode';
    if (theme === 'dark') return 'Dark mode';
    return 'System theme';
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={`${getLabel()}. Click to change.`}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}
