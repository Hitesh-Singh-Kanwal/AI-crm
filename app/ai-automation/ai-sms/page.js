'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Lock, Search } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
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
        toast.success({ title: isEdit ? 'Updated' : 'Created', message: `Prompt ${isEdit ? 'updated' : 'created'} successfully` })
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
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. sales-v2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt *</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
              rows={16}
              placeholder="Enter the full system prompt…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-sm resize-y font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
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
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-muted/40 border border-border rounded-lg p-4 h-[60vh] overflow-y-auto">
            {prompt.prompt}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AiSmsPage() {
  const toast = useToast()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
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
      else toast.error({ title: 'Error', message: result.error || 'Failed to load prompts' })
    } catch {
      toast.error({ title: 'Error', message: 'Unable to load prompts' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  const filtered = prompts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <MainLayout title="AI SMS" subtitle="">
      <div className="max-w-[1204px] mx-auto min-h-full flex flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">AI SMS Prompts</h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
              {prompts.length} prompts
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage system prompts for the AI sales agent. One prompt is active at a time.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="relative w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-background text-sm"
            />
          </div>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2"
            onClick={() => { setEditingPrompt(null); setDialogOpen(true) }}
          >
            <Plus className="h-4 w-4" /> New Prompt
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Loading prompts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No prompts found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((p) => (
              <div
                key={p._id}
                className={cn(
                  'rounded-xl border bg-card p-5 flex items-start justify-between gap-4',
                  p.isActive ? 'border-brand/40 bg-brand/5' : 'border-border'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {p.isActive ? (
                      <CheckCircle className="h-5 w-5 text-brand" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      {p.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                      {p.isActive && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-brand/10 text-brand">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={viewLoading}
                    onClick={async () => {
                      setViewLoading(true)
                      try {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) { setViewPrompt(result.data); setViewOpen(true) }
                        else toast.error({ title: 'Error', message: 'Unable to load prompt' })
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
                      className="h-8 text-xs gap-1"
                      onClick={async () => {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) { setEditingPrompt(result.data); setDialogOpen(true) }
                        else toast.error({ title: 'Error', message: 'Unable to load prompt' })
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                  {!p.isActive && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-brand hover:bg-brand-dark text-brand-foreground"
                      onClick={() => handleActivate(p)}
                      disabled={activatingId === p._id}
                    >
                      {activatingId === p._id ? 'Activating…' : 'Set Active'}
                    </Button>
                  )}
                  {!p.isLocked && !p.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
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

      <PromptDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        prompt={editingPrompt}
        onRefresh={load}
      />

      <ViewDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        prompt={viewPrompt}
      />
    </MainLayout>
  )
}
