'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Phone, Mail, MessageSquare, MoreHorizontal, UserCheck } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
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
import LeadsQuickBar from '@/components/leads/LeadsQuickBar'
import LeadsFilterPanel from '@/components/leads/LeadsFilterPanel'
import DynamicListFormDialog from '@/components/dynamic-list/DynamicListFormDialog'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { buildLeadQueryParams, filtersToConditionsForForm } from '@/lib/lead-filter-fields'
import {
  EMPTY_LEAD_FILTERS,
  sanitizeLeadFilters,
} from '@/lib/lead-page-filters'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'
import { normalizeConditionsForForm } from '@/lib/dynamic-list-normalize'

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
  const [selectedIds, setSelectedIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [leads, setLeads] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInitialLeadId, setDialogInitialLeadId] = useState(null)
  const [dialogViewOnly, setDialogViewOnly] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [filters, setFilters] = useState(EMPTY_LEAD_FILTERS)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [prefillList, setPrefillList] = useState(null)
  const [leadReasons, setLeadReasons] = useState([])
  const [locations, setLocations] = useState([])
  const [forms, setForms] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [convertingId, setConvertingId] = useState(null)

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / ROWS_PER_PAGE))

  const loadLeads = useCallback(async (page, nextFilters) => {
    setLoading(true)
    try {
      const sanitized = sanitizeLeadFilters(nextFilters)
      const params = buildLeadQueryParams({
        page,
        limit: ROWS_PER_PAGE,
        filters: sanitized,
      })

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
  }, [])

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

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    loadLeads(currentPage, filters)
  }, [currentPage, filters, loadLeads])

  const refreshLeads = useCallback(() => {
    loadLeads(currentPage, filters)
  }, [currentPage, filters, loadLeads])

  const applyFilters = (next) => {
    setFilters(sanitizeLeadFilters(next))
    setCurrentPage(1)
    setFilterPanelOpen(false)
  }

  const openCreateListFromFilters = () => {
    const sanitized = sanitizeLeadFilters(filters)
    const conditions = filtersToConditionsForForm(sanitized)
    if (conditions.length === 0) {
      toast.info('No filters applied', { description: 'Apply at least one filter before saving as a list.' })
      return
    }
    setPrefillList({
      name: '',
      description: '',
      conditionLogic: sanitized.conditionLogic || 'AND',
      conditions: normalizeConditionsForForm(conditions),
      groupLogics: sanitized.groupLogics || {},
      status: 'active',
    })
    setListDialogOpen(true)
  }

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
    const confirmed = window.confirm(`Convert "${lead.name}" to a customer? This will create a Customer record and mark the lead as Converted.`)
    if (!confirmed) return

    setConvertingId(lead._id)
    try {
      const result = await api.post(`/api/lead/${lead._id}/convert-to-customer`, {})
      if (result.success) {
        toast.success('Converted', { description: `${lead.name} has been converted to a customer.` })
        refreshLeads()
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
        refreshLeads()
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
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
                  {totalCount} leads
                </span>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                Manage leads and filter by any field. Save filters as dynamic lists for automation.
              </p>
            </div>
            <Button
              className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              Add Leads
            </Button>
          </div>
        </div>

        <LeadsQuickBar
          filters={filters}
          onChange={(next) => {
            setFilters(sanitizeLeadFilters(next))
            setCurrentPage(1)
          }}
          onClear={() => applyFilters(EMPTY_LEAD_FILTERS)}
          onOpenAdvanced={() => setFilterPanelOpen(true)}
          onCreateList={openCreateListFromFilters}
          canCreateList
          locations={locations}
          forms={forms}
          leadReasons={leadReasons}
        />

        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden min-h-[560px] flex flex-col">
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

        <LeadsFilterPanel
          open={filterPanelOpen}
          appliedFilters={filters}
          onClose={() => setFilterPanelOpen(false)}
          onApply={applyFilters}
          locations={locations}
          forms={forms}
          leadReasons={leadReasons}
          loadingOptions={loadingOptions}
        />

        <DynamicListFormDialog
          open={listDialogOpen}
          onClose={() => {
            setListDialogOpen(false)
            setPrefillList(null)
          }}
          list={prefillList}
          onSaved={() => {
            toast.success('Dynamic list created', {
              description: 'Your filtered leads have been saved as a dynamic list.',
            })
          }}
        />

        <LeadsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          leads={leads}
          onRefresh={refreshLeads}
          initialLeadId={dialogInitialLeadId}
          viewOnly={dialogViewOnly}
        />

        <BulkCreateLeadsDialog
          open={bulkDialogOpen}
          onClose={() => setBulkDialogOpen(false)}
          onRefresh={refreshLeads}
        />
      </div>
    </MainLayout>
  )
}
