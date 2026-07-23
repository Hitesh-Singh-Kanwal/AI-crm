'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import { buildLeadQueryParams } from '@/lib/lead-filter-fields'
import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'

/** YYYY-MM-DD, matching the value shape the Leads page date filters send. */
function dateOnly(d) {
  return d.toISOString().slice(0, 10)
}

function rangeDates(days) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: dateOnly(from), to: dateOnly(to) }
}

async function countLeadsByUploadType(uploadType, from, to) {
  // Reuse the same query-building path the Leads page uses (buildLeadQueryParams →
  // buildQueryParamsFromConditionFilters) so this sends the exact same request
  // shape — including createdFrom/createdTo as flat query params, which is what
  // the backend actually reads for date-range filtering (not the conditions blob).
  const params = buildLeadQueryParams({
    page: 1,
    limit: 1,
    filters: {
      conditions: [
        { field: 'uploadType', operator: 'eq', value: uploadType },
        { field: 'createdFrom', operator: 'eq', value: from },
        { field: 'createdTo', operator: 'eq', value: to },
      ],
      conditionLogic: 'AND',
    },
  })

  const res = await api.get(`/api/lead?${params.toString()}`)
  const pagination = res.pagination ?? res.data?.pagination
  const total = res.success ? pagination?.total ?? 0 : 0
  return { uploadType, total }
}

/**
 * Leads by Source, keyed off `Lead.uploadType` (manual, bulk_upload,
 * form_submission, incoming_sms/email/whatsapp/call) — the only lead-source
 * taxonomy that's actually populated today. Self-fetches per-type counts
 * from the existing leads list endpoint rather than a dedicated aggregation
 * endpoint, since no backend "leads by source" report exists yet.
 */
export default function LeadsByUploadTypeWidget({ rangeDays = 30, onRangeChange }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    const { from, to } = rangeDates(rangeDays)

    Promise.all(UPLOAD_TYPE_OPTIONS.map((type) => countLeadsByUploadType(type, from, to))).then((results) => {
      if (cancelled) return
      setRows(results.filter((r) => r.total > 0))
    })

    return () => {
      cancelled = true
    }
  }, [rangeDays])

  const loading = rows === null
  const data = [...(rows || [])].sort((a, b) => b.total - a.total)

  return (
    <Card>
      <WidgetHeader title="Leads by Source" rangeDays={rangeDays} onRangeChange={onRangeChange} />
      {loading ? (
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted/40" />
      ) : data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList
            rows={data.map((r) => ({ label: formatFieldDisplayValue(r.uploadType), value: r.total }))}
            valueFormatter={(v) => v.toLocaleString()}
          />
        </div>
      ) : (
        <EmptyChart message="No leads in this period." />
      )}
    </Card>
  )
}
