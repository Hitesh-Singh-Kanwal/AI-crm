'use client'

import {
  WORKFLOW_EMAIL_TYPES,
  WORKFLOW_HOUR_OPTIONS,
  WORKFLOW_MINUTE_OPTIONS,
  WORKFLOW_STEP_TYPES,
  isCallStepType,
} from '@/lib/workflow-normalize'
import { cn } from '@/lib/utils'
import WorkflowEmailTemplateSection from '@/components/workflow/WorkflowEmailTemplateSection'
import WorkflowSmsContentSection from '@/components/workflow/WorkflowSmsContentSection'

export default function WorkflowStepFields({
  step,
  leadStageOptions,
  onChange,
  compact = false,
  hideDay = false,
  layout = 'inline',
}) {
  const isPanel = layout === 'panel'

  const inputClass = isPanel
    ? 'h-12 w-full rounded-lg border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-[var(--studio-primary)]'
    : compact
      ? 'h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]'
      : 'h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'

  const labelClass = isPanel
    ? 'mb-1.5 block text-[13px] font-semibold text-foreground'
    : 'mb-1 block text-[11px] font-medium text-muted-foreground'

  const sectionTitleClass = 'text-[12px] font-bold uppercase tracking-wide text-muted-foreground'

  const isEmail = step.type === 'email'
  const isSms = step.type === 'sms'
  const emailFormat = step.emailType === 'template' ? 'template' : 'message'

  const textareaClass = cn(
    'w-full rounded-lg border border-border bg-background text-foreground outline-none focus:border-[var(--studio-primary)]',
    isPanel ? 'px-4 py-3 text-[14px]' : 'px-3 py-2 text-[13px]'
  )

  const handleEmailFormatChange = (nextFormat) => {
    if (nextFormat === 'template') {
      onChange({
        emailType: 'template',
        script: '',
      })
      return
    }
    onChange({
      emailType: 'message',
      htmlBody: '',
      emailTemplateId: '',
      emailTemplateSubject: '',
    })
  }

  if (isPanel) {
    return (
      <div className="space-y-6">
        <div>
          <div className={sectionTitleClass}>Action</div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Step type</label>
              <select
                value={step.type}
                onChange={(e) => onChange({ type: e.target.value })}
                className={inputClass}
              >
                {WORKFLOW_STEP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Lead stage</label>
              <select
                value={step.leadStage}
                onChange={(e) => onChange({ leadStage: e.target.value })}
                className={inputClass}
              >
                {leadStageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className={sectionTitleClass}>Schedule</div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!hideDay && (
              <div>
                <label className={labelClass}>Day</label>
                <input
                  value={step.day ?? 0}
                  onChange={(e) => onChange({ day: Number(e.target.value) })}
                  type="number"
                  min={0}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Hour</label>
              <select
                value={step.hour ?? 0}
                onChange={(e) => onChange({ hour: Number(e.target.value) })}
                className={inputClass}
              >
                {WORKFLOW_HOUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Minute</label>
              <select
                value={step.minute ?? 0}
                onChange={(e) => onChange({ minute: Number(e.target.value) })}
                className={inputClass}
              >
                {WORKFLOW_MINUTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={hideDay ? 'sm:col-span-2' : ''}>
              <label className={labelClass}>Description</label>
              <input
                value={step.description ?? ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Optional label for this step"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {isEmail && (
          <div className="rounded-xl border border-border bg-muted/15 p-5">
            <div className={sectionTitleClass}>Email content</div>
            <div className="mt-4 space-y-4">
              <div className="max-w-sm">
                <label className={labelClass}>Email format</label>
                <select
                  value={emailFormat}
                  onChange={(e) => handleEmailFormatChange(e.target.value)}
                  className={inputClass}
                >
                  {WORKFLOW_EMAIL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Subject</label>
                <input
                  value={step.subject ?? ''}
                  onChange={(e) => onChange({ subject: e.target.value })}
                  placeholder="e.g. Welcome to our studio"
                  className={inputClass}
                />
              </div>

              {emailFormat === 'template' ? (
                <WorkflowEmailTemplateSection step={step} onChange={onChange} isPanel />
              ) : (
                <div>
                  <label className={labelClass}>Message (plain text)</label>
                  <textarea
                    value={step.script ?? ''}
                    onChange={(e) => onChange({ script: e.target.value })}
                    rows={6}
                    placeholder="Hi {{name}}, …"
                    className={textareaClass}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {isSms && (
          <div className="rounded-xl border border-border bg-muted/15 p-5">
            <div className={sectionTitleClass}>SMS content</div>
            <div className="mt-4">
              <WorkflowSmsContentSection
                step={step}
                onChange={onChange}
                isPanel
                labelClass={labelClass}
                textareaClass={textareaClass}
              />
            </div>
          </div>
        )}

        {isCallStepType(step.type) && (
          <div className="rounded-xl border border-border bg-muted/15 p-5">
            <div className={sectionTitleClass}>Call details</div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              This step will place an outbound call. Use the description above to note the call purpose.
            </p>
          </div>
        )}
      </div>
    )
  }

  const gridCols = hideDay ? 'md:grid-cols-5' : 'md:grid-cols-6'

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 gap-3 ${gridCols}`}>
        <div>
          <label className={labelClass}>Type</label>
          <select
            value={step.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className={inputClass}
          >
            {WORKFLOW_STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Lead stage</label>
          <select
            value={step.leadStage}
            onChange={(e) => onChange({ leadStage: e.target.value })}
            className={inputClass}
          >
            {leadStageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {!hideDay && (
          <div>
            <label className={labelClass}>Day</label>
            <input
              value={step.day ?? 0}
              onChange={(e) => onChange({ day: Number(e.target.value) })}
              type="number"
              min={0}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Hour</label>
          <select
            value={step.hour ?? 0}
            onChange={(e) => onChange({ hour: Number(e.target.value) })}
            className={inputClass}
          >
            {WORKFLOW_HOUR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Minute</label>
          <select
            value={step.minute ?? 0}
            onChange={(e) => onChange({ minute: Number(e.target.value) })}
            className={inputClass}
          >
            {WORKFLOW_MINUTE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input
            value={step.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional label"
            className={inputClass}
          />
        </div>
      </div>

      {isEmail && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="max-w-xs">
            <label className={labelClass}>Email format</label>
            <select
              value={emailFormat}
              onChange={(e) => handleEmailFormatChange(e.target.value)}
              className={inputClass}
            >
              {WORKFLOW_EMAIL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Subject</label>
            <input
              value={step.subject ?? ''}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="e.g. Welcome to our studio"
              className={inputClass}
            />
          </div>

          {emailFormat === 'template' ? (
            <WorkflowEmailTemplateSection step={step} onChange={onChange} isPanel={false} />
          ) : (
            <div>
              <label className={labelClass}>Message (plain text)</label>
              <textarea
                value={step.script ?? ''}
                onChange={(e) => onChange({ script: e.target.value })}
                rows={compact ? 3 : 4}
                placeholder="Hi {{name}}, …"
                className={textareaClass}
              />
            </div>
          )}
        </div>
      )}

      {isSms && (
        <WorkflowSmsContentSection
          step={step}
          onChange={onChange}
          isPanel={false}
          labelClass={labelClass}
          textareaClass={textareaClass}
        />
      )}
    </div>
  )
}
