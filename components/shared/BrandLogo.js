import { cn } from '@/lib/utils'

/**
 * CADANCE AI mark — open "C" ring with the gold beat dot.
 * Drawn in white, so it expects a coloured backdrop (see BrandMark).
 */
export function BrandLogo({ size = 24, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M24.6 23.7 A11.56 11.56 0 1 1 24.6 8.26"
        fill="none"
        stroke="var(--brand-mark-ink)"
        strokeWidth="4.13"
      />
      <circle cx="24.75" cy="16" r="2.13" fill="var(--brand-gold-bright)" />
    </svg>
  )
}

/** The mark on its berry-gradient tile. `size` is the tile edge in px. */
export function BrandMark({ size = 46, className }) {
  return (
    <div
      className={cn('grid place-items-center shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'var(--brand-mark-gradient-css)',
        boxShadow: 'var(--brand-mark-shadow)',
      }}
      aria-hidden
    >
      <BrandLogo size={Math.round(size * 0.52)} />
    </div>
  )
}

/**
 * Full brand lockup: mark, CADANCE·AI wordmark, and the "Studio Intelligence"
 * tagline. `tone="light"` is for dark/coloured backdrops (sidebar, auth panel);
 * `tone="default"` follows the theme's foreground colour.
 * Everything scales off `size` (the tile edge) so proportions stay fixed.
 */
export function BrandLockup({ size = 46, tone = 'light', title, className }) {
  const light = tone === 'light'
  return (
    <div
      className={cn('flex flex-col items-center gap-2.5 text-center', className)}
      title={title}
    >
      <BrandMark size={size} />
      <div>
        <div
          className={light ? 'text-white' : 'text-foreground'}
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 500,
            fontSize: size * 0.283,
            letterSpacing: '0.06em',
            lineHeight: 1.1,
          }}
        >
          CADANCE
          <b
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              color: light ? 'var(--brand-gold-bright)' : 'var(--brand-gold)',
              fontWeight: 700,
              fontSize: size * 0.196,
              letterSpacing: '0.28em',
              verticalAlign: 2,
              marginLeft: 2,
            }}
          >
            AI
          </b>
        </div>
        <div
          className={light ? 'text-white/65' : 'text-muted-foreground'}
          style={{
            fontWeight: 500,
            fontSize: size * 0.185,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          Studio Intelligence
        </div>
      </div>
    </div>
  )
}

export default BrandLogo
