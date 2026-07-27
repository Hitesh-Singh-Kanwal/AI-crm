'use client'

import { useState } from 'react'
import { Phone, PhoneCall, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function CallMessageInput({
  phoneNumber,
  contactName,
  onPlaceCall,
  calling = false,
  disabled = false,
  disabledReason = '',
}) {
  const [confirming, setConfirming] = useState(false)
  const canCall = Boolean(phoneNumber) && !disabled && !calling

  const handleClick = async () => {
    if (!canCall) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    await onPlaceCall?.()
  }

  return (
    <div className="border-t border-border bg-card px-4 py-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)] shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Call {contactName || 'contact'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {phoneNumber
                ? `We’ll dial ${phoneNumber} from the studio number selected in the navbar. You’ll talk in this browser, and the call will be recorded in the call log.`
                : 'This contact has no phone number on file.'}
            </p>
            {disabledReason && (
              <p className="mt-2 text-xs text-destructive">{disabledReason}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          {confirming && (
            <Button
              type="button"
              variant="outline"
              disabled={calling}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="gradient"
            disabled={!canCall}
            onClick={handleClick}
            className={cn('min-w-[140px]', confirming && 'bg-emerald-600 hover:bg-emerald-700')}
          >
            {calling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calling…
              </>
            ) : confirming ? (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Confirm call
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Place call
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
