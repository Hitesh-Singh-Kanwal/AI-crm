'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const CLOVER_JS_SRC = 'https://token-sandbox.dev.clover.com/v1/clover.js'
// NOTE: sandbox-only URL, hardcoded. Before any production rollout, this must become an env-driven
// switch (production Clover.js is served from a different host — confirm the exact URL with Clover's
// current docs before shipping beyond sandbox testing; not verified as part of this plan).

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

export default function CloverCardFields({ ecommercePublicKey, merchantId, amount, onToken, disabled }) {
  const [ready, setReady] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState(null)
  const cloverRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadCloverScript()
      .then((Clover) => {
        if (cancelled) return
        const clover = new Clover(ecommercePublicKey, { merchantId })
        cloverRef.current = clover
        const elements = clover.elements()
        const styles = {}
        const cardNumber = elements.create('CARD_NUMBER', styles)
        const cardDate = elements.create('CARD_DATE', styles)
        const cardCvv = elements.create('CARD_CVV', styles)
        const cardPostalCode = elements.create('CARD_POSTAL_CODE', styles)
        cardNumber.mount('#clover-card-number')
        cardDate.mount('#clover-card-date')
        cardCvv.mount('#clover-card-cvv')
        cardPostalCode.mount('#clover-card-postal-code')
        setReady(true)
      })
      .catch(() => setFieldErrors('Unable to load the card payment form. Please refresh and try again.'))
    return () => {
      cancelled = true
    }
  }, [ecommercePublicKey, merchantId])

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

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div id="clover-card-number" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-date" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-cvv" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-postal-code" className="h-8 rounded-md border border-border bg-background px-2.5" />
      </div>
      {fieldErrors && <p className="text-[11px] text-red-600">{fieldErrors}</p>}
      <Button
        type="button"
        size="sm"
        className="h-8 px-3 text-[11px]"
        disabled={disabled || !ready || tokenizing}
        onClick={handlePayClick}
      >
        {tokenizing ? 'Processing…' : `Pay $${Number(amount).toFixed(2)}`}
      </Button>
    </div>
  )
}
