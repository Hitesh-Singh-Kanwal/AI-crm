'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const LS_STUDIO = 'ai-messaging-studio-pdf'
const LS_PLAYBOOK = 'ai-messaging-playbook-pdf'

function loadStoredMeta(key) {
  if (typeof window === 'undefined') return { name: '', updatedAt: '' }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { name: '', updatedAt: '' }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return { name: '', updatedAt: '' }
  }
}

function saveStoredMeta(key, name) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ name, updatedAt: new Date().toISOString() })
    )
  } catch {
    /* ignore */
  }
}

function formatUploadedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatFileSize(bytes) {
  const b = Number(bytes)
  if (!Number.isFinite(b) || b <= 0) return '0 KB'
  if (b < 1024) return `${b} B`
  const kb = b / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

function isPdfFile(file) {
  if (!file) return false
  const n = String(file.name || '').toLowerCase()
  const t = String(file.type || '').toLowerCase()
  return t === 'application/pdf' || n.endsWith('.pdf')
}

const tips = [
  {
    icon: MessageSquare,
    title: 'SMS & email agents',
    text: 'These documents ground automated replies in your studio’s voice and facts.',
  },
  {
    icon: FileText,
    title: 'PDF only',
    text: 'One active file per category. A new upload replaces the previous embeddings.',
  },
  {
    icon: Sparkles,
    title: 'Replace anytime',
    text: 'Upload again whenever your info or examples change — no extra cleanup.',
  },
]

function PdfUploadPanel({ id, title, description, icon: Icon, endpoint, storageKey }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [storedName, setStoredName] = useState('')
  const [storedAt, setStoredAt] = useState('')

  useEffect(() => {
    const { name, updatedAt } = loadStoredMeta(storageKey)
    setStoredName(name)
    setStoredAt(updatedAt)
  }, [storageKey])

  const pickFile = useCallback(
    (f) => {
      if (!f) {
        setFile(null)
        return
      }
      if (!isPdfFile(f)) {
        toast.error({ title: 'Invalid file', message: 'Please choose a PDF file.' })
        setFile(null)
        return
      }
      setFile(f)
    },
    [toast]
  )

  const openPicker = useCallback(() => {
    if (uploading) return
    inputRef.current?.click()
  }, [uploading])

  const onUpload = async () => {
    if (!file) {
      toast.error({ title: 'No file', message: 'Choose a PDF to upload.' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)

      const result = await api.request(endpoint, {
        method: 'POST',
        body: fd,
      })

      if (result.success) {
        const name = file.name
        saveStoredMeta(storageKey, name)
        setStoredName(name)
        setStoredAt(new Date().toISOString())
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        toast.success({
          title: 'Uploaded',
          message: result.message || 'Document processed and embeddings updated.',
        })
      } else {
        toast.error({
          title: 'Upload failed',
          message: result.error || 'Could not process the PDF.',
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not upload file.' })
    } finally {
      setUploading(false)
    }
  }

  const onKeyDownZone = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0">
      <Card
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow duration-200',
          'hover:shadow-md',
          uploading && 'ring-2 ring-primary/25'
        )}
      >
        <CardContent className="relative p-4 sm:p-6 space-y-4 sm:space-y-5">
          {uploading && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/75 backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-9 w-9 animate-spin text-[var(--studio-primary)]" />
              <p className="text-sm font-medium text-foreground">Processing PDF…</p>
              <p className="text-xs text-muted-foreground px-6 text-center max-w-xs">
                Building embeddings — this can take a little while for large files.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14',
                  'bg-gradient-to-br from-primary/12 via-primary/5 to-transparent ring-1 ring-border/60'
                )}
              >
                <Icon className="h-6 w-6 text-[var(--studio-primary)] sm:h-7 sm:w-7" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1.5 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {title}
                  </h2>
                  <Badge variant="secondary" className="font-medium text-[11px] uppercase tracking-wide">
                    PDF · 1 file
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>

          {storedName ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 sm:mt-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active in this browser</p>
                  <p className="truncate text-sm font-semibold text-foreground" title={storedName}>
                    {storedName}
                  </p>
                  {storedAt ? (
                    <p className="text-[11px] text-muted-foreground">Last upload · {formatUploadedAt(storedAt)}</p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-center"
                onClick={openPicker}
                disabled={uploading}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Replace
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-3 text-sm text-muted-foreground sm:px-4">
              <span className="font-medium text-foreground">No PDF yet.</span> Upload one so messaging agents can use this content.
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload PDF for ${title}`}
            onKeyDown={onKeyDownZone}
            onClick={openPicker}
            className={cn(
              'cursor-pointer rounded-2xl border-2 border-dashed text-center transition-all duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'px-4 py-8 sm:px-6 sm:py-10',
              dragOver
                ? 'scale-[1.01] border-primary bg-primary/8 shadow-sm'
                : 'border-muted-foreground/25 bg-muted/15 hover:border-primary/40 hover:bg-muted/25'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer?.files?.[0]
              pickFile(dropped)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted ring-1 ring-border/50 sm:h-16 sm:w-16">
              <Upload className="h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" aria-hidden />
            </div>
            <p className="text-base font-semibold text-foreground sm:text-lg">Drop your PDF here</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
              Or tap this area to browse. Only <span className="font-medium text-foreground">.pdf</span> — replaces the
              previous document for this category.
            </p>
            <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  openPicker()
                }}
                disabled={uploading}
              >
                Browse files
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpload()
                }}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {'Upload & replace'}
                  </>
                )}
              </Button>
            </div>
            {file ? (
              <div className="mx-auto mt-4 max-w-lg rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-left sm:text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Selected</p>
                <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default function AiMessagingPage() {
  return (
    <MainLayout
      title="AI Messaging"
      subtitle="Studio info and playbook PDFs power SMS and email agents with your facts and example conversations."
    >
      <div className="mx-auto flex h-full min-h-full w-full max-w-6xl flex-col gap-6 pb-10 sm:gap-8 sm:pb-12">
        <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
          <CardContent className="relative p-0">
            <div
              className={cn(
                'relative px-4 py-6 sm:px-8 sm:py-8',
                'bg-gradient-to-br from-primary/[0.07] via-background to-[color-mix(in_srgb,var(--studio-gradient)_8%,transparent)]',
                'dark:from-primary/10 dark:via-card dark:to-card'
              )}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--studio-gradient)]/10 blur-3xl sm:-right-24 sm:-top-24 sm:h-64 sm:w-64" />
              <div className="relative max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
                  Messaging context
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Teach your agents what to say — and how to say it
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Upload two PDFs: one with studio facts, and one with sample threads. Each slot keeps a single active
                  document; uploading again updates embeddings automatically.
                </p>
              </div>

              <ul className="relative mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                {tips.map(({ icon: TipIcon, title: tipTitle, text }) => (
                  <li
                    key={tipTitle}
                    className="flex gap-3 rounded-xl border border-border/50 bg-background/50 p-3 backdrop-blur-sm sm:flex-col sm:p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[var(--studio-primary)]">
                      <TipIcon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{tipTitle}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 xl:items-start">
          <PdfUploadPanel
            id="messaging-studio"
            title="Studio info"
            description="Locations, classes, pricing, policies — facts the agent can retrieve when replying."
            icon={Building2}
            endpoint="/api/embedding/studio"
            storageKey={LS_STUDIO}
          />
          <PdfUploadPanel
            id="messaging-playbook"
            title="Studio playbook"
            description="Realistic SMS or email threads between a lead and your team so tone and pacing match your studio."
            icon={BookOpen}
            endpoint="/api/embedding/playbook"
            storageKey={LS_PLAYBOOK}
          />
        </div>

        <p className="text-center text-[11px] text-muted-foreground sm:text-xs">
          {'"Last upload" is remembered on this device only. The server always keeps one embedding set per category.'}
        </p>
      </div>
    </MainLayout>
  )
}
