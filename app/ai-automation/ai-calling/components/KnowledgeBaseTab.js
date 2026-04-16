'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, ExternalLink, FileText, HardDrive, Pencil, Search, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const FILES_PAGE_SIZE = 10
import KnowledgeBaseUploadDialog from './KnowledgeBaseUploadDialog'
import KnowledgeBaseEditDialog from './KnowledgeBaseEditDialog'

const fileTypeIcons = { pdf: '📄', docx: '📝', doc: '📝', txt: '📃', mp3: '🎵', unknown: '📁' }

function getFileTypeFromUrl(url) {
  const u = (url || '').toLowerCase()
  const ext = u.split('?')[0].split('#')[0].split('.').pop()
  if (!ext || ext === u) return 'unknown'
  return ext
}

function formatUploadedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function parseSizeToBytes(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? value : 0
  if (typeof value !== 'string') return 0

  const normalized = value.trim().toUpperCase()
  const match = normalized.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/)
  if (!match) return 0

  const num = Number(match[1])
  if (!Number.isFinite(num)) return 0

  const unit = match[2] || 'B'
  const unitMap = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  return Math.round(num * (unitMap[unit] || 1))
}

function getDocSizeBytes(doc) {
  const candidates = [
    doc?.size,
    doc?.fileSize,
    doc?.file_size,
    doc?.sizeBytes,
    doc?.bytes,
    doc?.metadata?.size,
  ]
  for (const value of candidates) {
    const parsed = parseSizeToBytes(value)
    if (parsed > 0) return parsed
  }
  return 0
}

function formatFileSize(bytes) {
  const b = Number(bytes)
  if (!Number.isFinite(b) || b <= 0) return '—'
  if (b < 1024) return `${b} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = b / 1024
  let idx = 0
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`
}

function extractFilesPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.files)
    ? payload.files
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.files)
    ? payload.data.files
    : Array.isArray(payload)
    ? payload
    : []
  const pagination = payload?.pagination || payload?.data?.pagination || result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
    totalPages: pagination?.totalPages ?? pagination?.pages,
  }
}

export default function KnowledgeBaseTab() {
  const [dragOver, setDragOver] = useState(false)
  const toast = useToast()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingFile, setEditingFile] = useState(null)

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(FILES_PAGE_SIZE),
      })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await api.get(`/api/ai-script/file/paginated?${params.toString()}`)
      if (result.success) {
        const { list, total, totalPages: totalPagesFromApi } = extractFilesPayload(result)
        const nextTotalPages = Math.max(1, totalPagesFromApi ?? Math.ceil(total / FILES_PAGE_SIZE))
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        setFiles(list)
        setTotalCount(total)
        setTotalPages(nextTotalPages)
      } else {
        setError(result.error || 'Failed to fetch files')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const totalSizeLabel = useMemo(() => formatFileSize(files.reduce((sum, doc) => sum + getDocSizeBytes(doc), 0)), [files])
  const latestUploadLabel = useMemo(() => {
    if (!files.length) return '—'
    let latest = null
    for (const file of files) {
      const d = file?.uploadedAt ? new Date(file.uploadedAt) : null
      if (!d || Number.isNaN(d.getTime())) continue
      if (!latest || d.getTime() > latest.getTime()) latest = d
    }
    return latest ? latest.toLocaleString() : '—'
  }, [files])

  async function handleDelete(file) {
    if (!file?._id) return
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    setDeletingId(file._id)
    try {
      const result = await api.delete(`/api/ai-script/file/${file._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'File deleted successfully.' })
        if (files.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1))
        else fetchFiles()
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete file.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete file.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <TabsContent value="knowledge" className="mt-6 flex-1 min-h-0 flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload documents for AI training. Supported: PDF, DOCX, TXT, MP3 (max 10MB).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border-border/80 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total documents</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{totalCount}</p>
              </div>
              <FileText className="h-10 w-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest upload</p>
                <p className="text-sm font-medium mt-1 text-foreground">{latestUploadLabel}</p>
              </div>
              <Clock3 className="h-10 w-10 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total size</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{totalSizeLabel}</p>
              </div>
              <HardDrive className="h-10 w-10 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <KnowledgeBaseUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchFiles} />
      <KnowledgeBaseEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        file={editingFile}
        onSaved={fetchFiles}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card
        className={cn(
          'border-2 border-dashed rounded-xl transition-all duration-200',
          dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30'
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
          if (dropped) {
            setUploadOpen(true)
          }
        }}
      >
        <CardContent className="p-8 sm:p-14 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Upload documents</h3>
          <p className="text-sm text-muted-foreground mb-6">Drag and drop here or click to browse</p>
          <Button variant="gradient" size="lg" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Choose files
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading files…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={fetchFiles}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-muted-foreground">Uploaded documents</h3>
        <div className="grid grid-cols-1 gap-3">
          {!loading &&
            !error &&
            files.map((doc, index) => (
            <Card
              key={doc._id}
              className="group hover:shadow-md hover:border-border transition-all duration-200 rounded-xl animate-fade-in"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                    {fileTypeIcons[getFileTypeFromUrl(doc.url)] || fileTypeIcons.unknown}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                      {doc.description ? <span className="truncate max-w-[26ch]">{doc.description}</span> : <span>—</span>}
                      <span>·</span>
                      <span className="whitespace-nowrap">Uploaded {formatUploadedAt(doc.uploadedAt)}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">Size {formatFileSize(getDocSizeBytes(doc))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {getFileTypeFromUrl(doc.url).toUpperCase()}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                      title="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingFile(doc)
                        setEditOpen(true)
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc._id}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!loading && !error && files.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="font-medium text-muted-foreground">No files uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-1">Upload your first document to build the knowledge base.</p>
                <div className="mt-4">
                  <Button variant="gradient" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload file
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!loading && !error && files.length > 0 && (
          <div className="flex flex-col gap-3 pt-2 mt-auto">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading || n === page}
                  className={cn(
                    'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    n === page ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted/40'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  )
}

