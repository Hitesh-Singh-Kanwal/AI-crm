'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, PhoneCall, Trash2, Info, RefreshCw, Clock, User, Bot, X, SlidersHorizontal } from 'lucide-react'
import SuccessEvaluationDisplay from '@/components/ai-calling/SuccessEvaluationDisplay'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { toast } from '@/components/ui/toast'

const ROWS_PER_PAGE = 10

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ended', label: 'Ended' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'queued', label: 'Queued' },
  { value: 'ringing', label: 'Ringing' },
  { value: 'failed', label: 'Failed' },
]

const SETUP_FILTER_OPTIONS = [
  { value: '', label: 'All setups' },
  { value: 'assistant', label: 'Saved assistant' },
  { value: 'manual', label: 'Manual setup' },
]

const EVALUATION_FILTER_OPTIONS = [
  { value: '', label: 'All evaluations' },
  { value: 'true', label: 'Has evaluation' },
  { value: 'false', label: 'No evaluation' },
]

const DEFAULT_FILTERS = {
  search: '',
  assistantId: '',
  status: '',
  setupType: '',
  hasEvaluation: '',
}

function getVisiblePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set([1, total, current, current - 1, current + 1, current - 2, current + 2])
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const result = []

  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('…')
    }
    result.push(sorted[i])
  }

  return result
}

function hasActiveFilters(filters) {
  return Boolean(
    filters.search?.trim() ||
    filters.assistantId ||
    filters.status ||
    filters.setupType ||
    filters.hasEvaluation
  )
}

function getFilterChips(filters, assistants) {
  const chips = []

  if (filters.search?.trim()) {
    chips.push({ key: 'search', label: `Search: "${filters.search.trim()}"` })
  }
  if (filters.status) {
    const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status)
    chips.push({ key: 'status', label: opt?.label || filters.status })
  }
  if (filters.setupType) {
    const opt = SETUP_FILTER_OPTIONS.find((o) => o.value === filters.setupType)
    chips.push({ key: 'setupType', label: opt?.label || filters.setupType })
  }
  if (filters.assistantId) {
    const assistant = assistants.find((a) => a._id === filters.assistantId)
    chips.push({
      key: 'assistantId',
      label: assistant?.name ? `Assistant: ${assistant.name}` : 'Assistant filter',
    })
  }
  if (filters.hasEvaluation) {
    const opt = EVALUATION_FILTER_OPTIONS.find((o) => o.value === filters.hasEvaluation)
    chips.push({ key: 'hasEvaluation', label: opt?.label || 'Evaluation filter' })
  }

  return chips
}

const filterSelectClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)] disabled:cursor-not-allowed disabled:opacity-50'

// ── helpers ────────────────────────────────────────────────────────────────

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null
  const ms = Math.max(0, new Date(endedAt) - new Date(startedAt))
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatEndedReason(reason) {
  if (!reason) return null
  const map = {
    'customer-ended-call': 'Customer ended',
    'assistant-ended-call': 'AI ended',
    'customer-did-not-answer': 'No answer',
    'customer-busy': 'Line busy',
    voicemail: 'Voicemail',
    'max-duration-exceeded': 'Max duration',
    'silence-timed-out': 'Silence timeout',
    'pipeline-error': 'Pipeline error',
    'assistant-error': 'AI error',
    error: 'Error',
    'exceeded-max-duration': 'Max duration',
  }
  return map[reason] || reason.replace(/-/g, ' ')
}

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase()
  if (['ended', 'completed', 'done'].includes(s))
    return { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' }
  if (['in-progress', 'ringing', 'queued'].includes(s))
    return { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' }
  if (['failed', 'canceled', 'cancelled', 'error'].includes(s))
    return { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' }
  return { color: 'text-muted-foreground bg-muted border-border', dot: 'bg-muted-foreground' }
}

function getAssistantRubric(call) {
  if (call?.dbAssistantId && typeof call.dbAssistantId === 'object') {
    return call.dbAssistantId.successEvaluationRubric || null
  }
  return null
}

function getCallerName(call) {
  return (
    call.leadID?.name ||
    call.customer?.name ||
    null
  )
}

function getAssistantLabel(call) {
  if (call.assistantName) return call.assistantName
  if (call.dbAssistantId && typeof call.dbAssistantId === 'object') {
    return call.dbAssistantId.name || null
  }
  return null
}

function formatShortDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Calls still syncing from Vapi (in progress or ended without transcript/analysis yet). */
function isCallPendingSync(call) {
  if (!call) return false
  const status = String(call.status || '').toLowerCase()
  if (['in-progress', 'ringing', 'queued'].includes(status)) return true
  if (!call.endedAt) return true

  const hasData = Boolean(
    call.transcript ||
    call.recordingUrl ||
    call.artifact?.recordingUrl ||
    call.analysis?.summary ||
    call.analysis?.successEvaluation ||
    call.summary
  )
  return !hasData
}

export default function AiCallDetailPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [assistants, setAssistants] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [syncingId, setSyncingId] = useState(null)
  const [selectedCall, setSelectedCall] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [deletingMany, setDeletingMany] = useState(false)

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  )

  const filterChips = useMemo(
    () => getFilterChips(filters, assistants),
    [filters, assistants]
  )

  const updateFilter = (key, value) => {
    setCurrentPage(1)
    setSelectedIds([])
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'setupType' && value === 'manual') {
        next.assistantId = ''
      }
      return next
    })
  }

  const clearFilters = () => {
    setCurrentPage(1)
    setSelectedIds([])
    setFilters(DEFAULT_FILTERS)
  }

  const loadCalls = useCallback(
    async (page, activeFilters, { silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ROWS_PER_PAGE),
        })

        if (activeFilters.search?.trim()) {
          params.set('search', activeFilters.search.trim())
        }
        if (activeFilters.assistantId) {
          params.set('assistantId', activeFilters.assistantId)
        }
        if (activeFilters.status) {
          params.set('status', activeFilters.status)
        }
        if (activeFilters.setupType) {
          params.set('setupType', activeFilters.setupType)
        }
        if (activeFilters.hasEvaluation) {
          params.set('hasEvaluation', activeFilters.hasEvaluation)
        }

        const result = await api.get(`/api/ai-calling?${params.toString()}`)
        if (result.success) {
          const pagination = result.pagination ?? result.data?.pagination
          const total = pagination?.total ?? (Array.isArray(result.data) ? result.data.length : 0)
          const pagesFromApi = pagination?.totalPages ?? Math.max(1, Math.ceil((total || 0) / ROWS_PER_PAGE))

          if (page > pagesFromApi) {
            setCurrentPage(pagesFromApi)
            return
          }

          const nextCalls = Array.isArray(result.data) ? result.data : []
          setCalls(nextCalls)
          setTotalCount(total)
          setTotalPages(pagesFromApi)
          setSelectedCall((prev) => {
            if (!prev?._id) return prev
            const updated = nextCalls.find((c) => c._id === prev._id)
            return updated || prev
          })
        } else if (!silent) {
          toast.error('Failed to load AI call details', { description: result.error })
        }
      } catch (e) {
        console.error(e)
        if (!silent) {
          toast.error('Error', { description: 'Unable to load AI call details' })
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    api.get('/api/ai-assistant/').then((result) => {
      if (!result.success) return
      const list = Array.isArray(result.data) ? result.data : []
      setAssistants(list)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    loadCalls(currentPage, filters)
  }, [currentPage, filters, loadCalls])

  // Auto-refresh while any visible call is still syncing from Vapi.
  useEffect(() => {
    const hasPending =
      calls.some(isCallPendingSync) || (selectedCall && isCallPendingSync(selectedCall))
    if (!hasPending) return undefined

    const interval = setInterval(() => {
      loadCalls(currentPage, filters, { silent: true })
    }, 15000)

    return () => clearInterval(interval)
  }, [calls, selectedCall, currentPage, filters, loadCalls])

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this call record?')
    if (!confirmed) return

    try {
      setDeletingId(id)
      const result = await api.delete(`/api/ai-calling/${id}`)
      if (result.success) {
        toast.success('Deleted', { description: 'AI call deleted successfully' })
        loadCalls(currentPage, filters)
      } else {
        toast.error('Delete failed', { description: result.error || 'Unable to delete AI call' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unexpected error while deleting AI call' })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSync = async (e, call) => {
    e.stopPropagation()
    try {
      setSyncingId(call._id)
      const result = await api.post(`/api/ai-calling/${call._id}/sync`, {})
      if (result.success) {
        // Update the call in local state so the card refreshes immediately.
        setCalls((prev) => prev.map((c) => (c._id === call._id ? result.data : c)))
        // If this call is open in the detail view, update it there too.
        setSelectedCall((prev) => (prev?._id === call._id ? result.data : prev))
        toast.success('Call synced', { description: `Status: ${result.data?.status || '—'}` })
      } else {
        toast.error('Sync failed', { description: result.error || 'Could not reach Vapi for this call.' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unexpected error while syncing call.' })
    } finally {
      setSyncingId(null)
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAllOnPage = () => {
    if (selectedIds.length === calls.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(calls.map((c) => c._id))
    }
  }


  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} call(s)?`)
    if (!confirmed) return

    try {
      setDeletingMany(true)
      const result = await api.post('/api/ai-calling/delete-many', { ids: selectedIds })
      if (result.success) {
        toast.success('Deleted', {
          description: `${selectedIds.length} AI call${selectedIds.length > 1 ? 's' : ''} deleted successfully`,
        })
        setSelectedIds([])
        loadCalls(currentPage, filters)
      } else {
        toast.error('Delete failed', { description: result.error || 'Unable to delete selected calls' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unexpected error while deleting selected calls' })
    } finally {
      setDeletingMany(false)
    }
  }

  const handleOpenDetails = (call) => {
    setSelectedCall(call)
  }

  const handleBackToList = () => {
    setSelectedCall(null)
  }

  return (
    <MainLayout
      title="AI Call Details"
      subtitle="Review and manage individual AI call outcomes."
    >
      <div className="max-w-[1204px] mx-auto min-h-full flex flex-col">
        <div className="flex flex-col gap-6 lg:gap-8">
          {!selectedCall && (
          <div>
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                    AI Call Details
                  </h1>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-[#9224EF] bg-card border border-border">
                    {totalCount} calls
                  </span>
                </div>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                View AI calling activity — see who was called, duration, outcome, and call recording.
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Filter calls</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Search by name, phone, assistant, or outcome. Narrow results with the fields below.
                    </p>
                  </div>
                </div>
                {hasActiveFilters(filters) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-lg border-border bg-background text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Clear all
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                  <label htmlFor="call-search" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="call-search"
                      placeholder="Name, phone, assistant, status…"
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="h-10 pl-9 rounded-lg border-border bg-background text-[13px] placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="call-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </label>
                  <Select
                    id="call-status"
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className={filterSelectClass}
                  >
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all-status'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label htmlFor="call-setup" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Setup
                  </label>
                  <Select
                    id="call-setup"
                    value={filters.setupType}
                    onChange={(e) => updateFilter('setupType', e.target.value)}
                    className={filterSelectClass}
                  >
                    {SETUP_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all-setup'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label htmlFor="call-assistant" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Assistant
                  </label>
                  <Select
                    id="call-assistant"
                    value={filters.assistantId}
                    onChange={(e) => updateFilter('assistantId', e.target.value)}
                    disabled={filters.setupType === 'manual'}
                    className={filterSelectClass}
                    title={filters.setupType === 'manual' ? 'Not available for manual setup calls' : undefined}
                  >
                    <option value="">All assistants</option>
                    {assistants.map((assistant) => (
                      <option key={assistant._id} value={assistant._id}>
                        {assistant.name || 'Unnamed assistant'}
                      </option>
                    ))}
                  </Select>
                  {filters.setupType === 'manual' && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Unavailable for manual calls</p>
                  )}
                </div>

                <div>
                  <label htmlFor="call-evaluation" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Evaluation
                  </label>
                  <Select
                    id="call-evaluation"
                    value={filters.hasEvaluation}
                    onChange={(e) => updateFilter('hasEvaluation', e.target.value)}
                    className={filterSelectClass}
                  >
                    {EVALUATION_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all-eval'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {filterChips.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Active:</span>
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => updateFilter(chip.key, '')}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      {chip.label}
                      <X className="h-3 w-3 opacity-70" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalCount}</span>
                {' '}call{totalCount === 1 ? '' : 's'}
                {hasActiveFilters(filters) ? ' matching your filters' : ' total'}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 rounded-lg border-border bg-background text-xs font-medium text-foreground hover:bg-muted/50"
                  onClick={toggleSelectAllOnPage}
                  disabled={!calls.length}
                >
                  {selectedIds.length === calls.length && calls.length > 0
                    ? 'Clear selection'
                    : 'Select all on page'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9 px-3 rounded-lg text-xs font-medium"
                  onClick={handleDeleteSelected}
                  disabled={!selectedIds.length || deletingMany}
                >
                  {deletingMany ? 'Deleting…' : `Delete selected (${selectedIds.length})`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-4 rounded-lg border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50"
                  onClick={() => loadCalls(currentPage, filters)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[560px] flex flex-col">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner size="lg" text="Loading AI call details…" />
                </div>
              )}

              {!loading && calls.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <PhoneCall className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No AI call records found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Once AI calls are made, they will appear here with status, number, and a quick
                    summary.
                  </p>
                </div>
              )}

              {!loading && calls.length > 0 && (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 flex-1">
                {calls.map((call) => {
                  const isSelected = selectedIds.includes(call._id)
                  const statusStyle = getStatusStyle(call.status)
                  const duration = formatDuration(call.startedAt, call.endedAt)
                  const endedReason = formatEndedReason(call.endedReason)
                  const callerName = getCallerName(call)
                  const callerNumber = call.customer?.number || '—'
                  const callDate = formatShortDate(call.startedAt || call.createdAt)
                  const evaluation = call.analysis?.successEvaluation
                  const evaluationRubric = getAssistantRubric(call)
                  const isPending = !call.endedAt
                  const assistantLabel = getAssistantLabel(call)

                  return (
                    <Card
                      key={call._id}
                      className={`group cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#9224EF] ring-1 ring-[#9224EF]/30 shadow-md'
                          : 'border-border hover:border-[#9224EF]/50 hover:shadow-md'
                      }`}
                      onClick={() => handleOpenDetails(call)}
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-start justify-between gap-2">
                          {/* Left: checkbox + avatar + name */}
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onClick={(e) => { e.stopPropagation(); toggleSelectOne(call._id) }}
                              className="mt-0.5 shrink-0 rounded border-border data-[state=checked]:bg-[#9224EF] data-[state=checked]:border-[#9224EF]"
                              aria-label="Select call"
                            />
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                {callerName || callerNumber}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {callerName ? callerNumber : ' '}{callDate ? (callerName ? ` · ${callDate}` : callDate) : ''}
                              </p>
                            </div>
                          </div>
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusStyle.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                            {call.status || 'Unknown'}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 pb-4 space-y-2.5">
                        {assistantLabel ? (
                          <Badge variant="outline" className="text-[10px] font-medium gap-1">
                            <Bot className="h-3 w-3" />
                            {assistantLabel}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            Manual setup
                          </Badge>
                        )}

                        {/* Duration + ended reason */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {duration || '—'}
                          </span>
                          {endedReason && (
                            <span className="truncate">{endedReason}</span>
                          )}
                        </div>

                        {/* Success evaluation */}
                        {evaluation && (
                          <SuccessEvaluationDisplay
                            evaluation={evaluation}
                            rubric={evaluationRubric}
                            variant="compact"
                            className="text-[10px] px-2 py-0.5"
                          />
                        )}

                        {/* Summary */}
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {call.analysis?.summary || (isPending ? 'Call in progress — data syncing…' : 'No summary available')}
                        </p>

                        {/* Footer actions */}
                        <div className="flex justify-between items-center pt-1.5 border-t border-border/60">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
                          >
                            <Info className="h-3 w-3" />
                            View details
                          </button>
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${isPending ? 'text-amber-500 hover:bg-amber-50' : 'text-muted-foreground hover:bg-muted/60'}`}
                              onClick={(e) => handleSync(e, call)}
                              disabled={syncingId === call._id}
                              title="Sync latest data from Vapi"
                            >
                              {syncingId === call._id
                                ? <GlobalLoader variant="inline" size="sm" />
                                : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); handleDelete(call._id) }}
                              disabled={deletingId === call._id}
                              aria-label="Delete call"
                            >
                              {deletingId === call._id
                                ? <GlobalLoader variant="inline" size="sm" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3 px-4 pb-4 pt-4 mt-auto">
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {pageNumbers.map((n, idx) =>
                      n === '…' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCurrentPage(n)}
                          disabled={loading || n === currentPage}
                          className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                            n === currentPage
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted/40 disabled:opacity-50'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({totalCount} total)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* Full-width details view */}
          {selectedCall && (() => {
            const detailStatus = getStatusStyle(selectedCall.status)
            const detailDuration = formatDuration(selectedCall.startedAt, selectedCall.endedAt)
            const detailEval = selectedCall.analysis?.successEvaluation
            const detailEvalRubric = getAssistantRubric(selectedCall)
            const detailName = getCallerName(selectedCall)
            const detailReason = formatEndedReason(selectedCall.endedReason)
            const detailAssistant = getAssistantLabel(selectedCall)

            return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                    onClick={handleBackToList}
                  >
                    ← All calls
                  </button>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${detailStatus.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${detailStatus.dot}`} />
                    {selectedCall.status || 'Unknown'}
                  </span>
                  {detailEval && (
                    <SuccessEvaluationDisplay
                      evaluation={detailEval}
                      rubric={detailEvalRubric}
                      variant="compact"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={(e) => handleSync(e, selectedCall)}
                  disabled={syncingId === selectedCall._id}
                >
                  {syncingId === selectedCall._id
                    ? <GlobalLoader variant="inline" size="sm" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync from Vapi
                </Button>
              </div>

              <Card className="border-border">
                {/* Header */}
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {detailName || selectedCall.customer?.number || 'Unknown caller'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {detailName ? selectedCall.customer?.number : null}
                          {selectedCall.leadID?.email ? ` · ${selectedCall.leadID.email}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      {typeof selectedCall.cost === 'number' && selectedCall.cost > 0 && (
                        <p className="text-sm font-semibold text-foreground">
                          ${selectedCall.cost.toFixed(4)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">call cost</span>
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                  {/* Key stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Assistant', value: detailAssistant || 'Manual setup' },
                      { label: 'Duration', value: detailDuration || '—' },
                      { label: 'Ended reason', value: detailReason || '—' },
                      { label: 'Started', value: selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleTimeString() : '—' },
                      { label: 'Ended', value: selectedCall.endedAt ? new Date(selectedCall.endedAt).toLocaleTimeString() : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Summary
                    </p>
                    <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                      {selectedCall.analysis?.summary || selectedCall.summary || 'No summary available'}
                    </p>
                  </div>

                  {selectedCall.analysis?.successEvaluation && (
                    <SuccessEvaluationDisplay
                      evaluation={selectedCall.analysis.successEvaluation}
                      rubric={detailEvalRubric}
                      variant="full"
                    />
                  )}

                  {(selectedCall.artifact?.recordingUrl ||
                    selectedCall.recordingUrl ||
                    selectedCall.artifact?.stereoRecordingUrl ||
                    selectedCall.stereoRecordingUrl) && (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Recording
                      </p>
                      <div className="space-y-2">
                        {selectedCall.artifact?.recordingUrl || selectedCall.recordingUrl ? (
                          <audio
                            controls
                            className="w-full"
                            src={
                              selectedCall.artifact?.recordingUrl ||
                              selectedCall.recordingUrl
                            }
                          />
                        ) : null}
                        <div className="flex flex-wrap gap-3 text-xs text-indigo-600 dark:text-indigo-400">
                          {selectedCall.artifact?.recordingUrl && (
                            <a
                              href={selectedCall.artifact.recordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              Open mono recording
                            </a>
                          )}
                          {selectedCall.artifact?.stereoRecordingUrl && (
                            <a
                              href={selectedCall.artifact.stereoRecordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              Open stereo recording
                            </a>
                          )}
                          {selectedCall.logUrl && (
                            <a
                              href={selectedCall.logUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              View raw call log
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedCall.artifact?.messages) &&
                    selectedCall.artifact.messages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Script (system prompt)
                        </p>
                        <div className="text-[11px] text-foreground bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                          {selectedCall.artifact.messages.find((m) => m.role === 'system')?.message ||
                            'Script not available'}
                        </div>

                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Turn-by-turn messages
                        </p>
                        <div className="max-h-[360px] overflow-y-auto border border-dashed border-border rounded-lg p-3 bg-muted/30 space-y-2">
                          {selectedCall.artifact.messages
                            .filter((msg) => msg.role !== 'system')
                            .map((msg, idx) => {
                            const role =
                              msg.role === 'system'
                                ? 'system'
                                : msg.role === 'bot'
                                ? 'ai'
                                : 'user'

                            const isAI = role === 'ai'
                            const isUser = role === 'user'
                            const isSystem = role === 'system'

                            return (
                              <div
                                key={idx}
                                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed shadow-sm ${
                                    isSystem
                                      ? 'bg-muted text-foreground'
                                      : isAI
                                      ? 'bg-indigo-500/10 text-foreground'
                                      : 'bg-card text-foreground border border-border'
                                  } ${isUser ? 'rounded-br-sm' : isAI ? 'rounded-bl-sm' : ''}`}
                                >
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {isSystem ? 'System' : isAI ? 'AI Agent' : (detailName || 'Caller')}
                                  </p>
                                  <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
            )
          })()}
        </div>
      </div>
    </MainLayout>
  )
}
