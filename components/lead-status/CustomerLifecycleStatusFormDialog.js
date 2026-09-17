'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DEFAULT_COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#059669',
]

function contrastTextOnHex(hex) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length !== 6) return '#ffffff'
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '#ffffff'
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#1A1220' : '#ffffff'
}

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--studio-primary)] focus:ring-2 focus:ring-[var(--studio-primary)]/15 disabled:opacity-60'

function formFromStatus(status) {
  return {
    name: status?.label || status?.name || '',
    description: status?.description || '',
    color: status?.color || '#3B82F6',
  }
}

export default function CustomerLifecycleStatusFormDialog({ open, onClose, status, onSaved }) {
  const [form, setForm] = useState(() => formFromStatus(status))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(formFromStatus(status))
  }, [open, status])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Status name is required')
      return
    }
    const key = status?.value
    if (!key) {
      setError('Missing status key')
      return
    }
    setSaving(true)
    setError('')

    const res = await api.patch(`/api/customer-lifecycle-automation/status/${key}`, {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
    })

    if (res?.success) {
      onSaved?.(res.data)
      onClose()
    } else {
      setError(res?.error || 'Failed to save customer status')
    }
    setSaving(false)
  }

  const phaseLabel =
    status?.phase === 'intro' || status?.phase === 'trial' ? 'Trial' : 'Student'

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md">
      <DialogContent onClose={saving ? undefined : onClose} className="max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="text-[22px]">Edit status</DialogTitle>
            <DialogDescription className="text-[14px]">
              Rename how this status appears. The key stays the same so automations keep working.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Active student"
                disabled={saving}
                autoFocus
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-3 pb-0.5">
              <span
                className="inline-flex max-w-[140px] truncate rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm"
                style={{ background: form.color, color: contrastTextOnHex(form.color) }}
              >
                {form.name.trim() || 'Preview'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-foreground">Key</label>
              <code className="block rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 font-mono text-[12px] text-muted-foreground">
                {status?.value || '—'}
              </code>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-foreground">Phase</label>
              <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-[14px] text-muted-foreground">
                {phaseLabel}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-foreground">
              Short description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional note for your team"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-foreground">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  disabled={saving}
                  className={cn(
                    'h-8 w-8 rounded-full transition ring-offset-2 ring-offset-card',
                    form.color === c ? 'ring-2 ring-[var(--studio-primary)]' : 'hover:scale-110'
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-border">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={saving}
                />
                <span
                  className="block h-full w-full"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-[14px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--studio-primary)] px-6 text-[14px] font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save status'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
