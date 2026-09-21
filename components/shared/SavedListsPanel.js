'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import SearchInput from '@/components/ui/search-input'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { summarizeConditions } from '@/lib/dynamic-list-normalize'
import { extractLeadReasonsList } from '@/lib/workflow-normalize'

const ENTITY_COPY = {
  customer: {
    emptyTitle: 'No saved customer lists yet',
    emptyHint: 'Filter customers and click “Save as list” to create one.',
    countLabel: (n) => `${n} ${n === 1 ? 'student' : 'students'}`,
    footer: 'Open any list to view its students.',
    membersPath: (id) => `/ai-automation/dynamic-lists/${id}/customers`,
  },
  lead: {
    emptyTitle: 'No saved lead lists yet',
    emptyHint: 'Filter leads and click “Save as list” to create one.',
    countLabel: (n) => `${n} ${n === 1 ? 'lead' : 'leads'}`,
    footer: 'Open any list to view its leads.',
    membersPath: (id) => `/ai-automation/dynamic-lists/${id}/members`,
  },
}

/**
 * HubSpot-style saved dynamic lists browser (leads or customers).
 */
export default function SavedListsPanel({ entityType = 'lead', refreshKey = 0 }) {
  const router = useRouter()
  const resolvedType = entityType === 'customer' ? 'customer' : 'lead'
  const copy = ENTITY_COPY[resolvedType]
  const [lists, setLists] = useState([])
  const [leadReasons, setLeadReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadLists = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: '1',
      limit: '100',
      entityType: resolvedType,
      status: 'active',
    })
    const res = await api.get(`/api/dynamic-list?${params.toString()}`)
    if (res?.success) {
      const data = res?.data || {}
      const next = Array.isArray(data?.lists)
        ? data.lists
        : Array.isArray(res?.data)
          ? res.data
          : []
      setLists(next.filter((l) => (l?.entityType || 'lead') === resolvedType))
    } else {
      setLists([])
      setError(res?.error || 'Failed to load saved lists.')
    }
    setLoading(false)
  }, [resolvedType])

  useEffect(() => {
    loadLists()
  }, [loadLists, refreshKey])

  useEffect(() => {
    api.get('/api/lead-reasons').then((res) => {
      if (res?.success) setLeadReasons(extractLeadReasonsList(res))
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lists
    return lists.filter((list) => {
      const name = String(list?.name || '').toLowerCase()
      const description = String(list?.description || '').toLowerCase()
      const summary = summarizeConditions(list, { leadReasons }, resolvedType).toLowerCase()
      return name.includes(q) || description.includes(q) || summary.includes(q)
    })
  }, [lists, search, leadReasons, resolvedType])

  const openList = (list) => {
    const id = list?._id || list?.id
    if (!id) return
    router.push(copy.membersPath(id))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="min-w-[220px] flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved lists..."
        />
        <p className="text-[12px] text-muted-foreground">Lists update automatically.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="text-[14px] font-medium text-foreground">
            {lists.length === 0 ? copy.emptyTitle : 'No lists match your search'}
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {lists.length === 0 ? copy.emptyHint : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((list) => {
            const id = list?._id || list?.id
            const summary =
              list?.description?.trim() ||
              summarizeConditions(list, { leadReasons }, resolvedType)
            const count = Number(list?.memberCount ?? 0)
            return (
              <button
                key={id}
                type="button"
                onClick={() => openList(list)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-left',
                  'transition-colors hover:border-[var(--studio-primary)]/35 hover:bg-muted/30',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-foreground">
                    {list?.name || 'Untitled list'}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{summary}</div>
                </div>
                <div className="shrink-0 text-[13px] font-medium text-[var(--studio-primary)]">
                  {copy.countLabel(count)}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      )}

      <p className="text-center text-[12px] text-muted-foreground">{copy.footer}</p>
    </div>
  )
}
