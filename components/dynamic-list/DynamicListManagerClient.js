'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, RefreshCw, Star, Trash2, Users } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { LISTS_PAGE_SIZE, DYNAMIC_LIST_ENTITY_LABELS } from '@/lib/dynamic-list-constants'
import {
  formatDateTime,
  formatFieldDisplayValue,
  statusBadgeClass,
  summarizeConditions,
} from '@/lib/dynamic-list-normalize'
import { toast } from '@/components/ui/toast'
import { extractLeadReasonsList } from '@/lib/workflow-normalize'
import DynamicListFormDialog from '@/components/dynamic-list/DynamicListFormDialog'
import ConfirmDeleteDynamicListDialog from '@/components/dynamic-list/ConfirmDeleteDynamicListDialog'

export default function DynamicListManagerClient({ membersPathBase = '/ai-automation/dynamic-lists' }) {
  const [lists, setLists] = useState([])
  const [entityType, setEntityType] = useState('lead')
  const [leadReasons, setLeadReasons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [favoritingId, setFavoritingId] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LISTS_PAGE_SIZE))

  const loadLists = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LISTS_PAGE_SIZE),
      entityType,
    })
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await api.get(`/api/dynamic-list?${params.toString()}`)
    if (res?.success) {
      const data = res?.data || {}
      const nextLists = Array.isArray(data?.lists) ? data.lists : Array.isArray(res?.data) ? res.data : []
      const filtered = nextLists.filter((l) => (l?.entityType || 'lead') === entityType)
      const nextTotal = Number(data?.total ?? res?.pagination?.total ?? filtered.length)
      setLists(filtered)
      setTotal(filtered.length > 0 ? nextTotal : filtered.length)
    } else {
      setLists([])
      setTotal(0)
      setError(res?.error || 'Failed to load dynamic lists.')
    }
    setLoading(false)
  }, [page, statusFilter, entityType])

  useEffect(() => {
    loadLists()
    api.get('/api/lead-reasons').then((res) => {
      if (res?.success) setLeadReasons(extractLeadReasonsList(res))
    })
  }, [loadLists])

  const stats = useMemo(() => {
    const active = lists.filter((l) => String(l?.status).toLowerCase() === 'active').length
    const members = lists.reduce((acc, l) => acc + Number(l?.memberCount ?? 0), 0)
    return { active, members }
  }, [lists])

  const openCreate = () => {
    setEditingList(null)
    setFormOpen(true)
  }

  const openEdit = (list) => {
    setEditingList(list)
    setFormOpen(true)
  }

  const handleSaved = ({ isEdit }) => {
    toast.success(isEdit ? 'Dynamic list updated' : 'Dynamic list created')
    loadLists()
  }

  const requestDelete = (list) => {
    const id = list?._id || list?.id
    setDeleteTarget({
      id,
      name: list?.name || '',
      memberCount: Number(list?.memberCount ?? 0),
    })
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const id = deleteTarget?.id
    if (!id || deleting) return
    setDeleting(true)
    const res = await api.delete(`/api/dynamic-list/${id}`)
    if (res?.success) {
      toast.success('Dynamic list deleted')
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadLists()
    } else {
      setError(res?.error || 'Failed to delete dynamic list.')
    }
    setDeleting(false)
  }

  const toggleFavorite = async (id) => {
    if (!id || favoritingId) return
    setFavoritingId(id)
    const res = await api.post(`/api/dynamic-list/${id}/favorite`)
    if (res?.success) {
      await loadLists()
    } else {
      setError(res?.error || 'Failed to update favorite.')
    }
    setFavoritingId('')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[16px]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Total Lists</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Active</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Members (page)</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.members}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-bold text-foreground">Dynamic Lists</h2>
            <p className="text-[15px] text-muted-foreground">
              Segment {entityType === 'customer' ? 'customers' : 'leads'} by conditions.
              {entityType === 'lead' ? ' Workflows link to lists and fire when leads enter.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {Object.entries(DYNAMIC_LIST_ENTITY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setEntityType(value)
                    setPage(1)
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                    entityType === value
                      ? 'bg-[var(--studio-primary)] text-white'
                      : 'text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={loadLists}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              Create list
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
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Conditions</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-center">Favorite</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Loading dynamic lists…
                  </td>
                </tr>
              ) : lists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No dynamic lists yet.
                  </td>
                </tr>
              ) : (
                lists.map((list) => {
                  const id = list?._id || list?.id
                  return (
                    <tr key={id} className="border-b border-border/70 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{list?.name || '—'}</div>
                        {list?.description && (
                          <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{list.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                            statusBadgeClass(list?.status)
                          )}
                        >
                          {list?.status ? formatFieldDisplayValue(list.status) : 'Unknown'}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-[12px] text-foreground">
                        {summarizeConditions(list, { leadReasons }, list?.entityType || entityType)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{Number(list?.memberCount ?? 0)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(list?.createdAt) || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(id)}
                          disabled={favoritingId === id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted/50 disabled:opacity-50"
                          title={list?.isFavorite ? 'Remove favorite' : 'Add favorite'}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4',
                              list?.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(list)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted/40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <Link
                            href={`${membersPathBase}/${id}/${(list?.entityType || entityType) === 'customer' ? 'customers' : 'members'}`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted/40"
                          >
                            <Users className="h-3.5 w-3.5" />
                            Members
                          </Link>
                          <button
                            type="button"
                            onClick={() => requestDelete(list)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#EF4444] px-2 text-[11px] font-medium text-white hover:bg-[#DC2626]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
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
              Page {page} of {totalPages}
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

      <DynamicListFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingList(null)
        }}
        list={editingList}
        entityType={editingList?.entityType || entityType}
        onSaved={handleSaved}
      />

      <ConfirmDeleteDynamicListDialog
        open={deleteOpen}
        busy={deleting}
        listName={deleteTarget?.name}
        memberCount={deleteTarget?.memberCount ?? 0}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
