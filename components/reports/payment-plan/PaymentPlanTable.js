'use client'

import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'
import { computeColumnTotals, formatColumnTotal } from '@/lib/reports/reportTotals'

export const PAYMENT_PLAN_COLUMNS = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'studioName', label: 'Studio' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'programName', label: 'Program' },
  { key: 'planTotal', label: 'Plan Total', total: true },
  { key: 'installmentsPaid', label: 'Installments Paid', total: true },
  { key: 'installmentsRemaining', label: 'Installments Remaining', total: true },
  { key: 'nextDueDate', label: 'Next Due Date' },
  { key: 'paymentStatus', label: 'Payment Status' },
]

export function PaymentPlanTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payment plans found for the selected filters.</p>
  }

  const totals = computeColumnTotals(rows, PAYMENT_PLAN_COLUMNS)

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {PAYMENT_PLAN_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {PAYMENT_PLAN_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{formatReportCellValue(row[col.key], col, timeZone)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            {PAYMENT_PLAN_COLUMNS.map((col, idx) => (
              <TableCell key={col.key} className={reportTableCellClass}>
                {idx === 0 ? 'Page Total' : col.key in totals ? formatColumnTotal(totals[col.key]) : ''}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </ReportTableShell>
  )
}
