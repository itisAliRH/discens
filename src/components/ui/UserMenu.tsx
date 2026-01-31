'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LuUser, LuSettings, LuLogOut, LuChevronDown } from 'react-icons/lu';
import { useUntypedSupabase } from '@/lib/supabase/client-untyped';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = useUntypedSupabase();

  // Load user name
  useEffect(() => {
    if (!supabase) return;
    
    async function loadUser() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (user) {
        const { data: profile } = await supabase!
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.full_name || profile?.email || 'User');
      }
    }
    loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <LuUser className="w-4 h-4" />
        </div>
        <span className="text-sm hidden md:inline max-w-[100px] truncate">
          {userName || 'User'}
        </span>
        <LuChevronDown className="w-3 h-3 hidden md:inline" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium truncate">{userName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">Account Settings</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
              >
                <LuSettings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-red-600 dark:text-red-400 disabled:opacity-50"
              >
                <LuLogOut className="w-4 h-4" />
                <span className="text-sm">{isLoading ? 'Logging out...' : 'Log out'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
