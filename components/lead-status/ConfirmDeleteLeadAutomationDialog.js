'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ConfirmDeleteLeadAutomationDialog({
  open,
  onClose,
  onConfirm,
  ruleName,
  busy = false,
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md">
      <DialogContent onClose={busy ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>Delete automation?</DialogTitle>
          <DialogDescription>
            {ruleName ? (
              <>
                This will permanently delete{' '}
                <span className="font-medium text-foreground">{ruleName}</span>.
              </>
            ) : (
              <>This will permanently delete this automation rule.</>
            )}
            <span className="mt-2 block">Leads will no longer change status via this rule.</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#EF4444] px-4 text-[13px] font-medium text-white hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
