'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useReportData } from '@/lib/hooks/useReportData'
import { SalesCashTable } from '@/components/reports/sales-cash/SalesCashTable'
import { LeadConversionTable } from '@/components/reports/lead-conversion/LeadConversionTable'
import { ActiveInactiveStudentsTable } from '@/components/reports/active-inactive-students/ActiveInactiveStudentsTable'
import { ReasonForDancingTable } from '@/components/reports/reason-for-dancing/ReasonForDancingTable'
import { GroupAttendanceTable } from '@/components/reports/group-attendance/GroupAttendanceTable'

const REPORT_TABLES = {
  'sales-cash': SalesCashTable,
  'lead-conversion': LeadConversionTable,
  'active-inactive-students': ActiveInactiveStudentsTable,
  'reason-for-dancing': ReasonForDancingTable,
  'group-attendance': GroupAttendanceTable,
}

export function OverviewDrillSheet({ open, onClose, reportSlug, filters, title }) {
  const TableComponent = reportSlug ? REPORT_TABLES[reportSlug] : null
  const { rows, isLoading, error, mutate } = useReportData(reportSlug || 'sales-cash', filters || {}, {
    enabled: open && Boolean(reportSlug),
  })

  return (
    <Sheet open={open} onClose={onClose} side="right" width="min(720px, 90vw)">
      <SheetContent onClose={onClose} side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="max-h-[80vh] overflow-y-auto p-4">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <div className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-foreground">
                Couldn&apos;t load the underlying rows. <span className="text-muted-foreground">{error.message}</span>
              </p>
              <button className="text-sm underline" onClick={() => mutate()}>Retry</button>
            </div>
          )}
          {!isLoading && !error && TableComponent && <TableComponent rows={rows} onRowClick={() => {}} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
