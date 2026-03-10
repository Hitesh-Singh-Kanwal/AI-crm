'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, PhoneCall, Trash2, Info } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const ROWS_PER_PAGE = 10

export default function AiCallDetailPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedCall, setSelectedCall] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [deletingMany, setDeletingMany] = useState(false)

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / ROWS_PER_PAGE))

  const loadCalls = useCallback(
    async (page, query) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ROWS_PER_PAGE),
        })

        if (query) {
          params.set('search', query)
        }

        const result = await api.get(`/api/ai-calling?${params.toString()}`)
        if (result.success) {
          setCalls(result.data || [])
          setTotalCount(result.pagination?.total || (result.data ? result.data.length : 0))
        } else {
          toast.error('Failed to load AI call details', { description: result.error })
        }
      } catch (e) {
        console.error(e)
        toast.error('Error', { description: 'Unable to load AI call details' })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadCalls(currentPage, searchQuery)
  }, [currentPage, searchQuery, loadCalls])

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this call record?')
    if (!confirmed) return

    try {
      setDeletingId(id)
      const result = await api.delete(`/api/ai-calling/${id}`)
      if (result.success) {
        toast.success('Deleted', { description: 'AI call deleted successfully' })
        loadCalls(currentPage, searchQuery)
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
        loadCalls(currentPage, searchQuery)
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

  return (
    <MainLayout
      title="AI Call Details"
      subtitle="Review and manage individual AI call outcomes."
    >
      <div className="max-w-[1204px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-[#050312] tracking-tight">
              AI Call Details
            </h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-[#9224EF] bg-white border border-[#E2E8F0]">
              {totalCount} calls
            </span>
          </div>
          <p className="text-sm font-normal text-[#64748B]">
            View AI calling activity, search by call ID, number, status or summary, and remove
            outdated records.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="relative w-[260px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Search calls"
              value={searchQuery}
              onChange={(e) => {
                setCurrentPage(1)
                setSearchQuery(e.target.value)
              }}
              className="pl-9 h-9 rounded-lg border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 rounded-lg border-[#E2E8F0] bg-white text-xs font-medium text-[#334155] hover:bg-slate-50"
              onClick={toggleSelectAllOnPage}
              disabled={!calls.length}
            >
              {selectedIds.length === calls.length && calls.length > 0 ? 'Clear selection' : 'Select all on page'}
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
              className="h-9 px-4 rounded-lg border-[#E2E8F0] bg-white text-sm font-medium text-[#334155] hover:bg-slate-50"
              onClick={() => loadCalls(currentPage, searchQuery)}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" text="Loading AI call details…" />
            </div>
          )}

          {!loading && calls.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
                <PhoneCall className="h-6 w-6 text-[#64748B]" />
              </div>
              <p className="text-sm font-medium text-[#0F172A]">No AI call records found</p>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                Once AI calls are made, they will appear here with status, number, and a quick
                summary.
              </p>
            </div>
          )}

          {!loading && calls.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {calls.map((call) => {
                  const createdAt = call.createdAt ? new Date(call.createdAt) : null
                  const createdLabel = createdAt ? createdAt.toLocaleString() : '-'
                  const status = call.status || 'Unknown'

                  const isSelected = selectedIds.includes(call._id)

                  return (
                    <Card
                      key={call._id}
                      className={`group cursor-pointer border-2 ${
                        isSelected ? 'border-[#9224EF] shadow-lg' : 'border-[#E2E8F0]'
                      } hover:border-[#9224EF]/60 hover:shadow-lg transition-all duration-200`}
                      onClick={() => setSelectedCall(call)}
                    >
                      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelectOne(call._id)
                            }}
                            className="mt-1 rounded border-[#CBD5E1] data-[state=checked]:bg-[#9224EF] data-[state=checked]:border-[#9224EF]"
                            aria-label="Select call"
                          />
                          <div className="h-10 w-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#0F172A]">
                            <PhoneCall className="h-5 w-5 text-[#6366F1]" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {call.callId || 'Unknown Call'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {createdLabel}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        >
                          {status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#64748B]">
                          <span className="font-medium text-[#0F172A]">Number</span>
                          <span className="ml-2">
                            {call.customer?.number || call.customer?.phone || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-[#64748B]">
                          <span className="font-medium text-[#0F172A]">Summary</span>
                          <p className="mt-1 line-clamp-2">
                            {call.analysis?.summary || 'No summary available'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6366F1] hover:text-[#4F46E5]"
                          >
                            <Info className="h-3.5 w-3.5" />
                            View details
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(call._id)
                            }}
                            disabled={deletingId === call._id}
                            aria-label="Delete call"
                          >
                            {deletingId === call._id ? (
                              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#334155] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[#64748B]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#334155] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Details Modal */}
        <Dialog open={!!selectedCall} onClose={() => setSelectedCall(null)} maxWidth="2xl">
          <DialogContent onClose={() => setSelectedCall(null)} className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Call Details</DialogTitle>
              <DialogDescription>
                Full transcript and metadata for the selected AI call.
              </DialogDescription>
            </DialogHeader>

            {selectedCall && (
              <div className="mt-4 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-[#4F46E5]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {selectedCall.callId || 'Unknown Call'}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {selectedCall.createdAt
                          ? new Date(selectedCall.createdAt).toLocaleString()
                          : 'Created date unknown'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="self-start text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {selectedCall.status || 'Unknown'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Customer Number
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {selectedCall.customer?.number ||
                        selectedCall.customer?.phone ||
                        '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Customer Name
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {selectedCall.customer?.name || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Stage
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {selectedCall.stage || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Duration
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {selectedCall.duration || '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Summary</p>
                  <p className="text-sm text-[#0F172A] bg-[#F8FAFC] rounded-lg p-3">
                    {selectedCall.analysis?.summary || 'No summary available'}
                  </p>
                </div>

                {selectedCall.analysis?.successEvaluation && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Success Evaluation
                    </p>
                    <p className="text-sm text-[#0F172A] bg-[#F1F5F9] rounded-lg p-3">
                      {selectedCall.analysis.successEvaluation}
                    </p>
                  </div>
                )}

                {selectedCall.analysis?.transcript && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                      Transcript
                    </p>
                    <div className="text-sm text-[#0F172A] bg-[#F9FAFB] rounded-lg p-3 max-h-80 overflow-y-auto whitespace-pre-line">
                      {selectedCall.analysis.transcript}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}

