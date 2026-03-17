'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

function normalizeCategoryName(name) {
  return (name || '').trim()
}

export default function CategoriesDialog({ open, onClose }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const hasChanges = useMemo(() => {
    if (!editingId) return false
    const existing = categories.find((c) => c._id === editingId)
    if (!existing) return false
    return normalizeCategoryName(editingName) !== normalizeCategoryName(existing.name)
  }, [categories, editingId, editingName])

  async function fetchCategories() {
    setLoading(true)
    try {
      const result = await api.get('/api/ai-script/category')
      if (result.success) {
        const list = result.data?.categories
        setCategories(Array.isArray(list) ? list : [])
      } else {
        toast.error({ title: 'Failed', message: result.error || 'Could not load categories.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not load categories.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setNewName('')
    setEditingId(null)
    setEditingName('')
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleCreate() {
    const name = normalizeCategoryName(newName)
    if (!name) return
    setSaving(true)
    try {
      const result = await api.post('/api/ai-script/category', { name })
      if (result.success) {
        toast.success({ title: 'Created', message: 'Category created successfully.' })
        setNewName('')
        await fetchCategories()
      } else {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create category.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create category.' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(cat) {
    setEditingId(cat._id)
    setEditingName(cat.name || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
  }

  async function handleUpdate() {
    if (!editingId) return
    const name = normalizeCategoryName(editingName)
    if (!name) return
    setSaving(true)
    try {
      const result = await api.put(`/api/ai-script/category/${editingId}`, { name })
      if (result.success) {
        toast.success({ title: 'Updated', message: 'Category updated successfully.' })
        cancelEdit()
        await fetchCategories()
      } else {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update category.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update category.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat) {
    if (cat?.isDefault) {
      toast.error({ title: 'Not allowed', message: 'Default categories cannot be deleted.' })
      return
    }
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      const result = await api.delete(`/api/ai-script/category/${cat._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Category deleted successfully.' })
        if (editingId === cat._id) cancelEdit()
        await fetchCategories()
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete category.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete category.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Script categories</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              disabled={saving}
            />
            <Button
              variant="gradient"
              className="shrink-0"
              onClick={handleCreate}
              disabled={saving || !normalizeCategoryName(newName)}
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
            </p>
            <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading || saving}>
              Refresh
            </Button>
          </div>

          <div className="divide-y rounded-xl border border-border/60 bg-background">
            {categories.map((cat) => {
              const isEditing = editingId === cat._id
              return (
                <div key={cat._id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        disabled={saving}
                      />
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-medium truncate">{cat.name}</p>
                        {cat.isDefault && (
                          <Badge variant="secondary" className="shrink-0">
                            Default
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={handleUpdate}
                          disabled={saving || !normalizeCategoryName(editingName) || !hasChanges}
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => startEdit(cat)} disabled={saving}>
                          <Pencil className="h-4 w-4" />
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(cat)}
                          disabled={saving || !!cat.isDefault}
                          title={cat.isDefault ? 'Default categories cannot be deleted' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {!loading && categories.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No categories found.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

