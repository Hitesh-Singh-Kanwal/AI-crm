'use client'

import { Phone, Plus, Copy, Trash2, Tags, Pencil, Search, Eye, Heart } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Switch from '@/components/ui/switch'
import CategoriesDialog from './CategoriesDialog'
import ScriptEditorDialog from './ScriptEditorDialog'
import ScriptPreviewDialog from './ScriptPreviewDialog'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const SCRIPTS_PAGE_SIZE = 9

function getScriptStats(text) {
  const t = (text || '').trim()
  if (!t) return { lines: 0, chars: 0 }
  const lines = t.split('\n').filter((l) => l.trim().length > 0).length
  return { lines, chars: t.length }
}

export default function ScriptsTab() {
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingScript, setEditingScript] = useState(null)
  const [previewScriptId, setPreviewScriptId] = useState(null)

  const toast = useToast()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingIds, setTogglingIds] = useState(new Set())
  const [heartAnimIds, setHeartAnimIds] = useState(new Set())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchScripts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(SCRIPTS_PAGE_SIZE),
      })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await api.get(`/api/ai-script/paginated?${params.toString()}`)
      const list = result.data?.Scripts ?? result.data?.scripts ?? result.data
      if (result.success && Array.isArray(list)) {
        setScripts(list)
        const total = result.pagination?.total ?? list.length
        setTotalCount(total)
        setTotalPages(Math.max(1, Math.ceil(total / SCRIPTS_PAGE_SIZE)))
      } else {
        setError(result.error || 'Failed to fetch scripts')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to fetch scripts')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchScripts()
  }, [fetchScripts])

  async function handleDeleteScript(script) {
    if (!script?._id) return
    if (!confirm(`Delete script "${script.name}"? This cannot be undone.`)) return
    setDeletingId(script._id)
    try {
      const result = await api.delete(`/api/ai-script/${script._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Script deleted successfully.' })
        if (scripts.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1))
        else fetchScripts()
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete script.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete script.' })
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleFavorite(script) {
    if (togglingIds.has(script._id)) return
    setTogglingIds((prev) => new Set(prev).add(script._id))
    setHeartAnimIds((prev) => new Set(prev).add(script._id))
    setTimeout(() => setHeartAnimIds((prev) => { const s = new Set(prev); s.delete(script._id); return s }), 400)
    const next = !script.isFavorite
    setScripts((prev) => prev.map((s) => s._id === script._id ? { ...s, isFavorite: next } : s))
    try {
      const result = await api.patch(`/api/ai-script/${script._id}`, { isFavorite: next })
      if (!result.success) setScripts((prev) => prev.map((s) => s._id === script._id ? { ...s, isFavorite: !next } : s))
    } catch (e) {
      setScripts((prev) => prev.map((s) => s._id === script._id ? { ...s, isFavorite: !next } : s))
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(script._id); return s })
    }
  }

  async function toggleStatus(scriptId, nextChecked) {
    if (!scriptId) return
    if (togglingIds.has(scriptId)) return

    // Determine the next status from the switch's checked value.
    const next = nextChecked ? 'active' : 'inactive'

    let prevStatus
    let isDefault = false

    setTogglingIds((prev) => new Set(prev).add(scriptId))
    setScripts((prev) =>
      prev.map((s) => {
        if (s._id !== scriptId) return s
        prevStatus = s.status
        isDefault = !!s.isDefault
        return { ...s, status: next }
      })
    )

    // Default scripts shouldn't be toggled; revert immediately.
    if (isDefault) {
      setScripts((prev) => prev.map((s) => (s._id === scriptId ? { ...s, status: prevStatus } : s)))
      setTogglingIds((prev) => {
        const s = new Set(prev)
        s.delete(scriptId)
        return s
      })
      return
    }

    try {
      const result = await api.patch(`/api/ai-script/${scriptId}`, { status: next })
      if (!result.success) {
        setScripts((prev) => prev.map((s) => (s._id === scriptId ? { ...s, status: prevStatus } : s)))
      }
    } catch (e) {
      setScripts((prev) => prev.map((s) => (s._id === scriptId ? { ...s, status: prevStatus } : s)))
    } finally {
      setTogglingIds((prev) => {
        const s = new Set(prev)
        s.delete(scriptId)
        return s
      })
    }
  }

  async function handleCopy(script) {
    try {
      await navigator.clipboard.writeText(script?.script || '')
      toast.success({ title: 'Copied', message: 'Script copied to clipboard.' })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Copy failed', message: 'Could not copy script.' })
    }
  }

  return (
    <TabsContent value="scripts" className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Manage AI calling scripts and track performance.</p>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 shrink-0">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCategoriesOpen(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Categories
          </Button>
          <Button
            variant="gradient"
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingScript(null)
              setEditorOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Script
          </Button>
        </div>
      </div>

      <CategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <ScriptEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialScript={editingScript}
        onSaved={fetchScripts}
      />
      <ScriptPreviewDialog open={!!previewScriptId} onClose={() => setPreviewScriptId(null)} scriptId={previewScriptId} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search scripts…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading scripts…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={fetchScripts}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!loading &&
          !error &&
          scripts.map((script, index) => (
          <Card
            key={script._id}
            className={cn(
              'group overflow-hidden border transition-all duration-200 animate-fade-in rounded-2xl',
              'border-border/80 hover:border-primary/40 hover:shadow-md bg-card',
              script.status === 'inactive' && 'opacity-60'
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/10">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                      {script.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {script.categoryID?.name || 'Uncategorized'}
                      </Badge>
                      {script.subCategory && (
                        <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                          {script.subCategory}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {script.type || 'call'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!script.isDefault && (
                    <Switch
                      checked={script.status === 'active'}
                      onChange={(checked) => toggleStatus(script._id, checked)}
                      disabled={togglingIds.has(script._id)}
                      title={script.status === 'active' ? 'Set inactive' : 'Set active'}
                      className="disabled:opacity-40 scale-75"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(script) }}
                    disabled={togglingIds.has(script._id)}
                    title={script.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={cn(
                      'h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40',
                      script.isFavorite
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-muted-foreground hover:bg-muted hover:text-red-400'
                    )}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4 transition-all duration-200',
                        script.isFavorite && 'fill-current',
                        heartAnimIds.has(script._id) && 'scale-125'
                      )}
                    />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums font-medium">{getScriptStats(script.script).lines} lines</span>
                  <span className="opacity-50">·</span>
                  <span className="tabular-nums">{getScriptStats(script.script).chars.toLocaleString()} chars</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="gradient"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewScriptId(script._id)
                  }}
                  disabled={script.status === 'inactive'}
                  title="Preview"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingScript(script)
                      setEditorOpen(true)
                    }}
                    disabled={script.status === 'inactive'}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(script)
                    }}
                    title="Copy"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteScript(script)
                    }}
                    disabled={deletingId === script._id || script.isDefault}
                    title={script.isDefault ? 'Default scripts cannot be deleted' : 'Delete'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && !error && scripts.length > 0 && (
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
                  n === page ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted/40'
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
      )}
    </TabsContent>
  )
}

