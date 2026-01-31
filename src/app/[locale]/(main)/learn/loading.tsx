import { Skeleton } from '@/components/ui/Skeleton';

export default function LearnLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center space-y-6">
        {/* Animated icon */}
        <div className="relative inline-block">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-6 h-6 rounded" />
          </div>
        </div>
        
        {/* Animated text */}
        <div className="space-y-3">
          <div className="animate-pulse">
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <div className="animate-pulse delay-100">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
        </div>
      </div>
    </div>
  );
}
