'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, Tags } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { extractCategoriesList } from '../emailBuilderApi'

export default function EmailCategoriesDialog({ open, onClose, onChanged }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)

  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
  }, [categories])

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get('/api/email/builder/category')
      if (result.success) {
        setCategories(extractCategoriesList(result))
      } else {
        setError(result.error || 'Failed to load categories')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchCategories()
  }, [open, fetchCategories])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      const result = await api.post('/api/email/builder/category', { name })
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create category.' })
        return
      }
      toast.success({ title: 'Created', message: 'Category created successfully.' })
      setNewName('')
      await fetchCategories()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create category.' })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat._id)
    setEditingName(cat.name || '')
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
      const result = await api.patch(`/api/email/builder/category/${editingId}`, { name })
      if (!result.success) {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update category.' })
        return
      }
      toast.success({ title: 'Updated', message: 'Category updated successfully.' })
      cancelEdit()
      await fetchCategories()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update category.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!cat?._id) return
    if (!confirm(`Delete category "${cat.name}"? Templates using it may be affected.`)) return
    setDeletingId(cat._id)
    try {
      const result = await api.delete(`/api/email/builder/category/${cat._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete category.' })
        return
      }
      toast.success({ title: 'Deleted', message: 'Category deleted successfully.' })
      await fetchCategories()
      onChanged?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete category.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0" onClose={onClose}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-muted-foreground" />
            Email categories
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 font-normal">
            Organize templates into groups when creating emails in the builder.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 rounded-xl border bg-muted/30 p-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Welcome emails, Promotions…"
              disabled={saving}
              className="bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button variant="gradient" onClick={handleCreate} disabled={saving || !newName.trim()} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add category
            </Button>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" text="Loading categories…" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 py-6 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchCategories}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add one above to assign templates in the builder.</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <ul className="space-y-2">
              {sorted.map((cat) => (
                <li
                  key={cat._id}
                  className={cn(
                    'rounded-xl border bg-background px-3 py-2.5 transition-colors',
                    editingId === cat._id && 'ring-2 ring-ring/30'
                  )}
                >
                  {editingId === cat._id ? (
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
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium truncate">{cat.name || 'Unnamed'}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)} title="Rename">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat._id}
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
