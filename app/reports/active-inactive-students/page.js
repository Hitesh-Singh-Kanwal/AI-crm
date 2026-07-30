'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { ActiveInactiveStudentsTable, ACTIVE_INACTIVE_STUDENTS_COLUMNS } from '@/components/reports/active-inactive-students/ActiveInactiveStudentsTable'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'

export default function ActiveInactiveStudentsReportPage() {
  return (
    <ReportPageShell
      slug="active-inactive-students"
      title="Active and Inactive Student Report"
      subtitle="Student activity status based on recent and upcoming lessons"
      columns={ACTIVE_INACTIVE_STUDENTS_COLUMNS}
      showLeadSource={false}
      showActiveWindow={true}
      TableComponent={ActiveInactiveStudentsTable}
      drillTitle="Student Detail"
      summaryKeys={[
        { key: 'activeCount', label: 'Active' },
        { key: 'inactiveCount', label: 'Inactive' },
      ]}
      renderDrill={(detail, timeZone) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Student:</strong> {detail.studentName}</p>
          <p><strong>Status:</strong> {detail.status}</p>
          <p><strong>Last Lesson:</strong> {formatReportCellValue(detail.lastLessonDate, {}, timeZone)}</p>
        </div>
      )}
    />
  )
}
