'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuTriangleAlert, LuX } from 'react-icons/lu';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'danger' | 'primary';
  requireTextConfirmation?: boolean;
  confirmationText?: string;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'danger',
  requireTextConfirmation = false,
  confirmationText = 'DELETE',
  isLoading = false,
}: ConfirmationModalProps) {
  const [confirmationInput, setConfirmationInput] = React.useState('');

  const canConfirm = requireTextConfirmation
    ? confirmationInput === confirmationText
    : true;

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      onConfirm();
      setConfirmationInput('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${
                  confirmButtonVariant === 'danger'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <LuTriangleAlert className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{title}</h2>
                  <p className="text-muted-foreground text-sm">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              {/* Text Confirmation Input */}
              {requireTextConfirmation && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="font-mono font-bold">{confirmationText}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    placeholder={confirmationText}
                    autoFocus
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-xl border border-border hover:bg-accent transition-colors font-medium disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isLoading}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmButtonVariant === 'danger'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? 'Processing...' : confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
