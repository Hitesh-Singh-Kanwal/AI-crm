'use client'

import { cn } from '@/lib/utils'
import GlobalLoader from './GlobalLoader'

/**
 * Apple-style Loading Spinner Component
 * Provides a smooth, elegant loading animation matching Apple's design language
 */
export default function LoadingSpinner({ size = 'md', className = '', text = null }) {
  return (
    <GlobalLoader
      size={size}
      className={className}
      text={text}
      variant="center"
    />
  )
}

/**
 * Apple-style Dot Loading Spinner (alternative style)
 * Three dots that bounce up and down
 */
export function DotSpinner({ 
  size = 'md',
  className = '',
  text = null
}) {
  const dotSizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex items-center gap-1.5">
        <div 
          className={cn('rounded-full bg-brand animate-bounce', dotSizeClasses[size] || dotSizeClasses.md)}
          style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
        />
        <div 
          className={cn('rounded-full bg-brand animate-bounce', dotSizeClasses[size] || dotSizeClasses.md)}
          style={{ animationDelay: '160ms', animationDuration: '1.4s' }}
        />
        <div 
          className={cn('rounded-full bg-brand animate-bounce', dotSizeClasses[size] || dotSizeClasses.md)}
          style={{ animationDelay: '320ms', animationDuration: '1.4s' }}
        />
      </div>
      {text && (
        <p className="mt-4 text-sm text-slate-500">{text}</p>
      )}
    </div>
  )
}
