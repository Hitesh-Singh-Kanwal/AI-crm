'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'

export const PAYMENT_PLAN_COLUMNS = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'studioName', label: 'Studio' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'programName', label: 'Program' },
  { key: 'planTotal', label: 'Plan Total' },
  { key: 'installmentsPaid', label: 'Installments Paid' },
  { key: 'installmentsRemaining', label: 'Installments Remaining' },
  { key: 'nextDueDate', label: 'Next Due Date' },
  { key: 'paymentStatus', label: 'Payment Status' },
]

export function PaymentPlanTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payment plans found for the selected filters.</p>
  }

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
                <TableCell key={col.key} className={reportTableCellClass}>{formatReportCellValue(row[col.key], col)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
