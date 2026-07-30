'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, FolderOpen, Mail, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmailTemplateThumbnail from '@/app/marketing/email-builder/components/EmailTemplateThumbnail'
import { ScaledInboxHtmlEmail } from '@/app/inbox/components/InboxHtmlEmailFrame'
import {
  extractCategoriesList,
  extractEmailTemplatesPayload,
} from '@/app/marketing/email-builder/emailBuilderApi'

const PAGE_SIZE = 9

export default function WorkflowEmailTemplatePickerDialog({
  open,
  onClose,
  selectedId = '',
  onSelect,
  description = 'Templates from Email Builder — select one to use in this workflow step.',
}) {
  const toast = useToast()
  const [view, setView] = useState('categories') // 'categories' | 'templates'
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

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

  const resetState = useCallback(() => {
    setView('categories')
    setSelectedCategory(null)
    setCategorySearch('')
    setSearchQuery('')
    setDebouncedSearch('')
    setPage(1)
    setTemplates([])
    setError('')
    setPreviewId(null)
    setPreviewHtml('')
    setPreviewSubject('')
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    let cancelled = false
    const loadCategories = async () => {
      setCategoriesLoading(true)
      setCategoriesError('')
      try {
        const result = await api.get('/api/email/builder/category')
        if (cancelled) return
        if (result.success) {
          setCategories(extractCategoriesList(result))
        } else {
          setCategoriesError(result.error || 'Failed to load categories.')
        }
      } catch {
        if (!cancelled) setCategoriesError('Failed to load categories.')
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    }
    loadCategories()
    return () => {
      cancelled = true
    }
  }, [open, resetState])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (view === 'templates') setPage(1)
  }, [debouncedSearch, selectedCategory?._id, view])

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    const list = [...categories].sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || '')),
    )
    if (!q) return list
    return list.filter((c) => String(c?.name || '').toLowerCase().includes(q))
  }, [categories, categorySearch])

  const fetchTemplates = useCallback(async () => {
    if (!selectedCategory?._id) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        categoryID: String(selectedCategory._id),
        status: 'active',
      })
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
  }, [page, debouncedSearch, selectedCategory?._id])

  useEffect(() => {
    if (open && view === 'templates' && selectedCategory?._id) fetchTemplates()
  }, [open, view, selectedCategory?._id, fetchTemplates])

  const displayTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return String(a.subject || '').localeCompare(String(b.subject || ''))
    })
  }, [templates])

  const openCategory = (cat) => {
    setSelectedCategory(cat)
    setView('templates')
    setSearchQuery('')
    setDebouncedSearch('')
    setPage(1)
    setPreviewId(null)
  }

  const backToCategories = () => {
    setView('categories')
    setSelectedCategory(null)
    setTemplates([])
    setSearchQuery('')
    setDebouncedSearch('')
    setPage(1)
    setPreviewId(null)
    setError('')
  }

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
    if (!String(htmlBody || '').trim()) {
      toast.error({
        title: 'Template unavailable',
        message: 'This email template has no HTML content.',
      })
      return
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
      <DialogContent onClose={onClose} className="flex max-h-[90vh] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {view === 'categories'
              ? 'Choose a category'
              : selectedCategory?.name || 'Choose email template'}
          </DialogTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {view === 'categories'
              ? 'Pick a category first, then choose a template inside it.'
              : description}
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
          {view === 'categories' ? (
            <>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories…"
                  className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[14px] outline-none focus:border-[var(--studio-primary)]"
                />
              </div>

              {categoriesLoading ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading categories…" />
                </div>
              ) : categoriesError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-8 text-center text-[13px] text-destructive">
                  {categoriesError}
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-[14px] font-medium text-foreground">
                    {categorySearch.trim() ? 'No matching categories' : 'No categories yet'}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Create categories in Marketing → Email Builder first.
                  </p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((cat) => {
                      const count = Number(cat.templateCount) || 0
                      return (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => openCategory(cat)}
                          className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-[color:var(--studio-primary)]/40 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]">
                              <FolderOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-foreground">
                                {cat.name || 'Untitled'}
                              </p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                {count} {count === 1 ? 'template' : 'templates'}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={backToCategories}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                  All categories
                </button>
                <div className="relative min-w-0 flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates in this category…"
                    className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[14px] outline-none focus:border-[var(--studio-primary)]"
                  />
                </div>
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
                    {searchQuery.trim()
                      ? 'Try a different search in this category.'
                      : 'This category has no email templates yet.'}
                  </p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayTemplates.map((tpl) => {
                      const isSelected = selectedId === tpl._id
                      return (
                        <div
                          key={tpl._id}
                          className={cn(
                            'flex flex-col overflow-hidden rounded-xl border bg-card transition-all',
                            isSelected
                              ? 'border-[color:var(--studio-primary)] ring-2 ring-[color:var(--studio-primary)]/25'
                              : 'border-border hover:border-[color:var(--studio-primary)]/40 hover:shadow-md',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(tpl)}
                            className="p-3 pb-0 text-left"
                          >
                            <EmailTemplateThumbnail html={tpl.htmlBody} />
                          </button>
                          <div className="flex flex-1 flex-col p-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handleSelect(tpl)}
                              className="text-left"
                            >
                              <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
                                {tpl.subject || 'Untitled template'}
                              </div>
                              <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                                {tpl.body || 'No description'}
                              </p>
                            </button>
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
            </>
          )}
        </div>

        {view === 'templates' && previewId && (
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
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <ScaledInboxHtmlEmail
                  html={previewHtml}
                  title={previewSubject || 'Template preview'}
                  minHeight={160}
                  maxHeight={280}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
