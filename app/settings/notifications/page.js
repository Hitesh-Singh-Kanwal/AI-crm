'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Check, Loader2, Volume2 } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { playIncomingRing } from '@/lib/notificationSounds'
import {
  MASTER_KEY,
  NOTIFICATION_GROUPS,
  cacheNotificationPreferences,
  getNotificationPreferences,
  resolvePreferences,
} from '@/lib/notificationPreferences'

// One focus ring and one press feel for every switch on the page.
const SWITCH_CLASS =
  'transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed'

function SaveStatus({ status }) {
  return (
    <div aria-live="polite" className="flex h-5 items-center justify-end text-xs">
      {status === 'saving' && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> Saving
        </span>
      )}
      {status === 'saved' && (
        <span className="inline-flex items-center gap-1.5 text-success">
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      )}
      {status === 'error' && (
        <span role="alert" className="text-destructive">
          Could not save. Your last change was undone, please try again.
        </span>
      )}
    </div>
  )
}

function ToggleRow({ item, checked, locked, onToggle }) {
  const showWarning = item.offWarning && !checked && !locked
  return (
    <div
      onClick={() => !locked && onToggle(!checked)}
      className={cn(
        '-mx-3 flex items-start justify-between gap-6 rounded-lg px-3 py-3.5 transition-colors motion-reduce:transition-none',
        locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5 text-foreground">{item.label}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
        {showWarning && <p className="mt-1.5 text-[13px] leading-relaxed text-destructive">{item.offWarning}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {item.preview === 'sound' && (
          <button
            type="button"
            disabled={locked || !checked}
            onClick={(e) => {
              e.stopPropagation()
              playIncomingRing()
            }}
            aria-label="Play sample sound"
            title="Play sample sound"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]'
            )}
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
        <Switch
          checked={checked}
          disabled={locked}
          onCheckedChange={onToggle}
          aria-label={item.label}
          className={SWITCH_CLASS}
        />
      </div>
    </div>
  )
}

function PageSkeleton() {
  const bar = 'animate-pulse rounded bg-muted motion-reduce:animate-none'
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4" aria-busy="true" aria-label="Loading notification settings">
      <div className="h-[92px] animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
      <Card className="divide-y divide-border">
        {[2, 1, 1, 1].map((rows, i) => (
          <div key={i} className="grid gap-6 p-6 md:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <div className={cn(bar, 'h-4 w-32')} />
              <div className={cn(bar, 'h-3 w-44')} />
            </div>
            <div className="space-y-4">
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className={cn(bar, 'h-4 w-40')} />
                    <div className={cn(bar, 'h-3 w-64')} />
                  </div>
                  <div className={cn(bar, 'h-6 w-11 rounded-full')} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

/**
 * Per-user alert preferences. Each switch saves the moment it is flipped and is
 * undone if the save fails, so what the page shows is always what is stored. The
 * master switch silences everything without forgetting the choices underneath it.
 */
export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState(() => getNotificationPreferences())
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const inFlight = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    const res = await api.get('/api/auth/notification-preferences')
    if (res.success) {
      setPrefs(resolvePreferences(res.data))
      cacheNotificationPreferences(res.data || {})
    } else {
      setLoadFailed(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = useCallback(
    async (key, value) => {
      const before = prefs[key]
      setPrefs((p) => ({ ...p, [key]: value }))
      setStatus('saving')
      inFlight.current += 1
      const res = await api.put('/api/auth/notification-preferences', { [key]: value })
      inFlight.current -= 1
      if (res.success) {
        cacheNotificationPreferences(res.data || {})
        if (inFlight.current === 0) setStatus('saved')
      } else {
        setPrefs((p) => ({ ...p, [key]: before }))
        setStatus('error')
      }
    },
    [prefs]
  )

  const masterOn = prefs[MASTER_KEY]

  return (
    <MainLayout title="Notifications" subtitle="Choose which alerts you see and hear">
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          {loadFailed && (
            <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-foreground">
                Your saved settings could not be loaded, so defaults are shown.
              </p>
              <button
                type="button"
                onClick={load}
                className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-primary)]"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex items-end justify-between gap-4 px-1">
            <p className="text-[13px] text-muted-foreground">
              Changes save automatically and follow you to any device. They apply to you only.
            </p>
            <SaveStatus status={status} />
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-6 rounded-xl border p-5 transition-colors motion-reduce:transition-none',
              masterOn ? 'border-[var(--studio-primary)]/25 bg-[var(--studio-primary)]/[0.05]' : 'border-border bg-muted/40'
            )}
          >
            <div className="flex min-w-0 items-start gap-4">
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors motion-reduce:transition-none',
                  masterOn ? 'bg-[var(--studio-primary)] text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {masterOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-6 text-foreground">All notifications</h2>
                <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                  {masterOn
                    ? 'Turn this off to silence every alert at once. Your individual choices are saved and come back when you turn it on.'
                    : 'Everything below is silenced until you turn this back on.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={cn('text-sm font-medium', masterOn ? 'text-foreground' : 'text-muted-foreground')}>
                {masterOn ? 'On' : 'Off'}
              </span>
              <Switch
                checked={masterOn}
                onCheckedChange={(v) => update(MASTER_KEY, v)}
                aria-label="All notifications"
                className={SWITCH_CLASS}
              />
            </div>
          </div>

          <Card
            className={cn(
              'divide-y divide-border transition-opacity duration-200 motion-reduce:transition-none',
              !masterOn && 'opacity-60'
            )}
          >
            {NOTIFICATION_GROUPS.map((group) => (
              <section key={group.id} className="grid gap-x-10 gap-y-2 p-6 md:grid-cols-[240px_1fr]">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{group.description}</p>
                </div>
                <div className="divide-y divide-border/70">
                  {group.items.map((item) => (
                    <ToggleRow
                      key={item.key}
                      item={item}
                      checked={prefs[item.key]}
                      locked={!masterOn}
                      onToggle={(v) => update(item.key, v)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </Card>
        </div>
      )}
    </MainLayout>
  )
}
