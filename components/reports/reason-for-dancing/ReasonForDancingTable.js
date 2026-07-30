'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'

export const REASON_FOR_DANCING_COLUMNS = [
  { key: 'reason', label: 'Reason' },
  { key: 'studentCount', label: 'Student Count' },
  { key: 'totalSales', label: 'Total Sales' },
  { key: 'cashCollected', label: 'Cash Collected' },
  { key: 'conversionPct', label: 'Conversion %' },
  { key: 'studioName', label: 'Studio' },
]

function cellValue(row, col) {
  if (col.key === 'reason') {
    return row.reason ?? row.reasonForDancing
  }
  return row[col.key]
}

export function ReasonForDancingTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No reasons found for the selected filters.</p>
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {REASON_FOR_DANCING_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id || row.reason} className={reportTableRowClass} onClick={() => onRowClick?.(row)}>
              {REASON_FOR_DANCING_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {formatReportCellValue(cellValue(row, col), col, timeZone)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
