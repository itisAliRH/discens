'use client';

import Link from 'next/link';
import { LuSparkles, LuArrowRight, LuX } from '@/components/ui/icons';
import { useState } from 'react';

interface UpgradeBannerProps {
  currentTier?: string;
}

export default function UpgradeBanner({ currentTier = 'free' }: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show for free users
  if (currentTier !== 'free' || isDismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 mb-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-10" />
      
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-background/50 transition-colors"
        aria-label="Dismiss"
      >
        <LuX className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pr-8">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <LuSparkles className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">
            Unlock More Learning Power
          </h3>
          <p className="text-sm text-muted-foreground">
            Upgrade to Plus for 20 daily conversations, all quiz types, voice practice, and advanced analytics
          </p>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          <Link
            href="/profile/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
            <LuArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
