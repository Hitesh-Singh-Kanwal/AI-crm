'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Info } from 'lucide-react'
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

const DEFAULT_SETTINGS = {
  followupCount: 3,
  followupIntervalHours: 1,
  followupIntervalMinutes: 0,
  followupMessage: null,
  agentFollowupEnabled: true,
}

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  return {
    followupCount: raw.followupCount ?? DEFAULT_SETTINGS.followupCount,
    followupIntervalHours: raw.followupIntervalHours ?? DEFAULT_SETTINGS.followupIntervalHours,
    followupIntervalMinutes: raw.followupIntervalMinutes ?? DEFAULT_SETTINGS.followupIntervalMinutes,
    followupMessage: raw.followupMessage ?? null,
    agentFollowupEnabled: raw.agentFollowupEnabled !== false,
  }
}

function settingsToForm(settings) {
  const normalized = normalizeSettings(settings)
  const hasCustomMessage =
    typeof normalized.followupMessage === 'string' && normalized.followupMessage.trim().length > 0
  return {
    followupCount: String(normalized.followupCount),
    followupIntervalHours: String(normalized.followupIntervalHours),
    followupIntervalMinutes: String(normalized.followupIntervalMinutes),
    useAiMessage: !hasCustomMessage,
    followupMessage: hasCustomMessage ? normalized.followupMessage : '',
    agentFollowupEnabled: normalized.agentFollowupEnabled,
  }
}

function formatIntervalLabel(hours, minutes) {
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.length ? parts.join(' ') : '0m'
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
  const [form, setForm] = useState(() => settingsToForm(DEFAULT_SETTINGS))
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

  const activeScopeLabel = useMemo(() => {
    if (scope === ORG_SCOPE) return 'Organization default'
    return locations.find((loc) => String(loc._id) === String(scope))?.name || 'Selected location'
  }, [scope, locations])

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
          applySettings(DEFAULT_SETTINGS)
          return
        }

        const data = result.data
        if (Array.isArray(data)) {
          const orgConfig = data.find((item) => item.locationID == null)
          const overrides = data.filter((item) => item.locationID != null)
          setLocationOverrides(overrides)
          applySettings(orgConfig || DEFAULT_SETTINGS)
        } else {
          setLocationOverrides([])
          applySettings(data)
        }
      } catch {
        toast.error({ title: 'Error', message: 'Failed to load follow-up settings.' })
        applySettings(DEFAULT_SETTINGS)
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

  function validateForm() {
    // Allow saving with only the master switch off (e.g. disable a whole location).
    if (form.agentFollowupEnabled === false) return true

    const count = Number(form.followupCount)
    const hours = Number(form.followupIntervalHours)
    const minutes = Number(form.followupIntervalMinutes)

    if (!Number.isInteger(count) || count < 1 || count > 10) {
      toast.error({ title: 'Validation', message: 'Follow-up count must be between 1 and 10.' })
      return false
    }
    if (!Number.isInteger(hours) || hours < 0 || hours > 72) {
      toast.error({ title: 'Validation', message: 'Hours must be between 0 and 72.' })
      return false
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      toast.error({ title: 'Validation', message: 'Minutes must be between 0 and 59.' })
      return false
    }
    if (hours === 0 && minutes === 0) {
      toast.error({
        title: 'Validation',
        message: 'Interval must be greater than zero.',
      })
      return false
    }
    if (!form.useAiMessage && !form.followupMessage.trim()) {
      toast.error({
        title: 'Validation',
        message: 'Enter a follow-up message or enable AI-generated messages.',
      })
      return false
    }
    return true
  }

  async function handleSave() {
    if (!validateForm()) return

    setSaving(true)
    try {
      const body = {
        followupCount: Number(form.followupCount),
        followupIntervalHours: Number(form.followupIntervalHours),
        followupIntervalMinutes: Number(form.followupIntervalMinutes),
        followupMessage: form.useAiMessage ? null : form.followupMessage.trim(),
        agentFollowupEnabled: form.agentFollowupEnabled !== false,
      }

      if (scope !== ORG_SCOPE) {
        body.locationID = scope
      }

      const result = await api.put('/api/followup-settings', body)
      if (result.success) {
        toast.success({
          title: 'Saved',
          message: `Follow-up settings updated for ${activeScopeLabel.toLowerCase()}.`,
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
              Set how many automated follow-ups to send and how long to wait between each one.
              Location-specific settings override the organization default.
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
                  Choose the organization default or override settings for a specific location.
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
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                  <div>
                    <div className="text-sm font-medium">Enable agent follow-ups</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Master switch for this scope. When off, no automated follow-ups are sent for any
                      lead under {scope === ORG_SCOPE ? 'the organization' : 'this location'} — even if
                      the lead still has follow-ups enabled.
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

                <div
                  className={cn(
                    'grid gap-4 sm:grid-cols-3',
                    form.agentFollowupEnabled === false && 'pointer-events-none opacity-50'
                  )}
                >
                  <div className="space-y-2">
                    <label htmlFor="followup-count" className="text-sm font-medium">
                      Number of follow-ups
                    </label>
                    <Input
                      id="followup-count"
                      type="number"
                      min={1}
                      max={10}
                      value={form.followupCount}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupCount: e.target.value }))}
                      disabled={saving || form.agentFollowupEnabled === false}
                    />
                    <p className="text-xs text-muted-foreground">Between 1 and 10</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="followup-hours" className="text-sm font-medium">
                      Interval (hours)
                    </label>
                    <Input
                      id="followup-hours"
                      type="number"
                      min={0}
                      max={72}
                      value={form.followupIntervalHours}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, followupIntervalHours: e.target.value }))
                      }
                      disabled={saving || form.agentFollowupEnabled === false}
                    />
                    <p className="text-xs text-muted-foreground">0–72 hours</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="followup-minutes" className="text-sm font-medium">
                      Interval (minutes)
                    </label>
                    <Input
                      id="followup-minutes"
                      type="number"
                      min={0}
                      max={59}
                      value={form.followupIntervalMinutes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, followupIntervalMinutes: e.target.value }))
                      }
                      disabled={saving || form.agentFollowupEnabled === false}
                    />
                    <p className="text-xs text-muted-foreground">0–59 minutes</p>
                  </div>
                </div>

                <div
                  className={cn(
                    'space-y-3 rounded-lg border border-border bg-muted/20 p-4',
                    form.agentFollowupEnabled === false && 'pointer-events-none opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">AI-generated message</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        When enabled, the AI writes each follow-up based on the conversation.
                      </p>
                    </div>
                    <Switch
                      checked={form.useAiMessage}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          useAiMessage: checked,
                          followupMessage: checked ? '' : prev.followupMessage,
                        }))
                      }
                      disabled={saving || form.agentFollowupEnabled === false}
                    />
                  </div>

                  {!form.useAiMessage ? (
                    <div className="space-y-2">
                      <label htmlFor="followup-message" className="text-sm font-medium">
                        Fixed follow-up message
                      </label>
                      <Textarea
                        id="followup-message"
                        rows={4}
                        value={form.followupMessage}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, followupMessage: e.target.value }))
                        }
                        placeholder="Hey! Just checking in — are you still interested?"
                        disabled={saving || form.agentFollowupEnabled === false}
                      />
                    </div>
                  ) : null}
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
                  const messageMode =
                    item.followupMessage && String(item.followupMessage).trim()
                      ? 'Fixed message'
                      : 'AI-generated'
                  const followupsOn = item.agentFollowupEnabled !== false
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
                            {followupsOn ? (
                              <>
                                {item.followupCount} follow-ups every{' '}
                                {formatIntervalLabel(
                                  item.followupIntervalHours ?? 0,
                                  item.followupIntervalMinutes ?? 0
                                )}{' '}
                                · {messageMode}
                              </>
                            ) : (
                              'Follow-ups disabled'
                            )}
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
              Follow-ups only send when both this setting and the lead&apos;s{' '}
              <span className="font-medium text-foreground">Agent follow-up</span> toggle are on.
            </p>
            <p>
              Turn off the lead toggle to opt out one person; turn off this setting to block follow-ups
              for everyone under this scope.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
