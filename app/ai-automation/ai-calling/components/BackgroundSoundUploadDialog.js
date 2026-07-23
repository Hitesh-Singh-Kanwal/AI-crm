'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import LocationSelector from '@/components/shared/LocationSelector'
import api from '@/lib/api'
import {
  DEFAULT_BACKGROUND_SOUND_VOLUME,
  clampBackgroundSoundVolume,
  formatBackgroundSoundVolumeLabel,
} from '@/lib/backgroundSound'
import { hasLocationSelection, toLocationPayload } from './locationScope'

const MAX_AUDIO_BYTES = 5 * 1024 * 1024
const ALLOWED_AUDIO_EXT = /\.(mp3|wav|ogg|m4a|webm)$/i

function normalize(v) {
  return (v || '').trim()
}

function guessContentType(file) {
  const mime = String(file?.type || '').toLowerCase()
  if (mime) return mime
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.mp3')) return 'audio/mpeg'
  if (name.endsWith('.wav')) return 'audio/wav'
  if (name.endsWith('.ogg')) return 'audio/ogg'
  if (name.endsWith('.m4a')) return 'audio/mp4'
  if (name.endsWith('.webm')) return 'audio/webm'
  return 'application/octet-stream'
}

function isAllowedAudioFile(file) {
  if (!file) return false
  if (file.size > MAX_AUDIO_BYTES) return false
  const mime = String(file.type || '').toLowerCase()
  if (mime.startsWith('audio/')) return true
  return ALLOWED_AUDIO_EXT.test(file.name || '')
}

function putFileToS3(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return
      const pct = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(pct)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Storage upload failed (${xhr.status}). Check S3 CORS settings.`))
    }

    xhr.onerror = () => reject(new Error('Storage upload failed. Check S3 CORS settings.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    xhr.send(file)
  })
}

export default function BackgroundSoundUploadDialog({ open, onClose, onUploaded }) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [uploadPercent, setUploadPercent] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [volume, setVolume] = useState(DEFAULT_BACKGROUND_SOUND_VOLUME)
  const [locationID, setLocationID] = useState([])

  const canUpload = useMemo(
    () => !!file && !!normalize(name) && hasLocationSelection(locationID),
    [file, name, locationID],
  )

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setStatusText('')
    setUploadPercent(null)
    setName('')
    setDescription('')
    setFile(null)
    setVolume(DEFAULT_BACKGROUND_SOUND_VOLUME)
    setLocationID([])
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
        message:
          nextFile.size > MAX_AUDIO_BYTES
            ? 'File is too large. Max size is 5 MB (2–3 MB recommended for ambient loops).'
            : 'Use an audio file (MP3, WAV, M4A, OGG, WEBM) up to 5 MB.',
      })
      return
    }
    setFile(nextFile)
  }

  async function handleUpload() {
    if (!hasLocationSelection(locationID)) {
      toast.error({ title: 'Missing location', message: 'Select one or more studios, or All branches.' })
      return
    }
    if (!canUpload) return
    setSaving(true)
    setUploadPercent(null)
    try {
      const contentType = guessContentType(file)
      const locationPayload = toLocationPayload(locationID)

      setStatusText('Preparing upload…')
      const urlResult = await api.post('/api/ai-background-sound/upload-url', {
        fileName: file.name,
        contentType,
        fileSize: file.size,
      })

      if (!urlResult.success || !urlResult.data?.uploadUrl || !urlResult.data?.fileID) {
        throw new Error(urlResult.error || 'Could not prepare upload.')
      }

      setStatusText('Uploading to storage…')
      setUploadPercent(0)
      await putFileToS3(
        urlResult.data.uploadUrl,
        file,
        urlResult.data.contentType || contentType,
        (pct) => setUploadPercent(pct),
      )
      setUploadPercent(100)

      setStatusText('Saving sound…')
      const confirmResult = await api.post('/api/ai-background-sound/confirm', {
        fileID: urlResult.data.fileID,
        name: normalize(name),
        description: normalize(description),
        volume: clampBackgroundSoundVolume(volume),
        mimeType: urlResult.data.contentType || contentType,
        ...locationPayload,
      })

      if (confirmResult.success) {
        toast.success({ title: 'Uploaded', message: 'Background sound saved successfully.' })
        onUploaded?.(confirmResult.data)
        onClose()
      } else {
        toast.error({ title: 'Upload failed', message: confirmResult.error || 'Could not upload sound.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: e.message || 'Could not upload sound.' })
    } finally {
      setSaving(false)
      setStatusText('')
      setUploadPercent(null)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="2xl">
      <DialogContent onClose={saving ? undefined : onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload background sound</DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Upload a short ambient loop (MP3, WAV, M4A, OGG, WEBM). Max 5 MB — we recommend 2–3 MB. Vapi plays it softly in the background during calls.
          </p>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              Studio location <span className="text-red-500">*</span>
            </p>
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

          {saving ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{statusText || 'Working…'}</span>
                {uploadPercent != null ? (
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{uploadPercent}%</span>
                ) : null}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
                  style={{
                    width:
                      uploadPercent != null
                        ? `${uploadPercent}%`
                        : statusText?.startsWith('Saving')
                          ? '100%'
                          : '35%',
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Please keep this window open until the upload finishes.
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="gradient" onClick={handleUpload} disabled={!canUpload || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {uploadPercent != null ? `Uploading ${uploadPercent}%` : statusText || 'Uploading…'}
                </>
              ) : (
                'Upload sound'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
