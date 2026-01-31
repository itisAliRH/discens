/**
 * Skeleton Loading Components
 * Provides various skeleton shapes for loading states
 */

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 rounded-xl bg-card border border-border ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonStat({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 rounded-xl bg-card border border-border ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="w-12 h-6" />
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };
  
  return <Skeleton className={`${sizeClasses[size]} rounded-full ${className}`} />;
}

export function SkeletonButton({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-10 w-full rounded-xl ${className}`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-3/4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-3 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonLayoutProps {
  children?: ReactNode;
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      {/* Action Cards */}
      <div className="mb-8">
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <SkeletonAvatar size="xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* XP Progress */}
      <div className="mb-8 p-4 rounded-xl bg-card border border-border">
        <div className="flex justify-between mb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      {/* Badges */}
      <div className="mb-8">
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonMemoryPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-40 h-10 rounded-xl" />
          <Skeleton className="w-40 h-10 rounded-xl" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Skeleton className="flex-1 min-w-[200px] h-10" />
        <Skeleton className="w-32 h-10" />
        <Skeleton className="w-32 h-10" />
      </div>

      {/* Materials List */}
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
