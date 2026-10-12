'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import SavedCardField from '@/components/payments/SavedCardField'

/**
 * Autopay for a payment plan or a membership: staff pick one of the customer's saved
 * Stripe cards (the ones tapped on a reader) and the nightly jobs charge it as each
 * payment comes due. `path` is that record's PATCH …/autopay endpoint.
 */
export default function AutopayControl({ path, autoCharge, customerID, locationID, onChange }) {
  const [editing, setEditing] = useState(false)
  const [card, setCard] = useState('')
  const [saving, setSaving] = useState(false)
  const on = Boolean(autoCharge?.enabled)

  async function save(paymentMethodId) {
    setSaving(true)
    const res = await api.patch(path, { paymentMethodId })
    setSaving(false)
    if (!res.success) {
      toast.error('Could not update autopay', { description: res.error })
      return
    }
    toast.success(paymentMethodId ? 'Autopay on' : 'Autopay off')
    setEditing(false)
    setCard('')
    onChange?.()
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] text-foreground">
          <CreditCard aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
          Autopay:
          <span className={on ? 'font-medium' : 'text-muted-foreground'}>
            {on ? autoCharge.cardLabel || 'card on file' : 'off'}
          </span>
        </p>
        {!editing && (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => setEditing(true)}>
              {on ? 'Change card' : 'Set up'}
            </Button>
            {on && (
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px]" disabled={saving} onClick={() => save(null)}>
                Turn off
              </Button>
            )}
          </div>
        )}
      </div>
      {editing && (
        <div className="space-y-2">
          <SavedCardField
            method="saved_card"
            locationID={locationID}
            customerID={customerID}
            cardToken={card}
            onCardChange={setCard}
          />
          <p className="text-[11px] text-muted-foreground">
            Charged automatically on each due date. Only turn this on with the customer&apos;s permission.
          </p>
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => { setEditing(false); setCard('') }}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 px-2.5 text-[11px]" disabled={!card || saving} onClick={() => save(card)}>
              {saving ? 'Saving…' : 'Turn on autopay'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
