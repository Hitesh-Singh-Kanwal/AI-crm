'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Headphones, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
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

export default function InboundIvrTab() {
  const toast = useToast()
  const [routes, setRoutes] = useState([])
  const [assistants, setAssistants] = useState([])
  const [menuPreview, setMenuPreview] = useState('')
  const [setupInfo, setSetupInfo] = useState(null)
  const [voiceSetup, setVoiceSetup] = useState(null)
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [digit, setDigit] = useState('1')
  const [label, setLabel] = useState('')
  const [menuPrompt, setMenuPrompt] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [enabled, setEnabled] = useState(true)

  const usedDigits = useMemo(
    () => new Set(routes.filter((route) => route._id !== editingRoute?._id).map((route) => route.digit)),
    [routes, editingRoute],
  )

  const availableDigits = useMemo(
    () => DIGIT_OPTIONS.filter((value) => !usedDigits.has(value)),
    [usedDigits],
  )

  const canSave = Boolean(label.trim() && digit)

  const resetEditor = () => {
    setEditingRoute(null)
    setDigit(availableDigits[0] || '1')
    setLabel('')
    setMenuPrompt('')
    setAssistantId('')
    setEnabled(true)
  }

  const fetchAssistants = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const result = await api.get('/api/ai-assistant/')
      if (result.success) {
        setAssistants(extractList(result))
      }
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
      const [routesResult, previewResult, voiceSetupResult] = await Promise.all([
        api.get('/api/inbound-routes'),
        api.get('/api/inbound-routes/menu-preview'),
        api.get('/api/human-queue/voice-setup'),
      ])

      if (!routesResult.success) {
        setError(routesResult.error || 'Failed to fetch inbound IVR options')
        return
      }

      setRoutes(extractList(routesResult))

      if (previewResult.success) {
        const previewPayload = previewResult.data || {}
        setMenuPreview(previewPayload.menuPrompt || '')
        setSetupInfo(previewPayload.setup || null)
      }

      if (voiceSetupResult.success) {
        setVoiceSetup(voiceSetupResult.data || null)
      }
    } catch (e) {
      console.error(e)
      setError(e.message || 'Something went wrong while loading inbound IVR settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoutes()
    fetchAssistants()
  }, [fetchRoutes, fetchAssistants])

  const openCreate = () => {
    resetEditor()
    setDigit(availableDigits[0] || '1')
    setEditorOpen(true)
  }

  const openEdit = (route) => {
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
    setEditorOpen(true)
  }

  const handleSeedDefaults = async () => {
    setSeeding(true)
    try {
      const result = await api.post('/api/inbound-routes/seed-defaults', {})
      if (!result.success) {
        toast.error({ title: 'Seed failed', message: result.error || 'Could not create default options.' })
        return
      }

      toast.success({
        title: 'Defaults ready',
        message: result.message || 'Default IVR options are available. Assign an assistant to each one.',
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
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        digit,
        label: label.trim(),
        menuPrompt: menuPrompt.trim(),
        enabled,
        aiAssistantId: assistantId || null,
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
        message: `IVR option ${editingRoute ? 'updated' : 'created'} successfully.`,
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
    if (!confirm(`Delete IVR option "${route.label}" (press ${route.digit})?`)) return

    setDeletingId(route._id)
    try {
      const result = await api.delete(`/api/inbound-routes/${route._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete IVR option.' })
        return
      }

      toast.success({ title: 'Deleted', message: 'IVR option removed.' })
      await fetchRoutes()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete IVR option.' })
    } finally {
      setDeletingId(null)
    }
  }

  const readyRouteCount = routes.filter((route) => route.enabled !== false && isRouteReady(route)).length
  const enabledRouteCount = routes.filter((route) => route.enabled !== false).length

  return (
    <TabsContent value="inbound-ivr" className="mt-6 flex-1 min-h-0 flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Configure the inbound phone menu callers hear when they dial your Twilio number. Assign a
          dedicated AI assistant to each keypad option. When a caller asks for a human during the
          call, they are transferred to the Human Queue in Inbox.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchRoutes} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
            {seeding ? 'Creating…' : 'Add default options'}
          </Button>
          <Button variant="gradient" onClick={openCreate} disabled={availableDigits.length === 0 && !editingRoute}>
            <Plus className="h-4 w-4 mr-2" />
            Add IVR option
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Menu preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {menuPreview || 'No enabled IVR options yet. Add default options or create your own menu.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">IVR options ready</span>
              <Badge variant={readyRouteCount > 0 && readyRouteCount === enabledRouteCount ? 'default' : 'outline'}>
                {readyRouteCount}/{enabledRouteCount || 0}
              </Badge>
            </div>
            <div>
              <p className="font-medium">Inbound webhook (HTTP POST)</p>
              <p className="text-muted-foreground break-all">
                {setupInfo?.ivrWebhookUrl || 'Set PUBLIC_API_BASE_URL in backend env.'}
              </p>
            </div>
            <div>
              <p className="font-medium">Browser pickup TwiML App URL</p>
              <p className="text-muted-foreground break-all">
                {voiceSetup?.twimlAppVoiceUrl || 'Configure Twilio Voice SDK env vars first.'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {setupInfo?.note || setupInfo?.twilioSetupNote || 'Point your Twilio number voice webhook to the inbound URL above.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading inbound IVR options…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && routes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Headphones className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No inbound IVR options yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start with the default Sales, Booking, Cancellation, and General query options.
              </p>
            </div>
            <Button variant="gradient" onClick={handleSeedDefaults} disabled={seeding}>
              Add default options
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && routes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {routes.map((route) => (
            <Card key={route._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="secondary">Press {route.digit}</Badge>
                      {route.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Assistant:{' '}
                      <span className={isRouteReady(route) ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'}>
                        {getAssistantLabel(route) || 'Not assigned'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={route.enabled ? 'default' : 'outline'}>
                      {route.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {route.enabled !== false && !isRouteReady(route) && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        Needs assistant
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{route.menuPrompt}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(route)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(route)}
                    disabled={deletingId === route._id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Edit IVR option' : 'Create IVR option'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Keypad digit</label>
              <Select
                value={digit}
                onChange={(e) => setDigit(e.target.value)}
                className="mt-1"
                disabled={Boolean(editingRoute)}
              >
                {(editingRoute ? [digit] : availableDigits).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Booking"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Assigned AI assistant</label>
              <Select
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                className="mt-1"
                disabled={optionsLoading}
              >
                <option value="">Select assistant…</option>
                {assistants.map((assistant) => (
                  <option key={assistant._id} value={assistant._id}>
                    {assistant.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Menu prompt</label>
              <Textarea
                value={menuPrompt}
                onChange={(e) => setMenuPrompt(e.target.value)}
                placeholder={`Press ${digit || '1'} for ${label || 'Booking'}.`}
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Disabled options are hidden from the live menu.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleSave} disabled={!canSave || saving}>
                {saving ? 'Saving…' : editingRoute ? 'Save changes' : 'Create option'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}
