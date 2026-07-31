'use client'

import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'
import { computeColumnTotals, formatColumnTotal } from '@/lib/reports/reportTotals'

export const SALES_CASH_COLUMNS = [
  { key: 'transactionType', label: 'Transaction Type' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'studioName', label: 'Studio' },
  { key: 'transactionDate', label: 'Transaction Date' },
  { key: 'saleAmount', label: 'Sale Amount', total: true },
  { key: 'cashCollected', label: 'Cash Collected', total: true },
  { key: 'tipAmount', label: 'Tip Amount', total: true },
  { key: 'discountAmount', label: 'Discount Amount', total: true },
  { key: 'refundAmount', label: 'Refund Amount', total: true },
  { key: 'programName', label: 'Program' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'remainingBalance', label: 'Remaining Balance' },
]

export function SalesCashTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions found for the selected filters.</p>
  }

  const totals = computeColumnTotals(rows, SALES_CASH_COLUMNS)

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {SALES_CASH_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {SALES_CASH_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {formatReportCellValue(row[col.key], col, timeZone)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            {SALES_CASH_COLUMNS.map((col, idx) => (
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
