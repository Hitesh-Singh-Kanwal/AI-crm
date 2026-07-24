'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
    <Table>
      <TableHeader>
        <TableRow>
          {PAYMENT_PLAN_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick(row)}>
            {PAYMENT_PLAN_COLUMNS.map((col) => (
              <TableCell key={col.key}>{row[col.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
