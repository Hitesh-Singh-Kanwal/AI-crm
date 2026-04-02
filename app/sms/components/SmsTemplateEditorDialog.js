'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { previewMessage } from './constants'

export default function SmsTemplateEditorDialog({ open, onClose, templateId, onSaved }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [sms, setSms] = useState(null)
  const [message, setMessage] = useState('')

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/smsBuilder/${templateId}`)
      const tpl = result.data?.sms ?? result.data
      if (!result.success || !tpl) {
        setError(result.error || 'Could not load template')
        return
      }
      setSms(tpl)
      setMessage(String(tpl.message || ''))
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
    const chars = String(message || '').length
    const parts = Math.max(1, Math.ceil(chars / 160))
    return { chars, parts }
  }, [message])

  const save = async () => {
    if (!templateId) return
    setSaving(true)
    try {
      const result = await api.patch(`/api/smsBuilder/${templateId}`, { message: String(message || '') })
      if (!result.success) {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update template.' })
        return
      }
      toast.success({ title: 'Updated', message: 'Template updated successfully.' })
      onSaved?.()
      onClose?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update template.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="3xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Edit SMS template</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-14">
            <LoadingSpinner size="lg" text="Loading template…" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm font-medium text-destructive py-6 text-center">{error}</p>
        )}

        {!loading && !error && sms && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{sms.categoryID?.name || 'Uncategorized'}</Badge>
              {sms.subCategory && <Badge variant="secondary">{sms.subCategory}</Badge>}
              <Badge variant="outline">{sms.name || 'Unnamed template'}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Message</p>
                <div className="flex items-center gap-2">
                  <Badge variant={meta.parts > 1 ? 'warning' : 'info'}>
                    {meta.parts} SMS
                  </Badge>
                  <span className="text-xs text-muted-foreground">{meta.chars} chars</span>
                </div>
              </div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} maxLength={480} />
              <p className="text-xs text-muted-foreground">
                Messages over 160 characters may split into multiple SMS parts.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{previewMessage(message)}</p>
            </div>

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

