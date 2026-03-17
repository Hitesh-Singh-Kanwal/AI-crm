'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileText, Pencil, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
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

export default function KnowledgeBaseTab() {
  const [dragOver, setDragOver] = useState(false)
  const toast = useToast()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingFile, setEditingFile] = useState(null)

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get('/api/ai-script/file/')
      if (result.success) {
        const list = result.data?.files
        setFiles(Array.isArray(list) ? list : [])
      } else {
        setError(result.error || 'Failed to fetch files')
      }
    } catch (e) {
      console.error(e)
      setError('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const totalSizeLabel = useMemo(() => {
    return '—'
  }, [])

  async function handleDelete(file) {
    if (!file?._id) return
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    setDeletingId(file._id)
    try {
      const result = await api.delete(`/api/ai-script/file/${file._id}`)
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f._id !== file._id))
        toast.success({ title: 'Deleted', message: 'File deleted successfully.' })
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
    <TabsContent value="knowledge" className="space-y-6 mt-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload documents for AI training. Supported: PDF, DOCX, TXT, MP3 (max 10MB).
        </p>
      </div>

      <KnowledgeBaseUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchFiles} />
      <KnowledgeBaseEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        file={editingFile}
        onSaved={fetchFiles}
      />

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

      <div className="space-y-3">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total documents</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{files.length}</p>
              </div>
              <FileText className="h-10 w-10 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest upload</p>
                <p className="text-sm font-medium mt-1 text-muted-foreground">
                  {files[0]?.uploadedAt ? formatUploadedAt(files[0].uploadedAt) : '—'}
                </p>
              </div>
              <Upload className="h-10 w-10 text-primary/20" />
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
              <Upload className="h-10 w-10 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}

