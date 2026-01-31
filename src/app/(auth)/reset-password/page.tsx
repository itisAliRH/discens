'use client';

import { useSupabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { LuEye, LuEyeOff, LuCheck, LuX } from 'react-icons/lu';
import { motion } from 'framer-motion';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const supabase = useSupabase();

  // Check if user has valid session (from reset link)
  useEffect(() => {
    if (!supabase) return;

    async function checkSession() {
      const { data: { session } } = await supabase!.auth.getSession();
      
      if (!session) {
        setIsValidToken(false);
        setMessage({
          type: 'error',
          text: 'Invalid or expired reset link. Please request a new one.',
        });
      } else {
        setIsValidToken(true);
      }
    }

    checkSession();
  }, [supabase]);

  // Password validation
  const passwordRequirements = [
    { label: 'At least 6 characters', test: (pwd: string) => pwd.length >= 6 },
    { label: 'Passwords match', test: (pwd: string) => pwd === confirmPassword && confirmPassword.length > 0 },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isPasswordValid) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred',
      });
      setIsLoading(false);
    }
  };

  if (!supabase) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  if (isValidToken === null) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </main>
    );
  }

  if (isValidToken === false) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 text-2xl font-bold mb-4">
            <LuX className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired.
          </p>
          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Request New Link
            </Link>
            <Link
              href="/login"
              className="block px-6 py-3 rounded-xl border border-border hover:bg-accent transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
            D
          </div>
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-muted-foreground mt-1">
            Choose a strong password for your account
          </p>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                : 'bg-green-500/10 text-green-600 border border-green-500/20'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <LuEyeOff className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <LuEyeOff className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 p-4 rounded-xl bg-muted/50"
            >
              <p className="text-sm font-medium">Password requirements:</p>
              {passwordRequirements.map((req, index) => {
                const isValid = req.test(password);
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      isValid ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    {isValid ? (
                      <LuCheck className="w-4 h-4" />
                    ) : (
                      <LuX className="w-4 h-4" />
                    )}
                    {req.label}
                  </div>
                );
              })}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to Login
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
