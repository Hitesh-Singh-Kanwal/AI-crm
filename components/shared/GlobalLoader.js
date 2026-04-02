'use client'

import { cn } from '@/lib/utils'

const SIZE_PRESET_PX = {
  xs: 18,
  sm: 24,
  md: 32,
  lg: 42,
  xl: 54,
}

function resolveBlobPx(size) {
  if (typeof size === 'number' && Number.isFinite(size)) {
    return Math.max(16, Math.min(72, size))
  }
  return SIZE_PRESET_PX[size] ?? SIZE_PRESET_PX.md
}

function resolveBlobCssVar(size, variant) {
  // Allow numeric sizes (e.g. size={32}) to behave like fixed px.
  if (typeof size === 'number' && Number.isFinite(size)) {
    const px = resolveBlobPx(size)
    return `${px}px`
  }

  // Use clamp so loaders scale consistently across screen sizes.
  const centerMap = {
    xs: 'clamp(14px, 1.8vw, 18px)',
    sm: 'clamp(18px, 2.4vw, 24px)',
    md: 'clamp(22px, 2.9vw, 32px)',
    lg: 'clamp(28px, 3.4vw, 42px)',
    xl: 'clamp(34px, 4.0vw, 54px)',
  }

  const inlineMap = {
    xs: 'clamp(12px, 1.6vw, 14px)',
    sm: 'clamp(14px, 2.0vw, 18px)',
    md: 'clamp(16px, 2.2vw, 22px)',
    lg: 'clamp(18px, 2.6vw, 28px)',
    xl: 'clamp(22px, 3.0vw, 34px)',
  }

  const map = variant === 'inline' ? inlineMap : centerMap
  return map[size] ?? map.md
}

const blobShadow =
  '0 10px 28px -8px hsl(var(--primary) / 0.35), 0 4px 12px -4px hsl(var(--primary) / 0.18), inset 0 1px 0 0 rgba(255,255,255,0.35)'

/**
 * Liquid blob loader (split / merge + trail), themed to studio primary / gradient.
 *
 * @param {number|'xs'|'sm'|'md'|'lg'|'xl'} [size] — blob base size in px, or preset (default md ≈ 32)
 * @param {boolean} [full] — min-h-screen + centered (page shell)
 * @param {'center'|'inline'} [variant]
 */
export default function GlobalLoader({
  size = 'md',
  className = '',
  text = null,
  full = false,
  variant = 'center',
  'aria-label': ariaLabel = 'Loading',
}) {
  const cssVars = { ['--gl-blob-size']: resolveBlobCssVar(size, variant) }

  const blobStage = (
    <div
      className="relative isolate mx-auto overflow-visible"
      style={{
        width: 'calc(var(--gl-blob-size) * 2)',
        height: 'var(--gl-blob-size)',
        ...cssVars,
      }}
      aria-hidden
    >
      {/* Soft ambient glow — breathes with blobs */}
      <span
        className={cn(
          'global-loader-ambient pointer-events-none absolute left-1/2 top-1/2 z-0 block rounded-[45%]',
          'h-[130%] min-h-[20px] w-[90%] min-w-[24px]',
          'bg-[radial-gradient(ellipse_72%_55%_at_50%_48%,hsl(var(--primary)/0.28),transparent_72%)]',
          'blur-md motion-reduce:!animate-none'
        )}
        aria-hidden
      />

      {/* Primary blob */}
      <div
        className={cn(
          'global-loader-blob1 absolute z-[2] overflow-hidden rounded-full',
          'ring-1 ring-white/25 ring-inset',
          'bg-gradient-to-br from-[var(--studio-primary)] via-[hsl(var(--primary))] to-[var(--studio-gradient)]'
        )}
        style={{
          width: 'calc(var(--gl-blob-size) * 0.8)',
          height: 'calc(var(--gl-blob-size) * 0.8)',
          left: '10%',
          top: '10%',
          boxShadow: blobShadow,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/[0.07] to-transparent mix-blend-soft-light" />
        <span className="pointer-events-none absolute -left-[20%] -top-[20%] h-[70%] w-[70%] rounded-full bg-white/15 blur-md" />
      </div>

      {/* Secondary blob */}
      <div
        className={cn(
          'global-loader-blob2 absolute z-[2] overflow-hidden rounded-full',
          'ring-1 ring-white/20 ring-inset',
          'bg-gradient-to-tl from-[var(--studio-gradient)] via-[hsl(var(--primary))] to-[var(--studio-primary)]'
        )}
        style={{
          width: 'calc(var(--gl-blob-size) * 0.6)',
          height: 'calc(var(--gl-blob-size) * 0.6)',
          right: '5%',
          top: '20%',
          boxShadow: blobShadow,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-[var(--studio-primary)]/[0.12] mix-blend-soft-light" />
        <span className="pointer-events-none absolute -right-[15%] bottom-0 h-[55%] w-[55%] rounded-full bg-[var(--studio-primary-light)]/40 blur-md" />
      </div>

      {/* Connecting energy */}
      <div
        className={cn(
          'global-loader-trail absolute z-[1] rounded-full',
          'bg-gradient-to-r from-transparent via-brand/50 to-transparent',
          'motion-reduce:!animate-none',
          'blur-[0.5px]'
        )}
        style={{
          width: 'calc(var(--gl-blob-size) * 1.2)',
          height: 'max(7px, calc(var(--gl-blob-size) * 0.12))',
          top: '40%',
          left: '20%',
        }}
      />
    </div>
  )

  if (variant === 'inline') {
    return (
      <span
        className={cn('inline-flex items-center justify-center gap-3', className)}
        style={cssVars}
        role="status"
        aria-label={ariaLabel}
      >
        {blobStage}
        {text ? (
          <span className="text-xs font-medium leading-snug tracking-tight text-muted-foreground sm:text-sm">
            {text}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <div
      className={cn(
        full ? 'flex min-h-screen items-center justify-center' : '',
        'w-full px-4 text-center',
        className
      )}
      style={cssVars}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className="flex flex-col items-center gap-5">
        {blobStage}
        {text ? (
          <p className="max-w-sm text-sm font-medium leading-relaxed tracking-tight text-muted-foreground sm:text-base">
            {text}
          </p>
        ) : null}
      </div>
    </div>
  )
}
