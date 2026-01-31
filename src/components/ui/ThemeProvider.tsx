'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

/**
 * Theme provider wrapper that stores user preference in localStorage
 * 
 * Storage key: 'discens-theme'
 * Supported themes: 'light' | 'dark' | 'system'
 * Default: 'system' (follows OS preference)
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      storageKey="discens-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
