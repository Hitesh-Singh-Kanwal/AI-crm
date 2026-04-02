'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

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
      const result = await api.get('/api/emailBuilder/category')
      const list = result.data?.categories ?? result.data
      if (result.success && Array.isArray(list)) {
        setCategories(list)
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
      const result = await api.post('/api/emailBuilder/category', { name })
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
      const result = await api.patch(`/api/emailBuilder/category/${editingId}`, { name })
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
    if (!confirm(`Delete category "${cat.name}"? This may affect templates.`)) return
    setDeletingId(cat._id)
    try {
      const result = await api.delete(`/api/emailBuilder/category/${cat._id}`)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Email categories</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              disabled={saving}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button variant="gradient" onClick={handleCreate} disabled={saving || !newName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" text="Loading categories…" />
            </div>
          )}

          {error && !loading && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-6 text-center">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && (
            <div className="space-y-2">
              {sorted.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  {editingId === cat._id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={saving}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="gradient" size="sm" onClick={saveEdit} disabled={saving || !editingName.trim()}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name || 'Unnamed category'}</p>
                        <p className="text-xs text-muted-foreground truncate">{cat._id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)} title="Edit">
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
                    </>
                  )}
                </div>
              ))}
              {sorted.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No categories yet.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
