'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Headphones,
  ListOrdered,
  Pencil,
  PhoneCall,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Switch from '@/components/ui/switch'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import { cn } from '@/lib/utils'
import {
  hasLocationSelection,
  initLocationID,
  locationBadgeLabel,
  normalizeWorkingLocation,
  toLocationPayload,
  workingLocationQueryParam,
} from './locationScope'

const DIGIT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

function extractList(result) {
  const payload = result?.data
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
}

function getAssistantLabel(route) {
  const assistant = route?.aiAssistantId
  if (!assistant) return null
  if (typeof assistant === 'object') return assistant.name || assistant.assistantID || 'Assigned'
  return 'Assigned'
}

function isRouteReady(route) {
  if (route?.enabled === false) return true
  const assistant = route?.aiAssistantId
  if (!assistant) return false
  if (typeof assistant === 'object') return Boolean(assistant._id || assistant.assistantID)
  return Boolean(assistant)
}

// Route color palette cycling through brand colors
const ROUTE_COLORS = [
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
]

function routeColorClass(index) {
  return ROUTE_COLORS[index % ROUTE_COLORS.length]
}

export default function InboundIvrTab() {
  const toast = useToast()
  const [routes, setRoutes] = useState([])
  const [assistants, setAssistants] = useState([])
  const [menuPreview, setMenuPreview] = useState('')
  const [setupInfo, setSetupInfo] = useState(null)
  const [voiceSetup, setVoiceSetup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Working studio scope for this tab (view + mutations)
  const [workingLocationID, setWorkingLocationID] = useState([])

  // ── Inbound mode ──
  const [inboundMode, setInboundMode] = useState('ivr')
  const [directAssistantId, setDirectAssistantId] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [activatingId, setActivatingId] = useState(null)

  // ── IVR editor ──
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [digit, setDigit] = useState('1')
  const [label, setLabel] = useState('')
  const [menuPrompt, setMenuPrompt] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [routeLocationID, setRouteLocationID] = useState([])

  const usedDigits = useMemo(
    () => new Set(routes.filter((r) => r._id !== editingRoute?._id).map((r) => r.digit)),
    [routes, editingRoute],
  )
  const availableDigits = useMemo(
    () => DIGIT_OPTIONS.filter((v) => !usedDigits.has(v)),
    [usedDigits],
  )
  const canSave = Boolean(label.trim() && digit && hasLocationSelection(routeLocationID))

  const locationQuery = workingLocationQueryParam(workingLocationID)
  const withLocationQuery = useCallback(
    (path) => {
      if (!locationQuery) return path
      const sep = path.includes('?') ? '&' : '?'
      return `${path}${sep}locationID=${encodeURIComponent(locationQuery)}`
    },
    [locationQuery],
  )

  const resetEditor = () => {
    setEditingRoute(null)
    setDigit(availableDigits[0] || '1')
    setLabel('')
    setMenuPrompt('')
    setAssistantId('')
    setEnabled(true)
    setRouteLocationID(
      hasLocationSelection(workingLocationID) ? workingLocationID : [],
    )
  }

  const fetchAssistants = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const result = await api.get('/api/ai-assistant/')
      if (result.success) setAssistants(extractList(result))
    } catch (e) {
      console.error(e)
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  const fetchRoutes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [routesResult, previewResult, voiceSetupResult, settingsResult] = await Promise.all([
        api.get(withLocationQuery('/api/inbound-routes')),
        api.get(withLocationQuery('/api/inbound-routes/menu-preview')),
        api.get('/api/human-queue/voice-setup'),
        api.get(withLocationQuery('/api/inbound-routes/settings')),
      ])

      if (!routesResult.success) {
        setError(routesResult.error || 'Failed to load inbound settings.')
        return
      }
      setRoutes(extractList(routesResult))

      if (previewResult.success) {
        const p = previewResult.data || {}
        setMenuPreview(p.menuPrompt || '')
        setSetupInfo(p.setup || null)
      }
      if (voiceSetupResult.success) setVoiceSetup(voiceSetupResult.data || null)

      if (settingsResult.success) {
        const s = settingsResult.data || {}
        setInboundMode(s.mode || 'ivr')
        const doc = s.directAssistantId
        setDirectAssistantId(doc && typeof doc === 'object' ? doc._id || '' : doc || '')
      }
    } catch (e) {
      console.error(e)
      setError(e.message || 'Something went wrong while loading inbound settings.')
    } finally {
      setLoading(false)
    }
  }, [withLocationQuery])

  useEffect(() => {
    fetchRoutes()
    fetchAssistants()
  }, [fetchRoutes, fetchAssistants])

  const requireWorkingLocation = () => {
    if (!hasLocationSelection(workingLocationID)) {
      toast.error({ title: 'Location required', message: 'Select one or more studios, or All branches.' })
      return false
    }
    return true
  }

  const handleModeSelect = async (newMode) => {
    if (newMode === inboundMode || savingSettings) return
    if (!requireWorkingLocation()) return
    setSavingSettings(true)
    try {
      const result = await api.patch('/api/inbound-routes/settings', {
        mode: newMode,
        directAssistantId: directAssistantId || null,
        ...toLocationPayload(workingLocationID),
      })
      if (!result.success) {
        toast.error({ title: 'Failed to save', message: result.error || 'Could not update inbound mode.' })
        return
      }
      setInboundMode(newMode)
      toast.success({
        title: 'Mode updated',
        message:
          newMode === 'direct'
            ? 'Callers will be connected directly to the selected AI assistant.'
            : 'AI menu is now active — callers hear a natural-voice receptionist.',
      })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update inbound mode.' })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSelectDirectAssistant = async (assistant) => {
    if (activatingId || assistant._id === directAssistantId) return
    if (!requireWorkingLocation()) return
    setActivatingId(assistant._id)
    try {
      const result = await api.patch('/api/inbound-routes/settings', {
        mode: 'direct',
        directAssistantId: assistant._id,
        ...toLocationPayload(workingLocationID),
      })
      if (!result.success) {
        toast.error({ title: 'Failed to save', message: result.error || 'Could not set direct assistant.' })
        return
      }
      setDirectAssistantId(assistant._id)
      toast.success({ title: 'Active', message: `${assistant.name} is now answering all inbound calls.` })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not set direct assistant.' })
    } finally {
      setActivatingId(null)
    }
  }

  const openCreate = () => {
    if (!requireWorkingLocation()) return
    resetEditor()
    setDigit(availableDigits[0] || '1')
    setRouteLocationID(workingLocationID)
    setEditorOpen(true)
  }

  const openEdit = (route) => {
    const routeLoc = initLocationID(route)
    setEditingRoute(route)
    setDigit(route.digit || '1')
    setLabel(route.label || '')
    setMenuPrompt(route.menuPrompt || '')
    setAssistantId(
      typeof route.aiAssistantId === 'object'
        ? route.aiAssistantId?._id || ''
        : route.aiAssistantId || '',
    )
    setEnabled(route.enabled !== false)
    setRouteLocationID(
      hasLocationSelection(routeLoc)
        ? routeLoc
        : hasLocationSelection(workingLocationID)
          ? workingLocationID
          : [],
    )
    setEditorOpen(true)
  }

  const handleSeedDefaults = async () => {
    if (!requireWorkingLocation()) return
    setSeeding(true)
    try {
      const result = await api.post('/api/inbound-routes/seed-defaults', {
        ...toLocationPayload(workingLocationID),
      })
      if (!result.success) {
        toast.error({ title: 'Seed failed', message: result.error || 'Could not create default options.' })
        return
      }
      toast.success({
        title: 'Defaults created',
        message: 'Assign an AI assistant to each option to activate them.',
      })
      await fetchRoutes()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not seed default IVR options.' })
    } finally {
      setSeeding(false)
    }
  }

  const handleSave = async () => {
    if (!hasLocationSelection(routeLocationID)) {
      toast.error({ title: 'Location required', message: 'Select one or more studios, or All branches.' })
      return
    }
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        digit,
        label: label.trim(),
        menuPrompt: menuPrompt.trim(),
        enabled,
        aiAssistantId: assistantId || null,
        ...toLocationPayload(routeLocationID),
      }
      const result = editingRoute
        ? await api.patch(`/api/inbound-routes/${editingRoute._id}`, payload)
        : await api.post('/api/inbound-routes', payload)

      if (!result.success) {
        toast.error({ title: 'Save failed', message: result.error || 'Could not save IVR option.' })
        return
      }
      toast.success({
        title: editingRoute ? 'Updated' : 'Created',
        message: `"${label.trim()}" ${editingRoute ? 'updated' : 'added'} successfully.`,
      })
      setEditorOpen(false)
      resetEditor()
      await fetchRoutes()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not save IVR option.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (route) => {
    if (!route?._id) return
    if (!confirm(`Remove "${route.label}" from the IVR menu?`)) return
    setDeletingId(route._id)
    try {
      const result = await api.delete(`/api/inbound-routes/${route._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete IVR option.' })
        return
      }
      toast.success({ title: 'Removed', message: `"${route.label}" removed from IVR menu.` })
      await fetchRoutes()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete IVR option.' })
    } finally {
      setDeletingId(null)
    }
  }

  const readyCount = routes.filter((r) => r.enabled !== false && isRouteReady(r)).length
  const enabledCount = routes.filter((r) => r.enabled !== false).length
  const allReady = enabledCount > 0 && readyCount === enabledCount
  const directAssistantDoc = assistants.find((a) => a._id === directAssistantId)

  const webhookReady = Boolean(setupInfo?.ivrWebhookUrl)
  const twimlReady = Boolean(voiceSetup?.twimlAppVoiceUrl)

  return (
    <TabsContent value="inbound-ivr" className="mt-6 flex-1 min-h-0 flex flex-col gap-6">

      {/* Working studio scope */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Studio scope</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick a studio (or All branches) to load and edit IVR routes and inbound settings for that scope.
          </p>
        </div>
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
          placeholder="Select a studio…"
        />
        {!hasLocationSelection(workingLocationID) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Select a studio to manage inbound IVR for that branch.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="Loading inbound settings…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center space-y-3">
            <XCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRoutes}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
      {/* ── Mode selector ──────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Inbound call mode</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how incoming calls are handled when someone dials your number.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: 'ivr',
              icon: ListOrdered,
              title: 'AI Menu',
              desc: 'A natural-voice AI receptionist greets callers and routes them to the right specialist (Sales, Booking, etc.).',
            },
            {
              id: 'direct',
              icon: PhoneCall,
              title: 'Direct AI',
              desc: 'Every call is answered immediately by one AI assistant — no menu.',
            },
          ].map(({ id, icon: Icon, title, desc }) => {
            const active = inboundMode === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleModeSelect(id)}
                disabled={savingSettings}
                className={cn(
                  'group relative rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                  active
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-primary-light)]/40 shadow-sm'
                    : 'border-border bg-card hover:border-[var(--studio-primary)]/40 hover:bg-muted/40',
                )}
              >
                {/* Active checkmark */}
                <span
                  className={cn(
                    'absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center transition-all',
                    active
                      ? 'bg-[var(--studio-primary)] text-white scale-100'
                      : 'bg-muted text-transparent scale-90',
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>

                <div className="flex items-center gap-3 mb-2 pr-6">
                  <div
                    className={cn(
                      'rounded-lg p-2 transition-colors',
                      active
                        ? 'bg-[var(--studio-primary)] text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-[var(--studio-primary-light)] group-hover:text-[var(--studio-primary)]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </button>
            )
          })}
        </div>

        {/* Direct mode — status line */}
        {inboundMode === 'direct' && (
          <div className="mt-3 flex items-center gap-2 px-1">
            {directAssistantId && directAssistantDoc ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  All inbound calls → <span className="font-semibold">{directAssistantDoc.name}</span>
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  No assistant selected — direct calls will fail until one is assigned.
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── IVR section ────────────────────────────────────────────────────────── */}
      {inboundMode === 'ivr' && (
        <>
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">AI menu options</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                The receptionist offers these options (by name or digit), then connects the matching AI assistant.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRoutes} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
              {routes.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? 'Creating…' : 'Add defaults'}
                </Button>
              )}
              <Button
                variant="gradient"
                size="sm"
                onClick={openCreate}
                disabled={availableDigits.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add option
              </Button>
            </div>
          </div>

          {/* Summary + checklist row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Menu preview */}
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Live menu preview</CardTitle>
                  <Badge
                    variant={allReady ? 'default' : 'outline'}
                    className={allReady ? 'bg-emerald-500 text-white border-0' : ''}
                  >
                    {readyCount}/{enabledCount} ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {menuPreview ? (
                  <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {menuPreview}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No enabled IVR options yet. Add some below.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Setup checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Setup checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: 'Twilio number webhook',
                    value: setupInfo?.ivrWebhookUrl,
                    done: webhookReady,
                    placeholder: 'Set PUBLIC_API_BASE_URL in backend env',
                  },
                  {
                    label: 'IVR options assigned',
                    value: enabledCount > 0 ? `${readyCount}/${enabledCount} options ready` : null,
                    done: allReady,
                    placeholder: 'Assign an assistant to each option',
                  },
                  {
                    label: 'Browser pickup TwiML App',
                    value: voiceSetup?.twimlAppVoiceUrl,
                    done: twimlReady,
                    placeholder: 'Configure Twilio Voice SDK env vars',
                  },
                ].map(({ label, value, done, placeholder }) => (
                  <div key={label} className="flex gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
                      <p className={cn('text-xs mt-0.5 break-all leading-snug', done ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400')}>
                        {value || placeholder}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Route cards or empty state */}
          {routes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl bg-[var(--studio-primary-light)] flex items-center justify-center">
                  <Headphones className="h-6 w-6 text-[var(--studio-primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">No IVR options yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Start with the defaults — Sales, Booking, Cancellation, and General query — then assign your assistants.
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                    {seeding ? 'Creating…' : 'Add default options'}
                  </Button>
                  <Button variant="gradient" size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create custom
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {routes.map((route, idx) => {
                const ready = isRouteReady(route)
                const colorClass = routeColorClass(idx)
                const assistantLabel = getAssistantLabel(route)

                return (
                  <Card
                    key={route._id}
                    className={cn(
                      'relative overflow-hidden transition-shadow hover:shadow-md',
                      !route.enabled && 'opacity-60',
                    )}
                  >
                    {/* Color accent strip */}
                    <div className={cn('absolute top-0 left-0 right-0 h-0.5 rounded-t-lg', colorClass.split(' ')[0].replace('bg-', 'bg-').replace('100', '400').replace('500/20', '400'))} />

                    <CardContent className="p-4 space-y-3">
                      {/* Digit badge + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn('inline-flex items-center justify-center rounded-lg w-10 h-10 text-lg font-bold border', colorClass)}>
                          {route.digit}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {route.enabled ? (
                            ready ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                <Circle className="h-3 w-3" /> Needs assistant
                              </span>
                            )
                          ) : (
                            <Badge variant="outline" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                      </div>

                      {/* Label */}
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight">{route.label}</p>
                        {route.menuPrompt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {route.menuPrompt}
                          </p>
                        )}
                      </div>

                      {/* Assistant chip */}
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={cn('text-xs truncate', assistantLabel ? 'text-foreground font-medium' : 'text-muted-foreground italic')}>
                          {assistantLabel || 'No assistant assigned'}
                        </span>
                      </div>

                      {(() => {
                        const locLabel = locationBadgeLabel(route)
                        return locLabel ? (
                          <Badge variant="secondary" className="text-[10px] font-normal w-fit">
                            {locLabel}
                          </Badge>
                        ) : null
                      })()}

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-1 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => openEdit(route)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(route)}
                          disabled={deletingId === route._id}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deletingId === route._id ? '…' : 'Delete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Add new card */}
              {availableDigits.length > 0 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg border-2 border-dashed border-border bg-muted/20 hover:border-[var(--studio-primary)]/40 hover:bg-[var(--studio-primary-light)]/20 transition-colors flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:text-[var(--studio-primary)] min-h-[160px]"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium">Add option</span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Direct mode — assistant card grid ──────────────────────────────────── */}
      {inboundMode === 'direct' && (
        <div>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Select active assistant</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any assistant to make it the active one for all inbound calls. The change saves instantly.
            </p>
          </div>

          {optionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" text="Loading assistants…" />
            </div>
          ) : assistants.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-xl bg-[var(--studio-primary-light)] flex items-center justify-center">
                  <Bot className="h-6 w-6 text-[var(--studio-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No AI assistants yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to the AI Assist tab to create your first assistant, then come back to assign it here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {assistants.map((assistant) => {
                const isActive = assistant._id === directAssistantId
                const isActivating = activatingId === assistant._id

                return (
                  <button
                    key={assistant._id}
                    type="button"
                    onClick={() => handleSelectDirectAssistant(assistant)}
                    disabled={Boolean(activatingId)}
                    className={cn(
                      'group relative rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden',
                      isActive
                        ? 'border-[var(--studio-primary)] bg-[var(--studio-primary-light)]/30 shadow-sm'
                        : 'border-border bg-card hover:border-[var(--studio-primary)]/40 hover:shadow-md',
                      activatingId && !isActivating && 'opacity-50 pointer-events-none',
                    )}
                  >
                    {/* Active top strip */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--studio-primary)]" />
                    )}

                    <div className="p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-[var(--studio-primary)] text-white'
                            : 'bg-muted text-muted-foreground group-hover:bg-[var(--studio-primary-light)] group-hover:text-[var(--studio-primary)]',
                        )}>
                          {isActivating ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : (
                            <Bot className="h-5 w-5" />
                          )}
                        </div>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--studio-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            <Check className="h-2.5 w-2.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground group-hover:border-[var(--studio-primary)]/40 group-hover:text-[var(--studio-primary)]">
                            Set active
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div>
                        <p className={cn(
                          'text-sm font-semibold leading-tight line-clamp-1',
                          isActive ? 'text-[var(--studio-primary)]' : 'text-foreground',
                        )}>
                          {assistant.name || 'Unnamed assistant'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[
                            assistant.persona?.provider && `Voice: ${assistant.persona.provider}`,
                            assistant.persona?.voiceId && assistant.persona.voiceId,
                          ].filter(Boolean).join(' · ') || 'No voice configured'}
                        </p>
                      </div>

                      {/* Script preview */}
                      {assistant.scriptData?.script && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {assistant.scriptData.script}
                        </p>
                      )}

                      {/* Bottom action hint */}
                      <div className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-[var(--studio-primary-light)]/50 group-hover:text-[var(--studio-primary)]',
                      )}>
                        {isActivating ? (
                          <>Activating…</>
                        ) : isActive ? (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Answering all calls</>
                        ) : (
                          <><PhoneCall className="h-3.5 w-3.5" /> Click to set active</>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingRoute ? `Edit — ${editingRoute.label}` : 'New IVR option'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Studio location *
              </label>
              <div className="mt-1.5">
                <LocationSelector
                  value={routeLocationID}
                  onChange={setRouteLocationID}
                  multiple
                  allowAllBranches
                  showAllOption={false}
                  placeholder="Select studio(s)…"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Row: digit + label */}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Digit</label>
                <Select
                  value={digit}
                  onChange={(e) => setDigit(e.target.value)}
                  className="mt-1.5"
                  disabled={Boolean(editingRoute)}
                >
                  {(editingRoute ? [digit] : availableDigits).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Booking"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Assistant */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI assistant</label>
              <Select
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                className="mt-1.5"
                disabled={optionsLoading}
              >
                <option value="">Select assistant…</option>
                {assistants.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </Select>
              {!assistantId && (
                <p className="text-xs text-muted-foreground mt-1">
                  You can save without one and assign later, but the option won't be live until assigned.
                </p>
              )}
            </div>

            {/* Menu prompt */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Menu prompt <span className="normal-case font-normal">(what the caller hears)</span>
              </label>
              <Textarea
                value={menuPrompt}
                onChange={(e) => setMenuPrompt(e.target.value)}
                placeholder={`Press ${digit || '1'} for ${label || 'Booking'}.`}
                className="mt-1.5 min-h-[72px] resize-none text-sm"
              />
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">Inactive options are hidden from the live menu.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={handleSave} disabled={!canSave || saving}>
                {saving ? 'Saving…' : editingRoute ? 'Save changes' : 'Create option'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </TabsContent>
  )
}
