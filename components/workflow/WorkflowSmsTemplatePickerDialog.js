'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import {
  extractSmsTemplateDetail,
  extractSmsTemplatesPayload,
  getSmsTemplateCategoryName,
} from '@/app/marketing/sms-builder/smsBuilderApi'

const PAGE_SIZE = 9

export default function WorkflowSmsTemplatePickerDialog({
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
      const result = await api.get(`/api/smsBuilder?${params.toString()}`)
      if (result.success) {
        const { list, total, totalPages: pages } = extractSmsTemplatesPayload(result)
        const nextTotalPages = Math.max(1, pages ?? Math.ceil(total / PAGE_SIZE))
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        setTemplates(list)
        setTotalPages(nextTotalPages)
      } else {
        setError(result.error || 'Failed to load SMS templates.')
      }
    } catch {
      setError('Failed to load SMS templates.')
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
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }, [templates])

  const handleSelect = async (tpl) => {
    if (!tpl?._id) return
    let message = tpl.message || ''
    if (!message) {
      const result = await api.get(`/api/smsBuilder/${tpl._id}`)
      const detail = extractSmsTemplateDetail(result)
      message = detail?.message || ''
    }
    onSelect?.({
      smsTemplateId: tpl._id,
      smsTemplateName: tpl.name || 'Untitled template',
      script: message,
      smsContentType: 'template',
    })
    onClose?.()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="flex max-h-[90vh] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Choose SMS template</DialogTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Templates from SMS Builder — select one to use in this workflow step.
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
              <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-[14px] font-medium text-foreground">No templates found</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Create templates in Marketing → SMS Builder first.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayTemplates.map((tpl) => {
                  const isSelected = selectedId === tpl._id
                  const categoryName = getSmsTemplateCategoryName(tpl)
                  const isInactive = tpl.status === 'inactive'
                  return (
                    <div
                      key={tpl._id}
                      className={cn(
                        'flex flex-col rounded-xl border bg-card p-4 transition-all',
                        isInactive && 'opacity-60',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:shadow-md'
                      )}
                    >
                      <div className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2">
                        {tpl.name || 'Untitled template'}
                      </div>
                      {categoryName && (
                        <div className="mt-1 text-[11px] text-muted-foreground">{categoryName}</div>
                      )}
                      <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap text-[12px] text-muted-foreground">
                        {tpl.message || 'No message'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSelect(tpl)}
                        disabled={isInactive}
                        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--studio-primary)] text-[12px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSelected ? 'Selected' : 'Use template'}
                      </button>
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
      </DialogContent>
    </Dialog>
  )
}
