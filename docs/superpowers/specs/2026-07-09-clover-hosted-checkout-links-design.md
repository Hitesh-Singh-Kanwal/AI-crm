# Clover Hosted Checkout Links — Design

**Date:** 2026-07-09
**Status:** Approved
**Scope:** Frontend (Next.js app). Backend checkout-session creation and webhook reconciliation live in the separate API service and are out of scope here, but the frontend↔backend contract they must satisfy is specified below.

## Summary

Replace the in-app Clover card-tokenization flow with Clover **Hosted Checkout links**. When a staff member clicks **Pay with Clover**, the app no longer collects card details in an iframe. Instead it asks the backend to create a Hosted Checkout session for the purchase amount, then opens the returned Clover URL in a new tab. The customer pays on Clover's own page. A Clover webhook (backend-only) confirms the payment and flips the record to `paid`.

Refunds are **not** handled through Clover — they are handled with the existing wallet only. No refund work is in scope here.

## Motivation

The current implementation (`CloverCardFields.js`) mounts Clover's e-commerce SDK iframes, tokenizes the card client-side, and sends the token inline with the create/charge request. It also supports saving a card to auto-charge future installments. We are dropping all of that in favor of hosted links: no card data touches our UI, and there is no saved-card / auto-charge feature.

## Chosen approach: Create-as-pending, then open checkout (Approach A)

The record is created immediately in a `payment_pending` state; then its Hosted Checkout link opens. This was chosen over an "intent-first, record-created-by-webhook" approach because it keeps records visible in the CRM as soon as staff act, minimally diverges from the current create calls, and makes abandoned checkouts easy to reason about (a stuck `payment_pending` record).

## Frontend ↔ backend contract

Every call that today sends a `cardToken` instead sends **no token** and receives a `checkoutUrl`.

### Create endpoints
`/api/customer-membership`, the package-enrollment create, and the enrollment create endpoints:

- When `billing.method === 'card'`, the backend creates the record in a `payment_pending` state and responds with the created record plus `checkoutUrl`.
- Response shape: `{ ...record, checkoutUrl: string }`.
- Non-card methods (cash, wallet, etc.) are unchanged and return no `checkoutUrl`.

### Installment endpoints
`/api/payment-plan/:id/charge-installment` and `/api/payments/clover/charge`:

- Called with `{ installmentIndex }` (or existing identifying fields) and **no `cardToken`**.
- Backend creates a Hosted Checkout session for that installment's amount and responds `{ checkoutUrl: string }`.

### Webhook (backend-only, not in this repo)
Clover notifies the backend when a checkout is paid; the backend flips the corresponding record / installment from `payment_pending` to `paid`. The frontend does not call or implement the webhook; it only reflects the resulting state on refetch.

## Client behavior

On a successful create/charge response that contains `checkoutUrl`:

1. `window.open(checkoutUrl, '_blank')`.
2. Toast: *"Payment link opened in a new tab — the record will confirm once the customer pays."*
3. Close the dialog/sheet and refresh the relevant list.
4. **Popup-blocked fallback:** if `window.open` returns `null`, do not close the dialog; render a visible clickable link ("Open Clover payment page") so staff can proceed manually.

A single shared helper encapsulates steps 1–4 so all consumers behave identically.

## Components and changes

### Removed
- `app/settings/payments/clover/CloverCardFields.js` — the entire iframe/tokenization component, Clover SDK script loader, and card field styling.
- All `saveCard` / `allowSaveCard` / card-on-file consent UI and plumbing (auto-charge dropped).
- Every `showCloverFields` branch that renders `<CloverCardFields>`, replaced by a plain **Pay with Clover** action on the normal form submit.
- `cardToken` (and `saveCard`) plumbing through `components/enrollment/CreateEnrollmentSheet.js`, `app/calendar/components/AppointmentComposerPanel.js`, and the `app/settings/users-roles/customers/[id]/page.js` sub-forms.

### Consumers to update
- `components/membership/AssignMembershipForm.js`
- `app/calendar/components/NewEnrollmentPackageInline.js`
- `components/membership/CustomerMembershipsTab.js` (installment pay)
- `app/settings/users-roles/customers/[id]/page.js` (membership pay, package add, enrollment add, installment charge — four sub-forms)
- Token pass-through sites: `components/enrollment/CreateEnrollmentSheet.js`, `app/calendar/components/AppointmentComposerPanel.js`

### Retained
- `app/settings/payments/clover/useCloverConnection.js` — slimmed to connection **status** only (drop client usage of `ecommercePublicKey` / `merchantId`). Still gates the card method: when Clover is not `connected`, disable **Pay with Clover** with a "Connect Clover first" hint.
- The Clover settings / OAuth connection page (`CloverConnectionCard.js`, `app/settings/payments`) — untouched.

## Pending state in the UI

Card-created records appear immediately with a **"Payment pending"** badge in the membership / package / enrollment / installment lists, until a later refetch shows them `paid`. No polling — a refetch on next load/focus is sufficient given the webhook.

## Out of scope

- Backend Hosted Checkout session creation and Clover webhook handling (separate API service).
- Refunds (handled by the existing wallet feature; unchanged).
- Recurring / auto-charge of future installments (removed, not replaced).
