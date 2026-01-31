'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HoverScale } from '@/components/ui/AnimatedContainer';

export function AnimatedStatCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedActionCard({ children, href }: { children: ReactNode; href: string }) {
  return (
    <HoverScale scale={1.03}>
      {children}
    </HoverScale>
  );
}

export function AnimatedSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
