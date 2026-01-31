'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LuUser, LuSettings, LuLogOut, LuChevronDown } from 'react-icons/lu';
import { useUntypedSupabase } from '@/lib/supabase/client-untyped';
import { useTranslations } from 'next-intl';

export default function UserMenu() {
  const t = useTranslations('nav');
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = useUntypedSupabase();

  // Load user name and avatar
  useEffect(() => {
    if (!supabase) return;
    
    async function loadUser() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (user) {
        const { data: profile } = await supabase!
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.full_name || profile?.email || 'User');
        setAvatarUrl(profile?.avatar_url || null);
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
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Profile" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            <LuUser className="w-4 h-4" />
          )}
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
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <LuUser className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{t('profile')}</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
              >
                <LuSettings className="w-4 h-4" />
                <span className="text-sm">{t('settings')}</span>
              </Link>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-red-600 dark:text-red-400 disabled:opacity-50"
              >
                <LuLogOut className="w-4 h-4" />
                <span className="text-sm">{isLoading ? `${t('logout')}...` : t('logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
