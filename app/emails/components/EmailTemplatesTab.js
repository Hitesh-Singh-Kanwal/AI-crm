'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Plus, Search, Trash2, Pencil, Eye, Heart } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Switch from '@/components/ui/switch'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import EmailTemplateEditorDialog from './EmailTemplateEditorDialog'
import EmailTemplatePreviewDialog from './EmailTemplatePreviewDialog'

const PAGE_SIZE = 9

export default function EmailTemplatesTab({ onCreateNew, dataVersion = 0, onDataChanged }) {
  const toast = useToast()
  const [editingId, setEditingId] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingIds, setTogglingIds] = useState(new Set())
  const [heartAnimIds, setHeartAnimIds] = useState(new Set())

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await api.get(`/api/emailBuilder?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : result.data?.emails
      if (result.success && Array.isArray(list)) {
        setTemplates(list)
        const total = result.pagination?.total ?? list.length
        setTotalCount(total)
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)))
        setSelectedIds([])
      } else {
        setError(result.error || 'Failed to fetch email templates')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to fetch email templates')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates, dataVersion])

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === templates.length) setSelectedIds([])
    else setSelectedIds(templates.map((t) => t._id).filter(Boolean))
  }

  const deleteOne = async (tpl) => {
    if (!tpl?._id) return
    if (!confirm(`Delete email template "${tpl.subject}"? This cannot be undone.`)) return
    setDeletingId(tpl._id)
    try {
      const result = await api.delete(`/api/emailBuilder/${tpl._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete email.' })
        return
      }
      toast.success({ title: 'Deleted', message: 'Email template deleted successfully.' })
      onDataChanged?.()
      if (templates.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1))
      else fetchTemplates()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete email.' })
    } finally {
      setDeletingId(null)
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} email templates? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const result = await api.request('/api/emailBuilder/', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (!result.success) {
        toast.error({ title: 'Bulk delete failed', message: result.error || 'Could not delete emails.' })
        return
      }
      toast.success({ title: 'Deleted', message: 'Email templates deleted successfully.' })
      onDataChanged?.()
      fetchTemplates()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete emails.' })
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleFavorite = async (tpl) => {
    if (togglingIds.has(tpl._id)) return
    setTogglingIds((prev) => new Set(prev).add(tpl._id))
    setHeartAnimIds((prev) => new Set(prev).add(tpl._id))
    setTimeout(() => setHeartAnimIds((prev) => { const s = new Set(prev); s.delete(tpl._id); return s }), 400)
    const next = !tpl.isFavorite
    setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, isFavorite: next } : t))
    try {
      const result = await api.patch(`/api/emailBuilder/${tpl._id}`, { isFavorite: next })
      if (!result.success) setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, isFavorite: !next } : t))
    } catch (e) {
      setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, isFavorite: !next } : t))
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(tpl._id); return s })
    }
  }

  const toggleStatus = async (tpl) => {
    if (togglingIds.has(tpl._id)) return
    setTogglingIds((prev) => new Set(prev).add(tpl._id))
    const next = tpl.status === 'active' ? 'inactive' : 'active'
    setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, status: next } : t))
    try {
      const result = await api.patch(`/api/emailBuilder/${tpl._id}`, { status: next })
      if (!result.success) setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, status: tpl.status } : t))
    } catch (e) {
      setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, status: tpl.status } : t))
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(tpl._id); return s })
    }
  }

  return (
    <TabsContent value="templates" className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Manage email templates.</p>
        <Button variant="gradient" className="w-full sm:w-auto" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create template
        </Button>
      </div>

      <EmailTemplateEditorDialog open={!!editingId} onClose={() => setEditingId(null)} templateId={editingId} onSaved={fetchTemplates} />
      <EmailTemplatePreviewDialog open={!!previewId} onClose={() => setPreviewId(null)} templateId={previewId} />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={toggleSelectAll}
            disabled={templates.length === 0 || loading}
          >
            {selectedIds.length === templates.length && templates.length > 0 ? 'Unselect all' : 'Select all'}
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={bulkDelete}
            disabled={selectedIds.length === 0 || bulkDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {bulkDeleting ? 'Deleting…' : `Delete (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading templates…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={fetchTemplates}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No email templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to reuse your email content.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && templates.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl, index) => (
              <Card
                key={tpl._id}
                className={cn(
                  'group overflow-hidden border transition-all duration-200 animate-fade-in rounded-2xl',
                  'border-border/80 hover:border-primary/40 hover:shadow-md bg-card',
                  tpl.status === 'inactive' && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tpl._id)}
                          onChange={() => toggleSelected(tpl._id)}
                          className="h-4 w-4"
                        />
                        <CardTitle className="text-base line-clamp-2">{tpl.subject || 'No subject'}</CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                        {tpl.body || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Status toggle */}
                      <Switch
                        checked={tpl.status === 'active'}
                        onChange={() => toggleStatus(tpl)}
                        disabled={togglingIds.has(tpl._id)}
                        title={tpl.status === 'active' ? 'Set inactive' : 'Set active'}
                        className="disabled:opacity-40 scale-75"
                      />
                      {/* Favorite toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(tpl)}
                        disabled={togglingIds.has(tpl._id)}
                        title={tpl.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        className={cn(
                          'h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40',
                          tpl.isFavorite
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-muted-foreground hover:bg-muted hover:text-red-400'
                        )}
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4 transition-all duration-200',
                            tpl.isFavorite && 'fill-current',
                            heartAnimIds.has(tpl._id) && 'scale-125'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => setPreviewId(tpl._id)}
                      disabled={tpl.status === 'inactive'}
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => setEditingId(tpl._id)}
                      disabled={tpl.status === 'inactive'}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteOne(tpl)}
                      disabled={deletingId === tpl._id}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {deletingId === tpl._id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading || n === page}
                  className={cn(
                    'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    n === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/40'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </TabsContent>
  )
}

