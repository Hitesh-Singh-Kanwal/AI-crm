'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Code2, Eye, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatLeadStageLabel } from '@/lib/lead-stages'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailPreviewFrame from './EmailPreviewFrame'

export default function EmailTemplatePreviewDialog({
  open = true,
  onClose,
  templateId,
  onEdit,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState(null)
  const [viewTab, setViewTab] = useState('preview')

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/email/builder/${templateId}`)
      if (!result.success) {
        setError(result.error || 'Could not load template')
        return
      }
      setEmail(result.data)
      setViewTab('preview')
    } catch (e) {
      console.error(e)
      setError('Could not load template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    if (open && templateId) fetchTemplate()
  }, [open, templateId, fetchTemplate])

  useEffect(() => {
    if (!open) {
      setEmail(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  if (!open || !templateId) return null

  return (
    <div className="h-[calc(100vh-148px)] flex flex-col min-h-0">
      <Card className="flex flex-col flex-1 min-h-0 border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b py-2 px-3 bg-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <Tabs value={viewTab} onValueChange={setViewTab} className="min-w-0">
              <TabsList className="h-9 p-0.5 grid grid-cols-2 gap-0.5 bg-slate-100/90 rounded-lg">
                <TabsTrigger
                  value="preview"
                  className={cn(
                    'h-8 px-3 rounded-md text-slate-600 gap-1.5',
                    'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm',
                  )}
                >
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold">Preview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="html"
                  className={cn(
                    'h-8 px-3 rounded-md text-slate-600 gap-1.5',
                    'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm',
                  )}
                >
                  <Code2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold">HTML</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="min-w-0 flex-1 hidden md:flex items-center gap-2">
              {!loading && !error && email ? (
                <>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {email.subject || 'Untitled template'}
                  </p>
                  {email.code ? (
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      {String(email.code)}
                    </Badge>
                  ) : null}
                  {email.leadStage ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0 hidden lg:inline-flex">
                      {formatLeadStageLabel(email.leadStage)}
                    </Badge>
                  ) : null}
                </>
              ) : null}
            </div>

            {onEdit ? (
              <Button
                type="button"
                variant="gradient"
                size="sm"
                className="h-8 shrink-0 ml-auto"
                disabled={loading || !!error || !email}
                onClick={() => onEdit(templateId)}
              >
                <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent
          className="flex-1 min-h-0 flex flex-col px-3 pt-2 pb-3 overflow-hidden bg-slate-50/40"
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

          {!loading && !error && email && (
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
              {viewTab === 'preview' && (
                <EmailPreviewFrame
                  html={email.htmlBody}
                  subject={email.subject}
                  emptyMessage="This template has no HTML body."
                  fullWidth
                  className="h-full min-h-[calc(100vh-220px)]"
                />
              )}

              {viewTab === 'html' && (
                <EmailHtmlPanel
                  htmlBody={email.htmlBody || ''}
                  readOnly
                  layout="editor-only"
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
