/** Recharts strokes/tooltip — uses CSS variables so charts respect light/dark mode */

export const chartGridStroke = 'hsl(var(--border))'
export const chartAxisStroke = 'hsl(var(--muted-foreground))'

export const rechartsTooltipContentStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--popover-foreground))',
}

export const rechartsTooltipCursor = { fill: 'hsl(var(--muted))', opacity: 0.4 }

// Recharts colors each tooltip row using the series' own fill/stroke by default,
// which can be illegible (e.g. a light bar color on a light tooltip background).
export const rechartsTooltipItemStyle = { color: 'hsl(var(--popover-foreground))' }
