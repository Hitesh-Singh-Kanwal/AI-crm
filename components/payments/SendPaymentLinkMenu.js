'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

/**
 * Sends the customer a link they can pay from, beside whatever they owe.
 *
 * A menu rather than a modal: the only decision is which channel, so making staff open a
 * dialog, pick, and confirm would be three interactions for one choice. Picking the
 * channel IS the confirmation.
 *
 * `target` names what is being paid, and the server resolves the amount from it — the
 * balance may move between now and the moment the customer taps the link, so the client
 * never sends a price.
 */

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'Text message', icon: MessageSquare },
  { value: 'both', label: 'Email and text', icon: Send },
]

const money = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0)

export default function SendPaymentLinkMenu({ customerID, target, onSent }) {
  const [sending, setSending] = useState(false)

  async function send(channel) {
    setSending(true)
    const result = await api.post('/api/payment-request', { customerID, target, channel })
    setSending(false)

    if (result.success) {
      toast.success('Payment link sent', {
        description: `They can pay ${money(result.data.amount)} from the link. This updates itself once they do.`,
      })
      onSent?.()
      return
    }

    // The server's message is the useful one — it says which setup step is missing, or
    // that the customer has no phone number on file.
    toast.error('Could not send the payment link', { description: result.error })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={sending}
          aria-busy={sending}
          className="h-7 gap-1.5 px-2 text-[11px]"
        >
          {sending ? (
            <>
              <Loader2 aria-hidden="true" className="h-3 w-3 motion-safe:animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="h-3 w-3" />
              Send link
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Send a payment link by
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CHANNELS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => send(value)} className="gap-2 text-[13px]">
            <Icon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
