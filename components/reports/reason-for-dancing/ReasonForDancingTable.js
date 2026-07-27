'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'

export const REASON_FOR_DANCING_COLUMNS = [
  { key: 'studentName', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'reasonForDancing', label: 'Reason for Dancing' },
  { key: 'studioName', label: 'Studio' },
  { key: 'dateCreated', label: 'Date Created' },
]

export function ReasonForDancingTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No leads or students found for the selected filters.</p>
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
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {REASON_FOR_DANCING_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{row[col.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
