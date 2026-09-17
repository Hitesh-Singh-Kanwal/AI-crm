"use client";

// Shared "pay a payment-plan installment" dialog — used by the main customer
// profile and the calendar mini student panel so both surfaces record plan
// payments identically (amount lock, wallet shortfall, terminal, shortfall
// reschedule). Extracted from app/settings/users-roles/customers/[id]/page.js
// so the two call sites can't drift apart again.

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useCardProcessor } from "@/app/settings/payments/useCardProcessor";
import {
  openCheckoutTab,
  navigateCheckoutTab,
  closeCheckoutTab,
  CHECKOUT_TOAST,
} from "@/lib/clover";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
import { dateInputToISO, todayDateInput } from "@/lib/studioLocalDate";
import WalletShortfallField, {
  walletPaymentFields,
} from "@/components/payments/WalletShortfallField";
import TerminalDeviceField from "@/components/payments/TerminalDeviceField";
import { fetchWalletBalance } from "@/lib/wallet";
import { useToast } from "@/components/ui/toast";

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function PayInstallmentDialog({
  open,
  onClose,
  plan,
  installmentIndex,
  billingType,
  locationID,
  onSuccess,
}) {
  const [method, setMethod] = useState("cash");
  const [shortfallMethod, setShortfallMethod] = useState("cash");
  const [walletBalance, setWalletBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayDateInput);
  const [deviceID, setDeviceID] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { ready: cloverReady } = useCardProcessor(locationID || plan);

  useEffect(() => {
    if (open && plan?.customerID) {
      fetchWalletBalance(plan.customerID?._id ?? plan.customerID).then(
        setWalletBalance,
      );
    }
  }, [open, plan?.customerID]);

  const amountEditable = billingType === "flexible";
  const installment = plan?.installments?.[installmentIndex];
  // Guards the shortfall reschedule below from running twice if the actual
  // payment call fails (e.g. a declined card) and staff retries without
  // closing the dialog — the schedule split already went through once.
  const rescheduledRef = useRef(false);

  // When the wallet cannot cover the installment, the shortfall method is what actually
  // reaches Clover — so it, not the wallet, decides whether a checkout tab is needed.
  const paymentFields = walletPaymentFields({
    method,
    shortfallMethod,
    balance: walletBalance,
    amountDue: Number(amount) || 0,
  });
  const payWithClover = paymentFields.method === "card" && cloverReady;
  const cloverNotConnected = paymentFields.method === "card" && !cloverReady;
  const payWithTerminal = paymentFields.method === "terminal";
  const terminalNotSelected = payWithTerminal && !deviceID;

  useEffect(() => {
    if (installment) setAmount(Number(installment.amount).toFixed(2));
    rescheduledRef.current = false;
    setDeviceID("");
  }, [installment]);

  function validatedAmount() {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid amount.");
      return null;
    }
    return num;
  }

  async function submitPayment() {
    const num = validatedAmount();
    if (num === null) return;
    if (payWithTerminal && !deviceID) return;
    const checkoutTab = payWithClover ? openCheckoutTab() : null;
    setSaving(true);

    // A flexible schedule promises the full balance gets collected. If this
    // installment is being paid for less than its scheduled amount, carve
    // the shortfall into the schedule *before* marking it paid — a
    // single-installment plan otherwise has nothing left pending the moment
    // this one clears, and the backend then has no pending row left to
    // report the balance against, so the remainder silently disappears
    // instead of staying payable. Reordering this ahead of the actual
    // pay-installment call also sidesteps ever asking the backend to add a
    // new installment to a plan it already considers fully paid/completed.
    const shortfall = Number((installment.amount - num).toFixed(2));
    if (billingType === "flexible" && shortfall > 0.01 && !rescheduledRef.current) {
      const otherPending = plan.installments
        .map((i, idx) => ({ ...i, idx }))
        .filter((i) => i.idx !== installmentIndex && i.status === "pending");
      let rescheduleOk;
      if (otherPending.length > 0) {
        const base = Math.floor((shortfall / otherPending.length) * 100) / 100;
        const results = await Promise.all(
          otherPending.map((i, i2) => {
            const bump =
              i2 === otherPending.length - 1
                ? Number((shortfall - base * (otherPending.length - 1)).toFixed(2))
                : base;
            return api.patch(`/api/payment-plan/${plan._id}/installment/${i.idx}/due-date`, {
              dueDate: new Date(i.dueDate).toISOString().slice(0, 10),
              amount: Number((Number(i.amount) + bump).toFixed(2)),
            });
          }),
        );
        rescheduleOk = results.every((r) => r.success);
      } else {
        const addRes = await api.post(`/api/payment-plan/${plan._id}/installment`, {
          dueDate: new Date(installment.dueDate).toISOString().slice(0, 10),
          amount: shortfall,
        });
        rescheduleOk = addRes.success;
      }
      if (!rescheduleOk) {
        closeCheckoutTab(checkoutTab);
        setSaving(false);
        toast.error("Couldn't reschedule the remaining balance — payment not recorded.");
        return;
      }
      rescheduledRef.current = true;
    }

    const res = await api.post(
      `/api/payment-plan/${plan._id}/pay-installment`,
      {
        installmentIndex,
        amount: num,
        paymentDate: dateInputToISO(paymentDate),
        ...(payWithTerminal ? { deviceID } : {}),
        ...walletPaymentFields({
          method,
          shortfallMethod,
          balance: walletBalance,
          amountDue: num,
        }),
      },
    );
    if (res.success) {
      if (res.data?.checkoutUrl) {
        navigateCheckoutTab(checkoutTab, res.data.checkoutUrl);
        toast.success(CHECKOUT_TOAST);
      } else if (res.data?.pending) {
        // A Stripe Terminal charge is async — the PaymentIntent only succeeds
        // once the customer taps their card, settled later by the webhook.
        toast.success("Charge sent to the reader — waiting for the card.");
      } else if (shortfall > 0.01) {
        toast.success(
          `Installment payment recorded — $${shortfall.toFixed(2)} shortfall scheduled as a new payment.`,
        );
      } else {
        toast.success("Installment payment recorded.");
      }
      onSuccess();
      onClose();
    } else {
      closeCheckoutTab(checkoutTab);
      toast.error(res.error || "Failed to record payment.");
    }
    setSaving(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submitPayment();
  }

  async function handleSaveAmount() {
    const num = validatedAmount();
    if (num === null) return;
    setSaving(true);
    const res = await api.patch(
      `/api/payment-plan/${plan._id}/installment/${installmentIndex}/due-date`,
      {
        dueDate: new Date(installment.dueDate).toISOString().slice(0, 10),
        amount: num,
      },
    );
    if (res.success) {
      toast.success("Amount updated.");
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "Failed to update amount.");
    }
    setSaving(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Installment</DialogTitle>
        </DialogHeader>
        {installment && (
          <p className="text-[12px] text-muted-foreground -mt-1">
            Payment {installmentIndex + 1} of {plan.numberOfInstallments} ·{" "}
            <span className="text-foreground font-medium">
              ${Number(installment.amount).toFixed(2)}
            </span>{" "}
            due{" "}
            {new Date(installment.dueDate).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormField label="Amount" required>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={!amountEditable}
              disabled={!amountEditable}
              className={`h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary ${
                amountEditable ? "" : "cursor-not-allowed opacity-70"
              }`}
            />
          </FormField>
          <FormField label="Payment Method" required>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary capitalize"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormField>
          <FormField label="Payment date" required>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
            />
          </FormField>
          <TerminalDeviceField
            method={method}
            locationID={locationID}
            deviceID={deviceID}
            onDeviceChange={setDeviceID}
          />
          <WalletShortfallField
            method={method}
            balance={walletBalance}
            amountDue={Number(amount) || 0}
            shortfallMethod={shortfallMethod}
            onShortfallMethodChange={setShortfallMethod}
          />
          {cloverNotConnected && (
            <p className="text-[12px] text-muted-foreground">
              Connect a card processor (Clover or Stripe) in Settings → Integrations to charge a card.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {amountEditable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleSaveAmount}
              >
                Save
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={saving || cloverNotConnected || terminalNotSelected}
              className="bg-success hover:bg-success text-white"
            >
              {saving
                ? payWithTerminal
                  ? "Waiting for terminal…"
                  : "Recording…"
                : payWithClover
                  ? "Pay by card"
                  : `Pay $${(Number(amount) || 0).toFixed(2)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
