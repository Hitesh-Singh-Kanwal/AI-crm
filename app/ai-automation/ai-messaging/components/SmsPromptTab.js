'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Lock, Search } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast, toast as pushToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

function PromptDialog({ open, onClose, prompt, onRefresh }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', prompt: '' })

  useEffect(() => {
    if (!open) return
    if (prompt) {
      setForm({ name: prompt.name, prompt: prompt.prompt || '' })
    } else {
      setForm({ name: '', prompt: '' })
    }
  }, [open, prompt])

  const isEdit = !!prompt

  async function save() {
    if (!form.name.trim() || !form.prompt.trim()) {
      toast.error({ title: 'Validation', message: 'Name and prompt text are required' })
      return
    }
    setLoading(true)
    try {
      const result = isEdit
        ? await api.put(`/api/sms-prompt/${prompt._id}`, { name: form.name.trim(), prompt: form.prompt.trim() })
        : await api.post('/api/sms-prompt', { name: form.name.trim(), prompt: form.prompt.trim() })

      if (result.success) {
        toast.success({
          title: isEdit ? 'Updated' : 'Created',
          message: `Prompt ${isEdit ? 'updated' : 'created'} successfully`,
        })
        onRefresh?.()
        onClose?.()
      } else {
        toast.error({ title: 'Error', message: result.error || result.message || 'Unable to save prompt' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Prompt' : 'New Prompt'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the prompt name or content.' : 'Create a new AI SMS prompt.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. sales-v2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Prompt *</label>
            <Textarea
              value={form.prompt}
              onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
              rows={16}
              placeholder="Enter the full system prompt…"
              className="min-h-[200px] resize-y font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={save} disabled={loading} variant="gradient">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewDialog({ open, onClose, prompt }) {
  if (!prompt) return null
  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {prompt.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
            {prompt.name}
          </DialogTitle>
          <DialogDescription>Full prompt content</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <pre className="h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm text-foreground">
            {prompt.prompt}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SmsPromptTab({ activeView = 'embeddings' }) {
  const toast = useToast()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activatingId, setActivatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [viewPrompt, setViewPrompt] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.get('/api/sms-prompt')
      if (result.success) setPrompts(result.data || [])
      else pushToast.error('Error', { description: result.error || 'Failed to load prompts' })
    } catch {
      pushToast.error('Error', { description: 'Unable to load prompts' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeView !== 'prompt') return
    load()
  }, [activeView, load])

  const handleActivate = async (p) => {
    if (p.isActive) return
    setActivatingId(p._id)
    try {
      const result = await api.post(`/api/sms-prompt/${p._id}/activate`, {})
      if (result.success) {
        toast.success({ title: 'Activated', message: `"${p.name}" is now the active prompt` })
        load()
      } else {
        toast.error({ title: 'Error', message: result.error || 'Unable to activate prompt' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setActivatingId(null)
    }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete prompt "${p.name}"?`)) return
    setDeletingId(p._id)
    try {
      const result = await api.delete(`/api/sms-prompt/${p._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Prompt deleted' })
        load()
      } else {
        toast.error({ title: 'Error', message: result.error || result.message || 'Unable to delete prompt' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = prompts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <TabsContent value="prompt" className="mt-6 flex-1 min-h-0 flex flex-col gap-6 outline-none">
      <div className="mx-auto flex min-h-full w-full max-w-[1204px] flex-col">
        <div className="mb-6">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">AI SMS prompts</h2>
            <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-brand">
              {prompts.length} prompts
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage system prompts for the AI sales agent. One prompt is active at a time.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg bg-background pl-9 text-sm"
            />
          </div>
          <Button
            variant="gradient"
            className="h-9 shrink-0 gap-2 rounded-lg px-4 text-sm font-medium"
            onClick={() => {
              setEditingPrompt(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New prompt
          </Button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading prompts…</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No prompts found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((p) => (
              <div
                key={p._id}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between',
                  p.isActive ? 'border-brand/40 bg-brand/5' : 'border-border'
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {p.isActive ? (
                      <CheckCircle className="h-5 w-5 text-brand" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      {p.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                      {p.isActive && (
                        <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Created {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={viewLoading}
                    onClick={async () => {
                      setViewLoading(true)
                      try {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) {
                          setViewPrompt(result.data)
                          setViewOpen(true)
                        } else toast.error({ title: 'Error', message: 'Unable to load prompt' })
                      } finally {
                        setViewLoading(false)
                      }
                    }}
                  >
                    View
                  </Button>
                  {!p.isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={async () => {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) {
                          setEditingPrompt(result.data)
                          setDialogOpen(true)
                        } else toast.error({ title: 'Error', message: 'Unable to load prompt' })
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                  {!p.isActive && (
                    <Button
                      size="sm"
                      variant="gradient"
                      className="h-8 text-xs"
                      onClick={() => handleActivate(p)}
                      disabled={activatingId === p._id}
                    >
                      {activatingId === p._id ? 'Activating…' : 'Set active'}
                    </Button>
                  )}
                  {!p.isLocked && !p.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-red-600 hover:border-red-300 hover:text-red-700 dark:text-red-400"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p._id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PromptDialog open={dialogOpen} onClose={() => setDialogOpen(false)} prompt={editingPrompt} onRefresh={load} />

      <ViewDialog open={viewOpen} onClose={() => setViewOpen(false)} prompt={viewPrompt} />
    </TabsContent>
  )
}
