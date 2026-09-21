'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'

export const TIP_POOL_COLUMNS = [
  { key: 'transactionDate', label: 'Date' },
  { key: 'studentName', label: 'Student' },
  { key: 'studioName', label: 'Studio' },
  { key: 'paymentFor', label: 'Payment' },
  { key: 'paymentAmount', label: 'Payment Amount' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'collectedBy', label: 'Collected By' },
  { key: 'amount', label: 'Tip Amount', total: true },
]

// Rows are not clickable: every field of a pooled tip is already on the row, so a
// drill-in panel would only re-show what is visible.
export function TipPoolTable({ rows }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No pooled tips for the selected filters. Tips only land here for locations set to
        &ldquo;Tip pool&rdquo; in Settings → Studio → Locations.
      </p>
    )
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {TIP_POOL_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass}>
              {TIP_POOL_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {formatReportCellValue(row[col.key], col, timeZone)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
