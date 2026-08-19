'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlignLeft, ArrowLeft, Code2, Eye, Layout, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailPreviewFrame from './EmailPreviewFrame'
import EmailVisualHtmlEditor from './EmailVisualHtmlEditor'
import EmailFooterPicker from './EmailFooterPicker'
import {
  extractCategoriesList,
  getTemplateCategoryId,
} from '../emailBuilderApi'

export default function EmailTemplateEditorDialog({
  open = true,
  onClose,
  templateId,
  onSaved,
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [subject, setSubject] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [code, setCode] = useState('')
  const [body, setBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [editTab, setEditTab] = useState('visual')

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
      setCode(String(email?.code || ''))
      setBody(String(email?.body || ''))
      setHtmlBody(String(email?.htmlBody || ''))
      setEditTab(String(email?.htmlBody || '').trim() ? 'visual' : 'description')
    } catch (e) {
      console.error(e)
      setError('Could not load template')
    } finally {
      setLoading(false)
    }
  }, [templateId, fetchCategories])

  useEffect(() => {
    if (open && templateId) fetchTemplate()
  }, [open, templateId, fetchTemplate])

  const meta = useMemo(() => ({ bodyChars: String(body || '').length }), [body])

  const save = async () => {
    if (!templateId) return
    if (!String(subject || '').trim()) {
      toast.error({ title: 'Missing name', message: 'Template name is required.' })
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
        body: String(body || '').trim() || null,
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

  if (!open || !templateId) return null

  return (
    <div className="h-[calc(100vh-148px)] flex flex-col min-h-0">
      <Card className="flex flex-col flex-1 min-h-0 border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b py-2 px-3 bg-card">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="h-8 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <Tabs value={editTab} onValueChange={setEditTab} className="min-w-0">
              <TabsList className="h-9 p-0.5 grid grid-cols-4 gap-0.5 bg-muted/90 rounded-lg">
                {[
                  { value: 'description', label: 'Details', icon: AlignLeft },
                  { value: 'visual', label: 'Design', icon: Layout },
                  { value: 'html', label: 'HTML', icon: Code2 },
                  { value: 'preview', label: 'Preview', icon: Eye },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      'h-8 px-2.5 sm:px-3 rounded-md text-muted-foreground gap-1.5',
                      'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="min-w-0 flex-1 hidden md:block">
              <p className="text-sm font-medium text-foreground truncate">
                {subject.trim() || 'Untitled template'}
              </p>
            </div>

            {!loading && !error ? (
              <EmailFooterPicker
                html={htmlBody}
                onHtmlChange={(next) => {
                  setHtmlBody(next)
                  setEditTab('preview')
                }}
                className="shrink-0"
              />
            ) : null}

            <Button
              variant="gradient"
              size="sm"
              onClick={save}
              disabled={saving || loading || !!error}
              className="h-8 shrink-0"
            >
              <Send className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent
          className="flex-1 min-h-0 flex flex-col px-3 pt-2 pb-3 overflow-hidden bg-muted/40"
          style={{ overscrollBehavior: 'contain' }}
        >
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading email…" />
            </div>
          )}

          {error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTemplate}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
              {editTab === 'description' && (
                <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Template name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Template name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Category <span className="text-destructive">*</span>
                    </Label>
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
                  {code ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Code</Label>
                      <Input value={code} readOnly className="font-mono" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        Description <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {meta.bodyChars} chars
                      </span>
                    </div>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      maxLength={20000}
                      className="resize-none"
                      placeholder="Short note for your team"
                    />
                  </div>
                </div>
              )}

              {editTab === 'visual' && (
                <EmailVisualHtmlEditor
                  html={htmlBody}
                  onChange={setHtmlBody}
                  className="h-full min-h-[calc(100vh-220px)]"
                />
              )}

              {editTab === 'html' && (
                <EmailHtmlPanel
                  htmlBody={htmlBody}
                  onHtmlBodyChange={setHtmlBody}
                  onOpenDesign={() => setEditTab('visual')}
                  layout="editor-only"
                  className="h-full min-h-[calc(100vh-220px)]"
                />
              )}

              {editTab === 'preview' && (
                <EmailPreviewFrame
                  html={htmlBody}
                  subject={subject}
                  emptyMessage="Nothing to preview yet"
                  emptyHint="Switch to Design or HTML to add content, then come back here."
                  emptyActionLabel="Go to Design"
                  onEmptyAction={() => setEditTab('visual')}
                  fullWidth
                  className="h-full min-h-[calc(100vh-220px)]"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
