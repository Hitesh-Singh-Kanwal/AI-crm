export function ReportTableShell({ children }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">{children}</div>
}

export const reportTableHeadClass =
  'whitespace-nowrap bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'
export const reportTableRowClass = 'cursor-pointer even:bg-muted/20'
export const reportTableCellClass = 'whitespace-nowrap text-sm'
