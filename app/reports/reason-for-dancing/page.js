'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { ReasonForDancingTable, REASON_FOR_DANCING_COLUMNS } from '@/components/reports/reason-for-dancing/ReasonForDancingTable'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'

export default function ReasonForDancingReportPage() {
  return (
    <ReportPageShell
      slug="reason-for-dancing"
      title="Reason for Dancing Report"
      subtitle="Student volume and sales broken down by reason for dancing"
      columns={REASON_FOR_DANCING_COLUMNS}
      showLeadSource={false}
      TableComponent={ReasonForDancingTable}
      drillTitle="Reason Detail"
      renderDrill={(detail, timeZone) => {
        if (Array.isArray(detail?.people)) {
          return (
            <div className="space-y-3 p-4 text-sm">
              <p>
                <strong>Reason:</strong> {detail.reason}
              </p>
              <p>
                <strong>People:</strong> {detail.studentCount ?? detail.people.length}
              </p>
              <ul className="space-y-2 border-t border-border pt-3">
                {detail.people.map((person) => (
                  <li key={person.id}>
                    {person.studentName} · {person.type} · {formatReportCellValue(person.dateCreated, {}, timeZone)}
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        return (
          <div className="space-y-2 p-4 text-sm">
            <p><strong>Name:</strong> {detail.studentName}</p>
            <p><strong>Type:</strong> {detail.type}</p>
            <p><strong>Reason:</strong> {detail.reason ?? detail.reasonForDancing}</p>
          </div>
        )
      }}
    />
  )
}
