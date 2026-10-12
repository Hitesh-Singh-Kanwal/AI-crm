"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  {
    value: "refund",
    label: "Refund to original payment method",
    hint: "Money goes back the way it was paid.",
  },
  {
    value: "wallet_credit",
    label: "Credit to wallet",
    hint: "Amount is added as wallet balance, usable toward a new enrollment or membership.",
  },
  {
    value: "none",
    label: "Cancel without refund",
    hint: "No money is returned or credited.",
  },
];

export default function CancelRefundDialog({
  open,
  onClose,
  title,
  itemName,
  maxRefundable = 0,
  submitting,
  onConfirm,
}) {
  const [choice, setChoice] = useState("refund");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      setChoice(maxRefundable > 0 ? "refund" : "none");
      setAmount(maxRefundable > 0 ? String(maxRefundable) : "");
    }
  }, [open, maxRefundable]);

  const needsAmount = choice !== "none";
  const num = parseFloat(amount);
  const validAmount =
    !needsAmount || (!isNaN(num) && num > 0 && num <= maxRefundable);

  function handleSubmit() {
    if (!validAmount) return;
    onConfirm(choice, needsAmount ? num : 0);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-muted-foreground mt-1">
          Cancel <span className="font-semibold text-foreground">{itemName}</span>?
        </p>

        <div className="mt-3 space-y-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                choice === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              } ${opt.value !== "none" && maxRefundable <= 0 ? "opacity-40 pointer-events-none" : ""}`}
            >
              <input
                type="radio"
                name="cancel-refund-choice"
                value={opt.value}
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
                className="mt-0.5 accent-brand"
              />
              <span>
                <span className="block text-[13px] font-medium text-foreground">
                  {opt.label}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>

        {needsAmount && (
          <div className="mt-3">
            <label className="block text-[12px] font-medium text-foreground mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxRefundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Up to ${Number(maxRefundable).toFixed(2)} collected.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={submitting || !validAmount}
            onClick={handleSubmit}
          >
            {submitting ? "Cancelling…" : "Confirm Cancellation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
