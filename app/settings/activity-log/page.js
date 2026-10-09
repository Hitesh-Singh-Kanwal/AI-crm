'use client'

import { useState, useEffect, useRef } from 'react'
import { readPersistedListState, usePersistListState } from '@/lib/hooks/useListStatePersistence'
import { Activity, User, Clock, RefreshCw, Bot } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import SearchInput from '@/components/ui/search-input'
import { Badge } from '@/components/ui/badge'
import StyledSelect from '@/components/shared/StyledSelect'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { formatDate, cn } from '@/lib/utils'
import {
  ACTIVITY_ACTION_FILTER_OPTIONS,
  ACTIVITY_MODULE_FILTER_OPTIONS,
  buildActivityPageItems,
  formatActivityDetail,
  getVerbBadgeVariant,
  isValidActivityFilter,
  moduleLabel,
  resolveActivityActor,
  resolveActivityVerb,
} from '@/lib/activity-log-labels'

// Remembers search/filters/page/limit across back/forward navigation.
const ACTIVITY_LOG_LIST_STATE_KEY = 'activity-log-list-state'

const ACTOR_TABS = [
  { id: 'manual', label: 'Manual logs', Icon: User },
  { id: 'agent', label: 'Agent logs', Icon: Bot },
]

function sanitizePersistedFilter(value, options) {
  return isValidActivityFilter(value, options) ? value : 'All'
}

export default function ActivityLogPage() {
  const [persisted] = useState(() => readPersistedListState(ACTIVITY_LOG_LIST_STATE_KEY) || {})
  const [actorTab, setActorTab] = useState(
    persisted.actorTab === 'agent' ? 'agent' : 'manual',
  )
  const [searchQuery, setSearchQuery] = useState(persisted.searchQuery || '')
  const [debouncedSearch, setDebouncedSearch] = useState(persisted.searchQuery || '')
  const [actionFilter, setActionFilter] = useState(() =>
    sanitizePersistedFilter(persisted.actionFilter, ACTIVITY_ACTION_FILTER_OPTIONS),
  )
  const [moduleFilter, setModuleFilter] = useState(() =>
    sanitizePersistedFilter(persisted.moduleFilter, ACTIVITY_MODULE_FILTER_OPTIONS),
  )
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(persisted.currentPage || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(persisted.limit || 10)
  const toast = useToast()

  const skipPageResetRef = useRef(true)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      if (skipPageResetRef.current) {
        skipPageResetRef.current = false
        return
      }
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    loadLogs()
  }, [debouncedSearch, currentPage, actionFilter, moduleFilter, limit, actorTab])

  usePersistListState(ACTIVITY_LOG_LIST_STATE_KEY, {
    actorTab,
    searchQuery: debouncedSearch,
    actionFilter,
    moduleFilter,
    currentPage,
    limit,
  })

  async function loadLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', limit.toString())
      params.append('actor', actorTab)
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
      if (actionFilter !== 'All') params.append('action', actionFilter)
      if (moduleFilter !== 'All') params.append('module', moduleFilter)

      const result = await api.get(`/api/activity-log?${params.toString()}`)
      if (result.success) {
        setLogs(result.data || [])
        if (result.pagination) {
          const totalItems = result.pagination.total || 0
          const pages = Math.ceil(totalItems / limit) || 1
          setTotal(totalItems)
          setTotalPages(pages)
          // Persisted page can be past the last page after data shrinks.
          if (currentPage > pages) setCurrentPage(pages)
        } else {
          setTotal(0)
          setTotalPages(1)
          if (currentPage > 1) setCurrentPage(1)
        }
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to load activity logs' })
      }
    } catch (e) {
      console.error('loadLogs', e)
      toast.error({ title: 'Error', message: 'Failed to load activity logs' })
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(newPage) {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleActorTabChange(next) {
    if (next === actorTab) return
    setActorTab(next)
    setCurrentPage(1)
  }

  const emptyHint =
    debouncedSearch || actionFilter !== 'All' || moduleFilter !== 'All'
      ? 'Try adjusting your filters'
      : actorTab === 'agent'
        ? 'Agent and automated actions will appear here'
        : 'Staff and admin actions will appear here'

  const pageItems = buildActivityPageItems(currentPage, totalPages)

  return (
    <MainLayout title="Activity Log" subtitle="Track all actions and changes across the system">
      <div className="space-y-4 md:space-y-6 min-h-full flex flex-col">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Activity Log</h2>
          <p className="text-sm text-muted-foreground">
            Track all actions and changes across the system
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Activity log source"
            className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-muted/40 p-1 shrink-0"
          >
            {ACTOR_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={actorTab === id}
                onClick={() => handleActorTabChange(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                  actorTab === id
                    ? 'bg-card text-[color:var(--studio-primary)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
            <SearchInput
              className="w-full sm:w-[260px]"
              placeholder="Search by user or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <StyledSelect
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value)
                setCurrentPage(1)
              }}
              options={ACTIVITY_ACTION_FILTER_OPTIONS}
              placeholder="All Actions"
              className="w-full sm:w-40"
            />

            <StyledSelect
              value={moduleFilter}
              onChange={(value) => {
                setModuleFilter(value)
                setCurrentPage(1)
              }}
              options={ACTIVITY_MODULE_FILTER_OPTIONS}
              placeholder="All Modules"
              className="w-full sm:w-40"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs()}
              className="w-full sm:w-auto shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <LoadingSpinner size="md" text="Loading activity logs..." />
          </div>
        )}

        {!loading && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[180px]">When</TableHead>
                  <TableHead className="w-[180px]">Who</TableHead>
                  <TableHead className="w-[110px]">What</TableHead>
                  <TableHead className="w-[140px]">Where</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No activity logs found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">{emptyHint}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => {
                    const actor = resolveActivityActor(log)
                    const verb = resolveActivityVerb(log)
                    const detail = formatActivityDetail(log)
                    const role = String(log?.doneBy?.role || '').toLowerCase()
                    const isAgent = role === 'agent' || role === 'system'
                    return (
                      <TableRow
                        key={log._id || log.id || index}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            {log.createdAt ? formatDate(log.createdAt) : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                              {isAgent ? (
                                <Bot className="h-3 w-3 text-brand" />
                              ) : (
                                <User className="h-3 w-3 text-brand" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {actor.name}
                              </p>
                              {actor.roleLabel && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {actor.roleLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getVerbBadgeVariant(verb)}
                            className="text-xs capitalize"
                          >
                            {verb}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {moduleLabel(log.entity || log.module)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 max-w-xl">
                            <p className="text-sm text-foreground line-clamp-2">
                              {detail.primary}
                            </p>
                            {detail.secondary && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {detail.secondary}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-4 mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground shrink-0">
              Showing page {currentPage} of {totalPages} ({total} total{' '}
              {total === 1 ? 'entry' : 'entries'})
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex flex-wrap items-center gap-1">
                  {pageItems.map((item) =>
                    item.type === 'ellipsis' ? (
                      <span
                        key={item.key}
                        className="px-1.5 text-sm text-muted-foreground select-none"
                        aria-hidden
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={item.page}
                        variant={currentPage === item.page ? 'gradient' : 'outline'}
                        onClick={() => handlePageChange(item.page)}
                        size="sm"
                        className="min-w-[2.5rem]"
                      >
                        {item.page}
                      </Button>
                    ),
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
