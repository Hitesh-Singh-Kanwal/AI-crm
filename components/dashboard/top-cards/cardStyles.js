/**
 * Studio CRM – Top card design tokens (Figma node 300-27862).
 * Font: Inter (loaded in app/globals.css).
 * Colors align with Studio CRM Figma design system.
 */
export const CARD = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  background: '#FFFFFF',
  borderRadius: 10,
  border: '1px solid #F1F5F9',
  boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.08)',
}

/** Card title – 16px bold, dark grey (all 4 cards) */
export const LABEL = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1.45,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

/** New Leads card title – 16px bold, purple */
export const LABEL_PRIMARY = {
  ...LABEL,
  color: 'var(--studio-primary)', // #9224EF
}

/** All card numbers – 45px bold, black (all 4 cards) */
export const VALUE_DARK = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 45,
  lineHeight: 1.2,
  marginTop: 8,
  color: '#0F172A',
}

export const TREND_POSITIVE = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: 1.4,
  color: '#059669',
}

export const TREND_NEGATIVE = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: 1.4,
  color: '#DC2626',
}

export const ICON_POSITIVE = '#059669'
export const ICON_NEGATIVE = '#DC2626'
