'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, LayoutTemplate, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { extractEmailTemplatesPayload } from '@/app/marketing/email-builder/emailBuilderApi'
import EmailTemplateThumbnail from '@/app/marketing/email-builder/components/EmailTemplateThumbnail'
import WorkflowEmailTemplatePickerDialog from '@/components/workflow/WorkflowEmailTemplatePickerDialog'

export default function WorkflowEmailTemplateSection({ step, onChange, isPanel = false }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [resolving, setResolving] = useState(false)

  const labelClass = isPanel
    ? 'mb-1.5 block text-[13px] font-semibold text-foreground'
    : 'mb-1 block text-[11px] font-medium text-muted-foreground'

  const resolveTemplateFromHtml = useCallback(async () => {
    if (step.emailTemplateId || step.emailType !== 'template' || !step.htmlBody?.trim()) return
    setResolving(true)
    try {
      const result = await api.get('/api/email/builder?page=1&limit=100')
      if (!result.success) return
      const { list } = extractEmailTemplatesPayload(result)
      const match = list.find((t) => String(t.htmlBody || '').trim() === String(step.htmlBody).trim())
      if (match?._id) {
        onChange({
          emailTemplateId: match._id,
          emailTemplateSubject: match.subject || 'Untitled template',
          subject: step.subject?.trim() || match.subject || '',
        })
      }
    } finally {
      setResolving(false)
    }
  }, [step.emailTemplateId, step.emailType, step.htmlBody, onChange])

  useEffect(() => {
    resolveTemplateFromHtml()
  }, [resolveTemplateFromHtml])

  const handleTemplateSelect = (patch) => {
    onChange({
      ...patch,
      emailType: 'template',
    })
  }

  const clearTemplate = () => {
    onChange({
      emailTemplateId: '',
      emailTemplateSubject: '',
      htmlBody: '',
      subject: '',
    })
  }

  const hasTemplate = Boolean(step.htmlBody?.trim())

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={labelClass}>Email template</label>
        <Link
          href="/marketing/email-builder"
          target="_blank"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Email Builder
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {hasTemplate ? (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-40 shrink-0">
              <EmailTemplateThumbnail html={step.htmlBody} className="h-24" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-foreground">
                    {step.emailTemplateSubject?.trim() || 'Email template'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    HTML template linked from Email Builder
                  </div>
                </div>
                {resolving && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted/50"
                >
                  Change template
                </button>
                <button
                  type="button"
                  onClick={clearTemplate}
                  className="inline-flex h-9 items-center rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-[12px] font-medium text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/15 text-center transition-colors hover:border-primary/40 hover:bg-primary/5',
            isPanel ? 'px-6 py-10' : 'px-4 py-8'
          )}
        >
          <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
          <span className="text-[14px] font-semibold text-foreground">Browse email templates</span>
          <span className="max-w-sm text-[12px] text-muted-foreground">
            Pick a saved template from Email Builder — its HTML will be used for this step.
          </span>
        </button>
      )}

      <WorkflowEmailTemplatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={step.emailTemplateId || ''}
        onSelect={handleTemplateSelect}
      />
    </div>
  )
}
