'use client'

import { useState, useEffect } from 'react'
import { Search, Mail, Phone, MessageSquare, MoreHorizontal, Plus, Trash2, Edit, Upload } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import StyledSelect from '@/components/shared/StyledSelect'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import LeadsDialog from '@/app/leads/components/LeadsDialog'
import BulkCreateLeadsDialog from '@/app/leads/components/BulkCreateLeadsDialog'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const stageColors = {
  new: 'badge-info',
  engaged: 'badge-warning',
  bookingInProgress: 'badge-warning',
  cold: 'badge-info',
  booked: 'badge-success',
  disqualified: 'text-slate-500 bg-slate-100',
  qualified: 'badge-success',
  lost: 'text-red-600 bg-red-50',
}

const bookingStatusColors = {
  'Not Booked': 'badge-info',
  'Booked': 'badge-success',
}

const stageLabels = {
  new: 'New',
  engaged: 'Engaged',
  bookingInProgress: 'Booking In Progress',
  cold: 'Cold',
  booked: 'Booked',
  disqualified: 'Disqualified',
  qualified: 'Qualified',
  lost: 'Lost',
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [leadsList, setLeadsList] = useState([])
  const [loading, setLoading] = useState(false)
  const [leadsDialogOpen, setLeadsDialogOpen] = useState(false)
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(10)
  const [customLimit, setCustomLimit] = useState('')
  const [showCustomLimit, setShowCustomLimit] = useState(false)
  const toast = useToast()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load leads when filters change
  useEffect(() => {
    loadLeads()
  }, [debouncedSearch, currentPage, stageFilter, bookingStatusFilter, limit])

  async function loadLeads() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (stageFilter !== 'All') params.append('stage', stageFilter)
      if (bookingStatusFilter !== 'All') params.append('bookingStatus', bookingStatusFilter)
      params.append('page', currentPage.toString())
      params.append('limit', limit.toString())

      const result = await api.get(`/api/lead?${params.toString()}`)
      if (result.success) {
        setLeadsList(result.data || [])
        setTotal(result.pagination?.total || 0)
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to load leads' })
      }
    } catch (e) {
      console.error('Failed to load leads:', e)
      toast.error({ title: 'Error', message: 'Failed to load leads' })
    } finally {
      setLoading(false)
    }
  }

  async function deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      const result = await api.delete(`/api/lead/${leadId}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Lead deleted successfully' })
        loadLeads()
        setSelectedLeads(selectedLeads.filter((id) => id !== leadId))
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to delete lead' })
      }
    } catch (e) {
      console.error('Failed to delete lead:', e)
      toast.error({ title: 'Error', message: 'Failed to delete lead' })
    }
  }

  async function deleteManyLeads() {
    if (selectedLeads.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)?`)) return

    try {
      const result = await api.request('/api/lead/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selectedLeads }),
      })
      if (result.success) {
        toast.success({ title: 'Deleted', message: `${selectedLeads.length} lead(s) deleted successfully` })
        setSelectedLeads([])
        loadLeads()
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to delete leads' })
      }
    } catch (e) {
      console.error('Failed to delete leads:', e)
      toast.error({ title: 'Error', message: 'Failed to delete leads' })
    }
  }

  const toggleLead = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    )
  }

  const toggleAll = () => {
    if (selectedLeads.length === leadsList.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leadsList.map((l) => l._id))
    }
  }

  const openEditDialog = (leadId) => {
    setEditingLeadId(leadId)
    setLeadsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingLeadId(null)
    setLeadsDialogOpen(true)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <MainLayout title="Leads" subtitle="Manage and track all your leads">
      <div className="space-y-4 md:space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full sm:w-48"
          >
            <option value="All">All Stages</option>
            <option value="new">New</option>
            <option value="engaged">Engaged</option>
            <option value="bookingInProgress">Booking In Progress</option>
            <option value="cold">Cold</option>
            <option value="booked">Booked</option>
            <option value="disqualified">Disqualified</option>
            <option value="qualified">Qualified</option>
            <option value="lost">Lost</option>
          </Select>
          <Select
            value={bookingStatusFilter}
            onChange={(e) => {
              setBookingStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full sm:w-48"
          >
            <option value="All">All Booking Status</option>
            <option value="Not Booked">Not Booked</option>
            <option value="Booked">Booked</option>
          </Select>
          <div className="relative w-full sm:w-40">
            {!showCustomLimit ? (
              <StyledSelect
                value={[10, 20, 50, 100].includes(limit) ? limit.toString() : 'custom'}
                onChange={(value) => {
                  if (value === 'custom') {
                    setShowCustomLimit(true)
                    setCustomLimit(limit.toString())
                  } else {
                    const newLimit = parseInt(value)
                    setLimit(newLimit)
                    setCurrentPage(1)
                  }
                }}
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '20', label: '20 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' },
                  { value: 'custom', label: `${limit} per page (custom)` }
                ]}
                placeholder="10 per page"
                className="w-full"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(e.target.value)}
                  onBlur={() => {
                    const newLimit = parseInt(customLimit)
                    if (newLimit && newLimit >= 1 && newLimit <= 1000) {
                      setLimit(newLimit)
                      setCurrentPage(1)
                      setShowCustomLimit(false)
                    } else {
                      setCustomLimit(limit.toString())
                      setShowCustomLimit(false)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newLimit = parseInt(customLimit)
                      if (newLimit && newLimit >= 1 && newLimit <= 1000) {
                        setLimit(newLimit)
                        setCurrentPage(1)
                        setShowCustomLimit(false)
                      } else {
                        setShowCustomLimit(false)
                        setCustomLimit(limit.toString())
                      }
                    } else if (e.key === 'Escape') {
                      setShowCustomLimit(false)
                      setCustomLimit(limit.toString())
                    }
                  }}
                  placeholder="Enter limit"
                  className="w-full"
                  autoFocus
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="gradient" className="flex-1 sm:flex-none" onClick={() => setBulkCreateDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Bulk Create</span>
            </Button>
            <Button variant="gradient" className="flex-1 sm:flex-none" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up shadow-sm">
            <span className="text-sm font-semibold text-slate-900">
              {selectedLeads.length} lead(s) selected
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={deleteManyLeads}
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete Selected</span>
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {/* Leads Table - Tablet/Desktop */}
        {!loading && (
          <>
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLeads.length === leadsList.length && leadsList.length > 0}
                          onClick={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Booking Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Human Agent</TableHead>
                      <TableHead>AI Agent</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      leadsList.map((lead, index) => (
                        <TableRow
                          key={lead._id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.includes(lead._id)}
                              onClick={() => toggleLead(lead._id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              {lead.isEscalated && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Escalated
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{lead.email}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{lead.phoneNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(stageColors[lead.stage] || 'badge-info')}>
                              {stageLabels[lead.stage] || lead.stage}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(bookingStatusColors[lead.bookingStatus] || 'badge-info')}>
                              {lead.bookingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{lead.location}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {lead.assignedHumanAgent || <span className="text-muted-foreground">—</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {lead.assignedAiAgent || <span className="text-muted-foreground">—</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(lead.createdAt)}</p>
                              {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  Updated: {formatDate(lead.updatedAt)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(lead._id)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteLead(lead._id)}
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Leads Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {leadsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No leads found</div>
              ) : (
                leadsList.map((lead, index) => (
                  <div
                    key={lead._id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-fade-in"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedLeads.includes(lead._id)}
                          onClick={() => toggleLead(lead._id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 mb-1">{lead.name}</p>
                          <p className="text-sm text-slate-600 mb-0.5 truncate">{lead.email}</p>
                          <p className="text-sm text-slate-600 truncate">{lead.phoneNumber}</p>
                          <p className="text-xs text-slate-500 mt-1">{lead.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lead._id)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLead(lead._id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={cn(stageColors[lead.stage] || 'badge-info')}>
                        {stageLabels[lead.stage] || lead.stage}
                      </Badge>
                      <Badge className={cn(bookingStatusColors[lead.bookingStatus] || 'badge-info')}>
                        {lead.bookingStatus}
                      </Badge>
                      {lead.isEscalated && (
                        <Badge variant="outline" className="text-xs">
                          Escalated
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mb-3 space-y-1">
                      <p>
                        <span className="font-medium">Human Agent:</span>{' '}
                        {lead.assignedHumanAgent || <span className="text-muted-foreground">—</span>}
                      </p>
                      <p>
                        <span className="font-medium">AI Agent:</span>{' '}
                        {lead.assignedAiAgent || <span className="text-muted-foreground">—</span>}
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <p>Created: {formatDate(lead.createdAt)}</p>
                      {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                        <p>Updated: {formatDate(lead.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
              <div className="flex flex-row items-center border-t border-slate-200 pt-4">
                <div className="text-sm text-slate-600 w-52 flex-shrink-0">
                  Showing page {currentPage} of {totalPages} ({total} total {total === 1 ? 'lead' : 'leads'})
                </div>
                <div className="flex-1 flex justify-center">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'gradient' : 'outline'}
                              onClick={() => setCurrentPage(pageNum)}
                              size="sm"
                              className="min-w-[2.5rem]"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
                <div className="w-52 flex-shrink-0" aria-hidden="true" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Leads Dialog */}
      <LeadsDialog
        open={leadsDialogOpen}
        onClose={() => {
          setLeadsDialogOpen(false)
          setEditingLeadId(null)
        }}
        leads={leadsList}
        onRefresh={loadLeads}
        initialLeadId={editingLeadId}
      />

      {/* Bulk Create Dialog */}
      <BulkCreateLeadsDialog
        open={bulkCreateDialogOpen}
        onClose={() => setBulkCreateDialogOpen(false)}
        onRefresh={loadLeads}
      />
    </MainLayout>
  )
}
