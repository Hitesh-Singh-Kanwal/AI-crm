'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'

const EMPTY_FORM = { name: '', color: '#6366f1', isActive: true }

function CurriculumDialog({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()
  const isEdit = Boolean(initial?._id)

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { name: initial.name || '', color: initial.color || '#6366f1', isActive: initial.isActive !== false }
        : EMPTY_FORM)
      setError(null)
    }
  }, [open, initial])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    const result = isEdit
      ? await api.put(`/api/curriculum/${initial._id}`, form)
      : await api.post('/api/curriculum', form)
    if (result.success) {
      toast.success(isEdit ? 'Curriculum tier updated.' : 'Curriculum tier added.')
      onSaved()
      onClose()
    } else {
      setError(result.error || 'Something went wrong.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm">
      <DialogContent onClose={saving ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Curriculum Tier' : 'Add Curriculum Tier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">
              Name<span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Bronze I"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              className="h-9 w-16 rounded-lg border border-border bg-background"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CurriculumSettingsPage() {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTier, setEditingTier] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const toast = useToast()

  const loadTiers = useCallback(async () => {
    setLoading(true)
    const result = await api.get('/api/curriculum')
    if (result.success) setTiers(result.data || [])
    else toast.error(result.error || 'Failed to load curriculum tiers.')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadTiers() }, [loadTiers])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await api.delete(`/api/curriculum/${deleteTarget._id}`)
    if (result.success) {
      toast.success('Curriculum tier deleted.')
      setDeleteTarget(null)
      loadTiers()
    } else {
      toast.error(result.error || 'Failed to delete tier.')
    }
    setDeleting(false)
  }

  const persistOrder = async (ordered) => {
    setTiers(ordered)
    await Promise.all(
      ordered.map((t, idx) => api.put(`/api/curriculum/${t._id}`, { sequenceOrder: idx }))
    )
  }

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return
    const next = [...tiers]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    setDragIndex(null)
    persistOrder(next)
  }

  if (loading) {
    return (
      <MainLayout title="Curriculum" subtitle="">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading curriculum tiers…" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Curriculum" subtitle="">
      <div className="max-w-[900px] mx-auto min-h-full flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Curriculum Tiers</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              The tier sequence students progress through. Drag to reorder. Assign packages to a tier from the package form.
            </p>
          </div>
          <Button onClick={() => { setEditingTier(null); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Tier
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {tiers.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">
              No curriculum tiers yet. Click "Add Tier" to create one.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tiers.map((tier, idx) => (
                <div
                  key={tier._id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20"
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: tier.color || 'var(--studio-primary)' }}
                  />
                  <span className="flex-1 text-[13px] font-medium text-foreground">{tier.name}</span>
                  {!tier.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Inactive</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingTier(tier); setDialogOpen(true) }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(tier)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CurriculumDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadTiers}
        initial={editingTier}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleting ? undefined : () => setDeleteTarget(null)} maxWidth="sm">
        <DialogContent onClose={deleting ? undefined : () => setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>Delete Curriculum Tier</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
            Packages tagged with this tier will keep the reference until reassigned.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
