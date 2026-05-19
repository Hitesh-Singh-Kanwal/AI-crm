'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

export default function EmailTemplatePreviewDialog({ open, onClose, templateId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState(null)

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
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Email preview</DialogTitle>
        </DialogHeader>

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
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{email.subject || 'No name'}</Badge>
              {email.body ? <Badge variant="secondary">{email.body}</Badge> : null}
            </div>

            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Rendering from <span className="font-mono">{'htmlBody'}</span>
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: email.htmlBody || '<p>(No HTML body)</p>' }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

