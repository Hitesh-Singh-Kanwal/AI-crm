'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { formatLeadStageLabel, getLeadStageColor } from '@/lib/lead-stages'
import { formatReasonLabel } from '@/lib/dynamic-list-normalize'
import StatusColorBadge from '@/components/shared/StatusColorBadge'

/** Past attempts rendered before collapsing — the array has no backend cap. */
const RECENT_PAST_ATTEMPTS = 3

/** Total form attempts: every archived entry plus the lead's current state. */
export function getLeadAttemptCount(lead) {
  const history = Array.isArray(lead?.engagementHistory) ? lead.engagementHistory : []
  return history.length + 1
}

function ordinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`
}

/**
 * Each history entry is the state that was on file until the resubmission at its
 * `createdDate`. So attempt 1 began at the lead's `createdAt`, attempt k began at
 * entry k-2's `createdDate`, and the current (top-level) state began at the last
 * entry's `createdDate`.
 */
export function buildEngagementTimeline(lead) {
  const history = Array.isArray(lead?.engagementHistory) ? lead.engagementHistory : []
  if (history.length === 0) return []
  const snapshot = (source) =>
    Object.fromEntries(TIMELINE_FIELDS.map(({ key }) => [key, source?.[key] ?? null]))
  const attempts = [
    ...history.map((entry, i) => ({
      attempt: i + 1,
      date: i === 0 ? lead.createdAt : history[i - 1].createdDate,
      // Entries archived before the snapshot was widened only carry stage/reason/email.
      legacy: entry.name == null,
      values: snapshot(entry),
      current: false,
    })),
    {
      attempt: history.length + 1,
      date: history[history.length - 1].createdDate,
      legacy: false,
      values: snapshot(lead),
      current: true,
    },
  ]
  return attempts.map((item, i) => {
    const prev = attempts[i - 1]
    const changed = new Set()
    if (prev) {
      for (const { key, legacySafe } of TIMELINE_FIELDS) {
        if ((prev.legacy || item.legacy) && !legacySafe) continue
        if (normalize(prev.values[key]) !== normalize(item.values[key])) changed.add(key)
      }
    }
    return { ...item, changed }
  })
}

/** `legacySafe` fields were recorded on every history entry, including old ones. */
const TIMELINE_FIELDS = [
  { key: 'name', label: 'name' },
  { key: 'email', label: 'email', legacySafe: true },
  { key: 'stage', label: 'stage', legacySafe: true },
  { key: 'reason', label: 'reason', legacySafe: true },
  { key: 'location', label: 'studio' },
  { key: 'utm_source', label: 'source' },
  { key: 'utm_url', label: 'page' },
]

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function Row({ label, changed, children }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 text-xs">
      <span className="font-mono text-muted-foreground">{label}</span>
      <span className={cn('flex min-w-0 items-start gap-1.5 text-foreground', changed && 'font-medium')}>
        <span className="min-w-0 break-words">{children || '—'}</span>
        {changed && (
          <span className="shrink-0 rounded bg-amber-100 px-1 py-px text-[10px] font-medium leading-tight text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            updated
          </span>
        )}
      </span>
    </div>
  )
}

function fieldValue(key, value, { stages, leadReasons }) {
  if (value == null || value === '') return null
  if (key === 'stage') {
    return (
      <StatusColorBadge
        color={getLeadStageColor(value, stages)}
        className="px-2 py-0.5 text-[11px] font-medium"
      >
        {formatLeadStageLabel(value, stages)}
      </StatusColorBadge>
    )
  }
  if (key === 'reason') return formatReasonLabel(value, leadReasons)
  if (key === 'utm_source') return value === 'google-add' ? 'Google Ads' : value === 'website' ? 'Website' : value
  if (key === 'utm_url') {
    return (
      <span className="block truncate" title={value}>
        {value}
      </span>
    )
  }
  return value
}

export default function LeadEngagementHistory({ lead, stages, leadReasons = [] }) {
  const [expanded, setExpanded] = useState(false)
  const timeline = buildEngagementTimeline(lead)
  if (timeline.length === 0) return null

  const pastCount = timeline.length - 1
  const hiddenCount = expanded ? 0 : Math.max(0, pastCount - RECENT_PAST_ATTEMPTS)
  const visible = timeline.slice(hiddenCount)

  return (
    <div className="border-t pt-4">
      <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        Engagement history
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        This lead has submitted the form {timeline.length} times. Each attempt shows its details, with
        fields that changed from the previous attempt marked as updated.
      </p>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mb-3 ml-6 text-xs font-medium text-primary hover:underline"
        >
          Show {hiddenCount} earlier attempt{hiddenCount === 1 ? '' : 's'}
        </button>
      )}

      <ol className="relative ml-1.5 space-y-4 border-l border-border pl-5">
        {visible.map((item) => (
          <li key={item.attempt} className="relative">
            <span
              className={cn(
                'absolute -left-[26px] top-0.5 h-3 w-3 rounded-full border-2',
                item.current ? 'border-primary bg-primary' : 'border-primary bg-background'
              )}
              aria-hidden
            />
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {formatDate(item.date) || 'Unknown date'} — {item.current ? 'Current' : `${ordinal(item.attempt)} attempt`}
            </p>
            <div
              className={cn(
                'max-w-sm space-y-1.5 rounded-lg border bg-card px-3 py-2.5',
                item.current ? 'border-primary/60' : 'border-border'
              )}
            >
              {TIMELINE_FIELDS.filter(({ legacySafe }) => !item.legacy || legacySafe).map(({ key, label }) => (
                <Row key={key} label={label} changed={item.changed.has(key)}>
                  {fieldValue(key, item.values[key], { stages, leadReasons })}
                </Row>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {expanded && pastCount > RECENT_PAST_ATTEMPTS && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 ml-6 text-xs font-medium text-primary hover:underline"
        >
          Show fewer
        </button>
      )}
    </div>
  )
}
