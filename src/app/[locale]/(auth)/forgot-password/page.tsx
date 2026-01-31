'use client';

import { useSupabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { LuArrowLeft, LuMail } from 'react-icons/lu';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = useSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      setMessage({
        type: 'success',
        text: t('success'),
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : t('error'),
      });
    } finally {
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

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <LuArrowLeft className="w-4 h-4" />
          {t('backToLogin')}
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
            D
          </div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {emailSent ? t('checkEmail') : t('subtitle')}
          </p>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                : 'bg-green-500/10 text-green-600 border border-green-500/20'
            }`}
          >
            <LuMail className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{message.text}</span>
          </motion.div>
        )}

        {emailSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
              <LuMail className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                {t('emailSentMessage')} <strong className="text-foreground">{email}</strong>
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {t('didntReceive')}{' '}
              <button
                onClick={() => {
                  setEmailSent(false);
                  setMessage(null);
                }}
                className="text-primary hover:underline font-medium"
              >
                {t('tryAgain')}
              </button>
            </p>

            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              {t('backToLoginButton')}
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !email}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('sending')}
                </span>
              ) : (
                t('sendButton')
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </main>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
