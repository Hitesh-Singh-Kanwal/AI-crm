'use client'

import { ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { Dialog } from '@/components/ui/dialog'
import CustomerInboxThread from '@/components/customers/CustomerInboxThread'
import { nameWithMembers } from '@/lib/utils'

const CHANNEL_LABEL = { SMS: 'Messages', Email: 'Email', Call: 'Calls' }

/** Inbox thread for one lead in a popup, opened on the SMS, Email or Call tab. */
export default function LeadCommunicationDialog({ lead, channel = 'SMS', onClose }) {
  const open = Boolean(lead?._id)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      {open && (
        <div className="flex h-[min(80vh,760px)] min-h-[480px] flex-col overflow-hidden rounded-xl border-2 border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              {CHANNEL_LABEL[channel] || 'Conversation'} · {nameWithMembers(lead) || lead.phoneNumber || 'Lead'}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/inbox?filter=leads"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open inbox
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <CustomerInboxThread
            key={`${lead._id}-${channel}`}
            customer={{
              _id: lead._id,
              leadSourceID: lead._id,
              name: lead.name,
              members: lead.members,
              email: lead.email,
              phoneNumber: lead.phoneNumber,
              locationID: lead.locationID,
            }}
            contactType="Lead"
            initialChannel={channel}
          />
        </div>
      )}
    </Dialog>
  )
}
