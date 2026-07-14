'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Check, Lock, Loader2, AlertCircle } from 'lucide-react'

/**
 * The page a customer lands on from the SMS or email we sent them.
 *
 * This is the only screen in the product a paying customer ever sees, and they see it
 * on a phone, from a text message, deciding in about three seconds whether it is real.
 * So it answers exactly three questions — who is asking, how much, and what for — and
 * says plainly that the card is entered on Clover, not here.
 *
 * Colours are fixed rather than themed on purpose. The theme script sets `.dark` from
 * the visitor's OS preference, and a customer has never set a preference in this app, so
 * a dark phone would otherwise repaint a payment page in the staff dashboard's palette.
 * A page that asks for money must look the same to everyone.
 */

const BRAND = 'hsl(330 74% 45%)' // --primary, kept literal so `.dark` cannot repaint it.

const API_BASE = (
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:8080'
).replace(/\/$/, '')

const money = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0)

// What a customer is told when a link cannot be paid. Each one says what happened and
// what to do about it — a dead end with no next step is what makes people call the studio.
const CLOSED = {
  paid: {
    tone: 'good',
    title: 'This has been paid',
    body: 'Thank you — there is nothing left to pay. You can close this page.',
  },
  cancelled: {
    tone: 'plain',
    title: 'This payment link was cancelled',
    body: 'The studio cancelled this request. Contact them if you think that is a mistake.',
  },
  expired: {
    tone: 'plain',
    title: 'This payment link has expired',
    body: 'Links are only good for a few days. Ask the studio to send you a new one.',
  },
}

function Shell({ children }) {
  return (
    <div
      style={{ colorScheme: 'light' }}
      className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16 flex justify-center"
    >
      <main className="w-full max-w-[26rem]">{children}</main>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="motion-safe:animate-pulse space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="h-2.5 w-20 rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-2.5 w-24 rounded bg-slate-100" />
          <div className="h-10 w-40 rounded bg-slate-200" />
          <div className="h-3 w-48 rounded bg-slate-100" />
        </div>
        <div className="h-12 w-full rounded-xl bg-slate-200" />
      </div>
      <span className="sr-only">Loading your payment request…</span>
    </div>
  )
}

function StudioMark({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        style={{ backgroundColor: BRAND }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold text-white"
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">{name}</h1>
        <p className="text-[13px] text-slate-500">Payment request</p>
      </div>
    </div>
  )
}

export default function PayPage() {
  const { token } = useParams()

  const [state, setState] = useState('loading') // loading | ready | closed | invalid
  const [request, setRequest] = useState(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(`${API_BASE}/api/pay/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('invalid')
        return res.json()
      })
      .then((body) => {
        if (cancelled) return
        if (!body?.success) throw new Error('invalid')
        setRequest(body.data)
        setState(body.data.status === 'sent' ? 'ready' : 'closed')
      })
      .catch(() => {
        if (!cancelled) setState('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const pay = useCallback(async () => {
    setOpening(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/pay/${encodeURIComponent(token)}/session`, {
        method: 'POST',
      })
      const body = await res.json()

      if (body?.success && body.data?.checkoutUrl) {
        // The redirect is imminent, so the button deliberately stays in its busy state —
        // flicking back to "Pay" for the instant before the page unloads reads as a failure.
        window.location.href = body.data.checkoutUrl
        return
      }
      setError(body?.message || 'We could not open the payment page. Please try again.')
    } catch {
      setError('We could not reach the payment page. Check your connection and try again.')
    }
    setOpening(false)
  }, [token])

  if (state === 'loading') {
    return (
      <Shell>
        <Skeleton />
      </Shell>
    )
  }

  // A bad token says only that it is bad. It must not confirm whether it ever existed.
  if (state === 'invalid') {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-4 text-[15px] font-semibold text-slate-900">This link isn’t valid</h1>
          <p className="mx-auto mt-1.5 max-w-[30ch] text-[13px] leading-relaxed text-slate-600">
            Open the most recent link your studio sent you, or ask them for a new one.
          </p>
        </div>
      </Shell>
    )
  }

  if (state === 'closed') {
    const closed = CLOSED[request.status] ?? CLOSED.cancelled
    const good = closed.tone === 'good'
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <StudioMark name={request.studioName} />
          <div className="mt-6 flex flex-col items-center border-t border-slate-100 pt-6 text-center">
            <div
              aria-hidden="true"
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                good ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {good ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <h2 className="mt-3 text-[15px] font-semibold text-slate-900">{closed.title}</h2>
            <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-slate-600">
              {closed.body}
            </p>
            {good && (
              <p className="mt-4 text-[13px] text-slate-500">
                <span className="font-medium text-slate-700">{money(request.amount)}</span> ·{' '}
                {request.description}
              </p>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <StudioMark name={request.studioName} />

        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-[13px] font-medium text-slate-500">Amount due</p>
          <p className="mt-1 text-[2.75rem] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
            {money(request.amount)}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{request.description}</p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-[13px] leading-relaxed text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={pay}
          disabled={opening}
          aria-busy={opening}
          style={{ backgroundColor: BRAND }}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(330_74%_45%)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100 disabled:active:scale-100"
        >
          {opening ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
              Opening secure checkout…
            </>
          ) : (
            `Pay ${money(request.amount)}`
          )}
        </button>

        {/* Said before they leave, not after: an unexplained jump to a third-party domain
            is the moment a legitimate payment starts to feel like a scam. */}
        <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-slate-500">
          <Lock aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            You’ll be taken to Clover to enter your card. {request.studioName} never sees your card
            details.
          </span>
        </p>
      </div>
    </Shell>
  )
}
