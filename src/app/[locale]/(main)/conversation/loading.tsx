import { Skeleton } from '@/components/ui/Skeleton';

export default function ConversationLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-8rem)]">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-6 mb-4">
          <div className="space-y-4">
            {/* AI message skeleton */}
            <div className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>

            {/* User message skeleton */}
            <div className="flex gap-3 justify-end">
              <div className="flex-1 space-y-2 flex flex-col items-end">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            </div>

            {/* AI message skeleton */}
            <div className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="w-12 h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
