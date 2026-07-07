# Clover Card Charge (Frontend) — Design

## Context

Follow-on to `docs/superpowers/specs/2026-07-06-clover-oauth-payments-design.md`, which built the
Settings → Payments → Clover connection UI only. This spec adds real card charging to the existing
"Pay Now" flow on flexible-billing packages (`FlexiblePaymentDueCard` in
`app/settings/users-roles/customers/[id]/page.js:4841-5026`), using Clover's hosted iframe tokenizer so
raw card data never touches our frontend or backend servers.

Backend companion spec: `DanceStudio-CRM-Backend/docs/superpowers/specs/2026-07-07-clover-card-charge-design.md`.

## Scope Decisions

- **Only the "Pay Now" form** on `FlexiblePaymentDueCard` gets real Clover charging. Method dropdown
  already includes `"card"` (`PAYMENT_METHODS`) — when `method === "card"` **and** the current location has
  an active Clover connection, the form shows Clover's hosted card-entry fields instead of submitting
  instantly. Any other method, or `card` with no Clover connection, keeps today's exact behavior
  (instant `POST /api/payment`).
- **New small component**, not more inline code in the already very large `page.js`: a
  `CloverCardFields` component (new file) owns the `clover.js` script load, iframe mounting, and
  tokenization — `FlexiblePaymentDueCard` only calls it and receives a token back. Matches this session's
  established pattern of keeping Clover-specific UI in `app/settings/payments/clover/`.
- **Refund flow (`IssueRefundDialog`) is untouched** in this version — stays a local-only record per the
  backend spec's scope decision.

## Architecture

```
FlexiblePaymentDueCard (existing component, modified)
  - on mount / when opening "Pay Now": checks useCloverConnection()-style status
    (reuses the same status DTO shape already established: status/merchantId/ecommercePublicKey)
  - if method === "card" AND status === "connected":
      renders <CloverCardFields onToken={handleClover Token} amount={amount} />
      instead of the plain "Confirm Payment" submit
  - CloverCardFields calls clover.createToken() -> passes the resulting token up
  - handlePay (modified): if a Clover token is present, POST to
      /api/payments/clover/charge  { customerID, enrollmentID, type: "package_purchase", amount, cardToken }
    else (existing path, unchanged): POST /api/payment { ...same fields, method }

app/settings/payments/clover/CloverCardFields.js  (NEW)
  - loads https://token-sandbox.dev.clover.com/v1/clover.js (or prod equivalent) once, lazily
  - new Clover(ecommercePublicKey, { merchantId })
  - elements.create('CARD_NUMBER'|'CARD_DATE'|'CARD_CVV'|'CARD_POSTAL_CODE') mounted into 4 small
    bordered containers matching this app's existing input styling as closely as Clover's iframe
    CSS customization API allows
  - exposes a "Pay $X" button that calls clover.createToken(), surfaces validation errors inline
    (Clover's result.errors), and calls onToken(result.token) on success
```

## Where the Ecommerce Public Key Comes From

The existing `useCloverConnection` hook (`app/settings/payments/clover/useCloverConnection.js`) already
fetches `GET /api/payments/clover/status` on mount. Per the backend spec, that response gains an
`ecommercePublicKey` field. `FlexiblePaymentDueCard` needs this same data — rather than duplicating the
fetch, `useCloverConnection` is reused directly wherever "Pay Now" is rendered (it's a cheap, cached-by-
React-Query-pattern-or-plain-state hook already built for this purpose).

## Error Handling

- Clover's `createToken()` validation errors (bad card number, expired, etc.) shown inline in the card
  form, matching Clover's `result.errors` shape — the "Pay" button stays enabled for retry, no partial
  state.
- `POST /api/payments/clover/charge` failure (declined card, connection broken) → toast error with the
  backend's message. Clover tokens are single-use, so `CloverCardFields` resets its mounted iframe fields
  after a failed charge — the customer must re-enter their card, and the next attempt tokenizes fresh
  input rather than retrying a token Clover has already consumed.
- If the location's Clover connection breaks between page load and submit (e.g. token revoked
  server-side), the charge endpoint's specific error message ("Clover connection needs to be reconnected")
  is shown as-is, pointing the user to Settings → Payments.

## Testing Strategy

No test framework exists in this repo (matches the connection-management spec). Manual verification:
`npm run build` passing, then a real "Pay Now" against a connected sandbox merchant using Clover's test
card numbers — confirm a successful charge shows a success toast and the outstanding balance updates,
and a declined test card number shows a clean inline error with no false-positive "payment recorded"
state.

## Out of Scope (this spec)

- Initial-package-payment and installment payment entry points — follow-on.
- Real Clover refunds.
- Multi-currency support.

## Sources

Clover API details verified via their current developer documentation (not assumed from memory):
- [Generate a public API access key or PAKMS key](https://docs.clover.com/dev/docs/generate-ecommerce-api-key-or-pakms-key)
- [Create a charge](https://docs.clover.com/dev/docs/create-a-charge)
- [Create a card token](https://docs.clover.com/dev/docs/create-a-card-token)
- [Clover iframe integrations](https://docs.clover.com/dev/docs/clover-iframe-integrations)
- [Using the Clover hosted iframe](https://docs.clover.com/dev/docs/using-the-clover-hosted-iframe)
