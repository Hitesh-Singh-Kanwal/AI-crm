'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Lock, DollarSign, Loader2, CheckCircle2, Eye, Sparkles, Crown, Settings2, ChevronDown, Wrench } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchInput from '@/components/ui/search-input'
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
import LocationSelector from '@/components/shared/LocationSelector'
import WorkingStudioPicker from '@/app/ai-automation/ai-calling/components/WorkingStudioPicker'
import {
  initLocationID,
  hasLocationSelection,
  toLocationPayload,
  locationBadgeLabel,
  workingLocationQueryParam,
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

// ─── Agent model selector (tool-calling text agent) ───────────────────────────

// Temporarily OpenAI-only (cheap / balanced / premium) while only an OpenAI
// key is configured — mirrors TEXT_AGENT_MODELS in aiSettings.model.js.
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
  const [textAgentModel, setTextAgentModel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get('/api/ai-settings')
      .then((r) => {
        if (r.success) {
          setTextAgentModel(r.data?.textAgentModel || 'gpt-5.6-terra')
        }
      })
      .catch(() => {
        setTextAgentModel('gpt-5.6-terra')
      })
      .finally(() => setLoading(false))
  }, [])

  const saveTextAgentModel = async (value) => {
    if (value === textAgentModel) return
    setSaving(true)
    try {
      const result = await api.put('/api/ai-settings', { textAgentModel: value })
      if (result.success) {
        setTextAgentModel(result.data?.textAgentModel || value)
        toast.success({
          title: 'Model updated',
          message: `Text agent will now use ${textAgentModelLabel(result.data?.textAgentModel || value)}`,
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
                : <Wrench className="h-4 w-4 text-primary" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Agent model</p>
              <p className="truncate text-xs text-muted-foreground">
                {loading
                  ? 'Loading…'
                  : <>Tool-calling · <span className="font-medium text-foreground">{textAgentModelLabel(textAgentModel)}</span></>}
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
              Choose which model powers SMS and email replies for this studio.
              Change takes effect on the next conversation.
            </p>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function SmsPromptTab({
  activeView = 'embeddings',
  workingLocationID,
  onWorkingLocationChange,
}) {
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
  const loadGen = useRef(0)

  const locationQuery = workingLocationQueryParam(workingLocationID)
  const viewingStudio = Boolean(locationQuery && locationQuery !== 'all')
  const forLocationPayload = viewingStudio ? { forLocationID: locationQuery } : {}

  const load = useCallback(async ({ silent = false } = {}) => {
    const gen = ++loadGen.current
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (locationQuery) params.set('locationID', locationQuery)
      const qs = params.toString()
      const result = await api.get(`/api/sms-prompt${qs ? `?${qs}` : ''}`)
      if (gen !== loadGen.current) return
      if (result.success) setPrompts(result.data || [])
      else pushToast.error('Error', { description: result.error || 'Failed to load prompts' })
    } catch {
      if (gen !== loadGen.current) return
      pushToast.error('Error', { description: 'Unable to load prompts' })
    } finally {
      if (gen === loadGen.current && !silent) setLoading(false)
    }
  }, [locationQuery])

  useEffect(() => {
    if (activeView !== 'prompt') return
    load()
  }, [activeView, load])

  const handleActivate = async (p) => {
    if (!locationQuery) {
      toast.error({
        title: 'Select a studio',
        message: 'Pick a working studio first, then set the prompt that studio should use.',
      })
      return
    }
    // When a studio is selected, "already active" means active *for this studio*.
    // On All branches, strong highlight is isUsedSomewhere (not raw isActive).
    if (viewingStudio ? p.isEffective : p.isUsedSomewhere) return
    setActivatingId(p._id)
    try {
      const result = await api.post(`/api/sms-prompt/${p._id}/activate`, forLocationPayload)
      if (result.success) {
        toast.success({
          title: 'Activated',
          message: viewingStudio
            ? `"${p.name}" is now the prompt for this studio`
            : `"${p.name}" is now the active prompt`,
        })
        const id = String(p._id)
        setPrompts((prev) =>
          prev.map((row) => {
            const mine = String(row._id) === id
            if (viewingStudio) {
              return {
                ...row,
                isEffective: mine,
                isActive: mine ? true : row.isActive,
              }
            }
            // All branches activate: this row is the org default; clear others' strong badge.
            return {
              ...row,
              isEffective: false,
              isActive: mine ? true : false,
              isUsedSomewhere: mine,
              usedByStudioCount: mine ? row.usedByStudioCount || 1 : 0,
            }
          }),
        )
        await load({ silent: true })
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
            Pick a studio, then set the prompt that studio should use. Texts to that studio&apos;s
            number use only that prompt — other studios keep their own. All branches is the fallback
            when a studio has no prompt of its own.
          </p>
        </div>

        <WorkingStudioPicker
          workingLocationID={workingLocationID}
          onWorkingLocationChange={onWorkingLocationChange}
        />

        {/* Agent setup: architecture, then the model list for whichever is chosen */}
        <div className="mb-6">
          <AgentSetupSelector />
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            className="w-full sm:w-[220px]"
            placeholder="Search prompts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
            {filtered.map((p) => {
              const isUsedHere = viewingStudio
                ? Boolean(p.isEffective)
                : Boolean(p.isUsedSomewhere)
              const usedCount = Number(p.usedByStudioCount) || 0
              const allBranchesLabel =
                usedCount > 1 ? `Used by ${usedCount} studios` : 'Used by 1 studio'
              return (
              <div
                key={p._id}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between',
                  isUsedHere ? 'border-brand/40 bg-brand/5' : 'border-border',
                )}
              >
                {/* Left: name + badges */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isUsedHere ? (
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
                      {isUsedHere ? (
                        <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          {viewingStudio ? 'Used for this studio' : allBranchesLabel}
                        </span>
                      ) : p.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {viewingStudio ? 'Active elsewhere' : 'Eligible fallback'}
                        </span>
                      ) : null}
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
                  {!isUsedHere && (
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
              )
            })}
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
