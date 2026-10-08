'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import SearchInput from '@/components/ui/search-input'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import ConfirmDeleteDynamicListDialog from '@/components/dynamic-list/ConfirmDeleteDynamicListDialog'
import { summarizeConditions } from '@/lib/dynamic-list-normalize'
import { extractLeadReasonsList } from '@/lib/workflow-normalize'
import { buildCustomerQueryParams } from '@/lib/customer-filter-fields'

const ENTITY_COPY = {
  customer: {
    emptyTitle: 'No saved customer lists yet',
    emptyHint: 'Filter customers and click “Save as list” to create one.',
    noun: 'student',
    countLabel: (n) => `${n} ${n === 1 ? 'student' : 'students'}`,
    footer: 'Open any list to view its students.',
    membersPath: (id) => `/ai-automation/dynamic-lists/${id}/customers`,
  },
  lead: {
    emptyTitle: 'No saved lead lists yet',
    emptyHint: 'Filter leads and click “Save as list” to create one.',
    noun: 'lead',
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Customer lists: the stored memberCount is a cache that goes stale (e.g. "last 60 days"
  // never fires an event when someone ages out). The list page evaluates the conditions live
  // via /api/customer, so count the same way or the card and the page disagree.
  const [liveCounts, setLiveCounts] = useState({})
  const [countsSettled, setCountsSettled] = useState(false)

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
    if (resolvedType !== 'customer' || lists.length === 0) return
    let cancelled = false
    setCountsSettled(false)
    Promise.all(
      lists.map(async (list) => {
        const params = buildCustomerQueryParams({
          page: 1,
          limit: 1,
          filters: {
            conditionLogic: list.conditionLogic,
            conditions: list.conditions || [],
            groupLogics: list.groupLogics || {},
          },
        })
        const res = await api.get(`/api/customer?${params}`)
        return [list._id || list.id, res?.success ? (res.pagination?.total ?? res.total) : undefined]
      }),
    ).then((pairs) => {
      if (cancelled) return
      setLiveCounts(Object.fromEntries(pairs.filter(([, n]) => n != null)))
      setCountsSettled(true) // a failed request falls back to the stored count
    })
    return () => { cancelled = true }
  }, [lists, resolvedType])

  // Lookups so condition summaries show names ("Starter Package") instead of raw ids.
  const [lookups, setLookups] = useState({})

  useEffect(() => {
    api.get('/api/lead-reasons').then((res) => {
      if (res?.success) setLeadReasons(extractLeadReasonsList(res))
    })
    if (resolvedType !== 'customer') return
    const arr = (res) => (res?.success && Array.isArray(res.data) ? res.data : [])
    Promise.all([
      api.get('/api/location?limit=200'),
      api.get('/api/teacher?limit=200&status=active'),
      api.get('/api/customer/tags'),
      api.get('/api/membership?limit=200'),
      api.get('/api/package?limit=200'),
    ]).then(([locations, teachers, tags, memberships, packages]) =>
      setLookups({
        locations: arr(locations),
        teachers: arr(teachers),
        tags: arr(tags),
        memberships: arr(memberships),
        packages: arr(packages),
      }),
    )
  }, [resolvedType])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lists
    return lists.filter((list) => {
      const name = String(list?.name || '').toLowerCase()
      const description = String(list?.description || '').toLowerCase()
      const summary = summarizeConditions(list, { leadReasons, ...lookups }, resolvedType).toLowerCase()
      return name.includes(q) || description.includes(q) || summary.includes(q)
    })
  }, [lists, search, leadReasons, lookups, resolvedType])

  const openList = (list) => {
    const id = list?._id || list?.id
    if (!id) return
    router.push(copy.membersPath(id))
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const res = await api.delete(`/api/dynamic-list/${deleteTarget.id}`)
    setDeleting(false)
    if (res?.success) {
      toast.success('List deleted')
      setDeleteTarget(null)
      setLists((prev) => prev.filter((l) => (l?._id || l?.id) !== deleteTarget.id))
    } else {
      setDeleteTarget(null)
      setError(res?.error || 'Failed to delete list.')
    }
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
              summarizeConditions(list, { leadReasons, ...lookups }, resolvedType)
            // Customer lists wait for the live count instead of flashing the stale stored one.
            const count =
              resolvedType === 'customer' && liveCounts[id] == null && !countsSettled
                ? null
                : Number(liveCounts[id] ?? list?.memberCount ?? 0)
            return (
              <div
                key={id}
                className={cn(
                  'flex items-center rounded-xl border border-border bg-card',
                  'transition-colors hover:border-[var(--studio-primary)]/35 hover:bg-muted/30',
                )}
              >
                <button
                  type="button"
                  onClick={() => openList(list)}
                  className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-foreground">
                      {list?.name || 'Untitled list'}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{summary}</div>
                  </div>
                  <div className="shrink-0 text-[13px] font-medium text-[var(--studio-primary)]">
                    {count == null ? '…' : copy.countLabel(count)}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id, name: list?.name || '', memberCount: count ?? 0 })}
                  aria-label={`Delete ${list?.name || 'list'}`}
                  title="Delete list"
                  className="mx-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-[12px] text-muted-foreground">{copy.footer}</p>

      <ConfirmDeleteDynamicListDialog
        open={Boolean(deleteTarget)}
        busy={deleting}
        listName={deleteTarget?.name}
        memberCount={deleteTarget?.memberCount ?? 0}
        memberNoun={copy.noun}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
