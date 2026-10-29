"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

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
  maxRefundable: maxRefundableProp = 0,
  // Programs: the server works out the fair refund (lessons already used are kept).
  quoteUrl = null,
  submitting,
  onConfirm,
}) {
  const [choice, setChoice] = useState("refund");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const quoteLoading = Boolean(quoteUrl) && !quote && !quoteError;
  const maxRefundable = quote ? quote.refundable : maxRefundableProp;

  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!open || !quoteUrl) return;
    let live = true;
    api.get(quoteUrl).then((res) => {
      if (!live) return;
      if (res.success) setQuote(res.data);
      else setQuoteError(res.error || "Could not work out the refund");
    });
    return () => {
      live = false;
    };
  }, [open, quoteUrl]);

  useEffect(() => {
    if (!open || quoteLoading || quoteError) return;
    const suggested = quote ? quote.suggestedRefund : maxRefundable;
    setChoice(suggested > 0 ? "refund" : "none");
    setAmount(suggested > 0 ? String(suggested) : "");
  }, [open, quote, quoteLoading, quoteError, maxRefundable]);

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

        {quoteLoading && (
          <p className="mt-2 text-[12px] text-muted-foreground">Working out the refund…</p>
        )}
        {quoteError && (
          <p className="mt-2 text-[12px] text-destructive">{quoteError}. Close and try again.</p>
        )}
        {quote && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-[12px] space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{money(quote.collected)} of {money(quote.contractValue)}</span></div>
            {quote.services.map((s) => (
              <div key={s.serviceCode} className="flex justify-between">
                <span className="text-muted-foreground">{s.serviceName}: {s.sessionsUsed} of {s.sessionsTotal} used</span>
                <span>{money(s.usedValue)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium text-foreground border-t border-border pt-1">
              <span>Fair refund</span><span>{money(quote.suggestedRefund)}</span>
            </div>
            {quote.owedForUsed > 0 && (
              <p className="text-amber-600">Student has used {money(quote.owedForUsed)} more than they paid; this stays owed.</p>
            )}
            {quote.collected > quote.refundable && (
              <p className="text-muted-foreground">Only {money(quote.refundable)} was paid in Cadance and can be refunded here.</p>
            )}
            <p className="text-muted-foreground">Upcoming booked lessons go back to unallocated and are not counted as used.</p>
          </div>
        )}

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
                step="any"
                max={maxRefundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {quote && num > quote.suggestedRefund
                ? `More than the fair refund of ${money(quote.suggestedRefund)} — lessons already used would be refunded too.`
                : `Up to ${money(maxRefundable)} collected.`}
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
            disabled={submitting || !validAmount || quoteLoading || Boolean(quoteError)}
            onClick={handleSubmit}
          >
            {submitting ? "Cancelling…" : "Confirm Cancellation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
