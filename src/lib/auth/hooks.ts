'use client';

import { useUntypedSupabase } from '@/lib/supabase/client-untyped';
import type { Profile, Memory, Streak } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';

/**
 * User data with related profile, memory, and streak information
 */
export interface UserData {
  user: User;
  profile: Profile | null;
  memory: Memory | null;
  streak: Streak | null;
}

/**
 * Auth state
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memory: Memory | null;
  streak: Streak | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing user authentication state
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    memory: null,
    streak: null,
    isLoading: true,
    error: null,
  });
  const router = useRouter();
  const supabase = useUntypedSupabase();
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Fetch user data (profile, memory, streak)
  const fetchUserData = useCallback(async (userId: string) => {
    if (!supabase) return { profile: null, memory: null, streak: null };
    
    try {
      const [profileResult, memoryResult, streakResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('memories').select('*').eq('user_id', userId).single(),
        supabase.from('streaks').select('*').eq('user_id', userId).single(),
      ]);

      return {
        profile: profileResult.data as Profile | null,
        memory: memoryResult.data as Memory | null,
        streak: streakResult.data as Streak | null,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { profile: null, memory: null, streak: null };
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    if (!supabase) return;
    
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setState(prev => ({ ...prev, error: error.message, isLoading: false }));
          return;
        }

        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          setState({
            user: session.user,
            session,
            ...userData,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize auth',
          isLoading: false,
        }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await fetchUserData(session.user.id);
          setState({
            user: session.user,
            session,
            ...userData,
            isLoading: false,
            error: null,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            memory: null,
            streak: null,
            isLoading: false,
            error: null,
          });
        }
      }
    );
    
    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    } else {
      router.push('/');
      router.refresh();
    }
  }, [supabase, router]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (!state.user) return;
    
    const userData = await fetchUserData(state.user.id);
    setState(prev => ({ ...prev, ...userData }));
  }, [state.user, fetchUserData]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.user || !supabase) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setState(prev => ({ ...prev, profile: data as Profile }));
    return { data };
  }, [state.user, supabase]);

  return {
    ...state,
    signOut,
    refreshUserData,
    updateProfile,
    isAuthenticated: !!state.user,
  };
}

/**
 * Hook for requiring authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/login') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push(redirectTo);
    }
  }, [auth.isLoading, auth.user, router, redirectTo]);

  return auth;
}
