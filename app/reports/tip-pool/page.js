'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { TipPoolTable, TIP_POOL_COLUMNS } from '@/components/reports/tip-pool/TipPoolTable'

export default function TipPoolReportPage() {
  return (
    <ReportPageShell
      slug="tip-pool"
      title="Tip Pool"
      subtitle="Tips collected into the shared pool, ready to be split — excluded from teacher commissions"
      columns={TIP_POOL_COLUMNS}
      showLeadSource={false}
      TableComponent={TipPoolTable}
      summaryKeys={[
        { key: 'totalAmount', label: 'Pool Total' },
        { key: 'tipCount', label: 'Tips' },
        { key: 'averageTip', label: 'Average Tip' },
      ]}
    />
  )
}
