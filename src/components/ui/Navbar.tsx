'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import UserMenu from './UserMenu';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { 
  LuHome, 
  LuBookOpen, 
  LuRefreshCw, 
  LuMessageCircle, 
  LuHistory, 
  LuBrain 
} from 'react-icons/lu';
import type { ReactNode } from 'react';

function NavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname?.includes(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'text-foreground bg-accent'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const supabase = useSupabase();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check if user is logged in
  useEffect(() => {
    if (!supabase) return;
    
    async function checkAuth() {
      const { data: { user } } = await supabase!.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Don't show navbar on certain pages if needed
  const hideNavbar = false; // You can add logic here if needed

  if (hideNavbar) return null;

  // Check if we're on a main app page (to show navigation)
  const isMainApp = pathname?.includes('/dashboard') || 
                    pathname?.includes('/learn') || 
                    pathname?.includes('/review') || 
                    pathname?.includes('/conversation') || 
                    pathname?.includes('/memory') || 
                    pathname?.includes('/history') ||
                    pathname?.includes('/profile');

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and App Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                D
              </div>
              <span className="font-bold text-xl hidden sm:inline">Discens</span>
            </Link>

            {/* Desktop Navigation Links (only show when logged in) */}
            {isLoggedIn && isMainApp && (
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/dashboard" label={t('dashboard')} icon={<LuHome className="w-4 h-4" />} />
                <NavLink href="/learn" label={t('learn')} icon={<LuBookOpen className="w-4 h-4" />} />
                <NavLink href="/review" label={t('review')} icon={<LuRefreshCw className="w-4 h-4" />} />
                <NavLink href="/conversation" label="Talk" icon={<LuMessageCircle className="w-4 h-4" />} />
                <NavLink href="/history" label={t('history')} icon={<LuHistory className="w-4 h-4" />} />
                <NavLink href="/memory" label={t('memory')} icon={<LuBrain className="w-4 h-4" />} />
              </div>
            )}
          </div>

          {/* Right: Theme Toggle, Language Selector, User Menu or Auth Buttons */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            
            {isLoggedIn === null ? (
              // Loading state
              <div className="w-20 h-9 bg-muted animate-pulse rounded-lg" />
            ) : isLoggedIn ? (
              // Logged in: show user menu
              <UserMenu />
            ) : (
              // Not logged in: show login/get started buttons
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                >
                  {t('getStarted')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
