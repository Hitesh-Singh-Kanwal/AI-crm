'use client'

import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'
import { computeColumnTotals, hasColumnTotals, formatColumnTotal } from '@/lib/reports/reportTotals'

export function GenericReportTable({ rows, columns, onRowClick, emptyLabel = 'No rows found for the selected filters.' }) {
  const timeZone = useReportTimezone()

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const showTotals = hasColumnTotals(columns)
  const totals = showTotals ? computeColumnTotals(rows, columns) : null

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id || JSON.stringify(row)}
              className={reportTableRowClass}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {formatReportCellValue(row[col.key], col, timeZone)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {showTotals && (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {idx === 0 ? 'Page Total' : col.key in totals ? formatColumnTotal(totals[col.key]) : ''}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </ReportTableShell>
  )
}
