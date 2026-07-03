'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { MEMBERS_PAGE_SIZE } from '@/lib/dynamic-list-constants'
import {
  buildMemberFilterParams,
  EMPTY_MEMBER_FILTERS,
  sanitizeMemberFilters,
} from '@/lib/dynamic-list-member-filters'
import {
  formatDateTime,
  formatFieldDisplayValue,
  getMembershipLead,
  summarizeConditions,
} from '@/lib/dynamic-list-normalize'
import { toast } from '@/components/ui/toast'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'
import ConfirmReEvaluateDialog from '@/components/dynamic-list/ConfirmReEvaluateDialog'
import DynamicListMemberSendDialog from '@/components/dynamic-list/DynamicListMemberSendDialog'
import DynamicListMembersFilterPanel from '@/components/dynamic-list/DynamicListMembersFilterPanel'
import DynamicListMembersQuickBar from '@/components/dynamic-list/DynamicListMembersQuickBar'

function stageBadgeClass(stage) {
  const key = String(stage || '').toLowerCase()
  if (key === 'new') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
  if (key === 'engaged' || key === 'interested') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (key === 'booked' || key === 'actualized') return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
  if (key === 'cold' || key === 'no show') return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
  if (key === 'qualified') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
  if (key === 'disqualified') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
  return 'bg-muted text-muted-foreground'
}

function leadAvatarClass(name = '') {
  const palette = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  const index = (name.charCodeAt(0) || 0) % palette.length
  return palette[index]
}

function formatJoinedDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveLeadLocation(lead, locations = []) {
  if (lead?.location) return lead.location
  const id = lead?.locationID
  if (!id) return '—'
  const ids = Array.isArray(id) ? id : [id]
  const names = ids
    .map((locationId) => locations.find((loc) => loc._id === locationId)?.name)
    .filter(Boolean)
  return names.length ? names.join(', ') : '—'
}

export default function DynamicListMembersClient({ listId, listPathBase = '/ai-automation/dynamic-lists' }) {
  const [list, setList] = useState(null)
  const [leadReasons, setLeadReasons] = useState([])
  const [locations, setLocations] = useState([])
  const [forms, setForms] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_MEMBER_FILTERS)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [reEvaluateOpen, setReEvaluateOpen] = useState(false)
  const [reEvaluating, setReEvaluating] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectedLeadsData, setSelectedLeadsData] = useState([])
  const [selectingAll, setSelectingAll] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendChannel, setSendChannel] = useState('SMS')

  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE))
  const pageStart = total === 0 ? 0 : (page - 1) * MEMBERS_PAGE_SIZE + 1
  const pageEnd = Math.min(page * MEMBERS_PAGE_SIZE, total)

  const pageLeads = useMemo(
    () => memberships.map(getMembershipLead).filter(Boolean),
    [memberships]
  )
  const pageLeadIds = useMemo(() => pageLeads.map((lead) => lead._id), [pageLeads])
  const allOnPageSelected =
    pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedLeadIds.includes(id))
  const selectedLeads = selectedLeadsData

  const pageNumbers = useMemo(() => {
    const pages = []
    const maxButtons = 5
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    for (let i = start; i <= end; i += 1) pages.push(i)
    return pages
  }, [page, totalPages])

  const loadList = useCallback(async () => {
    if (!listId) return
    const res = await api.get(`/api/dynamic-list/${listId}`)
    if (res?.success) {
      setList(res?.data || null)
    }
  }, [listId])

  const loadFilterOptions = useCallback(async () => {
    setLoadingOptions(true)
    const [reasonsRes, locationsRes, formsRes] = await Promise.all([
      api.get('/api/lead-reasons'),
      api.get('/api/location?limit=200'),
      api.get('/api/formBuilder?page=1&limit=200'),
    ])

    if (reasonsRes?.success) setLeadReasons(extractLeadReasonsList(reasonsRes))
    if (locationsRes?.success) setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : [])
    if (formsRes?.success) setForms(extractFormTemplatesList(formsRes))

    setLoadingOptions(false)
  }, [])

  const loadMembers = useCallback(async () => {
    if (!listId) return
    setLoading(true)
    setError('')

    const params = buildMemberFilterParams({
      page,
      limit: MEMBERS_PAGE_SIZE,
      filters,
    })

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
  }, [listId, page, filters])

  useEffect(() => {
    loadList()
    loadFilterOptions()
  }, [loadList, loadFilterOptions])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (!list) return
    setFilters((prev) => {
      const next = sanitizeMemberFilters(list, prev)
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    })
  }, [list])

  const handleFiltersChange = (next) => {
    setFilters(sanitizeMemberFilters(list, next))
    setPage(1)
    clearSelection()
  }

  const clearFilters = () => {
    setFilters(EMPTY_MEMBER_FILTERS)
    setPage(1)
    clearSelection()
  }

  const clearSelection = () => {
    setSelectedLeadIds([])
    setSelectedLeadsData([])
  }

  const toggleLeadSelection = (lead) => {
    if (!lead?._id) return
    const isSelected = selectedLeadIds.includes(lead._id)
    if (isSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead._id))
      setSelectedLeadsData((prev) => prev.filter((item) => item._id !== lead._id))
      return
    }
    setSelectedLeadIds((prev) => [...prev, lead._id])
    setSelectedLeadsData((prev) => [...prev.filter((item) => item._id !== lead._id), lead])
  }

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageLeadIds.includes(id)))
      setSelectedLeadsData((prev) => prev.filter((lead) => !pageLeadIds.includes(lead._id)))
      return
    }
    const toAdd = pageLeads.filter((lead) => !selectedLeadIds.includes(lead._id))
    setSelectedLeadIds((prev) => [...new Set([...prev, ...toAdd.map((lead) => lead._id)])])
    setSelectedLeadsData((prev) => {
      const existingIds = new Set(prev.map((lead) => lead._id))
      return [...prev, ...toAdd.filter((lead) => !existingIds.has(lead._id))]
    })
  }

  const selectAllMembers = async () => {
    if (!listId || selectingAll || total <= pageLeads.length) return
    setSelectingAll(true)
    try {
      const params = buildMemberFilterParams({
        page: 1,
        limit: total,
        filters,
      })
      const res = await api.get(`/api/dynamic-list/${listId}/members?${params.toString()}`)
      if (!res?.success) {
        toast.error('Failed to select all', { description: res?.error || 'Could not load all members.' })
        return
      }
      const data = res?.data || {}
      const allMemberships = Array.isArray(data?.memberships)
        ? data.memberships
        : Array.isArray(res?.data)
          ? res.data
          : []
      const allLeads = allMemberships.map(getMembershipLead).filter(Boolean)
      setSelectedLeadIds(allLeads.map((lead) => lead._id))
      setSelectedLeadsData(allLeads)
    } catch (error) {
      console.error(error)
      toast.error('Error', { description: 'Could not select all members.' })
    } finally {
      setSelectingAll(false)
    }
  }

  const openSendDialog = (channel) => {
    if (!selectedLeads.length) return
    setSendChannel(channel)
    setSendDialogOpen(true)
  }

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
    <div className="mx-auto w-full max-w-[1400px] space-y-6 text-[16px]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={listPathBase}
              className="mb-3 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dynamic lists
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] font-bold text-[var(--studio-primary)]">{list?.name || 'List members'}</h2>
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-muted-foreground">
                {Number(list?.memberCount ?? total)} members
              </span>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">{summarizeConditions(list, leadReasons)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        <DynamicListMembersQuickBar
          filters={filters}
          onChange={handleFiltersChange}
          onClear={clearFilters}
          onOpenAdvanced={() => setFilterPanelOpen(true)}
          list={list}
          locations={locations}
          forms={forms}
          leadReasons={leadReasons}
        />

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {selectedLeads.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--studio-primary)]/30 bg-[var(--studio-primary)]/5 px-4 py-3">
            <div className="text-[13px] font-medium text-foreground">
              {selectedLeads.length} member{selectedLeads.length === 1 ? '' : 's'} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openSendDialog('SMS')}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40"
              >
                <MessageSquare className="h-4 w-4" />
                Send SMS
              </button>
              <button
                type="button"
                onClick={() => openSendDialog('Email')}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40"
              >
                <Mail className="h-4 w-4" />
                Send email
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/40"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        )}

        {allOnPageSelected && total > pageLeads.length && selectedLeads.length < total && (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 px-4 py-2 text-[12px] text-muted-foreground">
            All {pageLeads.length} members on this page are selected.{' '}
            <button
              type="button"
              onClick={selectAllMembers}
              disabled={selectingAll}
              className="font-semibold text-[var(--studio-primary)] hover:underline disabled:opacity-50"
            >
              {selectingAll ? 'Selecting…' : `Select all ${total} members`}
            </button>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      disabled={pageLeads.length === 0}
                      className="h-4 w-4 rounded accent-[var(--studio-primary)]"
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold">Upload type</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      Loading members…
                    </td>
                  </tr>
                ) : memberships.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      No members found.
                    </td>
                  </tr>
                ) : (
                  memberships.map((membership, idx) => {
                    const lead = membership?.leadID || {}
                    const selectableLead = getMembershipLead(membership)
                    const leadId = selectableLead?._id
                    const isSelected = leadId ? selectedLeadIds.includes(leadId) : false
                    const leadName = lead?.name || 'Unnamed'
                    return (
                      <tr key={`${lead?._id || lead?.id || idx}`} className="border-b border-border/70 hover:bg-muted/20">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selectableLead && toggleLeadSelection(selectableLead)}
                            disabled={!selectableLead}
                            className="h-4 w-4 rounded accent-[var(--studio-primary)]"
                            aria-label={`Select ${leadName}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white',
                                leadAvatarClass(leadName)
                              )}
                            >
                              {getInitials(leadName)}
                            </div>
                            <span className="font-medium text-foreground">{leadName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{lead?.email || '—'}</td>
                        <td className="px-4 py-4 text-muted-foreground">{lead?.phoneNumber || '—'}</td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              stageBadgeClass(lead?.stage)
                            )}
                          >
                            {lead?.stage ? formatFieldDisplayValue(lead.stage) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {lead?.uploadType ? (
                            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                              {formatFieldDisplayValue(lead.uploadType)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-4 text-foreground">
                          {selectableLead?.utm_source ? formatFieldDisplayValue(selectableLead.utm_source) : '—'}
                        </td>
                        <td className="px-4 py-4 text-foreground">
                          {resolveLeadLocation(selectableLead || lead, locations)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {formatJoinedDate(membership?.joinedAt) || formatDateTime(membership?.joinedAt) || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50"
                            aria-label="Row actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4">
              <div className="text-[13px] text-muted-foreground">
                Showing {pageStart} to {pageEnd} of {total} members
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium',
                      pageNumber === page
                        ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)] text-white'
                        : 'border-border text-foreground hover:bg-muted/40'
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DynamicListMembersFilterPanel
        open={filterPanelOpen}
        appliedFilters={filters}
        onClose={() => setFilterPanelOpen(false)}
        onApply={(next) => {
          handleFiltersChange(sanitizeMemberFilters(list, next))
          setFilterPanelOpen(false)
        }}
        list={list}
        locations={locations}
        forms={forms}
        leadReasons={leadReasons}
        loadingOptions={loadingOptions}
      />

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

      <DynamicListMemberSendDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        leads={selectedLeads}
        initialChannel={sendChannel}
        onSent={() => clearSelection()}
      />
    </div>
  )
}
