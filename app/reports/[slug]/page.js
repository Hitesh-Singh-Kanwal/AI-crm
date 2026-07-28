'use client'

import { notFound, useParams } from 'next/navigation'
import ReportPageShell from '@/components/reports/ReportPageShell'
import { GenericReportTable } from '@/components/reports/GenericReportTable'
import { getReportBySlug } from '@/lib/reports/reportCatalog'
import { getReportColumns } from '@/lib/reports/reportColumns'

/** Reports that already have dedicated `app/reports/<slug>/page.js` folders. */
const DEDICATED_SLUGS = new Set([
  'sales-cash',
  'outstanding-balance',
  'payment-plan',
  'revenue-by-teacher',
  'lead-conversion',
  'active-inactive-students',
  'reason-for-dancing',
  'group-attendance',
  'teacher-commissions',
  'callbacks',
])

export default function DynamicReportPage() {
  const params = useParams()
  const slug = params?.slug

  const meta = getReportBySlug(slug)
  const columns = getReportColumns(slug)

  if (!meta || !columns.length || DEDICATED_SLUGS.has(slug)) {
    notFound()
  }

  return (
    <ReportPageShell
      slug={slug}
      title={meta.title}
      subtitle={meta.description}
      columns={columns}
      showLeadSource={meta.filters?.includes('leadSource')}
      showComparison={Boolean(meta.hasComparison)}
      showActiveWindow={Boolean(meta.hasActiveWindow)}
      TableComponent={(props) => (
        <GenericReportTable {...props} columns={columns} emptyLabel={`No rows for ${meta.title}.`} />
      )}
    />
  )
}
