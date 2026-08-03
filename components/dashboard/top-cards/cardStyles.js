/**
 * Studio CRM – Top card design tokens (Figma node 300-27862).
 * Font: Inter (loaded in app/globals.css).
 * Colors align with Studio CRM Figma design system.
 */
export const CARD = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  background: 'hsl(var(--card))',
  borderRadius: 10,
  border: '1px solid hsl(var(--border))',
  boxShadow: '0px 1px 3px 0px hsl(var(--foreground) / 0.08)',
}

/** Card title – 16px bold, dark grey (all 4 cards) */
export const LABEL = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1.45,
  color: 'hsl(var(--muted-foreground))',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

/** New Leads card title – 16px bold, purple */
export const LABEL_PRIMARY = {
  ...LABEL,
  color: 'var(--studio-primary)',
}

/** All card numbers – 45px bold, black (all 4 cards) */
export const VALUE_DARK = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 45,
  lineHeight: 1.2,
  marginTop: 8,
  color: 'hsl(var(--foreground))',
}

export const TREND_POSITIVE = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: 1.4,
  color: 'hsl(var(--success))',
}

export const TREND_NEGATIVE = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: 1.4,
  color: 'hsl(var(--destructive))',
}

export const ICON_POSITIVE = 'hsl(var(--success))'
export const ICON_NEGATIVE = 'hsl(var(--destructive))'
