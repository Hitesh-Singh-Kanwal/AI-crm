'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import LocationSelector from '@/components/shared/LocationSelector'
import api from '@/lib/api'
import { appendLocationFields, hasLocationSelection } from './locationScope'

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
  const [locationID, setLocationID] = useState([])

  const canUpload = useMemo(
    () => !!file && !!normalize(name) && !!normalize(description) && hasLocationSelection(locationID),
    [file, name, description, locationID],
  )

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setName('')
    setDescription('')
    setFile(null)
    setLocationID([])
  }, [open])

  async function handleUpload() {
    if (!hasLocationSelection(locationID)) {
      toast.error({ title: 'Missing location', message: 'Select one or more studios, or All branches.' })
      return
    }
    if (!canUpload) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', normalize(name))
      fd.append('description', normalize(description))
      fd.append('file', file)
      appendLocationFields(fd, locationID)

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
            <p className="text-sm font-medium">Studio location <span className="text-red-500">*</span></p>
            <LocationSelector
              value={locationID}
              onChange={setLocationID}
              multiple
              allowAllBranches
              showAllOption={false}
              placeholder="Select studio(s)…"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Name <span className="text-red-500">*</span></p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AiScriptCallFile" disabled={saving} />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Description <span className="text-red-500">*</span></p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">File <span className="text-red-500">*</span></p>
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
