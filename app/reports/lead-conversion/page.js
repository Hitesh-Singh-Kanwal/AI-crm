'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { LeadConversionTable, LEAD_CONVERSION_COLUMNS } from '@/components/reports/lead-conversion/LeadConversionTable'

export default function LeadConversionReportPage() {
  return (
    <ReportPageShell
      slug="lead-conversion"
      title="Lead Conversion Report"
      subtitle="Lead-to-sale funnel by source and teacher"
      columns={LEAD_CONVERSION_COLUMNS}
      showLeadSource={true}
      TableComponent={LeadConversionTable}
      drillTitle="Lead Detail"
      summaryKeys={[{ key: 'conversionRatePct', label: 'Conversion Rate' }]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Lead:</strong> {detail.leadName}</p>
          <p><strong>Source:</strong> {detail.leadSource}</p>
          <p><strong>Sale Amount:</strong> {detail.saleAmount}</p>
        </div>
      )}
    />
  )
}
