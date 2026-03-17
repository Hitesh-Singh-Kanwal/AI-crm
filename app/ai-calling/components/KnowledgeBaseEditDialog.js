'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

function normalize(v) {
  return (v || '').trim()
}

export default function KnowledgeBaseEditDialog({ open, onClose, file, onSaved }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const canSave = useMemo(() => !!normalize(name), [name])

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setName(file?.name || '')
    setDescription(file?.description || '')
  }, [open, file?._id])

  async function handleSave() {
    if (!file?._id || !canSave) return
    setSaving(true)
    try {
      const payload = { name: normalize(name), description: normalize(description) }
      const result = await api.put(`/api/ai-script/file/${file._id}`, payload)
      if (result.success) {
        toast.success({ title: 'Updated', message: 'File updated successfully.' })
        onSaved?.()
        onClose()
      } else {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update file.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update file.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Edit file</DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Description</p>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

