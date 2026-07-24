'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const OUTSTANDING_BALANCE_COLUMNS = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'studioName', label: 'Studio' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'programName', label: 'Program' },
  { key: 'originalSaleAmount', label: 'Original Sale Amount' },
  { key: 'successfulPayments', label: 'Successful Payments' },
  { key: 'credits', label: 'Credits' },
  { key: 'refundAdjustments', label: 'Refund Adjustments' },
  { key: 'outstandingBalance', label: 'Outstanding Balance' },
]

export function OutstandingBalanceTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances found for the selected filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {OUTSTANDING_BALANCE_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick(row)}>
            {OUTSTANDING_BALANCE_COLUMNS.map((col) => (
              <TableCell key={col.key}>{row[col.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
