'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { resolveLocationID } from '@/app/settings/payments/clover/useCloverConnection'

/**
 * Card picker shown when `method === "saved_card"`. Lists the cards this customer
 * saved by tapping on a Stripe reader; the parent reads the chosen one back out via
 * `onCardChange` and sends it as `cardToken` to POST /api/payment.
 *
 * A card can only get here by being used on the reader once — the network has no way
 * to vault a card nobody presented — so the empty state says that rather than leaving
 * staff staring at a blank dropdown.
 */
/**
 * "VISA •••• 4242 — exp 04/29 · saved 12 Sep". The saved date is what separates two
 * cards that would otherwise read identically, and tells staff which one the customer
 * used most recently.
 */
function describeCard(card) {
  const brand = card.brand ? card.brand.toUpperCase() : 'Card'
  const exp = `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
  const base = `${brand} •••• ${card.last4} — exp ${exp}`
  if (!card.savedAt) return base
  const saved = new Date(card.savedAt)
  if (Number.isNaN(saved.getTime())) return base
  return `${base} · saved ${saved.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export default function SavedCardField({
  method,
  locationID,
  customerID,
  cardToken,
  onCardChange,
  className,
}) {
  const resolved = resolveLocationID(locationID)
  const [cards, setCards] = useState(null)

  useEffect(() => {
    if (method !== 'saved_card' || !resolved || !customerID) { setCards(null); return }
    let cancelled = false
    api
      .get(`/api/payments/stripe/customers/${encodeURIComponent(customerID)}/cards?locationID=${encodeURIComponent(resolved)}`)
      .then((res) => {
        if (!cancelled) setCards(res.success && Array.isArray(res.data) ? res.data : [])
      })
    return () => { cancelled = true }
  }, [method, resolved, customerID])

  // Nothing to choose from when exactly one card exists — pick it so staff cannot
  // submit a saved-card charge with no card attached.
  useEffect(() => {
    if (cards?.length === 1 && !cardToken) onCardChange(cards[0].id)
  }, [cards, cardToken, onCardChange])

  if (method !== 'saved_card') return null

  const note = className ?? 'text-[11px] text-muted-foreground'

  if (!resolved) return <p className={note}>No location on this customer — a saved-card charge needs one.</p>
  if (cards === null) return <p className={note}>Loading saved cards…</p>

  if (cards.length === 0) {
    return (
      <p className={note}>
        No saved cards for this customer. A card is saved the first time they pay on a
        Stripe reader — take one terminal payment and it will appear here.
      </p>
    )
  }

  return (
    <select
      value={cardToken || ''}
      onChange={(e) => onCardChange(e.target.value)}
      className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-primary"
    >
      <option value="" disabled>Select saved card…</option>
      {cards.map((c) => (
        <option key={c.id} value={c.id}>
          {describeCard(c)}
        </option>
      ))}
    </select>
  )
}
