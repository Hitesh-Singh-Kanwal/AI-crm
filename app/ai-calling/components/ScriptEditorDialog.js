'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

function normalizeName(v) {
  return (v || '').trim()
}

export default function ScriptEditorDialog({ open, onClose, initialScript, onSaved }) {
  const toast = useToast()
  const isEditing = !!initialScript?._id

  const [loadingCats, setLoadingCats] = useState(false)
  const [categories, setCategories] = useState([])

  const [saving, setSaving] = useState(false)
  const [categoryID, setCategoryID] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [name, setName] = useState('')
  const [script, setScript] = useState('')
  const [type, setType] = useState('call')

  const canSave = useMemo(() => {
    return !!normalizeName(name) && !!normalizeName(subCategory) && !!normalizeName(script) && !!normalizeName(type)
  }, [name, subCategory, script, type])

  async function fetchCategories() {
    setLoadingCats(true)
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
      setLoadingCats(false)
    }
  }

  useEffect(() => {
    if (!open) return

    setCategoryID(initialScript?.categoryID?._id || initialScript?.categoryID || '')
    setSubCategory(initialScript?.subCategory || '')
    setName(initialScript?.name || '')
    setScript(initialScript?.script || '')
    setType(initialScript?.type || 'call')

    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialScript?._id])

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        categoryID: categoryID || undefined,
        categoryName: '',
        subCategory: normalizeName(subCategory),
        name: normalizeName(name),
        script,
        type: normalizeName(type),
      }

      const result = isEditing
        ? await api.put(`/api/ai-script/${initialScript._id}`, payload)
        : await api.post('/api/ai-script/', payload)

      if (result.success) {
        toast.success({ title: isEditing ? 'Updated' : 'Created', message: `Script ${isEditing ? 'updated' : 'created'} successfully.` })
        onSaved?.()
        onClose()
      } else {
        toast.error({ title: 'Save failed', message: result.error || 'Could not save script.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not save script.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="3xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit script' : 'Create script'}</DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Category</p>
              <Select value={categoryID} onChange={(e) => setCategoryID(e.target.value)} disabled={saving || loadingCats}>
                <option value="">{loadingCats ? 'Loading…' : 'No category'}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Type</p>
              <Select value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
                <option value="call">call</option>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <p className="text-sm font-medium">Script name</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Calling Script" disabled={saving} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <p className="text-sm font-medium">Sub category</p>
              <Input
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Script for calling"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Script</p>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your system prompt/script here…"
              className="min-h-[260px] font-mono text-xs"
              disabled={saving}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? 'Saving…' : isEditing ? 'Update script' : 'Create script'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

