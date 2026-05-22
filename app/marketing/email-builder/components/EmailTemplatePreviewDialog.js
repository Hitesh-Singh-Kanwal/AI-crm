'use client'

import { useCallback, useEffect, useState } from 'react'
import { Code2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailPreviewFrame from './EmailPreviewFrame'

export default function EmailTemplatePreviewDialog({ open, onClose, templateId }) {
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
    if (open) fetchTemplate()
  }, [open, fetchTemplate])

  useEffect(() => {
    if (!open) {
      setEmail(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent className="max-h-[92vh] overflow-hidden flex flex-col p-0" onClose={onClose}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle>Email preview</DialogTitle>
          {!loading && !error && email ? (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="font-normal">
                {email.subject || 'No name'}
              </Badge>
              {email.body ? (
                <Badge variant="secondary" className="font-normal max-w-[280px] truncate">
                  {email.body}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading && (
            <div className="flex justify-center py-14">
              <LoadingSpinner size="lg" text="Loading email…" />
            </div>
          )}

          {error && !loading && (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={fetchTemplate}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && email && (
            <div className="space-y-4">
              <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                <TabsList className="w-full max-w-sm h-auto p-1 grid grid-cols-2 gap-1 bg-slate-100/80">
                  <TabsTrigger value="preview" className="gap-2 py-2 text-xs font-semibold">
                    <Eye className="h-3.5 w-3.5" />
                    Rendered
                  </TabsTrigger>
                  <TabsTrigger value="html" className="gap-2 py-2 text-xs font-semibold">
                    <Code2 className="h-3.5 w-3.5" />
                    HTML source
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {viewTab === 'preview' && (
                <EmailPreviewFrame
                  html={email.htmlBody}
                  emptyMessage="This template has no HTML body."
                  fullWidth
                  className="min-h-[400px]"
                />
              )}

              {viewTab === 'html' && (
                <EmailHtmlPanel
                  htmlBody={email.htmlBody || ''}
                  readOnly
                  layout="editor-only"
                  className="min-h-[400px]"
                />
              )}
            </div>
          )}
        </div>

        {!loading && !error && email && (
          <div className="shrink-0 flex justify-end px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
