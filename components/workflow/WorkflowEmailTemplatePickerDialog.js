'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Mail, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmailTemplateThumbnail from '@/app/marketing/email-builder/components/EmailTemplateThumbnail'
import {
  extractEmailTemplatesPayload,
  getTemplateCategoryName,
} from '@/app/marketing/email-builder/emailBuilderApi'

const PAGE_SIZE = 9

export default function WorkflowEmailTemplatePickerDialog({
  open,
  onClose,
  selectedId = '',
  onSelect,
}) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [previewId, setPreviewId] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (open) setPage(1)
  }, [debouncedSearch, open])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await api.get(`/api/email/builder?${params.toString()}`)
      if (result.success) {
        const { list, total, totalPages: pages } = extractEmailTemplatesPayload(result)
        const nextTotalPages = Math.max(1, pages ?? Math.ceil(total / PAGE_SIZE))
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        setTemplates(list)
        setTotalPages(nextTotalPages)
      } else {
        setError(result.error || 'Failed to load email templates.')
      }
    } catch {
      setError('Failed to load email templates.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    if (open) fetchTemplates()
  }, [open, fetchTemplates])

  const displayTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return String(a.subject || '').localeCompare(String(b.subject || ''))
    })
  }, [templates])

  const loadPreview = async (tpl) => {
    if (!tpl?._id) return
    setPreviewId(tpl._id)
    if (tpl.htmlBody) {
      setPreviewHtml(tpl.htmlBody)
      setPreviewSubject(tpl.subject || 'Untitled template')
      return
    }
    setPreviewLoading(true)
    const result = await api.get(`/api/email/builder/${tpl._id}`)
    setPreviewLoading(false)
    if (result.success) {
      setPreviewHtml(result.data?.htmlBody || '')
      setPreviewSubject(result.data?.subject || tpl.subject || 'Untitled template')
    }
  }

  const handleSelect = async (tpl) => {
    if (!tpl?._id) return
    let htmlBody = tpl.htmlBody || ''
    let subject = tpl.subject || ''
    if (!htmlBody) {
      const result = await api.get(`/api/email/builder/${tpl._id}`)
      if (result.success) {
        htmlBody = result.data?.htmlBody || ''
        subject = result.data?.subject || subject
      }
    }
    onSelect?.({
      emailTemplateId: tpl._id,
      emailTemplateSubject: subject || 'Untitled template',
      subject: subject || '',
      htmlBody,
    })
    onClose?.()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="5xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Choose email template</DialogTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Templates from Email Builder — select one to use in this workflow step.
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates…"
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[14px] outline-none focus:border-[var(--studio-primary)]"
            />
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading templates…" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-8 text-center text-[13px] text-destructive">
              {error}
            </div>
          ) : displayTemplates.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-[14px] font-medium text-foreground">No templates found</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Create templates in Marketing → Email Builder first.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayTemplates.map((tpl) => {
                  const isSelected = selectedId === tpl._id
                  const categoryName = getTemplateCategoryName(tpl)
                  return (
                    <div
                      key={tpl._id}
                      className={cn(
                        'flex flex-col overflow-hidden rounded-xl border bg-card transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:shadow-md'
                      )}
                    >
                      <div className="p-3 pb-0">
                        <EmailTemplateThumbnail html={tpl.htmlBody} />
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <div className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2">
                          {tpl.subject || 'Untitled template'}
                        </div>
                        {categoryName && (
                          <div className="mt-1 text-[11px] text-muted-foreground">{categoryName}</div>
                        )}
                        <p className="mt-2 line-clamp-2 flex-1 text-[11px] text-muted-foreground">
                          {tpl.body || 'No description'}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelect(tpl)}
                            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--studio-primary)] text-[12px] font-semibold text-white hover:brightness-95"
                          >
                            {isSelected ? 'Selected' : 'Use template'}
                          </button>
                          <button
                            type="button"
                            onClick={() => loadPreview(tpl)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50"
                            aria-label="Preview template"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-center gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 rounded-lg border border-border px-3 text-[12px] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[12px] text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-9 rounded-lg border border-border px-3 text-[12px] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {previewId && (
          <div className="border-t border-border bg-muted/20 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[13px] font-semibold text-foreground">{previewSubject}</div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                Close preview
              </button>
            </div>
            {previewLoading ? (
              <div className="py-8 text-center text-[12px] text-muted-foreground">Loading preview…</div>
            ) : (
              <div className="max-h-48 overflow-auto rounded-lg border border-border bg-white p-4">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
