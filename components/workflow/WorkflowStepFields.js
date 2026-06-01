'use client'

import {
  WORKFLOW_EMAIL_TYPES,
  WORKFLOW_HOUR_OPTIONS,
  WORKFLOW_STEP_TYPES,
} from '@/lib/workflow-normalize'

export default function WorkflowStepFields({
  step,
  leadStageOptions,
  onChange,
  compact = false,
}) {
  const inputClass = compact
    ? 'h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]'
    : 'h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'
  const labelClass = 'mb-1 block text-[11px] text-muted-foreground'
  const isEmail = step.type === 'email'
  const isSms = step.type === 'sms'
  const emailFormat = step.emailType === 'template' ? 'template' : 'message'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
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
          <label className={labelClass}>Order</label>
          <input
            value={step.order}
            onChange={(e) => onChange({ order: e.target.value })}
            inputMode="numeric"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Lead Stage</label>
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
          <label className={labelClass}>Description</label>
          <input
            value={step.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder=""
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
              onChange={(e) => onChange({ emailType: e.target.value })}
              className={inputClass}
            >
              {WORKFLOW_EMAIL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {emailFormat === 'template' ? (
            <div>
              <label className={labelClass}>HTML body</label>
              <textarea
                value={step.htmlBody ?? ''}
                onChange={(e) => onChange({ htmlBody: e.target.value })}
                rows={compact ? 4 : 5}
                placeholder="<!DOCTYPE html>…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Message (plain text)</label>
              <textarea
                value={step.script ?? ''}
                onChange={(e) => onChange({ script: e.target.value })}
                rows={compact ? 3 : 4}
                placeholder="Hi {{name}}, …"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
          )}
        </div>
      )}

      {isSms && (
        <div>
          <label className={labelClass}>SMS script</label>
          <textarea
            value={step.script ?? ''}
            onChange={(e) => onChange({ script: e.target.value })}
            rows={compact ? 3 : 4}
            placeholder="Hi {{first_name}}, …"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
          />
        </div>
      )}
    </div>
  )
}
