'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { hasPermission } from '@/lib/permissions'
import { useCloverConnection } from './useCloverConnection'

export default function CloverConnectionCard() {
  const { status, merchantId, merchantName, connectedAt, lastError, connect, disconnect } = useCloverConnection()
  const [disconnecting, setDisconnecting] = useState(false)
  const toast = useToast()

  const canWrite = hasPermission('settings', 'payments', 'write')
  const canDelete = hasPermission('settings', 'payments', 'delete')

  async function handleDisconnect() {
    setDisconnecting(true)
    const result = await disconnect()
    setDisconnecting(false)
    if (result.success) {
      toast.success({ title: 'Clover disconnected', message: 'The location is no longer connected to Clover.' })
    } else {
      toast.error({ title: 'Disconnect failed', message: result.error || 'Unable to disconnect Clover.' })
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Clover</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Accept payments directly into this location&apos;s Clover merchant account.
          </p>
        </div>
        {status === 'connected' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Connected</Badge>}
        {status === 'error' && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">Reconnect required</Badge>}
        {status === 'disconnected' && <Badge variant="secondary">Not Connected</Badge>}
      </div>

      {status === 'connected' && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Merchant</dt>
            <dd className="font-medium text-foreground">{merchantName || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Merchant ID</dt>
            <dd className="font-medium text-foreground">{merchantId || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Connected</dt>
            <dd className="font-medium text-foreground">
              {connectedAt ? new Date(connectedAt).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      )}

      {status === 'error' && lastError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {lastError}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        {status === 'disconnected' && (
          <Button onClick={connect} disabled={!canWrite} title={!canWrite ? 'You do not have permission to connect Clover' : undefined}>
            Connect Clover
          </Button>
        )}
        {(status === 'connected' || status === 'error') && (
          <>
            <Button onClick={connect} disabled={!canWrite} title={!canWrite ? 'You do not have permission to reconnect Clover' : undefined}>
              Reconnect
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={!canDelete || disconnecting}
              title={!canDelete ? 'You do not have permission to disconnect Clover' : undefined}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
