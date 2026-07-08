'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Clover's docs only demonstrate `body`/`input` font styling, but the iframe's style object
// is plain CSS-in-JS passed straight to Clover's own stylesheet generator — unsupported keys
// are ignored harmlessly, so we also request colors matching this app's dark theme. The iframe
// can't read our CSS custom properties (it's cross-origin), so these are the literal computed
// values of --input/--foreground/--muted-foreground from app/globals.css's dark theme block.
// Deliberately lighter than this app's --input token (~#27272a): at that literal shade the
// fields were nearly indistinguishable from the surrounding dark panel. Payment fields get a
// small elevation boost over the design system default so they read as clearly interactive.
// height/lineHeight/padding below match this file's field-wrapper height (h-11 = 44px) exactly —
// our wrapper div has zero padding of its own (see fieldWrapperClass), so the iframe's internal
// input is fully responsible for its own vertical centering and horizontal inset.
// Confirmed working (visually verified): color/backgroundColor/height/lineHeight/padding on
// `body`/`input` are honored by Clover's stylesheet generator. Confirmed NOT working: `appearance`
// and any `::-webkit-*-spin-button` selector — tried three variants, none suppressed the native
// number-input spinner arrows on Expiry/CVV/ZIP. That's handled below via an overflow crop
// instead (see MOUNT_WIDTH_OVERSHOOT), not through Clover's style API.
const CLOVER_FIELD_STYLES = {
  body: { fontFamily: 'inherit', fontSize: '14px', color: '#f7f7f8', backgroundColor: '#35353d' },
  input: {
    fontSize: '14px',
    color: '#f7f7f8',
    backgroundColor: '#35353d',
    height: '44px',
    lineHeight: '44px',
    padding: '0 12px',
    boxSizing: 'border-box',
  },
  '::placeholder': { color: '#9a9aa2' },
}

// Clover's iframe fills 100% of its mount target's width (documented behavior). Mounting into a
// target that's wider than the visible, overflow-hidden wrapper pushes the native spinner column
// (which renders at the far right of the input) outside the visible box, where it gets cropped.
const MOUNT_WIDTH_OVERSHOOT = 24

const CLOVER_JS_SRC = 'https://checkout.sandbox.dev.clover.com/sdk.js'
// NOTE: sandbox-only URL, hardcoded. Production is https://checkout.clover.com/sdk.js (verified against
// Clover's current docs) — before any production rollout, this must become an env-driven switch rather
// than a hardcoded sandbox URL.

let cloverScriptPromise = null
function loadCloverScript() {
  if (cloverScriptPromise) return cloverScriptPromise
  cloverScriptPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Clover) {
      resolve(window.Clover)
      return
    }
    const script = document.createElement('script')
    script.src = CLOVER_JS_SRC
    script.onload = () => resolve(window.Clover)
    script.onerror = () => reject(new Error('Failed to load Clover payment script'))
    document.head.appendChild(script)
  })
  return cloverScriptPromise
}

export default function CloverCardFields({ ecommercePublicKey, merchantId, amount, onToken, disabled, resetSignal }) {
  const [ready, setReady] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState(null)
  const cloverRef = useRef(null)
  const uid = useId()
  // "-mount" ids are the actual Clover mount targets (wider than visible, see
  // MOUNT_WIDTH_OVERSHOOT); the bare ids are their visible, overflow-hidden parents.
  const cardNumberId = `clover-card-number-${uid}`
  const cardDateId = `clover-card-date-${uid}`
  const cardCvvId = `clover-card-cvv-${uid}`
  const cardPostalCodeId = `clover-card-postal-code-${uid}`

  useEffect(() => {
    let cancelled = false
    setReady(false)
    loadCloverScript()
      .then((Clover) => {
        if (cancelled) return
        const clover = new Clover(ecommercePublicKey, { merchantId })
        cloverRef.current = clover
        const elements = clover.elements()
        const cardNumber = elements.create('CARD_NUMBER', CLOVER_FIELD_STYLES)
        const cardDate = elements.create('CARD_DATE', CLOVER_FIELD_STYLES)
        const cardCvv = elements.create('CARD_CVV', CLOVER_FIELD_STYLES)
        const cardPostalCode = elements.create('CARD_POSTAL_CODE', CLOVER_FIELD_STYLES)
        cardNumber.mount(`#${cardNumberId}-mount`)
        cardDate.mount(`#${cardDateId}-mount`)
        cardCvv.mount(`#${cardCvvId}-mount`)
        cardPostalCode.mount(`#${cardPostalCodeId}-mount`)
        setReady(true)
      })
      .catch(() => setFieldErrors('Unable to load the card payment form. Please refresh and try again.'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecommercePublicKey, merchantId, resetSignal])

  useEffect(() => {
    if (resetSignal) setTokenizing(false)
  }, [resetSignal])

  async function handlePayClick() {
    if (!cloverRef.current) return
    setTokenizing(true)
    setFieldErrors(null)
    try {
      const result = await cloverRef.current.createToken()
      if (result.errors) {
        setFieldErrors(Object.values(result.errors).join(' '))
        setTokenizing(false)
        return
      }
      onToken(result.token)
    } catch (error) {
      setFieldErrors('Unable to process the card. Please check the details and try again.')
      setTokenizing(false)
    }
  }

  // No padding here: Clover's iframe fills 100% of this element's box (its own docs guarantee
  // this), so any padding we add just becomes a visible gap between our wrapper's background and
  // the iframe's own surface — a double-box "halo" effect. The border/background/focus ring live
  // on this element; the iframe itself provides its input's internal spacing.
  const fieldWrapperClass =
    'relative h-11 overflow-hidden rounded-lg border border-border/80 transition-colors focus-within:border-[var(--studio-primary)] focus-within:ring-2 focus-within:ring-[var(--studio-primary-light)]'
  const mountStyle = { position: 'absolute', inset: 0, width: `calc(100% + ${MOUNT_WIDTH_OVERSHOOT}px)` }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Secured by Clover
      </div>

      <div className="space-y-3.5">
        <div>
          <label htmlFor={cardNumberId} className="mb-1.5 block text-[12px] font-medium text-foreground">
            Card Number
          </label>
          <div id={cardNumberId} className={fieldWrapperClass}>
            <div id={`${cardNumberId}-mount`} style={mountStyle} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor={cardDateId} className="mb-1.5 block text-[12px] font-medium text-foreground">
              Expiry
            </label>
            <div id={cardDateId} className={fieldWrapperClass}>
              <div id={`${cardDateId}-mount`} style={mountStyle} />
            </div>
          </div>
          <div>
            <label htmlFor={cardCvvId} className="mb-1.5 block text-[12px] font-medium text-foreground">
              CVV
            </label>
            <div id={cardCvvId} className={fieldWrapperClass}>
              <div id={`${cardCvvId}-mount`} style={mountStyle} />
            </div>
          </div>
          <div>
            <label htmlFor={cardPostalCodeId} className="mb-1.5 block text-[12px] font-medium text-foreground">
              ZIP
            </label>
            <div id={cardPostalCodeId} className={fieldWrapperClass}>
              <div id={`${cardPostalCodeId}-mount`} style={mountStyle} />
            </div>
          </div>
        </div>
      </div>

      {fieldErrors && <p className="mt-3 text-[11px] text-red-500">{fieldErrors}</p>}

      <Button
        type="button"
        size="sm"
        className="mt-4 h-10 w-full text-[13px]"
        disabled={disabled || !ready || tokenizing}
        onClick={handlePayClick}
      >
        {tokenizing ? 'Processing…' : `Pay $${Number(amount).toFixed(2)}`}
      </Button>
    </div>
  )
}
