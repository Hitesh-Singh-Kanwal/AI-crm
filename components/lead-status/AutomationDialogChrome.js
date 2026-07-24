'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--studio-primary)] focus:ring-2 focus:ring-[var(--studio-primary)]/15 disabled:opacity-60'

export const selectClass = fieldClass

export function StepHeader({ step, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--studio-primary)]/10 text-[11px] font-bold text-[var(--studio-primary)]">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

export function FieldLabel({ children, required }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
      {children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </label>
  )
}

export function ActiveToggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium transition hover:bg-muted/40 disabled:opacity-60',
        checked ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'left-4' : 'left-0.5'
          )}
        />
      </span>
      {checked ? 'Rule on' : 'Rule off'}
    </button>
  )
}

export function JoinToggle({ value, onChange, disabled }) {
  const current = value === 'OR' ? 'OR' : 'AND'
  return (
    <div className="relative z-[1] -my-1 flex justify-center">
      <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-sm">
        {['AND', 'OR'].map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-full px-3.5 py-1 text-[11px] font-bold tracking-wide transition',
              current === opt
                ? opt === 'AND'
                  ? 'bg-foreground text-background'
                  : 'bg-[var(--studio-primary)] text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ConditionCard({ index, onRemove, canRemove, disabled, children }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || !canRemove}
          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
        >
          Remove
        </button>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

export function RulePreview({ children }) {
  if (!children) return null
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--studio-primary)]/20 bg-[var(--studio-primary)]/5 px-4 py-3.5">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--studio-primary)]/10">
        <Zap className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--studio-primary)]">
          Preview
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground">{children}</p>
      </div>
    </div>
  )
}

export function DialogShell({
  title,
  description,
  icon: Icon,
  onClose,
  saving,
  children,
  footer,
}) {
  return (
    <div className="relative flex max-h-[90vh] flex-col overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
      <div className="sticky top-0 z-10 flex-shrink-0 border-b border-border bg-card px-6 pb-4 pt-6 pr-14">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
        <div className="flex items-start gap-3.5">
          {Icon ? (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--studio-primary)]/10 text-[var(--studio-primary)] ring-1 ring-[var(--studio-primary)]/15">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* No nested overflow-y — keeps stage multi-select menus from being clipped */}
      <div className="px-6 py-5">{children}</div>

      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-border bg-card px-6 py-4">
        {footer}
      </div>
    </div>
  )
}

export function FormActions({ onCancel, saving, isEdit, submitLabel }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground transition hover:bg-muted/50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--studio-primary)] px-5 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {saving
          ? isEdit
            ? 'Saving…'
            : 'Creating…'
          : submitLabel || (isEdit ? 'Save rule' : 'Create rule')}
      </button>
    </div>
  )
}
