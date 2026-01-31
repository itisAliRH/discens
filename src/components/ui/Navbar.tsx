'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import UserMenu from './UserMenu';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';

export default function Navbar() {
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

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and App Name */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              D
            </div>
            <span className="font-bold text-xl hidden sm:inline">Discens</span>
          </Link>

          {/* Right: Theme Toggle, Language Selector, User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            {isLoggedIn && <UserMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
}
