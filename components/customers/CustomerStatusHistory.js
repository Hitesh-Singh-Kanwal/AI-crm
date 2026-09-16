'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  customerLifecycleColor,
  customerLifecycleLabel,
} from '@/lib/customer-lifecycle'
import { useCustomerLifecycleStatuses } from '@/lib/use-customer-lifecycle'
import StatusColorBadge from '@/components/shared/StatusColorBadge'

/**
 * A customer's status timeline, plus any override currently holding it in place.
 *
 * Exists because the generic activity log cannot answer this: its API has no entityId
 * filter, and customer activity rows record neither the from/to pair nor a reason. The
 * StatusTransition collection stores all of it — who or which rule, and why.
 *
 * Refusals and suppressions are shown, not just successful changes. "The rules wanted to
 * move this customer to Inactive but an override held it" is usually the row someone is
 * actually looking for.
 */

const OUTCOME_STYLE = {
  applied: {
    label: 'Changed',
    cls: 'bg-primary/10 text-primary',
  },
  refused_requirements: {
    label: 'Refused',
    cls: 'bg-destructive/10 text-destructive',
  },
  suppressed_override: {
    label: 'Held by override',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  conflict: {
    label: 'Conflict',
    cls: 'bg-muted text-muted-foreground',
  },
}

function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Who or what caused it — a rule name beats a bare "automation". */
function actorLabel(t) {
  if (t.ruleName) return `rule "${t.ruleName}"`
  if (t.source === 'manual') return t.actorUserID?.name || t.actorUserID?.email || 'a person'
  if (t.source === 'import') return 'an import'
  if (t.source === 'system') return 'the system'
  return 'automation'
}

function StatusChip({ status, statuses }) {
  if (!status) {
    return <span className="text-[13px] text-muted-foreground">—</span>
  }
  return (
    <StatusColorBadge
      color={customerLifecycleColor(status, statuses)}
      className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
    >
      {customerLifecycleLabel(status, statuses)}
    </StatusColorBadge>
  )
}

export default function CustomerStatusHistory({ customerID, refreshKey = 0 }) {
  const { statuses } = useCustomerLifecycleStatuses()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!customerID) return
    setLoading(true)
    const res = await api.get(`/api/customer/${customerID}/status-history`)
    // Silent on failure: this is a supporting panel, and a toast here would fire on
    // every page load for anyone whose role cannot read it.
    setData(res.success ? res.data : null)
    setLoading(false)
  }, [customerID])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (loading && !data) {
    return <p className="text-[13px] text-muted-foreground">Loading status history…</p>
  }
  if (!data) return null

  const { statusOverride, transitions = [] } = data

  return (
    <div className="space-y-4">
      {statusOverride ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
            Status overridden
            {statusOverride.byUserID?.name ? ` by ${statusOverride.byUserID.name}` : ''}
          </p>
          {statusOverride.reason && (
            <p className="mt-0.5 text-[13px] text-foreground">{statusOverride.reason}</p>
          )}
          <p className="mt-1 text-[12px] text-muted-foreground">
            Automation will not change this status while the override stands.
          </p>
        </div>
      ) : null}

      {transitions.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No status changes recorded yet.</p>
      ) : (
        <ol className="space-y-0">
          {transitions.map((t, i) => {
            const style = OUTCOME_STYLE[t.outcome] || OUTCOME_STYLE.applied
            const last = i === transitions.length - 1
            return (
              <li key={t._id} className="relative flex gap-3">
                <div className="flex w-3 shrink-0 flex-col items-center">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ${
                      t.outcome === 'applied'
                        ? 'bg-primary ring-primary/10'
                        : t.outcome === 'refused_requirements'
                          ? 'bg-destructive ring-destructive/10'
                          : t.outcome === 'suppressed_override'
                            ? 'bg-amber-500 ring-amber-500/15'
                            : 'bg-muted-foreground ring-muted'
                    }`}
                  />
                  {!last && <span className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className={`min-w-0 flex-1 ${last ? 'pb-0' : 'pb-5'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.cls}`}
                    >
                      {style.label}
                    </span>
                    {t.isOverride && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Override
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusChip status={t.fromStatus} statuses={statuses} />
                    <span className="text-[12px] text-muted-foreground">→</span>
                    <StatusChip status={t.toStatus} statuses={statuses} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    {formatWhen(t.createdAt)}
                    {formatWhen(t.createdAt) ? ' · ' : ''}
                    by {actorLabel(t)}
                  </p>
                  {t.note && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{t.note}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
