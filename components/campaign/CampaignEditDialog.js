'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLeadStages } from '@/lib/lead-stages'
import {
  buildCampaignPatchPayload,
  CAMPAIGN_EVENT_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  CAMPAIGN_STEP_STATUS_OPTIONS,
  CAMPAIGN_STEP_TYPES,
  campaignToEditForm,
  createEmptyCampaignStep,
  formatLeadStageLabel,
} from '@/lib/campaign-normalize'

export default function CampaignEditDialog({ campaign, onClose, onSaved }) {
  const { stages: leadStageOptions } = useLeadStages()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!campaign) {
      setForm(null)
      setError('')
      return
    }
    setForm(campaignToEditForm(campaign))
    setError('')
  }, [campaign])

  const canSave = useMemo(() => {
    if (!form?.name?.trim() || !form?.leadID) return false
    if (!Array.isArray(form.steps) || form.steps.length === 0) return false
    return form.steps.every((s) => s.type && s.order !== '' && s.leadStage)
  }, [form])

  const updateStep = (idx, patch) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))
  }

  const save = async () => {
    if (!form?._id || !canSave || saving) return
    setSaving(true)
    setError('')
    const payload = buildCampaignPatchPayload(form)
    const res = await api.patch(`/api/campaign/${form._id}`, payload)
    if (res?.success) {
      onSaved?.(res.data)
      onClose?.()
    } else {
      setError(res?.error || 'Failed to update campaign.')
    }
    setSaving(false)
  }

  if (!campaign || !form) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold text-foreground">Edit Campaign</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Update campaign details and steps, then save.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-medium text-foreground">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              >
                {CAMPAIGN_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Event</label>
              <select
                value={form.event}
                onChange={(e) => setForm((p) => ({ ...p, event: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              >
                {CAMPAIGN_EVENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-medium text-foreground">Lead ID</label>
              <input
                value={form.leadID}
                onChange={(e) => setForm((p) => ({ ...p, leadID: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="campaign-is-favorite"
                type="checkbox"
                checked={form.isFavorite}
                onChange={(e) => setForm((p) => ({ ...p, isFavorite: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="campaign-is-favorite" className="text-[13px] text-foreground">
                Favorite
              </label>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-foreground">Steps</div>
              <div className="text-[12px] text-muted-foreground">Each step is saved as its own group.</div>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  steps: [...p.steps, createEmptyCampaignStep(p.steps.length + 1)],
                }))
              }
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground hover:bg-muted/40"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {form.steps.map((step, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13px] font-semibold text-foreground">Step {idx + 1}</div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))
                    }
                    disabled={form.steps.length === 1}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/40',
                      form.steps.length === 1 && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Type</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(idx, { type: e.target.value })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    >
                      {CAMPAIGN_STEP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                      {!CAMPAIGN_STEP_TYPES.some((t) => t.value === step.type) && step.type ? (
                        <option value={step.type}>{step.type}</option>
                      ) : null}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Order</label>
                    <input
                      value={step.order}
                      onChange={(e) => updateStep(idx, { order: e.target.value })}
                      type="number"
                      min={1}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Step Status</label>
                    <select
                      value={step.status}
                      onChange={(e) => updateStep(idx, { status: e.target.value })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    >
                      {CAMPAIGN_STEP_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Lead Stage</label>
                    <select
                      value={step.leadStage}
                      onChange={(e) => updateStep(idx, { leadStage: e.target.value })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    >
                      {leadStageOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[11px] text-muted-foreground">Scheduled</label>
                    <input
                      value={step.scheduleDateAndTime}
                      onChange={(e) => updateStep(idx, { scheduleDateAndTime: e.target.value })}
                      type="datetime-local"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[11px] text-muted-foreground">Description</label>
                    <input
                      value={step.description}
                      onChange={(e) => updateStep(idx, { description: e.target.value })}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[11px] text-muted-foreground">Script</label>
                    <textarea
                      value={step.script}
                      onChange={(e) => updateStep(idx, { script: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className={cn(
              'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[15px] font-medium text-white hover:brightness-95',
              (!canSave || saving) && 'cursor-not-allowed opacity-60'
            )}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
