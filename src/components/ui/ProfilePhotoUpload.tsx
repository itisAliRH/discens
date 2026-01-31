'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { LuUser, LuCamera, LuTrash2, LuUpload } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoChange?: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  size = 'lg',
}: ProfilePhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setPhotoUrl(data.avatarUrl);
      onPhotoChange?.(data.avatarUrl);
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/photo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      setPhotoUrl(null);
      onPhotoChange?.(null);
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative group">
        {/* Avatar Circle */}
        <div
          className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-lg relative`}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Profile"
              width={160}
              height={160}
              className="w-full h-full object-cover"
            />
          ) : (
            <LuUser className={`${iconSizes[size]} text-muted-foreground`} />
          )}

          {/* Overlay on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowMenu(true)}
          >
            <LuCamera className="w-8 h-8 text-white" />
          </motion.div>
        </div>

        {/* Edit Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenu(true)}
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background"
          aria-label="Change photo"
        >
          <LuCamera className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Menu Modal */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl z-50 w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Profile Photo</h3>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors disabled:opacity-50 text-left"
                >
                  <LuUpload className="w-5 h-5" />
                  <span>{photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {photoUrl && (
                  <button
                    onClick={deletePhoto}
                    disabled={isUploading}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-600 transition-colors disabled:opacity-50 text-left"
                  >
                    <LuTrash2 className="w-5 h-5" />
                    <span>Remove Photo</span>
                  </button>
                )}

                <button
                  onClick={() => setShowMenu(false)}
                  disabled={isUploading}
                  className="w-full px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {isUploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>{photoUrl ? 'Removing...' : 'Uploading...'}</span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
