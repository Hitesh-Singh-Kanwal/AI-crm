'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ConfirmReEvaluateDialog({ open, onClose, onConfirm, listName, busy = false }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md">
      <DialogContent onClose={busy ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>Re-evaluate list now?</DialogTitle>
          <DialogDescription>
            {listName ? (
              <>
                Re-run all leads against <span className="font-medium text-foreground">{listName}</span>&apos;s
                conditions?
              </>
            ) : (
              <>Re-run all leads against this list&apos;s conditions?</>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Queuing…' : 'Re-evaluate now'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
