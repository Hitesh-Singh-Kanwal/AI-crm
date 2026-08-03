'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { uploadEmailMedia, normalizeExternalMediaUrl } from '../emailBuilderApi'

function UploadDropzone({ uploading, onPick, onFile, label = 'Upload image', previewUrl }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="rounded-lg border border-border overflow-hidden bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="w-full max-h-28 object-contain bg-card" />
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          onFile?.(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => {
          onPick?.()
          fileInputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer?.files?.[0]
          if (file) onFile?.(file)
        }}
        className={cn(
          'w-full rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors',
          dragOver ? 'border-brand bg-brand/5' : 'border-border bg-muted/40 hover:border-border hover:bg-muted/40',
          uploading && 'opacity-60 cursor-wait',
        )}
      >
        <div className="flex flex-col items-center gap-1.5">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">
            {uploading ? 'Uploading…' : label}
          </span>
          <span className="text-[10px] text-muted-foreground">JPEG, PNG, GIF, WebP · max 8MB</span>
        </div>
      </button>
    </div>
  )
}

export function EmailImageMediaFields({ value, onChange }) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const previous = String(value || '').trim()
      const result = await uploadEmailMedia(file, {
        replaceUrl: previous.includes('/email-media/') ? previous : undefined,
      })
      if (!result.success || !result.url) {
        toast.error({ title: 'Upload failed', message: result.error || 'Could not upload image.' })
        return
      }
      onChange?.(result.url)
      toast.success({ title: 'Uploaded', message: 'Image ready for the email.' })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Upload failed', message: 'Could not upload image.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <UploadDropzone
        uploading={uploading}
        onFile={handleUpload}
        previewUrl={/^https?:\/\//i.test(String(value || '')) ? value : ''}
        label="Drop image or click to upload"
      />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
        <Input
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => {
            const next = normalizeExternalMediaUrl(value)
            if (next && next !== value) onChange?.(next)
          }}
          placeholder="https://…"
          className="text-sm"
        />
      </div>
    </div>
  )
}

export function EmailVideoMediaFields({ url, poster, onUrlChange, onPosterChange }) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)

  const handleUploadPoster = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const previous = String(poster || '').trim()
      const result = await uploadEmailMedia(file, {
        replaceUrl: previous.includes('/email-media/') ? previous : undefined,
      })
      if (!result.success || !result.url) {
        toast.error({ title: 'Upload failed', message: result.error || 'Could not upload poster.' })
        return
      }
      onPosterChange?.(result.url)
      toast.success({ title: 'Uploaded', message: 'Poster image set.' })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Upload failed', message: 'Could not upload poster.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Video link</Label>
        <Input
          value={url || ''}
          onChange={(e) => onUrlChange?.(e.target.value)}
          onBlur={() => {
            const next = normalizeExternalMediaUrl(url)
            if (next && next !== url) onUrlChange?.(next)
          }}
          placeholder="YouTube, Vimeo, or direct video URL"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Recipients see a thumbnail that opens this link — email clients rarely play video inline.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Poster image (optional)</Label>
        <UploadDropzone
          uploading={uploading}
          onFile={handleUploadPoster}
          previewUrl={/^https?:\/\//i.test(String(poster || '')) ? poster : ''}
          label="Upload poster"
        />
        <Input
          value={poster || ''}
          onChange={(e) => onPosterChange?.(e.target.value)}
          placeholder="Auto from YouTube if empty"
          className="text-sm"
        />
      </div>
    </div>
  )
}
