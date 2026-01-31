'use client';

import { useState, useEffect } from 'react';
import { LuLanguages, LuCheck } from 'react-icons/lu';
import { createUntypedClient } from '@/lib/supabase/client-untyped';
import type { LanguageCode } from '@/types/database';

const LANGUAGES = [
  { code: 'en' as LanguageCode, name: 'English', flag: '🇬🇧' },
  { code: 'de' as LanguageCode, name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createUntypedClient();

  // Load current UI language from profile
  useEffect(() => {
    async function loadLanguage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ui_language')
          .eq('id', user.id)
          .single();
        
        if (profile?.ui_language) {
          setCurrentLanguage(profile.ui_language as LanguageCode);
        }
      }
    }
    loadLanguage();
  }, [supabase]);

  const handleLanguageChange = async (language: LanguageCode) => {
    if (language === currentLanguage || isLoading) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ ui_language: language })
          .eq('id', user.id);

        if (!error) {
          setCurrentLanguage(language);
          // Reload to apply language changes
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to update language:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Select language"
      >
        <LuLanguages className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">{currentLang.name}</span>
        <span className="text-lg sm:hidden">{currentLang.flag}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="flex-1 text-left text-sm">{lang.name}</span>
                {currentLanguage === lang.code && (
                  <LuCheck className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
