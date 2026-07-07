# Clover Card Charge (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Clover card charging to the existing "Pay Now" flow (`FlexiblePaymentDueCard`), using Clover's hosted iframe tokenizer so raw card data never touches our servers.

**Architecture:** A new small component (`CloverCardFields`) owns loading Clover's `clover.js` script, mounting the hosted card-entry iframe fields, and tokenizing on submit. `FlexiblePaymentDueCard` renders it only when `method === "card"` and the location has an active Clover connection (reusing the existing `useCloverConnection` hook), and posts to a new backend endpoint instead of the existing one when a Clover token is present.

**Tech Stack:** Next.js 14 App Router, React, existing `api` client (`lib/api.js`), existing `useToast`/`useCloverConnection` hooks.

## Global Constraints

- No test framework exists in this repo — every task's "test" step is manual dev-server verification, matching this session's established pattern.
- Only the "Pay Now" form on `FlexiblePaymentDueCard` gets real Clover charging in this plan. Other payment entry points are unchanged.
- Every `api.*()` call resolves `{success, data, error}` — never throws. Always branch on `result.success`.
- Backend contract (already planned/implemented per the companion backend plan,
  `DanceStudio-CRM-Backend/docs/superpowers/plans/2026-07-07-clover-card-charge.md`):
  - `GET /api/payments/clover/status` now also returns `ecommercePublicKey: string | null` alongside the existing `status`/`merchantId`/`merchantName`/`connectedAt`/`lastError`.
  - `POST /api/payments/clover/charge` accepts `{ customerID, enrollmentID, type, amount, cardToken }`, responds `{success, data: {payment, tip}, message}` on success or `{success: false, error}` on failure — same shape as the existing `POST /api/payment`.
- Clover's hosted iframe script/API (verified against Clover's current developer docs, not memory):
  - Script: `<script src="https://token-sandbox.dev.clover.com/v1/clover.js">` (sandbox). This repo has no existing env-driven sandbox/production URL switch on the frontend for Clover — hardcode the sandbox URL for now with a one-line comment noting the production URL (`https://checkout.clover.com/sdk.js`-style — **not verified**, flagged for the team to confirm before any production rollout) needs to be swapped in via an env var when this ships beyond sandbox testing. This is an explicit, called-out limitation, not a silent gap.
  - Init: `new Clover(apiAccessKey, { merchantId })`, then `const elements = clover.elements()`.
  - Fields: `elements.create('CARD_NUMBER'|'CARD_DATE'|'CARD_CVV'|'CARD_POSTAL_CODE')`, each `.mount('#element-id')`.
  - Tokenize: `clover.createToken().then(result => result.errors ? ... : result.token)` — token is a one-time-use string starting with `clv_`.
- `PAYMENT_METHODS = ["cash", "card", "online", "cheque", "other", "wallet"]` (`app/settings/users-roles/customers/[id]/page.js:87`) — unchanged, `"card"` already exists as an option.
- `Button` from `@/components/ui/button`, `useToast` from `@/components/ui/toast`, `api` default export from `@/lib/api` — existing imports, same conventions as the rest of this file and the existing Clover components.

---

### Task 1: `CloverCardFields` component

**Files:**
- Create: `app/settings/payments/clover/CloverCardFields.js`

**Interfaces:**
- Consumes: props `{ ecommercePublicKey: string, merchantId: string, amount: number, onToken: (token: string) => void, disabled?: boolean }`.
- Produces: default-exported `CloverCardFields` component. Renders four mounted card-entry containers and a "Pay $X" button; calls `onToken(token)` on successful tokenization. Consumed by Task 2 (`FlexiblePaymentDueCard`).

- [ ] **Step 1: Write the component**

```jsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const CLOVER_JS_SRC = 'https://token-sandbox.dev.clover.com/v1/clover.js'
// NOTE: sandbox-only URL, hardcoded. Before any production rollout, this must become an env-driven
// switch (production Clover.js is served from a different host — confirm the exact URL with Clover's
// current docs before shipping beyond sandbox testing; not verified as part of this plan).

let cloverScriptPromise = null
function loadCloverScript() {
  if (cloverScriptPromise) return cloverScriptPromise
  cloverScriptPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Clover) {
      resolve(window.Clover)
      return
    }
    const script = document.createElement('script')
    script.src = CLOVER_JS_SRC
    script.onload = () => resolve(window.Clover)
    script.onerror = () => reject(new Error('Failed to load Clover payment script'))
    document.head.appendChild(script)
  })
  return cloverScriptPromise
}

export default function CloverCardFields({ ecommercePublicKey, merchantId, amount, onToken, disabled }) {
  const [ready, setReady] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState(null)
  const cloverRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadCloverScript()
      .then((Clover) => {
        if (cancelled) return
        const clover = new Clover(ecommercePublicKey, { merchantId })
        cloverRef.current = clover
        const elements = clover.elements()
        const styles = {}
        const cardNumber = elements.create('CARD_NUMBER', styles)
        const cardDate = elements.create('CARD_DATE', styles)
        const cardCvv = elements.create('CARD_CVV', styles)
        const cardPostalCode = elements.create('CARD_POSTAL_CODE', styles)
        cardNumber.mount('#clover-card-number')
        cardDate.mount('#clover-card-date')
        cardCvv.mount('#clover-card-cvv')
        cardPostalCode.mount('#clover-card-postal-code')
        setReady(true)
      })
      .catch(() => setFieldErrors('Unable to load the card payment form. Please refresh and try again.'))
    return () => {
      cancelled = true
    }
  }, [ecommercePublicKey, merchantId])

  async function handlePayClick() {
    if (!cloverRef.current) return
    setTokenizing(true)
    setFieldErrors(null)
    try {
      const result = await cloverRef.current.createToken()
      if (result.errors) {
        setFieldErrors(Object.values(result.errors).join(' '))
        setTokenizing(false)
        return
      }
      onToken(result.token)
    } catch (error) {
      setFieldErrors('Unable to process the card. Please check the details and try again.')
      setTokenizing(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div id="clover-card-number" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-date" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-cvv" className="h-8 rounded-md border border-border bg-background px-2.5" />
        <div id="clover-card-postal-code" className="h-8 rounded-md border border-border bg-background px-2.5" />
      </div>
      {fieldErrors && <p className="text-[11px] text-red-600">{fieldErrors}</p>}
      <Button
        type="button"
        size="sm"
        className="h-8 px-3 text-[11px]"
        disabled={disabled || !ready || tokenizing}
        onClick={handlePayClick}
      >
        {tokenizing ? 'Processing…' : `Pay $${Number(amount).toFixed(2)}`}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. This component isn't wired into any page yet (Task 2 does that) — confirm it at least compiles with no import errors by checking the dev server output for this file, and confirm no console errors on a page that doesn't render it yet (i.e. nothing regresses from just adding this file).

- [ ] **Step 3: Commit**

```bash
git add app/settings/payments/clover/CloverCardFields.js
git commit -m "feat: add CloverCardFields hosted card-tokenizer component"
```

---

### Task 2: Wire `CloverCardFields` into `FlexiblePaymentDueCard`

**Files:**
- Modify: `app/settings/users-roles/customers/[id]/page.js:4841-5026` (the `FlexiblePaymentDueCard` function only)

**Interfaces:**
- Consumes: `CloverCardFields` (Task 1), `useCloverConnection` from `@/app/settings/payments/clover/useCloverConnection` (existing hook — returns `{status, ecommercePublicKey, merchantId, ...}` once the companion backend plan's status DTO extension ships; if `ecommercePublicKey`/`merchantId` aren't present yet because the backend isn't deployed, the hook's existing graceful `disconnected` fallback means the Clover fields simply never render — no crash).
- Produces: no change to this component's external interface (`{enr, customerID, onSuccess}` props unchanged).

- [ ] **Step 1: Add the import**

At the top of `app/settings/users-roles/customers/[id]/page.js`, alongside the other imports (near line 44-45), add:

```js
import { useCloverConnection } from '@/app/settings/payments/clover/useCloverConnection'
import CloverCardFields from '@/app/settings/payments/clover/CloverCardFields'
```

- [ ] **Step 2: Modify `FlexiblePaymentDueCard`**

Replace the function body from its start through `handlePay` (lines 4841-4878) with:

```js
function FlexiblePaymentDueCard({ enr, customerID, onSuccess }) {
  const cp = enr.package;
  const collected = cp.amountCollected ?? 0;
  const outstanding = Math.max(0, (cp.totalPaid ?? 0) - collected);
  const isOverdue =
    cp.dueDate && outstanding > 0 && new Date(cp.dueDate) < new Date();
  const [mode, setMode] = useState(null); // "pay" | "change-date"
  const [amount, setAmount] = useState(String(outstanding.toFixed(2)));
  const [method, setMethod] = useState("cash");
  const [newDueDate, setNewDueDate] = useState(
    cp.dueDate ? new Date(cp.dueDate).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { status: cloverStatus, merchantId: cloverMerchantId, ecommercePublicKey } = useCloverConnection();

  const showCloverFields = method === "card" && cloverStatus === "connected" && ecommercePublicKey;

  async function submitPayment(cardToken) {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setSaving(true);
    const res = cardToken
      ? await api.post("/api/payments/clover/charge", {
          customerID,
          enrollmentID: enr._id,
          type: "package_purchase",
          amount: num,
          cardToken,
        })
      : await api.post("/api/payment", {
          customerID,
          enrollmentID: enr._id,
          type: "package_purchase",
          amount: num,
          method,
        });
    if (res.success) {
      toast.success(
        num >= outstanding ? "Payment recorded." : "Partial payment recorded.",
      );
      setMode(null);
      onSuccess();
    } else {
      toast.error(res.error || "Failed to record payment.");
    }
    setSaving(false);
  }

  async function handlePay(e) {
    e.preventDefault();
    if (showCloverFields) return; // Clover path is submitted via CloverCardFields' onToken, not this form submit
    await submitPayment(null);
  }
```

- [ ] **Step 3: Add the Clover fields into the "pay" form's render**

In the same function's JSX (originally lines 4967-5026, the `{mode === "pay" && (...)}` block), find the `<div className="flex gap-1.5">` block containing the Cancel/Confirm Payment buttons (originally lines 5006-5024) and replace it with:

```jsx
          {showCloverFields ? (
            <div className="w-full pt-2">
              <CloverCardFields
                ecommercePublicKey={ecommercePublicKey}
                merchantId={cloverMerchantId}
                amount={parseFloat(amount) || 0}
                disabled={saving}
                onToken={(token) => submitPayment(token)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px] mt-2"
                onClick={() => setMode(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px]"
                onClick={() => setMode(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-[11px]"
                disabled={saving}
              >
                {saving ? "Saving…" : "Confirm Payment"}
              </Button>
            </div>
          )}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, navigate to a customer with a flexible-billing package showing an outstanding balance.
- Select Method: **Cash** (or any non-card method) → confirm the form looks and behaves exactly as before (instant submit, no Clover fields).
- Select Method: **Card**, with the location's Clover connection in `disconnected` state (the default, since no real connection exists in most dev sessions) → confirm it falls back to the existing plain "Confirm Payment" button (no Clover fields, no crash) — this proves the fallback path.
- If you have the sandbox Clover connection from this session active on this location: select Method: **Card** → confirm the four Clover card-entry boxes and a "Pay $X" button appear instead. (Full tokenize+charge verification happens once the backend endpoint is deployed — see Task 3.)

- [ ] **Step 5: Commit**

```bash
git add "app/settings/users-roles/customers/[id]/page.js"
git commit -m "feat: wire Clover card charging into the Pay Now flow"
```

---

### Task 3: Manual sandbox end-to-end verification

**Files:** None — verification only.

- [ ] **Step 1: Confirm the build still passes**

Run: `npm run build`
Expected: succeeds, no new errors (matches the existing baseline from this session's earlier Clover connection-management work).

- [ ] **Step 2: End-to-end test against the sandbox Clover connection from this session**

Once the companion backend plan is deployed and this location's Clover connection is active:
1. Navigate to a customer with an outstanding flexible-billing balance, select Method: Card, confirm the Clover card fields render.
2. Enter one of Clover's published sandbox test card numbers that simulates a successful charge, click Pay — confirm a success toast, the outstanding balance updates, and (checking the backend/database) a real `Payment` record exists with `method: "card"` and a populated `cloverChargeId`.
3. Enter a sandbox test card number that simulates a decline — confirm a clear inline error from `CloverCardFields` or a toast from the failed charge response, and that no `Payment` record was created.
4. Confirm the existing cash/online/cheque/other/wallet methods are completely unaffected.

## Self-Review Notes

- **Spec coverage:** `CloverCardFields` (Task 1) covers the frontend spec's tokenization architecture section exactly (script load, init, mount, tokenize). Task 2 covers the "Pay Now" integration and fallback-when-disconnected behavior. Task 3 covers manual verification. The production Clover.js URL gap is explicitly flagged as unverified rather than silently guessed — consistent with this session's lesson about not inventing Clover host URLs from memory.
- **Placeholder scan:** no TBD/TODO; every step has complete, runnable code.
- **Type consistency:** `CloverCardFields`' props (`ecommercePublicKey`, `merchantId`, `amount`, `onToken`, `disabled`) match exactly between Task 1's definition and Task 2's usage. `submitPayment(cardToken)`'s branching (Clover charge endpoint vs. existing `/api/payment`) matches the backend plan's two distinct endpoints exactly.
