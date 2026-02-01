'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  LuArrowLeft,
  LuSave,
  LuGlobe,
  LuBell,
  LuPalette,
  LuTarget,
  LuGamepad2,
  LuTriangleAlert,
  LuTrash2,
  LuRotateCcw,
} from 'react-icons/lu';
import ProfilePhotoUpload from '@/components/ui/ProfilePhotoUpload';
import { FadeSlideUp, StaggeredContainer, StaggeredItem } from '@/components/ui/AnimatedContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import type { Profile, QuizType, LanguageCode } from '@/types/database';
import { motion } from 'framer-motion';

const QUIZ_TYPES: { value: QuizType; label: string; description: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Select the correct answer from options' },
  { value: 'true_false', label: 'True/False', description: 'Determine if statements are true or false' },
  { value: 'fill_blank', label: 'Fill in the Blank', description: 'Complete sentences with missing words' },
  { value: 'reading', label: 'Reading', description: 'Comprehension exercises' },
  { value: 'video', label: 'Video', description: 'Video-based learning' },
  { value: 'game', label: 'Games', description: 'Interactive language games' },
  { value: 'mix', label: 'Mixed', description: 'Combination of different types' },
];

export default function ProfileEditPage() {
  const router = useRouter();
  const t = useTranslations('profile.account');
  const tCommon = useTranslations('common');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Account management state
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('de');
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>('en');
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>('en');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(15);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [preferredQuizTypes, setPreferredQuizTypes] = useState<QuizType[]>([
    'multiple_choice',
    'fill_blank',
    'true_false',
  ]);

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        const p = data.profile as Profile;
        setProfile(p);

        // Populate form
        setFullName(p.full_name || '');
        setEmail(p.email || '');
        setTargetLanguage(p.target_language);
        setNativeLanguage(p.native_language);
        setUiLanguage(p.ui_language);
        setDailyGoalMinutes(p.daily_goal_minutes);
        setNotificationsEnabled(p.notifications_enabled);
        setTheme(p.theme);
        setPreferredQuizTypes(p.preferred_quiz_types);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          target_language: targetLanguage,
          native_language: nativeLanguage,
          ui_language: uiLanguage,
          daily_goal_minutes: dailyGoalMinutes,
          notifications_enabled: notificationsEnabled,
          theme,
          preferred_quiz_types: preferredQuizTypes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccessMessage('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleQuizType = (type: QuizType) => {
    setPreferredQuizTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleResetAccount = async () => {
    setIsResetting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/account?action=reset', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('resetError'));
      }

      // Success - user will be signed out and redirected
      setShowResetModal(false);
      // The API route signs out the user, so we'll redirect
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetError'));
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/account?action=delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('deleteError'));
      }

      // Success - user will be signed out and redirected
      setShowDeleteModal(false);
      // The API route signs out the user, so we'll redirect
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <Skeleton className="w-32 h-32 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <FadeSlideUp>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <LuArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <LuSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </FadeSlideUp>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600"
        >
          {error}
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600"
        >
          {successMessage}
        </motion.div>
      )}

      <StaggeredContainer className="space-y-6">
        {/* Profile Photo */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuPalette className="w-5 h-5 text-primary" />
              Profile Photo
            </h2>
            <div className="flex justify-center">
              <ProfilePhotoUpload
                currentPhotoUrl={profile?.avatar_url}
                size="xl"
                onPhotoChange={(url) => {
                  if (profile) {
                    setProfile({ ...profile, avatar_url: url });
                  }
                }}
              />
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Basic Information */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Language Settings */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuGlobe className="w-5 h-5 text-primary" />
              Language Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Language (Learning)
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as LanguageCode)}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background"
                >
                  <option value="de">German (Deutsch)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Native Language</label>
                <select
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value as LanguageCode)}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background"
                >
                  <option value="en">English</option>
                  <option value="de">German (Deutsch)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">App Language</label>
                <select
                  value={uiLanguage}
                  onChange={(e) => setUiLanguage(e.target.value as LanguageCode)}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background"
                >
                  <option value="en">English</option>
                  <option value="de">German (Deutsch)</option>
                </select>
              </div>
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Learning Goals */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuTarget className="w-5 h-5 text-primary" />
              Daily Goal
            </h2>
            <div>
              <label className="block text-sm font-medium mb-3">
                Daily Practice: {dailyGoalMinutes} minutes
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>5 min</span>
                <span>30 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Quiz Preferences */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuGamepad2 className="w-5 h-5 text-primary" />
              Quiz Preferences
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select your preferred learning quiz types
            </p>
            <div className="space-y-2">
              {QUIZ_TYPES.map((quiz) => (
                <motion.button
                  key={quiz.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleQuizType(quiz.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    preferredQuizTypes.includes(quiz.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        preferredQuizTypes.includes(quiz.value)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {preferredQuizTypes.includes(quiz.value) && (
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{quiz.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {quiz.description}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Appearance */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuPalette className="w-5 h-5 text-primary" />
              Appearance
            </h2>
            <div>
              <label className="block text-sm font-medium mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <motion.button
                    key={t}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme(t)}
                    className={`p-4 rounded-xl border-2 capitalize transition-all ${
                      theme === t
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Notifications */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LuBell className="w-5 h-5 text-primary" />
              Notifications
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Get reminders for your daily practice
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <motion.div
                  animate={{ x: notificationsEnabled ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full m-1 shadow"
                />
              </motion.button>
            </div>
          </motion.div>
        </StaggeredItem>

        {/* Danger Zone */}
        <StaggeredItem>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-card border-2 border-red-500/20"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <LuTriangleAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1">{t('dangerZone')}</h2>
                <p className="text-sm text-muted-foreground">{t('dangerZoneDesc')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Reset Account */}
              <div className="p-4 rounded-xl border border-border bg-card/50">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <LuRotateCcw className="w-4 h-4 text-orange-500" />
                      {t('resetAccount')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('resetAccountDesc')}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowResetModal(true)}
                  disabled={isResetting || isDeleting}
                  className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {t('resetButton')}
                </motion.button>
              </div>

              {/* Delete Account */}
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <LuTrash2 className="w-4 h-4 text-red-500" />
                      {t('deleteAccount')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('deleteAccountDesc')}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isResetting || isDeleting}
                  className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {t('deleteButton')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </StaggeredItem>
      </StaggeredContainer>

      {/* Save Button (Mobile) */}
      <div className="md:hidden mt-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LuSave className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>

      {/* Reset Account Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetAccount}
        title={t('resetAccountConfirm')}
        message={t('resetAccountMessage')}
        confirmText={t('resetButton')}
        cancelText={tCommon('cancel')}
        confirmButtonVariant="danger"
        isLoading={isResetting}
      />

      {/* Delete Account Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title={t('deleteAccountConfirm')}
        message={t('deleteAccountMessage')}
        confirmText={t('deleteButton')}
        cancelText={tCommon('cancel')}
        confirmButtonVariant="danger"
        requireTextConfirmation={true}
        confirmationText="DELETE"
        isLoading={isDeleting}
      />
    </div>
  );
}
