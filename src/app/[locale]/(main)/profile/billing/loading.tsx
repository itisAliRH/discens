import { Skeleton } from '@/components/ui/Skeleton';

export default function BillingLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Current Plan Card Skeleton */}
      <div className="mb-12">
        <div className="rounded-2xl border-2 border-border bg-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Skeleton */}
      <div className="mb-12">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-border bg-card p-6">
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-6" />
              <Skeleton className="h-10 w-full mb-6" />
              <Skeleton className="h-10 w-full mb-6" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-5 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
