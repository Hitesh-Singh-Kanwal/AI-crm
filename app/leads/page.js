'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, ChevronDown, SlidersHorizontal, Phone, Mail, MessageSquare, MoreHorizontal, X, UserCheck } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import LeadsDialog from './components/LeadsDialog'
import BulkCreateLeadsDialog from './components/BulkCreateLeadsDialog'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import GlobalLoader from '@/components/shared/GlobalLoader'

const STAGE_STYLES = {
  new: 'bg-slate-200 text-slate-800',
  engaged: 'bg-blue-100 text-blue-800',
  bookingInProgress: 'bg-amber-100 text-amber-800',
  cold: 'bg-slate-300 text-slate-800',
  booked: 'bg-emerald-100 text-emerald-800',
  disqualified: 'bg-rose-100 text-rose-800',
  qualified: 'bg-violet-100 text-violet-800',
  lost: 'bg-slate-400 text-slate-900',
}

const BOOKING_STATUS_STYLES = {
  'Not Booked': 'bg-amber-100 text-amber-800',
  Booked: 'bg-emerald-100 text-emerald-800',
}

const ROWS_PER_PAGE = 10

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [leads, setLeads] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInitialLeadId, setDialogInitialLeadId] = useState(null)
  const [dialogViewOnly, setDialogViewOnly] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [stageFilter, setStageFilter] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('')
  const [escalatedOnly, setEscalatedOnly] = useState(false)
  const [sort, setSort] = useState('createdDesc')
  const [convertingId, setConvertingId] = useState(null)

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / ROWS_PER_PAGE))

  const loadLeads = useCallback(async (page, query, filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROWS_PER_PAGE),
      })
      if (query) {
        params.set('search', query)
      }
      if (filters?.stage) params.set('stage', filters.stage)
      if (filters?.bookingStatus) params.set('bookingStatus', filters.bookingStatus)
      if (filters?.isEscalated) params.set('isEscalated', 'true')

      const result = await api.get(`/api/lead?${params.toString()}`)
      if (result.success) {
        let data = result.data || []
        const pagination = result.data?.pagination ?? result.pagination
        const total = pagination?.total || (result.data ? result.data.length : 0)
        const nextTotalPages = Math.max(1, Math.ceil((total || 0) / ROWS_PER_PAGE))
        if (page > nextTotalPages) {
          setCurrentPage(nextTotalPages)
          return
        }

        if (sort === 'nameAsc') {
          data = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        } else if (sort === 'nameDesc') {
          data = [...data].sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        }

        setLeads(data)
        setTotalCount(total)
      } else {
        toast.error('Failed to load leads', { description: result.error })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unable to load leads' })
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }, [sort])

  useEffect(() => {
    loadLeads(currentPage, searchQuery, {
      stage: stageFilter,
      bookingStatus: bookingStatusFilter,
      isEscalated: escalatedOnly,
    })
  }, [currentPage, searchQuery, stageFilter, bookingStatusFilter, escalatedOnly, loadLeads])

  if (loading && leads.length === 0) {
    return (
      <MainLayout title="Leads" subtitle="">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading leads…" />
        </div>
      </MainLayout>
    )
  }

  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([])
    else setSelectedIds(leads.map((l) => l._id))
  }

  const openCreateDialog = () => {
    setDialogInitialLeadId(null)
    setDialogViewOnly(false)
    setDialogOpen(true)
  }

  const openEditDialog = (id) => {
    setDialogInitialLeadId(id)
    setDialogViewOnly(false)
    setDialogOpen(true)
  }

  const openViewDialog = (id) => {
    setDialogInitialLeadId(id)
    setDialogViewOnly(true)
    setDialogOpen(true)
  }

  const handleConvertToCustomer = async (lead) => {
    if (lead.convertedCustomerID) {
      toast.info('Already a customer', { description: `${lead.name} has already been converted to a customer.` })
      return
    }
    const confirmed = window.confirm(`Convert "${lead.name}" to a customer? This will create a Customer record and set the lead stage to Actualized.`)
    if (!confirmed) return

    setConvertingId(lead._id)
    try {
      const result = await api.post(`/api/lead/${lead._id}/convert-to-customer`, {})
      if (result.success) {
        toast.success('Converted', { description: `${lead.name} has been converted to a customer.` })
        loadLeads(currentPage, searchQuery, { stage: stageFilter, bookingStatus: bookingStatusFilter, isEscalated: escalatedOnly })
      } else {
        toast.error('Conversion failed', { description: result.error || 'Unable to convert lead' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unexpected error during conversion' })
    } finally {
      setConvertingId(null)
    }
  }

  const handleDeleteLead = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this lead?')
    if (!confirmed) return

    try {
      const result = await api.delete(`/api/lead/${id}`)
      if (result.success) {
        toast.success('Deleted', { description: 'Lead deleted successfully' })
        loadLeads(currentPage, searchQuery, {
          stage: stageFilter,
          bookingStatus: bookingStatusFilter,
          isEscalated: escalatedOnly,
        })
      } else {
        toast.error('Delete failed', { description: result.error || 'Unable to delete lead' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unexpected error while deleting lead' })
    }
  }

  return (
    <MainLayout title="Leads" subtitle="">
      <div className="max-w-[1204px] mx-auto min-h-full flex flex-col">
        {/* Title + count + description */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
              {totalCount} leads
            </span>
          </div>
          <p className="text-sm font-normal text-muted-foreground">
            Manage your team members and their account permissions here.
          </p>
        </div>

        {/* Search + filter bar — Search left, everything else right */}
        <div className="flex items-center justify-between gap-3 mb-6">
          {/* Left: Search */}
          <div className="relative w-[220px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-background text-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* Right: all filter controls */}
          <div className="flex items-center gap-2">
            {/* Active filter pills */}
            {stageFilter && (
              <button
                type="button"
                onClick={() => setStageFilter('')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-brand-foreground text-sm font-medium shrink-0"
              >
                {stageFilter} <X className="h-3.5 w-3.5" />
              </button>
            )}
          {bookingStatusFilter && (
            <button
              type="button"
              onClick={() => setBookingStatusFilter('')}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-brand-foreground text-sm font-medium shrink-0"
            >
              {bookingStatusFilter} <X className="h-3.5 w-3.5" />
            </button>
          )}
          {escalatedOnly && (
            <button
              type="button"
              onClick={() => setEscalatedOnly(false)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-brand-foreground text-sm font-medium shrink-0"
            >
              Escalated <X className="h-3.5 w-3.5" />
            </button>
          )}
            {sort !== 'createdDesc' && (
              <button
                type="button"
                onClick={() => setSort('createdDesc')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-brand-foreground text-sm font-medium shrink-0"
              >
                {sort === 'nameAsc' ? 'Sort A-Z' : sort} <X className="h-3.5 w-3.5" />
              </button>
            )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                More filters
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-semibold text-foreground">
                Booking status
              </div>
              <DropdownMenuItem onClick={() => setBookingStatusFilter('')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBookingStatusFilter('Not Booked')}>
                Not Booked
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBookingStatusFilter('Booked')}>
                Booked
              </DropdownMenuItem>

              <div className="px-2 pt-2 pb-1.5 text-sm font-semibold text-foreground">
                Escalation
              </div>
              <DropdownMenuItem
                onClick={() => setEscalatedOnly((prev) => !prev)}
                className="flex items-center justify-between"
              >
                <span>Escalated only</span>
                {escalatedOnly && (
                  <span className="text-[10px] rounded-full bg-brand text-brand-foreground px-1.5 py-0.5">
                    On
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 shrink-0"
              >
                {stageFilter ? `Status: ${stageFilter}` : 'Status'}{' '}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStageFilter('')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('new')}>New</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('engaged')}>Engaged</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('cold')}>Cold</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('bookingInProgress')}>
                Booking In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('booked')}>Booked</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('qualified')}>Qualified</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('disqualified')}>Disqualified</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStageFilter('lost')}>Lost</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            Add Leads
          </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[560px] flex flex-col">
          <div className="flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent bg-muted/30">
                <TableHead className="w-12 py-3 pl-4 pr-0">
                  <Checkbox
                    checked={selectedIds.length === leads.length && leads.length > 0}
                    onClick={toggleAll}
                    className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                  />
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Contact</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Booking Status</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Communication</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Created</TableHead>
                <TableHead className="w-12 py-3 pr-4 pl-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const stageKey = (lead.stage || 'new').toLowerCase()
                const bookingStatus = lead.bookingStatus || 'Not Booked'
                const createdAt = lead.createdAt ? new Date(lead.createdAt) : null
                const createdLabel = createdAt ? createdAt.toLocaleDateString() : '-'
                const lastActiveLabel = lead.updatedAt
                  ? new Date(lead.updatedAt).toLocaleDateString()
                  : createdLabel

                return (
                <TableRow
                  key={lead._id}
                  className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => openViewDialog(lead._id)}
                >
                  <TableCell className="py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(lead._id)}
                      onClick={() => toggleOne(lead._id)}
                      className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                    />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-normal text-foreground leading-tight">{lead.name}</p>
                        {lead.location && (
                          <p className="text-xs font-normal text-muted-foreground leading-tight mt-0.5">
                            {lead.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="text-sm font-normal text-foreground leading-tight">{lead.email}</div>
                    <div className="text-xs font-normal text-muted-foreground leading-tight">{lead.phoneNumber}</div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STAGE_STYLES[stageKey] ?? 'bg-slate-200 text-slate-700'
                      )}
                    >
                      {lead.stage || 'new'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        BOOKING_STATUS_STYLES[bookingStatus] ?? 'bg-slate-200 text-slate-700'
                      )}
                    >
                      {bookingStatus}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {lead.calls ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {lead.emails ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {lead.chats ?? 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <p className="text-sm font-normal text-foreground leading-tight">{createdLabel}</p>
                    <p className="text-xs font-normal text-muted-foreground leading-tight">
                      Last: {lastActiveLabel}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 pr-4 pl-0" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(lead._id)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(lead._id)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleConvertToCustomer(lead)}
                          disabled={!!lead.convertedCustomerID || convertingId === lead._id}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {lead.convertedCustomerID ? 'Already a Customer' : convertingId === lead._id ? 'Converting…' : 'Convert to Customer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteLead(lead._id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        <LeadsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          leads={leads}
          onRefresh={() =>
            loadLeads(currentPage, searchQuery, {
              stage: stageFilter,
              bookingStatus: bookingStatusFilter,
              isEscalated: escalatedOnly,
            })
          }
          initialLeadId={dialogInitialLeadId}
          viewOnly={dialogViewOnly}
        />

        <BulkCreateLeadsDialog
          open={bulkDialogOpen}
          onClose={() => setBulkDialogOpen(false)}
          onRefresh={() =>
            loadLeads(currentPage, searchQuery, {
              stage: stageFilter,
              bookingStatus: bookingStatusFilter,
              isEscalated: escalatedOnly,
            })
          }
        />
      </div>
    </MainLayout>
  )
}