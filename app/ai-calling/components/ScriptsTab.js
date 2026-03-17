'use client'

import { Phone, Plus, Copy, Trash2, Tags, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import CategoriesDialog from './CategoriesDialog'
import ScriptEditorDialog from './ScriptEditorDialog'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function safeRate(conversions, calls) {
  const c = Number(conversions || 0)
  const t = Number(calls || 0)
  if (!t) return '0.0%'
  return `${((c / t) * 100).toFixed(1)}%`
}

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

  const toast = useToast()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const sortedScripts = useMemo(() => {
    return [...scripts].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
  }, [scripts])

  async function fetchScripts() {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get('/api/ai-script/')
      if (result.success) {
        const list = result.data?.Scripts
        setScripts(Array.isArray(list) ? list : [])
      } else {
        setError(result.error || 'Failed to fetch scripts')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to fetch scripts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScripts()
  }, [])

  async function handleDeleteScript(script) {
    if (!script?._id) return
    if (!confirm(`Delete script "${script.name}"? This cannot be undone.`)) return
    setDeletingId(script._id)
    try {
      const result = await api.delete(`/api/ai-script/${script._id}`)
      if (result.success) {
        setScripts((prev) => prev.filter((s) => s._id !== script._id))
        toast.success({ title: 'Deleted', message: 'Script deleted successfully.' })
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
          sortedScripts.map((script, index) => (
          <Card
            key={script._id}
            className="group overflow-hidden border-border/80 hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer animate-fade-in rounded-2xl"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => {
              setEditingScript(script)
              setEditorOpen(true)
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg leading-tight truncate">{script.name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {script.categoryID?.name || 'Uncategorized'}
                      </Badge>
                      {script.subCategory && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {script.subCategory}
                        </Badge>
                      )}
                      <Badge variant={script.isDefault ? 'secondary' : 'outline'} className="text-xs">
                        {script.isDefault ? 'Default' : 'Custom'}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {script.type || 'call'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingScript(script)
                      setEditorOpen(true)
                    }}
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(script)
                    }}
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteScript(script)
                    }}
                    disabled={deletingId === script._id || script.isDefault}
                    title={script.isDefault ? 'Default scripts cannot be deleted' : 'Delete'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">Script</span>
                  <span className="tabular-nums">{getScriptStats(script.script).lines} lines</span>
                  <span className="opacity-60">·</span>
                  <span className="tabular-nums">{getScriptStats(script.script).chars.toLocaleString()} chars</span>
                </div>
                <span className="text-xs text-muted-foreground">Click to edit</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">Total Calls</span>
                  <span className="font-medium tabular-nums">—</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">Conversions</span>
                  <span className="font-medium text-green-600 tabular-nums">—</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">Rate</span>
                  <span className="font-medium tabular-nums">{safeRate(0, 0)}</span>
                </div>
                <div className="flex justify-between gap-2 col-span-2">
                  <span className="text-muted-foreground truncate">Last Used</span>
                  <span className="font-medium text-muted-foreground">—</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TabsContent>
  )
}

