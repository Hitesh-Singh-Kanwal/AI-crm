"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

export default function FreezeMembershipDialog({
  open,
  onClose,
  itemName,
  freezeCapDays,
  freezeDaysUsed = 0,
  submitting,
  onConfirm,
}) {
  const today = toDateInput(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    if (open) {
      setStartDate(today);
      setEndDate(today);
    }
  }, [open, today]);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
  const remaining = freezeCapDays != null ? freezeCapDays - freezeDaysUsed : null;
  const validRange = end > start;
  const withinCap = remaining == null || days <= remaining;

  function handleSubmit() {
    if (!validRange || !withinCap) return;
    onConfirm(startDate, endDate);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Freeze Membership</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-muted-foreground mt-1">
          Freeze <span className="font-semibold text-foreground">{itemName}</span>. The expiry date will be pushed back by the number of days frozen.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">
              Start date
            </label>
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">
              End date
            </label>
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary"
            />
          </div>
        </div>

        {validRange && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {days} day{days === 1 ? "" : "s"} frozen
            {remaining != null && ` · ${Math.max(0, remaining)} of ${freezeCapDays} days remaining this membership year`}
          </p>
        )}
        {!validRange && (
          <p className="text-[11px] text-red-600 mt-2">End date must be after start date.</p>
        )}
        {validRange && !withinCap && (
          <p className="text-[11px] text-red-600 mt-2">
            This exceeds the remaining freeze allowance ({Math.max(0, remaining)} days left).
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || !validRange || !withinCap}
            onClick={handleSubmit}
          >
            {submitting ? "Freezing…" : "Freeze Membership"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
