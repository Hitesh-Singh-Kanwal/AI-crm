'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const LEAD_CONVERSION_COLUMNS = [
  { key: 'leadName', label: 'Lead Name' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'dateCreated', label: 'Date Created' },
  { key: 'dateBooked', label: 'Date Booked' },
  { key: 'dateOfIntro', label: 'Date of Intro' },
  { key: 'showed', label: 'Showed' },
  { key: 'sold', label: 'Sold' },
  { key: 'saleAmount', label: 'Sale Amount' },
  { key: 'teacherAssigned', label: 'Teacher Assigned' },
  { key: 'timeToConvert', label: 'Time to Convert' },
]

function formatCell(key, value) {
  if (key === 'showed' || key === 'sold') return value ? 'Yes' : 'No'
  return value
}

export function LeadConversionTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No leads found for the selected filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {LEAD_CONVERSION_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick(row)}>
            {LEAD_CONVERSION_COLUMNS.map((col) => (
              <TableCell key={col.key}>{formatCell(col.key, row[col.key])}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
