'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Plus, Search, Tags, Trash2, Pencil, Eye, Heart, Sparkles } from 'lucide-react'
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
import EmailCategoriesDialog from './EmailCategoriesDialog'
import EmailLeadReasonsDialog from './EmailLeadReasonsDialog'
import EmailTemplateThumbnail from './EmailTemplateThumbnail'
import {
  extractEmailTemplatesPayload,
  getTemplateCategoryName,
} from '../emailBuilderApi'

const PAGE_SIZE = 9

export default function EmailTemplatesTab({ onCreateNew, dataVersion = 0, onDataChanged }) {
  const toast = useToast()
  const [editingId, setEditingId] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [reasonsOpen, setReasonsOpen] = useState(false)
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

  const displayTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return String(a.subject || '').localeCompare(String(b.subject || ''))
    })
  }, [templates])

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
      const result = await api.get(`/api/email/builder?${params.toString()}`)
      if (result.success) {
        const { list, total, totalPages: totalPagesFromApi } = extractEmailTemplatesPayload(result)
        const nextTotalPages = Math.max(1, totalPagesFromApi ?? Math.ceil(total / PAGE_SIZE))
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        setTemplates(list)
        setTotalCount(total)
        setTotalPages(nextTotalPages)
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
    const visibleIds = displayTemplates.map((t) => t._id).filter(Boolean)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
    if (allSelected) setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    else setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
  }

  const deleteOne = async (tpl) => {
    if (!tpl?._id) return
    if (!confirm(`Delete email template "${tpl.subject}"? This cannot be undone.`)) return
    setDeletingId(tpl._id)
    try {
      const result = await api.delete(`/api/email/builder/${tpl._id}`)
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
      const result = await api.request('/api/email/builder/', {
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
      const result = await api.patch(`/api/email/builder/${tpl._id}`, { isFavorite: next })
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
      const result = await api.patch(`/api/email/builder/${tpl._id}`, { status: next })
      if (!result.success) setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, status: tpl.status } : t))
    } catch (e) {
      setTemplates((prev) => prev.map((t) => t._id === tpl._id ? { ...t, status: tpl.status } : t))
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(tpl._id); return s })
    }
  }

  return (
    <TabsContent value="templates" className="mt-6 flex-1 min-h-0 flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Create, organize, and manage reusable email templates.</p>
          {!loading && totalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{totalCount} templates</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCategoriesOpen(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Categories
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReasonsOpen(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Lead reasons
          </Button>
          <Button variant="gradient" className="w-full sm:w-auto" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create template
          </Button>
        </div>
      </div>

      <EmailCategoriesDialog
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        onChanged={() => {
          fetchTemplates()
          onDataChanged?.()
        }}
      />
      <EmailLeadReasonsDialog
        open={reasonsOpen}
        onClose={() => setReasonsOpen(false)}
        onChanged={() => {
          fetchTemplates()
          onDataChanged?.()
        }}
      />
      <EmailTemplateEditorDialog open={!!editingId} onClose={() => setEditingId(null)} templateId={editingId} onSaved={fetchTemplates} />
      <EmailTemplatePreviewDialog open={!!previewId} onClose={() => setPreviewId(null)} templateId={previewId} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={displayTemplates.length === 0 || loading}
          >
            {displayTemplates.length > 0 && displayTemplates.every((t) => selectedIds.includes(t._id))
              ? 'Unselect visible'
              : 'Select visible'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={bulkDelete}
            disabled={selectedIds.length === 0 || bulkDeleting}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
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
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-14 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No email templates yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Build your first template in the Email Builder, then reuse it across campaigns.
            </p>
            <Button variant="gradient" className="mt-6" onClick={onCreateNew}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && displayTemplates.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayTemplates.map((tpl, index) => {
              const categoryName = getTemplateCategoryName(tpl)
              const isInactive = tpl.status === 'inactive'
              return (
                <Card
                  key={tpl._id}
                  className={cn(
                    'group overflow-hidden border transition-all duration-200 rounded-2xl flex flex-col',
                    'border-border/80 hover:border-primary/40 hover:shadow-lg bg-card',
                    isInactive && 'opacity-75',
                    tpl.isFavorite && 'ring-1 ring-red-200/60'
                  )}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className="p-3 pb-0">
                    <EmailTemplateThumbnail html={tpl.htmlBody} />
                  </div>

                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tpl._id)}
                            onChange={() => toggleSelected(tpl._id)}
                            className="h-4 w-4 mt-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0">
                            <CardTitle className="text-base line-clamp-2 leading-snug">
                              {tpl.subject || 'Untitled template'}
                            </CardTitle>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge
                                variant={isInactive ? 'secondary' : 'default'}
                                className={cn(
                                  'text-[10px] font-medium',
                                  !isInactive && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0'
                                )}
                              >
                                {isInactive ? 'Inactive' : 'Active'}
                              </Badge>
                              {tpl.code ? (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {String(tpl.code)}
                                </Badge>
                              ) : null}
                              {categoryName ? (
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {categoryName}
                                </Badge>
                              ) : null}
                              {tpl.isFavorite ? (
                                <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                                  Favorite
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 pl-6">
                          {tpl.body || 'No description'}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <Switch
                          checked={!isInactive}
                          onChange={() => toggleStatus(tpl)}
                          disabled={togglingIds.has(tpl._id)}
                          title={isInactive ? 'Activate' : 'Deactivate'}
                          className="disabled:opacity-40 scale-75"
                        />
                        <button
                          type="button"
                          onClick={() => toggleFavorite(tpl)}
                          disabled={togglingIds.has(tpl._id)}
                          title={tpl.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                          className={cn(
                            'h-8 w-8 flex items-center justify-center rounded-full transition-all',
                            tpl.isFavorite
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-muted-foreground hover:bg-muted hover:text-red-400'
                          )}
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4',
                              tpl.isFavorite && 'fill-current',
                              heartAnimIds.has(tpl._id) && 'scale-125 transition-transform'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0 pb-3">
                    <div className="flex items-center gap-2 px-3">
                      <Button
                        variant="gradient"
                        size="sm"
                        className="text-xs flex-1"
                        onClick={() => setPreviewId(tpl._id)}
                        title="Preview email"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex-1"
                        onClick={() => setEditingId(tpl._id)}
                        title="Edit template"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteOne(tpl)}
                        disabled={deletingId === tpl._id}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 pt-2 mt-auto">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading || n === page}
                  className={cn(
                    'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50',
                    n === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/40'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground text-center">
                Page {page} of {totalPages} · {totalCount} templates
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </TabsContent>
  )
}
