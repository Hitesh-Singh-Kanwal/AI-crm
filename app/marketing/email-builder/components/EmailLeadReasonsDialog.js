'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { extractLeadReasonsList } from '../emailBuilderApi'

export default function EmailLeadReasonsDialog({ open, onClose, onChanged }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [reasons, setReasons] = useState([])
  const [error, setError] = useState(null)

  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const sorted = useMemo(() => {
    return [...reasons].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
  }, [reasons])

  const fetchReasons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get('/api/lead-reasons')
      if (result.success) {
        setReasons(extractLeadReasonsList(result))
      } else {
        setError(result.error || 'Failed to load reasons')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to load reasons')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchReasons()
  }, [open, fetchReasons])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      const result = await api.post('/api/lead-reasons', { name })
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create reason.' })
        return
      }
      toast.success({ title: 'Created', message: 'Lead reason created successfully.' })
      setNewName('')
      await fetchReasons()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create reason.' })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (reason) => {
    setEditingId(reason._id)
    setEditingName(reason.name || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async () => {
    const name = editingName.trim()
    if (!editingId || !name) return
    setSaving(true)
    try {
      const result = await api.put(`/api/lead-reasons/${editingId}`, { name })
      if (!result.success) {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update reason.' })
        return
      }
      toast.success({ title: 'Updated', message: 'Lead reason updated successfully.' })
      cancelEdit()
      await fetchReasons()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update reason.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reason) => {
    if (!reason?._id) return
    if (!confirm(`Delete reason "${reason.name}"? Templates using it may be affected.`)) return
    setDeletingId(reason._id)
    try {
      const result = await api.delete(`/api/lead-reasons/${reason._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete reason.' })
        return
      }
      toast.success({ title: 'Deleted', message: 'Lead reason deleted successfully.' })
      await fetchReasons()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete reason.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0" onClose={onClose}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            Lead reasons
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 font-normal">
            Manage the allowed reasons used by email templates.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 rounded-xl border bg-muted/30 p-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Fun, Event, Birthday…"
              disabled={saving}
              className="bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button variant="gradient" onClick={handleCreate} disabled={saving || !newName.trim()} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add reason
            </Button>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading reasons…" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 py-6 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchReasons}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No reasons yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add one above to use in templates.</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <ul className="space-y-2">
              {sorted.map((r) => (
                <li
                  key={r._id}
                  className={cn(
                    'rounded-xl border bg-background px-3 py-2.5 transition-colors',
                    editingId === r._id && 'ring-2 ring-ring/30'
                  )}
                >
                  {editingId === r._id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={saving}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <div className="flex gap-2 shrink-0">
                        <Button variant="gradient" size="sm" onClick={saveEdit} disabled={saving || !editingName.trim()}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.name || 'Unnamed'}</p>
                          {r.reasonCode ? (
                            <p className="text-[11px] text-muted-foreground truncate">code: {r.reasonCode}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)} title="Rename">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r._id}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t bg-muted/20 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

