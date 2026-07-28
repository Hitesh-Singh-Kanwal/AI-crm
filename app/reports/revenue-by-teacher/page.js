'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { RevenueByTeacherTable, REVENUE_BY_TEACHER_COLUMNS } from '@/components/reports/revenue-by-teacher/RevenueByTeacherTable'

export default function RevenueByTeacherReportPage() {
  return (
    <ReportPageShell
      slug="revenue-by-teacher"
      title="Revenue by Teacher"
      subtitle="Revenue and performance grouped by teacher, studio, or program"
      columns={REVENUE_BY_TEACHER_COLUMNS}
      showLeadSource={false}
      showGroupBy
      TableComponent={RevenueByTeacherTable}
      drillTitle="Performance Detail"
      summaryKeys={[{ key: 'totalRevenue', label: 'Total Revenue' }]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Name:</strong> {detail.entityName}</p>
          <p><strong>Revenue Generated:</strong> {detail.revenueGenerated}</p>
          <p><strong>Retention %:</strong> {detail.retentionPct}</p>
        </div>
      )}
    />
  )
}
