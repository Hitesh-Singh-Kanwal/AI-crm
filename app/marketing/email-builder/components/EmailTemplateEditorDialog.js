'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlignLeft, Code2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailPreviewFrame from './EmailPreviewFrame'
import {
  extractCategoriesList,
  getTemplateCategoryId,
} from '../emailBuilderApi'

export default function EmailTemplateEditorDialog({ open, onClose, templateId, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [subject, setSubject] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [body, setBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [editTab, setEditTab] = useState('description')

  const fetchCategories = useCallback(async () => {
    const result = await api.get('/api/email/builder/category')
    if (result.success) {
      setCategories(extractCategoriesList(result))
    }
  }, [])

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const [templateResult] = await Promise.all([
        api.get(`/api/email/builder/${templateId}`),
        fetchCategories(),
      ])
      if (!templateResult.success) {
        setError(templateResult.error || 'Could not load template')
        return
      }
      const email = templateResult.data
      setSubject(String(email?.subject || ''))
      setCategoryId(getTemplateCategoryId(email))
      setBody(String(email?.body || ''))
      setHtmlBody(String(email?.htmlBody || ''))
      setEditTab('description')
    } catch (e) {
      console.error(e)
      setError('Could not load template')
    } finally {
      setLoading(false)
    }
  }, [templateId, fetchCategories])

  useEffect(() => {
    if (open) fetchTemplate()
  }, [open, fetchTemplate])

  const meta = useMemo(() => ({ bodyChars: String(body || '').length }), [body])

  const save = async () => {
    if (!templateId) return
    if (!String(subject || '').trim()) {
      toast.error({ title: 'Missing name', message: 'Template name (subject) is required.' })
      return
    }
    if (!categoryId) {
      toast.error({
        title: 'Missing category',
        message: categories.length === 0 ? 'Create a category first.' : 'Please select a category.',
      })
      return
    }
    if (!String(htmlBody || '').trim()) {
      toast.error({ title: 'Missing HTML', message: 'HTML body is required.' })
      return
    }
    setSaving(true)
    try {
      const result = await api.patch(`/api/email/builder/${templateId}`, {
        subject: subject.trim(),
        categoryID: categoryId,
        body: String(body || ''),
        htmlBody: String(htmlBody || ''),
      })
      if (!result.success) {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update email.' })
        return
      }
      toast.success({ title: 'Updated', message: 'Email template updated successfully.' })
      onSaved?.()
      onClose?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update email.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent className="max-h-[92vh] overflow-hidden flex flex-col p-0" onClose={onClose}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle>Edit email template</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading && (
            <div className="flex justify-center py-14">
              <LoadingSpinner size="lg" text="Loading email…" />
            </div>
          )}

          {error && !loading && (
            <p className="text-sm font-medium text-destructive py-6 text-center">{error}</p>
          )}

          {!loading && !error && (
            <div className="space-y-4 flex flex-col min-h-[480px]">
              <Tabs value={editTab} onValueChange={setEditTab} className="w-full shrink-0">
                <TabsList className="w-full h-10 p-1 grid grid-cols-3 gap-1 bg-slate-100/80">
                  <TabsTrigger value="description" className="gap-1.5 py-2 text-xs font-semibold">
                    <AlignLeft className="h-3.5 w-3.5" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="html" className="gap-1.5 py-2 text-xs font-semibold">
                    <Code2 className="h-3.5 w-3.5" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5 py-2 text-xs font-semibold">
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {editTab === 'description' && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label className="text-xs">Template name</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Template name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select category…</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Description</Label>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{meta.bodyChars} chars</span>
                    </div>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      maxLength={20000}
                      className="resize-none"
                      placeholder="Short description"
                    />
                  </div>
                </div>
              )}

              {editTab === 'html' && (
                <EmailHtmlPanel
                  htmlBody={htmlBody}
                  onHtmlBodyChange={setHtmlBody}
                  layout="editor-only"
                  className="flex-1 min-h-[420px]"
                />
              )}

              {editTab === 'preview' && (
                <EmailPreviewFrame
                  html={htmlBody}
                  emptyMessage="Nothing to preview yet."
                  fullWidth
                  className="flex-1 min-h-[420px]"
                />
              )}
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
