import { Loader2 } from 'lucide-react'

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'text' | 'chat'
  count?: number
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-xl bg-slate-800/50"
          >
            <div className="h-full w-full bg-gradient-to-br from-slate-800/50 via-slate-700/30 to-slate-800/50 bg-[length:200%_200%] animate-shimmer" />
          </div>
        ))}
      </>
    )
  }

  if (variant === 'list') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg bg-slate-800/50 p-3 animate-pulse"
          >
            <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-700/50" />
              <div className="h-3 w-full rounded bg-slate-700/30" />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-slate-700/50"
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'chat') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}
          >
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-700/50 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-slate-700/50 animate-pulse" />
              <div className="rounded-lg bg-slate-800/50 p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-slate-700/30" />
                  <div className="h-3 w-5/6 rounded bg-slate-700/30" />
                  <div className="h-3 w-4/6 rounded bg-slate-700/30" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-purple-500`} />
      {message && <p className="text-sm text-slate-400">{message}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <LoadingSpinner size="lg" message="กำลังโหลด..." />
    </div>
  )
}
