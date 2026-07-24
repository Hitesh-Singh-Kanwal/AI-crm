'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const SALES_CASH_COLUMNS = [
  { key: 'transactionType', label: 'Transaction Type' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'studioName', label: 'Studio' },
  { key: 'transactionDate', label: 'Transaction Date' },
  { key: 'saleAmount', label: 'Sale Amount' },
  { key: 'cashCollected', label: 'Cash Collected' },
  { key: 'tipAmount', label: 'Tip Amount' },
  { key: 'discountAmount', label: 'Discount Amount' },
  { key: 'refundAmount', label: 'Refund Amount' },
  { key: 'programName', label: 'Program' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'remainingBalance', label: 'Remaining Balance' },
]

export function SalesCashTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions found for the selected filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {SALES_CASH_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick(row)}>
            {SALES_CASH_COLUMNS.map((col) => (
              <TableCell key={col.key}>{row[col.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
