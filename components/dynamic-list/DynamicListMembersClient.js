'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, RefreshCw, RotateCcw, X } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { MEMBERS_PAGE_SIZE } from '@/lib/dynamic-list-constants'
import {
  buildMemberFilterParams,
  EMPTY_MEMBER_FILTERS,
  sanitizeMemberFilters,
} from '@/lib/dynamic-list-member-filters'
import {
  formatDateTime,
  formatFieldDisplayValue,
  formatReasonLabel,
  getMembershipLead,
  summarizeConditions,
} from '@/lib/dynamic-list-normalize'
import { toast } from '@/components/ui/toast'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'
import ConfirmReEvaluateDialog from '@/components/dynamic-list/ConfirmReEvaluateDialog'
import DynamicListMemberSendDialog from '@/components/dynamic-list/DynamicListMemberSendDialog'
import DynamicListMembersFilters from '@/components/dynamic-list/DynamicListMembersFilters'

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

  const pageLeads = useMemo(
    () => memberships.map(getMembershipLead).filter(Boolean),
    [memberships]
  )
  const pageLeadIds = useMemo(() => pageLeads.map((lead) => lead._id), [pageLeads])
  const allOnPageSelected =
    pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedLeadIds.includes(id))
  const selectedLeads = selectedLeadsData

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
    setFilters(next)
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

        <DynamicListMembersFilters
          filters={filters}
          onChange={handleFiltersChange}
          onClear={clearFilters}
          list={list}
          locations={locations}
          forms={forms}
          leadReasons={leadReasons}
          loadingOptions={loadingOptions}
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

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    disabled={pageLeads.length === 0}
                    className="h-4 w-4 accent-[var(--studio-primary)]"
                    aria-label="Select all on page"
                  />
                </th>
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
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Loading members…
                  </td>
                </tr>
              ) : memberships.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No members found.
                  </td>
                </tr>
              ) : (
                memberships.map((membership, idx) => {
                  const lead = membership?.leadID || {}
                  const selectableLead = getMembershipLead(membership)
                  const leadId = selectableLead?._id
                  const isSelected = leadId ? selectedLeadIds.includes(leadId) : false
                  return (
                    <tr key={`${lead?._id || lead?.id || idx}`} className="border-b border-border/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selectableLead && toggleLeadSelection(selectableLead)}
                          disabled={!selectableLead}
                          className="h-4 w-4 accent-[var(--studio-primary)]"
                          aria-label={`Select ${lead?.name || 'member'}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{lead?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead?.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead?.phoneNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {lead?.stage ? formatFieldDisplayValue(lead.stage) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {lead?.uploadType ? formatFieldDisplayValue(lead.uploadType) : '—'}
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatReasonLabel(lead?.reason, leadReasons)}</td>
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
