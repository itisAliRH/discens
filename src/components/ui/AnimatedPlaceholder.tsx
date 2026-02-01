'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface AnimatedPlaceholderProps {
  examples: string[];
  isVisible: boolean;
}

export function AnimatedPlaceholder({ examples, isVisible }: AnimatedPlaceholderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const showingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorBlinkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (showingTimeoutRef.current) {
      clearTimeout(showingTimeoutRef.current);
      showingTimeoutRef.current = null;
    }
    if (cursorBlinkIntervalRef.current) {
      clearInterval(cursorBlinkIntervalRef.current);
      cursorBlinkIntervalRef.current = null;
    }
  };

  // Reset animation when visibility changes
  useEffect(() => {
    if (!isVisible) {
      cleanup();
      setDisplayText('');
      setIsTyping(false);
      setShowCursor(false);
    } else {
      // Start from a random index when becoming visible
      setCurrentIndex(Math.floor(Math.random() * examples.length));
    }

    return cleanup;
  }, [isVisible, examples.length]);

  // Main animation effect
  useEffect(() => {
    if (!isVisible || examples.length === 0) return;

    const currentExample = examples[currentIndex];
    const fullText = `e.g., ${currentExample}`;
    let charIndex = 0;

    // Start typing
    setIsTyping(true);
    setShowCursor(true);
    setDisplayText('');

    // Start cursor blink
    cursorBlinkIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    // Typing animation
    typingIntervalRef.current = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayText(fullText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        // Typing complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);

        // Hold the full text for 2.5s before fading
        showingTimeoutRef.current = setTimeout(() => {
          // Fade out will be handled by AnimatePresence
          // After fade completes, advance to next example
          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % examples.length);
            setDisplayText('');
          }, 300); // Match fade duration
        }, 2500);
      }
    }, 40);

    return cleanup;
  }, [currentIndex, isVisible, examples]);

  if (!isVisible || examples.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start p-3" aria-hidden="true">
      <AnimatePresence mode="wait">
        {displayText && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="select-none text-sm text-muted-foreground"
          >
            {displayText}
            {showCursor && <span className="ml-0.5">|</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
