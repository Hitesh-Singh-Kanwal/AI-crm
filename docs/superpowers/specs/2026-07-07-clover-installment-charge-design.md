# Clover Charging for Payment Plan Installments (Frontend) — Design

## Context

Follow-on to the "Pay Now" Clover card-charge feature. Extends the same `CloverCardFields`
component to the two existing `PayInstallmentDialog` components, both of which already have a
Method dropdown (including "card") but only ever create a manual/instant Payment record today —
no real charging happens regardless of method selected.

Backend companion spec:
`DanceStudio-CRM-Backend/docs/superpowers/specs/2026-07-07-clover-installment-charge-design.md`.

## Two Dialogs, Same Pattern

1. **`app/settings/users-roles/customers/[id]/page.js:1322`** — package-plan installments. Has an
   editable `amount` field (defaults to the installment's amount, can be overridden — used for
   partial payments) and a `useToast()` hook.
2. **`components/membership/CustomerMembershipsTab.js:34`** — membership-plan installments.
   Simpler: fixed amount (no override), and uses the standalone `toast` object import (`import {
   toast } from '@/components/ui/toast'`), not the `useToast()` hook — a pre-existing difference
   between the two dialogs, not something this spec changes.

Both apply the identical Clover integration pattern already proven in `FlexiblePaymentDueCard`:
when `method === "card"` and the location's Clover connection is active (`useCloverConnection()`),
render `CloverCardFields` instead of the plain submit button; any other method, or card without a
connection, is completely unchanged.

## Architecture

```
PayInstallmentDialog (both variants, modified)
  - useCloverConnection() for { status, merchantId, ecommercePublicKey }
  - showCloverFields = method === "card" && status === "connected" && ecommercePublicKey
  - if showCloverFields: <CloverCardFields ecommercePublicKey merchantId amount onToken=.../>
      instead of the plain "Pay $X" submit button
  - on token: POST /api/payment-plan/:planId/charge-installment
      { installmentIndex, cardToken, amount (package-plan variant only), notes? }
    else (existing path, unchanged): POST /api/payment-plan/:planId/pay-installment
      { installmentIndex, method, amount (package-plan variant only) }
```

`CloverCardFields` is reused with no modification — same component, same props contract, already
built and fixed (retry-on-failure, amount-guard, unique DOM ids) for the "Pay Now" feature.

## Error Handling

Identical to `FlexiblePaymentDueCard`'s established pattern: a failed charge shows an error (toast
in the package-plan dialog, `toast.error(...)` in the membership dialog) and resets the card form
for a fresh retry via `CloverCardFields`' existing `resetSignal` mechanism — no new error-handling
design needed, just applying the same wiring twice.

## Testing Strategy

No test framework in this repo. Manual verification: pay an installment via Clover sandbox test
cards for both a package-plan and a membership-plan installment, confirming success updates the
plan/installment status and a decline shows a retryable error, matching the "Pay Now" feature's
already-verified behavior.

## Out of Scope

- The "Change Date"/amount-save flow (`handleSaveAmount` in the package-plan dialog) — untouched.
- Real Clover refunds.
