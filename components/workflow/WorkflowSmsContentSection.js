'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, LayoutTemplate, MessageSquare, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { extractSmsTemplatesPayload } from '@/app/marketing/sms-builder/smsBuilderApi'
import WorkflowSmsTemplatePickerDialog from '@/components/workflow/WorkflowSmsTemplatePickerDialog'
import { WORKFLOW_SMS_CONTENT_TYPES } from '@/lib/workflow-normalize'

export default function WorkflowSmsContentSection({
  step,
  onChange,
  isPanel = false,
  textareaClass = '',
  labelClass = '',
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [resolving, setResolving] = useState(false)

  const contentType = step.smsContentType === 'template' ? 'template' : 'custom'
  const hasScript = Boolean(step.script?.trim())

  const resolveTemplateFromScript = useCallback(async () => {
    if (step.smsTemplateId || contentType !== 'template' || !step.script?.trim()) return
    setResolving(true)
    try {
      const result = await api.get('/api/smsBuilder?page=1&limit=100')
      if (!result.success) return
      const { list } = extractSmsTemplatesPayload(result)
      const match = list.find((t) => String(t.message || '').trim() === String(step.script).trim())
      if (match?._id) {
        onChange({
          smsTemplateId: match._id,
          smsTemplateName: match.name || 'Untitled template',
        })
      }
    } finally {
      setResolving(false)
    }
  }, [step.smsTemplateId, contentType, step.script, onChange])

  useEffect(() => {
    resolveTemplateFromScript()
  }, [resolveTemplateFromScript])

  const handleContentTypeChange = (nextType) => {
    if (nextType === 'template') {
      onChange({ smsContentType: 'template' })
      return
    }
    onChange({
      smsContentType: 'custom',
      smsTemplateId: '',
      smsTemplateName: '',
    })
  }

  const handleTemplateSelect = (patch) => {
    onChange(patch)
  }

  const clearTemplate = () => {
    onChange({
      smsTemplateId: '',
      smsTemplateName: '',
      script: '',
    })
  }

  const handleCustomScriptChange = (value) => {
    onChange({
      script: value,
      smsContentType: 'custom',
      smsTemplateId: '',
      smsTemplateName: '',
    })
  }

  const selectClass = isPanel
    ? 'h-12 w-full max-w-sm rounded-lg border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-[var(--studio-primary)]'
    : 'h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="max-w-sm space-y-2">
          <label className={labelClass}>Message source</label>
          <select
            value={contentType}
            onChange={(e) => handleContentTypeChange(e.target.value)}
            className={selectClass}
          >
            {WORKFLOW_SMS_CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          href="/marketing/sms-builder"
          target="_blank"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          SMS Builder
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {contentType === 'template' ? (
        <div className="space-y-3">
          {hasScript ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 shrink-0 text-primary" />
                    <div className="text-[14px] font-semibold text-foreground">
                      {step.smsTemplateName?.trim() || 'SMS template'}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12px] text-muted-foreground">
                    {step.script}
                  </p>
                </div>
                {resolving && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
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
              <span className="text-[14px] font-semibold text-foreground">Browse SMS templates</span>
              <span className="max-w-sm text-[12px] text-muted-foreground">
                Pick a saved template from SMS Builder — its message will be used for this step.
              </span>
            </button>
          )}

          <WorkflowSmsTemplatePickerDialog
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            selectedId={step.smsTemplateId || ''}
            onSelect={handleTemplateSelect}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className={labelClass}>Custom message</label>
          <textarea
            value={step.script ?? ''}
            onChange={(e) => handleCustomScriptChange(e.target.value)}
            rows={isPanel ? 6 : 4}
            placeholder="Hi {{first_name}}, thanks for your interest…"
            className={textareaClass}
          />
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            Use {'{{first_name}}'}, {'{{name}}'}, and other merge tags in your message.
          </p>
        </div>
      )}
    </div>
  )
}
