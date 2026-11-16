/**
 * Reusable loading spinner component with multiple variants
 */
import React from 'react'

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const borderClasses = {
  xs: 'border-2',
  sm: 'border-2',
  md: 'border-4',
  lg: 'border-4',
  xl: 'border-4',
}

/**
 * Animated spinner component
 * @param {{ size?: 'xs'|'sm'|'md'|'lg'|'xl', className?: string }} props
 */
export const Spinner = React.memo(({ size = 'md', className = '' }) => (
  <div
    className={`${sizeClasses[size]} ${borderClasses[size]} inline-block animate-spin rounded-full border-slate-600 border-t-indigo-500 ${className}`}
    role="status"
    aria-label="Loading"
  />
))

/**
 * Progress bar component
 * @param {{ value: number, max?: number, className?: string, showLabel?: boolean }} props
 */
export const ProgressBar = React.memo(({ value, max = 100, className = '', showLabel = true }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-right text-xs text-slate-500">{percentage.toFixed(0)}%</p>}
    </div>
  )
})

/**
 * Loading skeleton for content placeholders
 * @param {{ lines?: number, className?: string }} props
 */
export const LoadingSkeleton = React.memo(({ lines = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
    ))}
  </div>
))

/**
 * Full-page loading overlay
 * @param {{ message?: string }} props
 */
export const LoadingOverlay = React.memo(({ message = 'Loading...' }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="status">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-slate-200">{message}</p>
    </div>
  </div>
))
