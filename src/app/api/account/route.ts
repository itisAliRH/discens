import { createClient } from '@supabase/supabase-js';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextRequest, NextResponse } from 'next/server';

// Lazy-init admin client to avoid build-time env var access
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * DELETE /api/account?action=reset|delete
 * Reset or delete user account
 * 
 * Query params:
 * - action: 'reset' | 'delete'
 *   - reset: Clears all learning data, keeps account
 *   - delete: Completely removes account from auth.users
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get current user from the request
    const supabase = await createUntypedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get action from query params
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (!action || !['reset', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "reset" or "delete"' },
        { status: 400 }
      );
    }

    console.log(`[API] ${action === 'reset' ? 'Resetting' : 'Deleting'} account for user:`, user.id);

    // Get admin client for privileged operations
    const supabaseAdmin = getSupabaseAdmin();

    if (action === 'reset') {
      // RESET: Clear all learning data, keep account
      
      // 1. Delete all user data (CASCADE will handle related records)
      const tablesToClear = [
        'memories',
        'learning_sessions',
        'streaks',
        'mistakes',
        'user_badges',
        'friendships',
        'conversation_sessions',
      ];

      for (const table of tablesToClear) {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error(`[API] Error deleting from ${table}:`, error);
          // Continue with other tables even if one fails
        }
      }

      // 2. Delete profile photos from storage
      try {
        const { data: files } = await supabaseAdmin.storage
          .from('profiles')
          .list('avatars');

        if (files && files.length > 0) {
          const filePaths = files
            .filter(file => file.name.startsWith(`${user.id}-`))
            .map(file => `avatars/${file.name}`);

          if (filePaths.length > 0) {
            await supabaseAdmin.storage
              .from('profiles')
              .remove(filePaths);
          }
        }
      } catch (storageError) {
        console.error('[API] Error deleting profile photos:', storageError);
        // Continue even if storage deletion fails
      }

      // 3. Reset profile to defaults
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          gems: 50,
          total_xp: 0,
          avatar_url: null,
          preferred_quiz_types: ['multiple_choice', 'fill_blank'],
          daily_goal_minutes: 10,
          notifications_enabled: true,
          theme: 'system',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[API] Error resetting profile:', profileError);
        return NextResponse.json(
          { error: `Failed to reset profile: ${profileError.message}` },
          { status: 500 }
        );
      }

      // 4. Re-create empty memory and streak records
      const { error: memoryError } = await supabaseAdmin
        .from('memories')
        .insert({
          user_id: user.id,
          summary: '',
          goals: [],
          top_categories: [],
          total_materials: 0,
          mastered_materials: 0,
        });

      if (memoryError && !memoryError.message.includes('duplicate')) {
        console.error('[API] Error creating memory:', memoryError);
      }

      const { error: streakError } = await supabaseAdmin
        .from('streaks')
        .insert({
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          total_days_active: 0,
          total_time_minutes: 0,
        });

      if (streakError && !streakError.message.includes('duplicate')) {
        console.error('[API] Error creating streak:', streakError);
      }

      // 5. Sign out the user
      await supabase.auth.signOut();

      console.log('[API] Account reset successfully for user:', user.id);

      return NextResponse.json({ 
        success: true,
        message: 'Account reset successfully. You will be signed out.' 
      });

    } else if (action === 'delete') {
      // DELETE: Completely remove account from auth.users
      
      // 1. Delete profile photos from storage first
      try {
        const { data: files } = await supabaseAdmin.storage
          .from('profiles')
          .list('avatars');

        if (files && files.length > 0) {
          const filePaths = files
            .filter(file => file.name.startsWith(`${user.id}-`))
            .map(file => `avatars/${file.name}`);

          if (filePaths.length > 0) {
            await supabaseAdmin.storage
              .from('profiles')
              .remove(filePaths);
          }
        }
      } catch (storageError) {
        console.error('[API] Error deleting profile photos:', storageError);
        // Continue even if storage deletion fails
      }

      // 2. Delete user from auth.users (CASCADE will clean all related data)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error('[API] Error deleting user:', deleteError);
        return NextResponse.json(
          { error: `Failed to delete account: ${deleteError.message}` },
          { status: 500 }
        );
      }

      // 3. Sign out the user (session will be invalid anyway)
      await supabase.auth.signOut();

      console.log('[API] Account deleted successfully for user:', user.id);

      return NextResponse.json({ 
        success: true,
        message: 'Account deleted successfully.' 
      });
    }

  } catch (error) {
    console.error('[API] Account operation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
