'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { MEMBERS_PAGE_SIZE } from '@/lib/dynamic-list-constants'
import {
  formatDateTime,
  formatReasonLabel,
  summarizeConditions,
} from '@/lib/dynamic-list-normalize'
import { toast } from '@/components/ui/toast'
import ConfirmReEvaluateDialog from '@/components/dynamic-list/ConfirmReEvaluateDialog'

export default function DynamicListMembersClient({ listId, listPathBase = '/ai-automation/dynamic-lists' }) {
  const [list, setList] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [reEvaluateOpen, setReEvaluateOpen] = useState(false)
  const [reEvaluating, setReEvaluating] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE))

  const loadList = useCallback(async () => {
    if (!listId) return
    const res = await api.get(`/api/dynamic-list/${listId}`)
    if (res?.success) {
      setList(res?.data || null)
    }
  }, [listId])

  const loadMembers = useCallback(async () => {
    if (!listId) return
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(page),
      limit: String(MEMBERS_PAGE_SIZE),
    })
    if (activeFilter !== 'all') params.set('isActive', activeFilter)

    const res = await api.get(`/api/dynamic-list/${listId}/members?${params.toString()}`)
    if (res?.success) {
      const data = res?.data || {}
      const nextMemberships = Array.isArray(data?.memberships)
        ? data.memberships
        : Array.isArray(res?.data)
        ? res.data
        : []
      const nextTotal = Number(data?.total ?? res?.pagination?.total ?? nextMemberships.length)
      setMemberships(nextMemberships)
      setTotal(nextTotal)
    } else {
      setMemberships([])
      setTotal(0)
      setError(res?.error || 'Failed to load members.')
    }
    setLoading(false)
  }, [listId, page, activeFilter])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const confirmReEvaluate = async () => {
    if (!listId || reEvaluating) return
    setReEvaluating(true)
    const res = await api.post(`/api/dynamic-list/${listId}/re-evaluate`)
    if (res?.success) {
      const queued = res?.data?.leadsQueued
      toast.success('Re-evaluation queued', {
        description: queued ? `${queued} leads queued` : 'Leads will be re-evaluated shortly',
      })
      setReEvaluateOpen(false)
      await loadList()
      await loadMembers()
    } else {
      setError(res?.error || 'Failed to re-evaluate dynamic list.')
    }
    setReEvaluating(false)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[16px]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={listPathBase}
              className="mb-3 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dynamic lists
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[26px] font-bold text-foreground">{list?.name || 'List members'}</h2>
              <span className="inline-flex rounded-full bg-[var(--studio-primary)]/10 px-3 py-1 text-[12px] font-semibold text-[var(--studio-primary)]">
                {Number(list?.memberCount ?? total)} members
              </span>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">{summarizeConditions(list)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'true', label: 'In list' },
                { value: 'false', label: 'Exited' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt.value)
                    setPage(1)
                  }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[12px] font-semibold',
                    activeFilter === opt.value
                      ? 'bg-[var(--studio-primary)] text-white'
                      : 'text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReEvaluateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RotateCcw className="h-4 w-4" />
              Re-evaluate
            </button>
            <button
              type="button"
              onClick={() => {
                loadList()
                loadMembers()
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Upload type</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Loading members…
                  </td>
                </tr>
              ) : memberships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No members found.
                  </td>
                </tr>
              ) : (
                memberships.map((membership, idx) => {
                  const lead = membership?.leadID || {}
                  return (
                    <tr key={`${lead?._id || lead?.id || idx}`} className="border-b border-border/70">
                      <td className="px-4 py-3 font-medium text-foreground">{lead?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead?.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead?.phoneNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {lead?.stage || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{lead?.uploadType || '—'}</td>
                      <td className="px-4 py-3 text-foreground">{formatReasonLabel(lead?.reason)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(membership?.joinedAt) || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-[13px] text-muted-foreground">
              Page {page} of {totalPages} • {total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmReEvaluateDialog
        open={reEvaluateOpen}
        busy={reEvaluating}
        listName={list?.name}
        onClose={() => {
          if (reEvaluating) return
          setReEvaluateOpen(false)
        }}
        onConfirm={confirmReEvaluate}
      />
    </div>
  )
}
