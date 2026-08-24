'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, AlertCircle, MailX } from 'lucide-react'

function resolveApiBase() {
  const fromEnv = (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    ''
  ).replace(/\/$/, '')
  if (fromEnv) return fromEnv
  // Live fallback when the Vercel env var was not baked into the build.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || ''
    if (host.includes('cadance.ai') || host.includes('vercel.app')) {
      return 'https://backend.cadance.ai'
    }
  }
  return 'http://localhost:8080'
}

function Shell({ children }) {
  return (
    <div
      style={{ colorScheme: 'light' }}
      className="min-h-screen bg-muted/40 px-4 py-10 sm:py-16 flex justify-center"
    >
      <main className="w-full max-w-[26rem]">{children}</main>
    </div>
  )
}

function UnsubscribeInner() {
  const searchParams = useSearchParams()
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams])
  const view = String(searchParams.get('view') || '').toLowerCase()
  const apiBase = useMemo(() => resolveApiBase(), [])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [record, setRecord] = useState(null)
  const [done, setDone] = useState(false)

  const backendConfirmUrl = token
    ? `${apiBase}/api/email-unsubscribe/public/${encodeURIComponent(token)}/confirm`
    : ''

  const load = useCallback(async () => {
    if (!token) {
      setError('This unsubscribe link is missing a token.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${apiBase}/api/email-unsubscribe/public/${encodeURIComponent(token)}`,
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setError(json?.message || 'This unsubscribe link is invalid or has expired.')
        setRecord(null)
        return
      }
      setRecord(json.data)
      if (json.data?.status === 'unsubscribed') setDone(true)
    } catch {
      setError(
        'Unable to reach the server from this page. Use the button below to unsubscribe directly.',
      )
    } finally {
      setLoading(false)
    }
  }, [token, apiBase])

  useEffect(() => {
    load()
  }, [load])

  const confirm = async () => {
    if (!token || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        `${apiBase}/api/email-unsubscribe/public/${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        },
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        // Fall through to backend HTML confirm (no CORS / SPA dependency).
        if (backendConfirmUrl) {
          window.location.href = backendConfirmUrl
          return
        }
        setError(json?.message || 'Could not unsubscribe. Please try again.')
        return
      }
      setRecord(json.data)
      setDone(true)
    } catch {
      if (backendConfirmUrl) {
        window.location.href = backendConfirmUrl
        return
      }
      setError('Could not unsubscribe. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading…</p>
        </div>
      </Shell>
    )
  }

  if (error && !record) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          {backendConfirmUrl ? (
            <a
              href={backendConfirmUrl}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1c1c1c] px-4 text-sm font-semibold text-white"
            >
              Unsubscribe anyway
            </a>
          ) : null}
        </div>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">You’re unsubscribed</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{record?.email}</span> will no longer
            receive marketing emails from this studio.
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            Changed your mind? Contact the studio and ask them to resubscribe you.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1c1c1c] text-white">
            <MailX className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              {view === 'preferences' ? 'Email preferences' : 'Unsubscribe'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{record?.email}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {view === 'preferences'
            ? 'You can stop receiving marketing emails from this studio. Transactional messages (receipts, booking confirmations) may still be sent when required.'
            : 'Confirm below to stop receiving marketing emails from this studio.'}
        </p>

        {error ? (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={confirm}
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-[#1c1c1c] text-white text-sm font-semibold hover:bg-black/90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Working…' : 'Unsubscribe from emails'}
        </button>
      </div>
    </Shell>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Shell>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  )
}
