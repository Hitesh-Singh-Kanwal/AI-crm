'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import {
  DEFAULT_BACKGROUND_SOUND_VOLUME,
  clampBackgroundSoundVolume,
  formatBackgroundSoundVolumeLabel,
} from '@/lib/backgroundSound'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const ALLOWED_AUDIO_EXT = /\.(mp3|wav|ogg|m4a|webm)$/i

function normalize(v) {
  return (v || '').trim()
}

function isAllowedAudioFile(file) {
  if (!file) return false
  if (file.size > MAX_AUDIO_BYTES) return false
  const mime = String(file.type || '').toLowerCase()
  if (mime.startsWith('audio/')) return true
  return ALLOWED_AUDIO_EXT.test(file.name || '')
}

export default function BackgroundSoundUploadDialog({ open, onClose, onUploaded }) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [volume, setVolume] = useState(DEFAULT_BACKGROUND_SOUND_VOLUME)

  const canUpload = useMemo(() => !!file && !!normalize(name), [file, name])

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setName('')
    setDescription('')
    setFile(null)
    setVolume(DEFAULT_BACKGROUND_SOUND_VOLUME)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [open])

  function handleFileSelect(nextFile) {
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!isAllowedAudioFile(nextFile)) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.error({
        title: 'Invalid file',
        message: 'Use an audio file (MP3, WAV, M4A, OGG, WEBM) up to 10 MB.',
      })
      return
    }
    setFile(nextFile)
  }

  async function handleUpload() {
    if (!canUpload) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', normalize(name))
      fd.append('description', normalize(description))
      fd.append('volume', String(clampBackgroundSoundVolume(volume)))
      fd.append('file', file)

      const result = await api.request('/api/ai-background-sound/upload', {
        method: 'POST',
        body: fd,
      })

      if (result.success) {
        toast.success({ title: 'Uploaded', message: 'Background sound saved successfully.' })
        onUploaded?.(result.data)
        onClose()
      } else {
        toast.error({ title: 'Upload failed', message: result.error || 'Could not upload sound.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not upload sound.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload background sound</DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Upload a short ambient loop (MP3, WAV, M4A, OGG, WEBM). Max 10 MB. Vapi plays it softly in the background during calls.
          </p>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Soft office ambience"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note for your team"
              disabled={saving}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              Default volume ({formatBackgroundSoundVolumeLabel(volume)})
            </p>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(clampBackgroundSoundVolume(Number(e.target.value)))}
              disabled={saving}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              This saved volume will be used anywhere this sound is selected.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              Audio file <span className="text-red-500">*</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                Choose file
              </Button>
              <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                {file?.name || 'No file selected'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="gradient" onClick={handleUpload} disabled={!canUpload || saving}>
              {saving ? 'Uploading…' : 'Upload sound'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
