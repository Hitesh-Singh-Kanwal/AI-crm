'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

export default function EmailTemplateEditorDialog({ open, onClose, templateId, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState(null)
  const [body, setBody] = useState('')

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/emailBuilder/${templateId}`)
      if (!result.success) {
        setError(result.error || 'Could not load template')
        return
      }
      setEmail(result.data)
      setBody(String(result.data?.body || ''))
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

  const meta = useMemo(() => {
    const chars = String(body || '').length
    return { chars }
  }, [body])

  const save = async () => {
    if (!templateId) return
    setSaving(true)
    try {
      const result = await api.patch(`/api/emailBuilder/${templateId}`, { body: String(body || '') })
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
    <Dialog open={open} onClose={onClose} maxWidth="3xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Edit email template</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-14">
            <LoadingSpinner size="lg" text="Loading email…" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm font-medium text-destructive py-6 text-center">{error}</p>
        )}

        {!loading && !error && email && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{email.subject || 'No subject'}</Badge>
              <Badge variant="secondary">{email._id}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Body</p>
                <span className="text-xs text-muted-foreground">{meta.chars} chars</span>
              </div>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={20000} />
            </div>

            {email.htmlBody && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">HTML preview</p>
                <div
                  className="prose prose-sm max-w-none bg-background rounded-md border border-border p-3"
                  dangerouslySetInnerHTML={{ __html: email.htmlBody }}
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="gradient" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

