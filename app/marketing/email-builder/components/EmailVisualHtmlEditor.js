'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  Trash2,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { uploadEmailMedia, buildVideoEmailHtml, deleteEmailMedia, normalizeExternalMediaUrl } from '../emailBuilderApi'

const FONT_SIZES = [
  { label: 'S', value: '3', title: 'Small' },
  { label: 'M', value: '4', title: 'Normal' },
  { label: 'L', value: '5', title: 'Large' },
]

const IMAGE_ALIGNS = [
  {
    id: 'left',
    label: 'Left',
    style: 'display:block;max-width:100%;height:auto;margin:12px 0;',
  },
  {
    id: 'center',
    label: 'Center',
    style: 'display:block;max-width:100%;height:auto;margin:12px auto;',
  },
  {
    id: 'full',
    label: 'Full',
    style: 'display:block;width:100%;max-width:100%;height:auto;margin:12px 0;',
  },
]

function ToolButton({ icon: Icon, label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-lg border transition-colors text-[11px] font-semibold',
        'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />
}

function buildImgHtml(url, alignId = 'center') {
  const align = IMAGE_ALIGNS.find((a) => a.id === alignId) || IMAGE_ALIGNS[1]
  const safeUrl = String(url).replaceAll('"', '%22')
  return `<img src="${safeUrl}" alt="Image" data-crm-img="1" style="${align.style}" />`
}

/**
 * Visual tweak mode for pasted / AI HTML.
 */
export default function EmailVisualHtmlEditor({
  html,
  onChange,
  className,
  emptyMessage = 'Paste HTML in the HTML tab, then come back here to tweak the design.',
}) {
  const toast = useToast()
  const iframeRef = useRef(null)
  const fileInputRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoOpen, setVideoOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [imageOpen, setImageOpen] = useState(false)
  const [imageAlign, setImageAlign] = useState('center')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedImg, setSelectedImg] = useState(null)
  const [textColor, setTextColor] = useState('#0f172a')
  const [bgColor, setBgColor] = useState('#fef08a')
  const lastWritten = useRef('')
  const htmlRef = useRef(html)
  const initializedRef = useRef(false)
  htmlRef.current = html

  const getDoc = () => iframeRef.current?.contentDocument || null

  const emitHtml = useCallback(() => {
    const doc = getDoc()
    if (!doc?.body) return
    const next = doc.body.innerHTML || ''
    if (next === lastWritten.current) return
    lastWritten.current = next
    onChange?.(next)
  }, [onChange])

  const saveSelection = () => {
    const doc = getDoc()
    const sel = doc?.getSelection?.()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = () => {
    const doc = getDoc()
    const range = savedRangeRef.current
    if (!doc || !range) return false
    doc.body?.focus()
    const sel = doc.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  const clearImageSelection = () => {
    const doc = getDoc()
    doc?.querySelectorAll('img[data-crm-selected="1"]').forEach((el) => {
      el.removeAttribute('data-crm-selected')
      el.style.outline = ''
      el.style.outlineOffset = ''
    })
    setSelectedImg(null)
  }

  const extractEditableHtml = (sourceHtml) => {
    const raw = String(sourceHtml || '')
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) return bodyMatch[1]
    if (/<!DOCTYPE|<html[\s>]/i.test(raw)) {
      return raw
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '')
    }
    return raw
  }

  const bindEditorListeners = useCallback(() => {
    const doc = getDoc()
    if (!doc?.body) return

    const onInput = () => emitHtml()
    const onClick = (e) => {
      const target = e.target
      if (target?.tagName === 'IMG') {
        e.preventDefault()
        clearImageSelection()
        target.setAttribute('data-crm-selected', '1')
        target.style.outline = '2px solid #6366f1'
        target.style.outlineOffset = '3px'
        setSelectedImg(target)
        return
      }
      clearImageSelection()
    }

    doc.addEventListener('input', onInput)
    doc.addEventListener('blur', onInput, true)
    doc.addEventListener('click', onClick)
    doc.addEventListener('mouseup', saveSelection)
    doc.addEventListener('keyup', saveSelection)
  }, [emitHtml])

  const writeDocument = useCallback(
    (sourceHtml) => {
      const doc = getDoc()
      if (!doc) return
      const bodyHtml = extractEditableHtml(sourceHtml)
      const wrapped = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; line-height: 1.55; color: #0f172a; background: #fff; }
    body { min-height: 420px; outline: none; max-width: 640px; margin: 0 auto; }
    img { max-width: 100%; height: auto; cursor: pointer; }
    img[data-crm-selected="1"] { outline: 2px solid #6366f1; outline-offset: 3px; }
    a { color: #2563eb; }
    ::selection { background: #c7d2fe; }
  </style>
</head>
<body contenteditable="true">${bodyHtml}</body>
</html>`
      doc.open()
      doc.write(wrapped)
      doc.close()
      lastWritten.current = bodyHtml
      setReady(true)
      setSelectedImg(null)
    },
    [],
  )

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let cancelled = false

    const onLoad = () => {
      if (cancelled) return
      // First load is about:blank — write content once.
      // Later loads come from doc.write(); only rebind listeners, never rewrite with stale props.
      if (!initializedRef.current) {
        initializedRef.current = true
        writeDocument(htmlRef.current)
        return
      }
      bindEditorListeners()
    }

    initializedRef.current = false
    setReady(false)
    iframe.addEventListener('load', onLoad)
    iframe.src = 'about:blank'
    return () => {
      cancelled = true
      iframe.removeEventListener('load', onLoad)
      initializedRef.current = false
    }
  }, [writeDocument, bindEditorListeners])

  useEffect(() => {
    const next = extractEditableHtml(html)
    if (!ready) return
    if (next === lastWritten.current) return
    const doc = getDoc()
    if (!doc?.body) return
    if (doc.hasFocus?.() || doc.activeElement === doc.body) return
    writeDocument(next)
  }, [html, ready, writeDocument])

  const runCommand = (command, value = null) => {
    const doc = getDoc()
    if (!doc) return
    restoreSelection()
    doc.body?.focus()
    try {
      doc.execCommand(command, false, value)
      emitHtml()
      saveSelection()
    } catch {
      /* ignore */
    }
  }

  const insertHtml = (snippet, placement = 'cursor') => {
    const doc = getDoc()
    if (!doc?.body) return

    if (placement === 'top') {
      doc.body.insertAdjacentHTML('afterbegin', snippet)
    } else if (placement === 'bottom') {
      doc.body.insertAdjacentHTML('beforeend', snippet)
    } else {
      restoreSelection()
      doc.body.focus()
      try {
        const ok = doc.execCommand('insertHTML', false, snippet)
        if (!ok) doc.body.insertAdjacentHTML('beforeend', snippet)
      } catch {
        doc.body.insertAdjacentHTML('beforeend', snippet)
      }
    }
    emitHtml()
    saveSelection()
  }

  const openImageDialog = () => {
    saveSelection()
    setImageUrl('')
    setImageAlign('center')
    setImageOpen(true)
  }

  const closeImageDialog = () => {
    const pending = String(imageUrl || '').trim()
    // Discard unused uploads when the dialog is canceled.
    if (pending.includes('/email-media/') && imageOpen) {
      deleteEmailMedia(pending).catch(() => {})
    }
    setImageOpen(false)
    setImageUrl('')
  }

  const handleUploadImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const previous = String(imageUrl || '').trim()
      const result = await uploadEmailMedia(file, {
        replaceUrl: previous.includes('/email-media/') ? previous : undefined,
      })
      if (!result.success || !result.url) {
        toast.error({ title: 'Upload failed', message: result.error || 'Could not upload image.' })
        return
      }
      setImageUrl(result.url)
      toast.success({ title: 'Uploaded', message: 'Choose alignment, then insert.' })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Upload failed', message: 'Could not upload image.' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertImage = () => {
    const url = normalizeExternalMediaUrl(imageUrl)
    if (!url) {
      toast.error({ title: 'Missing image', message: 'Upload an image or paste an https URL.' })
      return
    }
    insertHtml(buildImgHtml(url, imageAlign), 'cursor')
    setImageOpen(false)
    setImageUrl('')
    clearImageSelection()
    toast.success({ title: 'Image inserted', message: 'Placed at cursor.' })
  }

  const updateSelectedImageAlign = (alignId) => {
    if (!selectedImg) return
    const align = IMAGE_ALIGNS.find((a) => a.id === alignId) || IMAGE_ALIGNS[1]
    selectedImg.setAttribute('style', align.style)
    selectedImg.setAttribute('data-crm-selected', '1')
    selectedImg.style.outline = '2px solid #6366f1'
    selectedImg.style.outlineOffset = '3px'
    emitHtml()
  }

  const removeSelectedImage = () => {
    if (!selectedImg) return
    const src = String(selectedImg.getAttribute('src') || '').trim()
    selectedImg.remove()
    setSelectedImg(null)
    emitHtml()
    if (src.includes('/email-media/')) {
      deleteEmailMedia(src).catch(() => {})
    }
    toast.success({ title: 'Removed', message: 'Image removed from the email.' })
  }

  const applyLink = () => {
    const href = normalizeExternalMediaUrl(linkUrl)
    if (!href) {
      toast.error({ title: 'Invalid URL', message: 'Link must be a valid http(s) URL.' })
      return
    }
    runCommand('createLink', href)
    setLinkOpen(false)
  }

  const applyVideo = () => {
    const url = normalizeExternalMediaUrl(videoUrl)
    if (!url) {
      toast.error({ title: 'Invalid URL', message: 'Paste a valid YouTube, Vimeo, or video https link.' })
      return
    }
    insertHtml(buildVideoEmailHtml(url), 'cursor')
    setVideoUrl('')
    setVideoOpen(false)
    toast.success({ title: 'Video added', message: 'Email-safe thumbnail link inserted.' })
  }

  const hasHtml = !!String(html || '').trim()

  return (
    <div className={cn('flex flex-col gap-2 min-h-0 h-full w-full', className)}>
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50/80">
          <ToolButton icon={Bold} label="Bold" onClick={() => runCommand('bold')} disabled={!hasHtml} />
          <ToolButton icon={Italic} label="Italic" onClick={() => runCommand('italic')} disabled={!hasHtml} />
          <Divider />
          {FONT_SIZES.map((s) => (
            <ToolButton
              key={s.value}
              label={s.title}
              disabled={!hasHtml}
              onClick={() => runCommand('fontSize', s.value)}
            >
              {s.label}
            </ToolButton>
          ))}
          <Divider />
          <label
            className="inline-flex items-center gap-1 h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-500"
            title="Text color"
          >
            A
            <input
              type="color"
              value={textColor}
              disabled={!hasHtml}
              onChange={(e) => {
                setTextColor(e.target.value)
                runCommand('foreColor', e.target.value)
              }}
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50"
            />
          </label>
          <label
            className="inline-flex items-center gap-1 h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-500"
            title="Background color"
          >
            <span
              className="h-3.5 w-3.5 rounded-sm border border-slate-300"
              style={{ backgroundColor: bgColor }}
              aria-hidden
            />
            <input
              type="color"
              value={bgColor}
              disabled={!hasHtml}
              onChange={(e) => {
                setBgColor(e.target.value)
                runCommand('hiliteColor', e.target.value)
              }}
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50"
            />
          </label>
          <Divider />
          <ToolButton icon={AlignLeft} label="Align left" onClick={() => runCommand('justifyLeft')} disabled={!hasHtml} />
          <ToolButton icon={AlignCenter} label="Align center" onClick={() => runCommand('justifyCenter')} disabled={!hasHtml} />
          <ToolButton icon={AlignRight} label="Align right" onClick={() => runCommand('justifyRight')} disabled={!hasHtml} />
          <Divider />
          <ToolButton icon={List} label="Bullet list" onClick={() => runCommand('insertUnorderedList')} disabled={!hasHtml} />
          <Divider />
          <ToolButton
            icon={Link2}
            label="Add link"
            onClick={() => {
              saveSelection()
              setLinkUrl('https://')
              setLinkOpen(true)
            }}
            disabled={!hasHtml}
          />
          <ToolButton
            icon={ImagePlus}
            label="Insert image"
            disabled={!hasHtml || uploading}
            onClick={openImageDialog}
          />
          <ToolButton
            icon={Video}
            label="Insert video"
            disabled={!hasHtml}
            onClick={() => {
              saveSelection()
              setVideoOpen(true)
            }}
          />
        </div>

        {selectedImg ? (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-violet-50/80 border-t border-violet-100">
            <span className="text-[11px] font-semibold text-violet-900">Image</span>
            <div className="flex flex-wrap gap-1">
              {IMAGE_ALIGNS.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] bg-white"
                  onClick={() => updateSelectedImageAlign(a.id)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px] text-red-600 border-red-200 bg-white ml-auto"
              onClick={removeSelectedImage}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {!hasHtml ? (
        <div className="flex-1 min-h-[240px] rounded-xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <ImagePlus className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-100/80 to-slate-50 p-2 md:p-3 overflow-hidden">
          <div className="mx-auto max-w-[720px] h-full min-h-[calc(100vh-280px)] rounded-lg border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50/90 shrink-0">
              <span className="h-2 w-2 rounded-full bg-red-400/90" />
              <span className="h-2 w-2 rounded-full bg-amber-400/90" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
              <span className="text-[11px] text-slate-500 ml-1">Design canvas</span>
            </div>
            <iframe
              ref={iframeRef}
              title="Email visual editor"
              className="w-full flex-1 min-h-[320px] border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      <Dialog open={imageOpen} onClose={closeImageDialog} maxWidth="3xl">
        <DialogContent onClose={closeImageDialog}>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => handleUploadImage(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>
            <div className="space-y-1.5">
              <Label className="text-xs">Or image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            {imageUrl ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="max-h-32 mx-auto object-contain" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs">Alignment</Label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_ALIGNS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setImageAlign(a.id)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors',
                      imageAlign === a.id
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={closeImageDialog}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={insertImage} disabled={!imageUrl}>
                Insert image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth="lg">
        <DialogContent onClose={() => setLinkOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">Select text in the canvas first, then set the URL.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={applyLink}>
                Apply link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)} maxWidth="lg">
        <DialogContent onClose={() => setVideoOpen(false)}>
          <DialogHeader>
            <DialogTitle>Insert video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              Emails show a thumbnail that opens this link — inline playback is not supported by most clients.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Video URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setVideoOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={applyVideo}>
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
