'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { LuGlobe } from 'react-icons/lu';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setIsOpen(false);
    
    // Get the current pathname without the locale prefix
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '');
    
    // Navigate to the same path with new locale
    router.push(`/${newLocale}${pathWithoutLocale || ''}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Change language"
        title="Change language"
      >
        <LuGlobe className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">{locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                locale === loc ? 'bg-accent font-medium' : ''
              }`}
            >
              <span>{localeNames[loc]}</span>
              <span className="text-xs text-muted-foreground">{loc.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
