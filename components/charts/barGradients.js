/**
 * Shared bar fills for every Recharts <BarChart>.
 *
 * Mirrors the design language: the primary series gets the Berry 500 → 700
 * vertical gradient, secondary series get the pale Berry 200 → 100 wash.
 * Colours come from --bar-gradient-* / --bar-soft-*, so both flip with the theme.
 *
 * Put {BAR_GRADIENT_DEFS} inside the chart, then fill bars with BAR_FILL /
 * BAR_FILL_SOFT. The gradient ids are document-global but the definitions are
 * identical everywhere, so repeating them across charts on one page is safe.
 *
 * NOTE: this is an element constant, not a component, and must stay that way.
 * Recharts renders its children through its own lookup — a custom component
 * wrapper is dropped silently, taking the <defs> with it and leaving every
 * gradient-filled bar invisible. A plain <defs> element does get rendered.
 */
export const BAR_GRADIENT_ID = 'chartBarBerry'
export const BAR_GRADIENT_SOFT_ID = 'chartBarBerrySoft'

export const BAR_FILL = `url(#${BAR_GRADIENT_ID})`
export const BAR_FILL_SOFT = `url(#${BAR_GRADIENT_SOFT_ID})`

export const BAR_GRADIENT_DEFS = (
  <defs>
    <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--bar-gradient-start)" />
      <stop offset="100%" stopColor="var(--bar-gradient-end)" />
    </linearGradient>
    <linearGradient id={BAR_GRADIENT_SOFT_ID} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--bar-soft-start)" />
      <stop offset="100%" stopColor="var(--bar-soft-end)" />
    </linearGradient>
  </defs>
)
