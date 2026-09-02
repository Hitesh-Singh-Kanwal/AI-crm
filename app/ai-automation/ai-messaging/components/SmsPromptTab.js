'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Lock, Search, Brain, Zap, DollarSign, Loader2, CheckCircle2, Eye, Sparkles, Crown, Settings2, ChevronDown, Tags, Wrench } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast, toast as pushToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import {
  initLocationID,
  hasLocationSelection,
  toLocationPayload,
  locationBadgeLabel,
  workingLocationQueryParam,
  normalizeWorkingLocation,
} from '@/app/ai-automation/ai-calling/components/locationScope'

// ─── Create / Edit dialog ────────────────────────────────────────────────────

function PromptDialog({ open, onClose, prompt, onRefresh, defaultLocationID }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', systemPrompt: '', locationID: [] })

  useEffect(() => {
    if (!open) return
    setForm({
      name: prompt?.name || '',
      systemPrompt: prompt?.systemPrompt || '',
      locationID: prompt ? initLocationID(prompt) : (defaultLocationID || []),
    })
  }, [open, prompt, defaultLocationID])

  const isEdit = !!prompt

  async function save() {
    if (!form.name.trim()) {
      toast.error({ title: 'Validation', message: 'Name is required' })
      return
    }
    if (!form.systemPrompt.trim()) {
      toast.error({ title: 'Validation', message: 'System prompt is required' })
      return
    }
    if (!hasLocationSelection(form.locationID)) {
      toast.error({ title: 'Validation', message: 'Select a studio or All branches' })
      return
    }
    setLoading(true)
    try {
      const body = {
        name: form.name.trim(),
        systemPrompt: form.systemPrompt.trim(),
        ...toLocationPayload(form.locationID),
      }
      const result = isEdit
        ? await api.put(`/api/sms-prompt/${prompt._id}`, body)
        : await api.post('/api/sms-prompt', body)

      if (result.success) {
        toast.success({
          title: isEdit ? 'Updated' : 'Created',
          message: `Prompt ${isEdit ? 'updated' : 'created'} successfully`,
        })
        onRefresh?.()
        onClose?.()
      } else {
        toast.error({
          title: 'Error',
          message: result.error || result.message || 'Unable to save prompt',
        })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Prompt' : 'New Prompt'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the system prompt for the AI SMS agent.'
              : 'Create a new system prompt for the AI SMS agent.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Studio scope *</label>
            <LocationSelector
              value={form.locationID}
              onChange={(id) => setForm((p) => ({ ...p, locationID: id }))}
              multiple
              allowAllBranches
              placeholder="Select studio(s)…"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. sales-v2"
            />
          </div>

          {/* System prompt */}
          <div>
            <label className="mb-1 block text-sm font-medium">System Prompt *</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Define the agent&apos;s persona, qualification steps, sales rules, and tone — all in one
              place. Studio facts are pulled from the{' '}
              <span className="font-medium text-foreground">Knowledge Base PDF</span> and conversation
              examples from the{' '}
              <span className="font-medium text-foreground">Conversational Playbook PDF</span>. Both
              are automatically injected as context when the agent replies.
            </p>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
              rows={22}
              placeholder={`You are Kira, a warm and friendly sales representative for Dance Studio America.\n\nNever reveal you are AI. Keep replies short and conversational.\n\nQUALIFICATION\nCollect the following before recommending a lesson:\n1. Lead's name\n2. Their reason for wanting dance lessons\n...\n\nSALES\nOnce qualified, recommend the introductory private lesson ($49 / 45 min) first.\n...`}
              className="resize-y font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={save} disabled={loading} variant="gradient">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View (read-only) dialog ─────────────────────────────────────────────────

function ViewDialog({ open, onClose, prompt }) {
  if (!prompt) return null
  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {prompt.isLocked && <Lock className="h-4 w-4 text-warning" />}
            {prompt.name}
          </DialogTitle>
          <DialogDescription>System prompt configuration</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="mb-1.5 text-sm font-semibold text-foreground">System Prompt</h4>
          {(prompt.systemPrompt || '').trim() ? (
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm text-foreground">
              {prompt.systemPrompt}
            </pre>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm italic text-muted-foreground">
              Not set
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Model selector ───────────────────────────────────────────────────────────

const LEGACY_SMS_MODEL_LABELS = {
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
}

const SMS_MODELS = [
  {
    value: 'gpt-4.1',
    label: 'GPT-4.1',
    badge: 'Recommended',
    badgeClass: 'bg-success/10 text-success',
    icon: Brain,
    iconClass: 'text-success',
    price: '$2 / $8 per 1M tokens',
    perText: '~$0.009 / typical text',
    speed: 'Replies instantly',
    description: 'Best everyday choice for booking texts. Follows the studio prompt well and catches inconsistent details without slowing every reply.',
    pros: [
      'Accurate on booking details before offering times',
      'Handles constraints and objections naturally',
      'Instant replies — good for live texting',
    ],
    cons: [
      'Not the cheapest option',
      'Won’t pause to double-check the rarest confusing messages',
    ],
  },
  {
    value: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    badge: 'Lower cost',
    badgeClass: 'bg-info/10 text-info',
    icon: Zap,
    iconClass: 'text-info',
    price: '$0.40 / $1.60 per 1M tokens',
    perText: '~$0.002 / typical text',
    speed: 'Replies instantly',
    description: 'Lower-cost option for straightforward booking chats. Fast when the request is clear; weaker when details conflict.',
    pros: [
      'Much cheaper at high text volume',
      'Follows the studio prompt on simple chats',
      'Instant replies',
    ],
    cons: [
      'More likely to miss inconsistent details',
      'Weaker on complex objections',
    ],
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    badge: 'Standard',
    badgeClass: 'bg-muted text-muted-foreground',
    icon: Brain,
    iconClass: 'text-muted-foreground',
    price: '$2.50 / $10 per 1M tokens',
    perText: '~$0.011 / typical text',
    speed: 'Replies instantly',
    description: 'The model already running for most studios. Keep it while you compare, or switch to GPT-4.1 for similar speed at a lower cost.',
    pros: [
      'Already in production — no surprise change in tone',
      'Instant replies',
    ],
    cons: [
      'Can miss inconsistent booking details',
      'Costs more than GPT-4.1 for similar quality',
    ],
  },
  {
    value: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    badge: 'Checks details',
    badgeClass: 'bg-primary/10 text-primary',
    icon: Sparkles,
    iconClass: 'text-primary',
    price: '$2 / $12 per 1M tokens',
    perText: '~$0.013 / typical text',
    speed: 'Pauses 1–3 seconds to check',
    description: 'Newer model that thinks briefly before it replies. Strong option if you want extra care on messy requests without paying for Sol.',
    pros: [
      'Stronger at checking details before offering times',
      'Better on messy or conflicting requests',
      'Cost is close to GPT-4.1',
    ],
    cons: [
      'Replies take 1–3 seconds longer',
      'A little more expensive than GPT-4.1',
    ],
  },
  {
    value: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    badge: 'Cheapest new model',
    badgeClass: 'bg-warning/10 text-warning',
    icon: DollarSign,
    iconClass: 'text-warning',
    price: '$0.20 / $1.20 per 1M tokens',
    perText: '~$0.001 / typical text',
    speed: 'Usually fast',
    description: 'Cheapest newer model. Fine for simple chats. Not the best choice if booking accuracy is the priority.',
    pros: [
      'Lowest cost if you send a lot of texts',
      'Fast among the newer models',
    ],
    cons: [
      'More likely to miss details or sound scripted',
      'Not recommended as the main booking agent',
    ],
  },
  {
    value: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    badge: 'Highest quality',
    badgeClass: 'bg-brand/10 text-brand',
    icon: Crown,
    iconClass: 'text-brand',
    price: '$5 / $30 per 1M tokens',
    perText: '~$0.029 / typical text',
    speed: 'Slowest replies here',
    description: 'Strongest model on this list. Use it for hard conversations. Too expensive and slow for everyday studio texting.',
    pros: [
      'Best at clarifying unclear requests before booking',
      'Best at tricky objections',
    ],
    cons: [
      'Most expensive card on this list',
      'Slowest replies — not a good everyday default',
    ],
  },
]

function modelLabel(value) {
  return SMS_MODELS.find((m) => m.value === value)?.label || LEGACY_SMS_MODEL_LABELS[value] || value
}

// ─── Agent setup: architecture (step 1) + model for that architecture (step 2) ──

// Temporarily OpenAI-only (cheap / balanced / premium) while only an OpenAI
// key is configured — mirrors TEXT_AGENT_MODELS in aiSettings.model.js on the
// backend. claude-sonnet-5 and gemini-3.6-flash are already fully wired
// server-side; add them back here once Anthropic/Google keys exist.
const TEXT_AGENT_MODELS = [
  {
    value: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    provider: 'OpenAI',
    icon: DollarSign,
    iconClass: 'text-warning',
    price: '$0.20 / $1.20 per 1M tokens',
  },
  {
    value: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    provider: 'OpenAI',
    icon: Sparkles,
    iconClass: 'text-primary',
    price: '$2 / $12 per 1M tokens',
  },
  {
    value: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    icon: Crown,
    iconClass: 'text-brand',
    price: '$5 / $30 per 1M tokens',
  },
]

function textAgentModelLabel(value) {
  return TEXT_AGENT_MODELS.find((m) => m.value === value)?.label || value
}

function AgentSetupSelector() {
  const toast = useToast()
  const [textAgentMode, setTextAgentMode] = useState(null)
  const [smsModel, setSmsModel] = useState(null)
  const [textAgentModel, setTextAgentModel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get('/api/ai-settings')
      .then((r) => {
        if (r.success) {
          setTextAgentMode(r.data?.textAgentMode || 'legacy_tags')
          setSmsModel(r.data?.smsModel || 'gpt-4o')
          setTextAgentModel(r.data?.textAgentModel || 'gpt-5.6-terra')
        }
      })
      .catch(() => {
        setTextAgentMode('legacy_tags')
        setSmsModel('gpt-4o')
        setTextAgentModel('gpt-5.6-terra')
      })
      .finally(() => setLoading(false))
  }, [])

  const saveMode = async (value) => {
    if (value === textAgentMode) return
    setSaving(true)
    try {
      const result = await api.put('/api/ai-settings', { textAgentMode: value })
      if (result.success) {
        setTextAgentMode(result.data?.textAgentMode || value)
        toast.success({
          title: 'Agent architecture updated',
          message: value === 'tool_calling'
            ? 'This studio now runs the new tool-calling agent.'
            : 'This studio is back on the old tag-based agent.',
        })
      } else {
        toast.error({ title: 'Error', message: result.error || 'Unable to update agent architecture' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setSaving(false)
    }
  }

  const saveSmsModel = async (value) => {
    if (value === smsModel) return
    setSaving(true)
    try {
      const result = await api.put('/api/ai-settings', { smsModel: value })
      if (result.success) {
        setSmsModel(result.data?.smsModel || value)
        toast.success({
          title: 'Model updated',
          message: `Old agent will now use ${modelLabel(result.data?.smsModel || value)}`,
        })
      } else {
        toast.error({ title: 'Error', message: result.error || 'Unable to update model' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setSaving(false)
    }
  }

  const saveTextAgentModel = async (value) => {
    if (value === textAgentModel) return
    setSaving(true)
    try {
      const result = await api.put('/api/ai-settings', { textAgentModel: value })
      if (result.success) {
        setTextAgentModel(result.data?.textAgentModel || value)
        toast.success({
          title: 'Model updated',
          message: `New agent will now use ${textAgentModelLabel(result.data?.textAgentModel || value)}`,
        })
      } else {
        toast.error({ title: 'Error', message: result.error || 'Unable to update model' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setSaving(false)
    }
  }

  const isToolCalling = textAgentMode === 'tool_calling'
  const smsModelMeta = SMS_MODELS.find((m) => m.value === smsModel)
  const smsModelIsUnlisted = Boolean(smsModel) && !smsModelMeta && !loading

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/80 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              open ? 'bg-primary/10' : 'bg-muted',
            )}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                : isToolCalling
                  ? <Wrench className="h-4 w-4 text-primary" />
                  : <Tags className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground">Agent setup</p>
                {isToolCalling && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Testing
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {loading
                  ? 'Loading…'
                  : isToolCalling
                    ? <>New (tool-calling) · <span className="font-medium text-foreground">{textAgentModelLabel(textAgentModel)}</span></>
                    : <>Old (legacy, tag-based) · <span className="font-medium text-foreground">{modelLabel(smsModel)}</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 rounded-lg px-3 text-sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <Settings2 className="h-4 w-4" />
              {open ? 'Hide settings' : 'Settings'}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 border-t border-border/80 pt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              Pick the architecture first — that decides which model list applies below it.
              Change takes effect on this studio&apos;s next conversation. Use this to compare
              the two before deciding which to keep.
            </p>

            {/* Step 1: architecture */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 · Architecture
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveMode('legacy_tags')}
                className={cn(
                  'group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  textAgentMode === 'legacy_tags'
                    ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                  saving && 'cursor-not-allowed opacity-60',
                )}
              >
                {textAgentMode === 'legacy_tags' && (
                  <span className="absolute right-3 top-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </span>
                )}
                <div className="flex items-center gap-2 pr-6">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Old (legacy, tag-based)</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Current production default. Booking, payment, reschedule, and cancel actions are
                  driven by rules and text tags in the prompt.
                </p>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveMode('tool_calling')}
                className={cn(
                  'group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  textAgentMode === 'tool_calling'
                    ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                  saving && 'cursor-not-allowed opacity-60',
                )}
              >
                {textAgentMode === 'tool_calling' && (
                  <span className="absolute right-3 top-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </span>
                )}
                <div className="flex items-center gap-2 pr-6">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">New (tool-calling)</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Model owns the conversation and calls tools only to check availability, send
                  payment links, reschedule, or cancel.
                </p>
              </button>
            </div>

            {/* Step 2: model for whichever architecture is selected above */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Step 2 · Model for the {isToolCalling ? 'new' : 'old'} agent
              </p>

              {isToolCalling ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {TEXT_AGENT_MODELS.map(({ value, label, provider, icon: Icon, iconClass, price }) => {
                    const isSelected = textAgentModel === value
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={saving}
                        onClick={() => saveTextAgentModel(value)}
                        className={cn(
                          'group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isSelected
                            ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/30'
                            : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                          saving && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </span>
                        )}
                        <div className="flex items-center gap-2 pr-6">
                          <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : iconClass)} />
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{provider}</p>
                        <p className="text-[11px] font-medium text-foreground">{price}</p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  {smsModelIsUnlisted && (
                    <p className="mb-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
                      This studio is still on <span className="font-medium text-foreground">{modelLabel(smsModel)}</span> from
                      an older list. Choose a model below to switch.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {SMS_MODELS.map(({
                      value, label, badge, badgeClass, description, icon: Icon, iconClass,
                      price, perText, speed, pros, cons,
                    }) => {
                      const isSelected = smsModel === value
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={saving}
                          onClick={() => saveSmsModel(value)}
                          className={cn(
                            'group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isSelected
                              ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/30'
                              : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                            saving && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          {isSelected && (
                            <span className="absolute right-3 top-3">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </span>
                          )}
                          <div className="flex items-start gap-3 pr-6">
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              isSelected ? 'bg-primary/10' : 'bg-muted',
                            )}>
                              <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : iconClass)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-semibold text-foreground">{label}</span>
                                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', badgeClass)}>
                                  {badge}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] font-medium text-foreground">{price}</p>
                              <p className="text-[11px] text-muted-foreground">{perText} · {speed}</p>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-success">Pros</p>
                              <ul className="mt-1 space-y-0.5">
                                {pros.map((item) => (
                                  <li key={item} className="text-[11px] leading-snug text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-warning">Cons</p>
                              <ul className="mt-1 space-y-0.5">
                                {cons.map((item) => (
                                  <li key={item} className="text-[11px] leading-snug text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Prices are OpenAI list rates (input / output per 1M tokens). Typical text ≈ 4,000 input + 100 output tokens.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function SmsPromptTab({ activeView = 'embeddings' }) {
  const toast = useToast()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activatingId, setActivatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [viewPrompt, setViewPrompt] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [workingLocationID, setWorkingLocationID] = useState([])

  const locationQuery = workingLocationQueryParam(workingLocationID)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (locationQuery) params.set('locationID', locationQuery)
      const qs = params.toString()
      const result = await api.get(`/api/sms-prompt${qs ? `?${qs}` : ''}`)
      if (result.success) setPrompts(result.data || [])
      else pushToast.error('Error', { description: result.error || 'Failed to load prompts' })
    } catch {
      pushToast.error('Error', { description: 'Unable to load prompts' })
    } finally {
      setLoading(false)
    }
  }, [locationQuery])

  useEffect(() => {
    if (activeView !== 'prompt') return
    load()
  }, [activeView, load])

  const handleActivate = async (p) => {
    if (p.isActive) return
    setActivatingId(p._id)
    try {
      const result = await api.post(`/api/sms-prompt/${p._id}/activate`, {})
      if (result.success) {
        toast.success({ title: 'Activated', message: `"${p.name}" is now the active prompt` })
        load()
      } else {
        toast.error({ title: 'Error', message: result.error || 'Unable to activate prompt' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setActivatingId(null)
    }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete prompt "${p.name}"?`)) return
    setDeletingId(p._id)
    try {
      const result = await api.delete(`/api/sms-prompt/${p._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Prompt deleted' })
        load()
      } else {
        toast.error({ title: 'Error', message: result.error || result.message || 'Unable to delete prompt' })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = prompts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <TabsContent value="prompt" className="mt-6 flex-1 min-h-0 flex flex-col gap-6 outline-none">
      <div className="flex min-h-full w-full flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">AI SMS prompts</h2>
            <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-brand">
              {prompts.length} prompts
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            One active prompt per studio scope. Texts to a studio number use that studio&apos;s active
            prompt (or All branches). Knowledge Base and Playbook PDFs are injected per studio too.
          </p>
        </div>

        <div className="mb-4 max-w-md">
          <label className="mb-1.5 block text-sm font-medium">Working studio</label>
          <LocationSelector
            value={
              workingLocationID === ALL_BRANCHES_VALUE
                ? ALL_BRANCHES_VALUE
                : Array.isArray(workingLocationID) && workingLocationID.length
                  ? workingLocationID[0]
                  : null
            }
            onChange={(id) => setWorkingLocationID(normalizeWorkingLocation(id))}
            multiple={false}
            allowAllBranches
            showAllOption={false}
            placeholder="Filter by studio…"
          />
        </div>

        {/* Agent setup: architecture, then the model list for whichever is chosen */}
        <div className="mb-6">
          <AgentSetupSelector />
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg bg-background pl-9 text-sm"
            />
          </div>
          <Button
            variant="gradient"
            className="h-9 shrink-0 gap-2 rounded-lg px-4 text-sm font-medium"
            onClick={() => {
              setEditingPrompt(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New prompt
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading prompts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No prompts found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((p) => (
              <div
                key={p._id}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between',
                  p.isActive ? 'border-brand/40 bg-brand/5' : 'border-border',
                )}
              >
                {/* Left: name + badges */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {p.isActive ? (
                      <CheckCircle className="h-5 w-5 text-brand" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      {p.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                      {p.isActive && (
                        <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          Active
                        </span>
                      )}
                      {locationBadgeLabel(p) && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {locationBadgeLabel(p)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Created {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {/* View */}
                  <Button
                    variant="outline"
                    size="sm"
                    title="View prompt"
                    className="h-8 w-8 p-0"
                    disabled={viewLoading}
                    onClick={async () => {
                      setViewLoading(true)
                      try {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) {
                          setViewPrompt(result.data)
                          setViewOpen(true)
                        } else {
                          toast.error({ title: 'Error', message: 'Unable to load prompt' })
                        }
                      } finally {
                        setViewLoading(false)
                      }
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  {/* Edit */}
                  {!p.isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      title="Edit"
                      className="h-8 w-8 p-0"
                      onClick={async () => {
                        const result = await api.get(`/api/sms-prompt/${p._id}`)
                        if (result.success) {
                          setEditingPrompt(result.data)
                          setDialogOpen(true)
                        } else {
                          toast.error({ title: 'Error', message: 'Unable to load prompt' })
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Set active — keep text */}
                  {!p.isActive && (
                    <Button
                      size="sm"
                      variant="gradient"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleActivate(p)}
                      disabled={activatingId === p._id}
                    >
                      {activatingId === p._id ? 'Activating…' : 'Set active'}
                    </Button>
                  )}

                  {/* Delete */}
                  {!p.isLocked && !p.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      title="Delete"
                      className="h-8 w-8 p-0 text-destructive hover:border-destructive/20 hover:text-destructive"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p._id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PromptDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        prompt={editingPrompt}
        onRefresh={load}
        defaultLocationID={workingLocationID}
      />
      <ViewDialog open={viewOpen} onClose={() => setViewOpen(false)} prompt={viewPrompt} />
    </TabsContent>
  )
}
