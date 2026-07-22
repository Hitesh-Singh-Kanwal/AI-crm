'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Info, Plus, Trash2 } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { getEffectiveBranch, isSuperAdmin } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ORG_SCOPE = '__org__'
const MIN_FOLLOWUPS = 1
const MAX_FOLLOWUPS = 10

function emptyFollowup(overrides = {}) {
  return {
    intervalHours: '1',
    intervalMinutes: '0',
    useAiMessage: true,
    message: '',
    ...overrides,
  }
}

const DEFAULT_FOLLOWUPS = [
  emptyFollowup({ intervalHours: '1', intervalMinutes: '0' }),
  emptyFollowup({ intervalHours: '2', intervalMinutes: '30' }),
  emptyFollowup({ intervalHours: '5', intervalMinutes: '0' }),
]

function followupFromApi(item) {
  const message = item?.message ?? null
  const hasCustomMessage = typeof message === 'string' && message.trim().length > 0
  return emptyFollowup({
    intervalHours: String(item?.intervalHours ?? 1),
    intervalMinutes: String(item?.intervalMinutes ?? 0),
    useAiMessage: !hasCustomMessage,
    message: hasCustomMessage ? message : '',
  })
}

/** Normalize API payload — supports new `followups[]` and legacy flat fields. */
function settingsToForm(raw) {
  const agentFollowupEnabled = raw?.agentFollowupEnabled !== false

  if (Array.isArray(raw?.followups) && raw.followups.length > 0) {
    return {
      agentFollowupEnabled,
      followups: raw.followups.map(followupFromApi),
    }
  }

  // Legacy shape → single follow-up entry so the form still loads.
  if (raw && (raw.followupCount != null || raw.followupIntervalHours != null)) {
    const count = Math.min(
      MAX_FOLLOWUPS,
      Math.max(MIN_FOLLOWUPS, Number(raw.followupCount) || 1)
    )
    const hours = String(raw.followupIntervalHours ?? 1)
    const minutes = String(raw.followupIntervalMinutes ?? 0)
    const message = raw.followupMessage ?? null
    const hasCustomMessage = typeof message === 'string' && message.trim().length > 0
    return {
      agentFollowupEnabled,
      followups: Array.from({ length: count }, () =>
        emptyFollowup({
          intervalHours: hours,
          intervalMinutes: minutes,
          useAiMessage: !hasCustomMessage,
          message: hasCustomMessage ? message : '',
        })
      ),
    }
  }

  return {
    agentFollowupEnabled: true,
    followups: DEFAULT_FOLLOWUPS.map((f) => ({ ...f })),
  }
}

function formatIntervalLabel(hours, minutes) {
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.length ? parts.join(' ') : '0m'
}

function summarizeFollowups(item) {
  if (item.agentFollowupEnabled === false) return 'Follow-ups disabled'
  const list = Array.isArray(item.followups) ? item.followups : []
  if (list.length === 0) {
    if (item.followupCount != null) {
      return `${item.followupCount} follow-ups every ${formatIntervalLabel(
        item.followupIntervalHours ?? 0,
        item.followupIntervalMinutes ?? 0
      )}`
    }
    return 'No follow-ups configured'
  }
  return `${list.length} follow-up${list.length === 1 ? '' : 's'}`
}

export default function FollowupSettingsPage() {
  const toast = useToast()
  const superAdmin = isSuperAdmin()
  const effectiveBranch = getEffectiveBranch()

  const [locations, setLocations] = useState([])
  const [scope, setScope] = useState(() => {
    if (superAdmin) return ORG_SCOPE
    return effectiveBranch || ORG_SCOPE
  })
  const [form, setForm] = useState(() => settingsToForm(null))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locationOverrides, setLocationOverrides] = useState([])

  const scopeOptions = useMemo(() => {
    const options = [{ value: ORG_SCOPE, label: 'Organization default' }]
    locations.forEach((loc) => {
      options.push({ value: String(loc._id), label: loc.name || 'Unnamed location' })
    })
    return options
  }, [locations])

  const isLocationScope = scope !== ORG_SCOPE

  const activeScopeLabel = useMemo(() => {
    if (scope === ORG_SCOPE) return 'Organization default'
    return locations.find((loc) => String(loc._id) === String(scope))?.name || 'Selected location'
  }, [scope, locations])

  // Enable/disable is per-location only — never blocks other locations from org default view.
  const scheduleDisabled = isLocationScope && form.agentFollowupEnabled === false

  const loadLocations = useCallback(async () => {
    const result = await api.get('/api/location?limit=200')
    if (!result.success) return []
    const locs = (result.data || []).filter(
      (loc) => loc.status?.toLowerCase() === 'active' || !loc.status
    )
    setLocations(locs)
    return locs
  }, [])

  const applySettings = useCallback((settings) => {
    setForm(settingsToForm(settings))
  }, [])

  const loadSettings = useCallback(
    async (nextScope) => {
      setLoading(true)
      try {
        const isOrgScope = nextScope === ORG_SCOPE
        const url = isOrgScope
          ? '/api/followup-settings'
          : `/api/followup-settings?locationID=${encodeURIComponent(nextScope)}`

        const result = await api.get(url)
        if (!result.success) {
          toast.error({
            title: 'Unable to load settings',
            message: result.error || result.message || 'Please try again.',
          })
          applySettings(null)
          return
        }

        const data = result.data
        if (Array.isArray(data)) {
          const orgConfig = data.find((item) => item.locationID == null)
          const overrides = data.filter((item) => item.locationID != null)
          setLocationOverrides(overrides)
          applySettings(orgConfig)
        } else {
          setLocationOverrides([])
          applySettings(data)
        }
      } catch {
        toast.error({ title: 'Error', message: 'Failed to load follow-up settings.' })
        applySettings(null)
      } finally {
        setLoading(false)
      }
    },
    [applySettings, toast]
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      const locs = await loadLocations()
      if (cancelled) return

      let initialScope = scope
      if (!superAdmin) {
        const branch = getEffectiveBranch()
        if (branch && locs.some((loc) => String(loc._id) === String(branch))) {
          initialScope = branch
        } else if (locs.length === 1) {
          initialScope = String(locs[0]._id)
        } else {
          initialScope = ORG_SCOPE
        }
        setScope(initialScope)
      }

      await loadSettings(initialScope)
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScopeChange(nextScope) {
    setScope(nextScope)
    await loadSettings(nextScope)
  }

  function updateFollowup(index, patch) {
    setForm((prev) => ({
      ...prev,
      followups: prev.followups.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function addFollowup() {
    if (form.followups.length >= MAX_FOLLOWUPS) {
      toast.error({ title: 'Limit reached', message: `You can add up to ${MAX_FOLLOWUPS} follow-ups.` })
      return
    }
    setForm((prev) => ({
      ...prev,
      followups: [...prev.followups, emptyFollowup()],
    }))
  }

  function removeFollowup(index) {
    if (form.followups.length <= MIN_FOLLOWUPS) {
      toast.error({ title: 'Required', message: 'Keep at least one follow-up step.' })
      return
    }
    setForm((prev) => ({
      ...prev,
      followups: prev.followups.filter((_, i) => i !== index),
    }))
  }

  function validateForm() {
    // Location can be saved with follow-ups turned off for that location only.
    if (isLocationScope && form.agentFollowupEnabled === false) return true

    if (!Array.isArray(form.followups) || form.followups.length < MIN_FOLLOWUPS) {
      toast.error({ title: 'Validation', message: 'Add at least one follow-up.' })
      return false
    }
    if (form.followups.length > MAX_FOLLOWUPS) {
      toast.error({
        title: 'Validation',
        message: `You can configure at most ${MAX_FOLLOWUPS} follow-ups.`,
      })
      return false
    }

    for (let i = 0; i < form.followups.length; i++) {
      const step = form.followups[i]
      const hours = Number(step.intervalHours)
      const minutes = Number(step.intervalMinutes)
      const label = `Follow-up ${i + 1}`

      if (!Number.isInteger(hours) || hours < 0 || hours > 72) {
        toast.error({ title: 'Validation', message: `${label}: hours must be between 0 and 72.` })
        return false
      }
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        toast.error({ title: 'Validation', message: `${label}: minutes must be between 0 and 59.` })
        return false
      }
      if (hours === 0 && minutes === 0) {
        toast.error({
          title: 'Validation',
          message: `${label}: interval must be greater than zero.`,
        })
        return false
      }
      if (!step.useAiMessage && !String(step.message || '').trim()) {
        toast.error({
          title: 'Validation',
          message: `${label}: enter a message or enable AI-generated.`,
        })
        return false
      }
    }

    return true
  }

  async function handleSave() {
    if (!validateForm()) return

    setSaving(true)
    try {
      const body = {
        followups: form.followups.map((step) => ({
          intervalHours: Number(step.intervalHours),
          intervalMinutes: Number(step.intervalMinutes),
          message: step.useAiMessage ? null : String(step.message).trim(),
        })),
      }

      if (isLocationScope) {
        // Toggle applies only to this location — other locations are unchanged.
        body.locationID = scope
        body.agentFollowupEnabled = form.agentFollowupEnabled !== false
      }

      const result = await api.put('/api/followup-settings', body)
      if (result.success) {
        toast.success({
          title: 'Saved',
          message: isLocationScope
            ? `Follow-up settings updated for ${activeScopeLabel}.`
            : 'Organization default follow-up schedule updated.',
        })
        await loadSettings(scope)
      } else {
        toast.error({
          title: 'Unable to save',
          message: result.error || result.message || 'Please try again.',
        })
      }
    } catch {
      toast.error({ title: 'Error', message: 'Failed to save follow-up settings.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout
      title="Follow-up Settings"
      subtitle="Configure how the AI agent follows up with leads who haven't replied."
    >
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follow-up schedule</CardTitle>
            <CardDescription>
              Add each follow-up with its own wait interval and message. Location-specific settings
              override the organization default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {superAdmin ? (
              <div className="space-y-2">
                <label htmlFor="followup-scope" className="text-sm font-medium">
                  Applies to
                </label>
                <Select
                  id="followup-scope"
                  value={scope}
                  onChange={(e) => handleScopeChange(e.target.value)}
                  disabled={loading || saving}
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Organization default sets the schedule template. Pick a location to turn follow-ups
                  on or off for that location only.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <span className="font-medium text-foreground">Applies to: </span>
                <span className="text-muted-foreground">{activeScopeLabel}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings…
              </div>
            ) : (
              <>
                {isLocationScope ? (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                    <div>
                      <div className="text-sm font-medium">
                        Enable agent follow-ups for {activeScopeLabel}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Location-only switch. When off, follow-ups stop for leads at{' '}
                        <span className="font-medium text-foreground">{activeScopeLabel}</span> —
                        other locations are not affected. Individual leads can still opt out on their
                        profile.
                      </p>
                    </div>
                    <Switch
                      checked={form.agentFollowupEnabled !== false}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, agentFollowupEnabled: checked }))
                      }
                      disabled={saving}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                    Select a location above to enable or disable follow-ups for that location only.
                    Saving here updates the organization default schedule.
                  </div>
                )}

                <div
                  className={cn(
                    'space-y-4',
                    scheduleDisabled && 'pointer-events-none opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Follow-up steps</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Each step waits its interval after the previous message, then sends.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFollowup}
                      disabled={saving || scheduleDisabled || form.followups.length >= MAX_FOLLOWUPS}
                    >
                      <Plus className="h-4 w-4" />
                      Add follow-up
                    </Button>
                  </div>

                  {form.followups.map((step, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">
                          Follow-up {index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFollowup(index)}
                          disabled={
                            saving || scheduleDisabled || form.followups.length <= MIN_FOLLOWUPS
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor={`followup-hours-${index}`}
                            className="text-sm font-medium"
                          >
                            Wait (hours)
                          </label>
                          <Input
                            id={`followup-hours-${index}`}
                            type="number"
                            min={0}
                            max={72}
                            value={step.intervalHours}
                            onChange={(e) =>
                              updateFollowup(index, { intervalHours: e.target.value })
                            }
                            disabled={saving || scheduleDisabled}
                          />
                          <p className="text-xs text-muted-foreground">0–72 hours</p>
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor={`followup-minutes-${index}`}
                            className="text-sm font-medium"
                          >
                            Wait (minutes)
                          </label>
                          <Input
                            id={`followup-minutes-${index}`}
                            type="number"
                            min={0}
                            max={59}
                            value={step.intervalMinutes}
                            onChange={(e) =>
                              updateFollowup(index, { intervalMinutes: e.target.value })
                            }
                            disabled={saving || scheduleDisabled}
                          />
                          <p className="text-xs text-muted-foreground">0–59 minutes</p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium">AI-generated message</div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              When on, the AI writes this follow-up. When off, use a fixed message.
                            </p>
                          </div>
                          <Switch
                            checked={step.useAiMessage}
                            onCheckedChange={(checked) =>
                              updateFollowup(index, {
                                useAiMessage: checked,
                                message: checked ? '' : step.message,
                              })
                            }
                            disabled={saving || scheduleDisabled}
                          />
                        </div>

                        {!step.useAiMessage ? (
                          <div className="space-y-2">
                            <label
                              htmlFor={`followup-message-${index}`}
                              className="text-sm font-medium"
                            >
                              Fixed message
                            </label>
                            <Textarea
                              id={`followup-message-${index}`}
                              rows={3}
                              value={step.message}
                              onChange={(e) =>
                                updateFollowup(index, { message: e.target.value })
                              }
                              placeholder="Hey! Just checking in — are you still interested?"
                              disabled={saving || scheduleDisabled}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} variant="gradient">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save settings'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {superAdmin && locationOverrides.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location overrides</CardTitle>
              <CardDescription>
                These locations have custom follow-up settings that differ from the organization
                default.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {locationOverrides.map((item) => {
                  const locationName =
                    locations.find((loc) => String(loc._id) === String(item.locationID))?.name ||
                    'Unknown location'
                  return (
                    <li key={String(item.locationID)}>
                      <button
                        type="button"
                        onClick={() => handleScopeChange(String(item.locationID))}
                        className={cn(
                          'flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                          String(scope) === String(item.locationID) && 'bg-muted/50'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{locationName}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {summarizeFollowups(item)}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[color:var(--studio-primary)]">
                          Edit
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p>
              Follow-ups only send when the location switch is on and the lead&apos;s{' '}
              <span className="font-medium text-foreground">Agent follow-up</span> toggle is on.
            </p>
            <p>
              Turn off a location here to pause follow-ups for that studio only. Turn off the lead
              toggle to opt out one person.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
