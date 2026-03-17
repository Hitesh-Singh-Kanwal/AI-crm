'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

function normalize(v) {
  return (v || '').trim()
}

export default function KnowledgeBaseUploadDialog({ open, onClose, onUploaded }) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)

  const canUpload = useMemo(() => !!file && !!normalize(name), [file, name])

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setName('')
    setDescription('')
    setFile(null)
  }, [open])

  async function handleUpload() {
    if (!canUpload) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', normalize(name))
      fd.append('description', normalize(description))
      fd.append('file', file)

      const result = await api.request('/api/ai-script/file/upload', {
        method: 'POST',
        body: fd,
        headers: {},
      })

      if (result.success) {
        toast.success({ title: 'Uploaded', message: 'File uploaded successfully.' })
        onUploaded?.(result.data?.file)
        onClose()
      } else {
        toast.error({ title: 'Upload failed', message: result.error || 'Could not upload file.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not upload file.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload knowledge base file</DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AiScriptCallFile" disabled={saving} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">File</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.txt,.mp3"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="justify-start"
              >
                Choose file
              </Button>
              <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'No file selected'}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleUpload} disabled={!canUpload || saving}>
              {saving ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

