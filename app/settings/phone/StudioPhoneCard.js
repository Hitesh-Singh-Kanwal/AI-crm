'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { hasPermission } from '@/lib/permissions'
import { useStudioPhone } from './useStudioPhone'

export default function StudioPhoneCard() {
  const {
    status,
    twilioNumber,
    connectedAt,
    lastError,
    webhookVoiceUrl,
    webhookSmsUrl,
    setupNote,
    connect,
    disconnect,
  } = useStudioPhone()
  const [numberInput, setNumberInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const toast = useToast()

  const canWrite = hasPermission('settings', 'integration', 'write')
  const canDelete = canWrite

  async function handleConnect() {
    const value = numberInput.trim() || twilioNumber || ''
    if (!value) {
      toast.error({ title: 'Number required', message: 'Enter the Twilio number for this studio (E.164, e.g. +15551234567).' })
      return
    }
    setConnecting(true)
    const result = await connect(value)
    setConnecting(false)
    if (result.success) {
      setNumberInput('')
      toast.success({
        title: 'Phone connected',
        message: 'Webhooks and Vapi were configured for this studio number.',
      })
    } else {
      toast.error({ title: 'Connect failed', message: result.error || 'Unable to connect this number.' })
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    const result = await disconnect()
    setDisconnecting(false)
    if (result.success) {
      toast.success({ title: 'Phone disconnected', message: 'This studio no longer uses that Twilio number.' })
    } else {
      toast.error({ title: 'Disconnect failed', message: result.error || 'Unable to disconnect.' })
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Studio Twilio number</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each studio uses its own number for inbound and AI outbound calls. Buy or port the number
            into the platform Twilio account, then paste it here — we configure webhooks and Vapi
            automatically.
          </p>
        </div>
        {status === 'loading' && <Badge variant="secondary">Loading…</Badge>}
        {status === 'connected' && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            Connected
          </Badge>
        )}
        {status === 'error' && (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">Error</Badge>
        )}
        {status === 'disconnected' && <Badge variant="secondary">Not Connected</Badge>}
      </div>

      {setupNote && (
        <p className="mt-4 text-sm text-muted-foreground">{setupNote}</p>
      )}

      {status === 'connected' && (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Number</dt>
            <dd className="font-medium text-foreground">{twilioNumber || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Connected</dt>
            <dd className="font-medium text-foreground">
              {connectedAt ? new Date(connectedAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          {webhookVoiceUrl && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Voice webhook</dt>
              <dd className="break-all font-mono text-xs text-foreground">{webhookVoiceUrl}</dd>
            </div>
          )}
          {webhookSmsUrl && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">SMS webhook</dt>
              <dd className="break-all font-mono text-xs text-foreground">{webhookSmsUrl}</dd>
            </div>
          )}
        </dl>
      )}

      {(status === 'error' || lastError) && lastError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {lastError}
        </p>
      )}

      {(status === 'disconnected' || status === 'error' || status === 'connected') && (
        <div className="mt-5 space-y-3">
          {(status === 'disconnected' || status === 'error' || status === 'connected') && canWrite && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder={twilioNumber || '+15551234567'}
                className="sm:max-w-xs"
                disabled={!canWrite || connecting}
              />
              <Button
                onClick={handleConnect}
                disabled={!canWrite || connecting}
                title={!canWrite ? 'You do not have permission to connect a number' : undefined}
              >
                {connecting
                  ? 'Connecting…'
                  : status === 'connected'
                    ? 'Update number'
                    : 'Connect number'}
              </Button>
            </div>
          )}

          {status === 'connected' && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={!canDelete || disconnecting}
              title={!canDelete ? 'You do not have permission to disconnect' : undefined}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
