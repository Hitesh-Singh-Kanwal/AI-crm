# Clover Hosted Checkout Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-app Clover card-entry/tokenization flow with Clover Hosted Checkout links — clicking Pay opens a Clover-hosted payment page in a new tab; a backend webhook (out of scope) confirms payment.

**Architecture:** Delete the `CloverCardFields` iframe component and all card-token plumbing. A tiny shared helper (`lib/clover.js`) pre-opens a browser tab inside the click handler (so it is not popup-blocked) and navigates it to the `checkoutUrl` the backend returns from the normal create/pay endpoints when `method === 'card'`. Records/installments settled by card come back in a `payment_pending` state and are shown with a pending badge until the webhook flips them to `paid`.

**Tech Stack:** Next.js 14 App Router, React, existing `api` client (`lib/api.js`), existing `useCloverConnection` hook, `toast` from `@/components/ui/toast` (and `useToast()` in the customer detail page).

## Global Constraints

- **No test framework exists in this repo** — every task's "test" step is manual dev-server verification plus `npm run lint`, matching this repo's established pattern (see `docs/superpowers/plans/2026-07-07-clover-card-charge.md`).
- **Every `api.*()` call resolves `{ success, data, error }` — never throws.** Always branch on `result.success`. The settled payload is `result.data`; read the checkout link as `result.data?.checkoutUrl`.
- **Finalized backend contract (backend lives in the separate API service; this plan only consumes it):**
  - When a request carries `method: 'card'` (or `billing.method === 'card'`), the settling endpoint creates a Clover Hosted Checkout session and returns `checkoutUrl: string` on the success payload, and sets the affected record/installment to a `payment_pending` state. No `cardToken` is ever sent.
  - Card-settling endpoints and where the `checkoutUrl` appears:
    - `POST /api/customer-membership` → `data.checkoutUrl` (one-time card membership)
    - `POST /api/customer-package/add` → `data.checkoutUrl` (one-time card package/enrollment)
    - `POST /api/payment` → `data.checkoutUrl` (flexible package card payment)
    - `POST /api/payment-plan/:id/pay-installment` → `data.checkoutUrl` (card installment)
  - The previously-used card-only endpoints `POST /api/payments/clover/charge` and `POST /api/payment-plan/:id/charge-installment` are **no longer called from the frontend** — the normal endpoints above handle card via `method: 'card'`.
  - Pending-state values the frontend reads:
    - Records: `paymentStatus: 'payment_pending'` (memberships, packages, enrollments).
    - Installments: `installments[].status: 'payment_pending'`.
  - The webhook flips `payment_pending → paid`; the frontend reflects this on the next refetch (no polling).
- **`useCloverConnection` is NOT modified.** It still returns `merchantId`/`merchantName` used by the settings page (`CloverConnectionCard.js`). Payment consumers simply stop destructuring `merchantId`/`ecommercePublicKey` and keep only `status`.
- **`PAYMENT_METHODS`** already includes `'card'` in every consumer — unchanged.
- Popup rule: the checkout tab MUST be opened synchronously inside the click handler (`openCheckoutTab()`), before any `await`, then navigated after the response. Opening it after `await` gets blocked by browsers.
- Copy: the success toast after opening a link uses the shared `CHECKOUT_TOAST` constant verbatim. The card-disabled hint copy is verbatim: `Connect Clover in Settings → Payments to charge a card.`

---

### Task 1: Shared checkout-tab helper

**Files:**
- Create: `lib/clover.js`

**Interfaces:**
- Produces:
  - `openCheckoutTab(): Window | null` — call synchronously in the click handler before awaiting.
  - `navigateCheckoutTab(tab: Window | null, url: string): void`
  - `closeCheckoutTab(tab: Window | null): void`
  - `CHECKOUT_TOAST: string`
- Consumed by Tasks 2–5.

- [ ] **Step 1: Write the helper**

```js
// Clover Hosted Checkout opens on Clover's own site in a new tab. To avoid the
// browser blocking that tab as a non-user-initiated popup, callers open a blank
// tab synchronously inside the click handler (openCheckoutTab), then navigate it
// to the real checkout URL once the backend responds (navigateCheckoutTab), or
// close it if the request failed (closeCheckoutTab).

export const CHECKOUT_TOAST =
  'Payment link opened in a new tab — this will be marked paid once the customer completes payment.'

export function openCheckoutTab() {
  if (typeof window === 'undefined') return null
  return window.open('about:blank', '_blank')
}

export function navigateCheckoutTab(tab, url) {
  if (!url) return
  if (tab && !tab.closed) {
    tab.opener = null
    tab.location.replace(url)
  } else if (typeof window !== 'undefined') {
    // Pre-opened tab was blocked or closed — fall back to a direct open.
    window.open(url, '_blank', 'noopener')
  }
}

export function closeCheckoutTab(tab) {
  if (tab && !tab.closed) tab.close()
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint -- lib/clover.js` (or `npm run lint`)
Expected: no errors for `lib/clover.js`.

- [ ] **Step 3: Commit**

```bash
git add lib/clover.js
git commit -m "feat: add Clover hosted-checkout tab helper"
```

---

### Task 2: AssignMembershipForm — open checkout instead of tokenizing

**Files:**
- Modify: `components/membership/AssignMembershipForm.js`

**Interfaces:**
- Consumes: `openCheckoutTab`, `navigateCheckoutTab`, `closeCheckoutTab`, `CHECKOUT_TOAST` from Task 1; `POST /api/customer-membership` returning `data.checkoutUrl` for card.

- [ ] **Step 1: Swap imports**

Replace line 11:
```js
import CloverCardFields from '@/app/settings/payments/clover/CloverCardFields'
```
with:
```js
import { openCheckoutTab, navigateCheckoutTab, closeCheckoutTab, CHECKOUT_TOAST } from '@/lib/clover'
```

- [ ] **Step 2: Slim the hook destructure and drop the reset signal**

Delete line 30 (`const [cloverResetSignal, setCloverResetSignal] = useState(0)`).
Replace line 31:
```js
  const { status: cloverStatus, merchantId: cloverMerchantId, ecommercePublicKey } = useCloverConnection()
```
with:
```js
  const { status: cloverStatus } = useCloverConnection()
```

- [ ] **Step 3: Replace the `showCloverFields` derivation (lines 56-62)**

```js
  // One-time card purchases settle through Clover's hosted page; everything else
  // (cash, wallet, flexible schedules) is recorded directly.
  const payWithClover =
    billingType === 'one_time' && method === 'card' && remaining > 0 && cloverStatus === 'connected'
  const cloverNotConnected =
    billingType === 'one_time' && method === 'card' && remaining > 0 && cloverStatus !== 'connected'
```

- [ ] **Step 4: Rewrite `handleSubmit` (lines 82-129)**

```js
  async function handleSubmit() {
    if (!customerID) { toast.error('Select a student first'); return }
    if (!membershipID) { toast.error('Select a membership'); return }
    if (walletOver) {
      toast.error('Insufficient wallet balance', { description: `Wallet has $${walletBalance.toFixed(2)} but you entered $${walletEntered.toFixed(2)}.` })
      return
    }

    const billing = {}
    if (billingType === 'one_time') {
      billing.method = method
      if (walletApplied > 0) billing.walletAmount = walletApplied
    }
    else if (billingType === 'flexible') {
      if (scheduleMode === 'custom') {
        const valid = customInstallments.filter((c) => c.dueDate && Number(c.amount) > 0)
        if (valid.length === 0) { toast.error('Add at least one scheduled payment with a date and amount'); return }
        if (Math.abs(customTotal - price) > 0.01) {
          toast.error(`Scheduled payments total $${customTotal.toFixed(2)} but the price is $${price.toFixed(2)}`); return
        }
        billing.customInstallments = valid.map((c) => ({ dueDate: c.dueDate, amount: Number(c.amount) }))
      } else {
        if (!dueDate) { toast.error('Due date is required for flexible billing'); return }
        billing.dueDate = dueDate
      }
    }

    const checkoutTab = payWithClover ? openCheckoutTab() : null
    setSubmitting(true)
    try {
      const result = await api.post('/api/customer-membership', {
        customerID,
        membershipID,
        billingType,
        billing,
        notes: notes.trim() || undefined,
      })
      if (result.success) {
        if (result.data?.checkoutUrl) {
          navigateCheckoutTab(checkoutTab, result.data.checkoutUrl)
          toast.success(CHECKOUT_TOAST)
        } else {
          toast.success('Membership assigned')
        }
        onSuccess?.()
      } else {
        closeCheckoutTab(checkoutTab)
        toast.error('Failed to assign membership', { description: result.error })
      }
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 5: Delete the `<CloverCardFields>` block (lines 256-265)**

Remove the entire block:
```js
          {showCloverFields && (
            <CloverCardFields
              ecommercePublicKey={ecommercePublicKey}
              merchantId={cloverMerchantId}
              amount={remaining}
              disabled={submitting || walletOver}
              resetSignal={cloverResetSignal}
              onToken={(token) => handleSubmit(token)}
            />
          )}
```

- [ ] **Step 6: Restore the always-present submit button (lines 345-353)**

Replace:
```js
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        {/* The Clover pay button submits the card path; it owns the token. */}
        {!showCloverFields && (
          <Button onClick={() => handleSubmit()} disabled={submitting || walletOver} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {submitting ? 'Assigning…' : 'Assign Membership'}
          </Button>
        )}
      </div>
```
with:
```js
      <div className="flex flex-col gap-1.5 pt-2">
        {cloverNotConnected && (
          <p className="text-[11px] text-amber-600 text-right">Connect Clover in Settings → Payments to charge a card.</p>
        )}
        <div className="flex justify-end gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>}
          <Button onClick={() => handleSubmit()} disabled={submitting || walletOver || cloverNotConnected} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {submitting ? 'Assigning…' : payWithClover ? 'Pay with Clover' : 'Assign Membership'}
          </Button>
        </div>
      </div>
```

- [ ] **Step 7: Verify + commit**

Run: `npm run lint` — expect no new errors in this file.
Manual: `npm run dev`, open Assign Membership, one-time + card with Clover connected → button reads "Pay with Clover", clicking opens a new tab; with Clover disconnected → button disabled with the hint. Cash/flexible unaffected.

```bash
git add components/membership/AssignMembershipForm.js
git commit -m "feat: open Clover hosted checkout from membership assignment"
```

---

### Task 3: Enrollment+package wizard and its two orchestrators

**Files:**
- Modify: `app/calendar/components/NewEnrollmentPackageInline.js`
- Modify: `components/enrollment/CreateEnrollmentSheet.js`
- Modify: `app/calendar/components/AppointmentComposerPanel.js`

**Interfaces:**
- Consumes: Task 1 helpers; `POST /api/customer-package/add`, `POST /api/payment`, `POST /api/payment-plan/:id/pay-installment` returning `data.checkoutUrl` for card.
- Produces: `onSubmit(payload)` now resolves `{ ok: boolean, checkoutUrl: string | null }` (was a boolean). Both orchestrators return this shape.

- [ ] **Step 1 (inline): swap imports**

In `NewEnrollmentPackageInline.js` replace line 7:
```js
import CloverCardFields from "@/app/settings/payments/clover/CloverCardFields";
```
with:
```js
import { openCheckoutTab, navigateCheckoutTab, closeCheckoutTab, CHECKOUT_TOAST } from "@/lib/clover";
```

- [ ] **Step 2 (inline): slim the hook destructure (line 179)**

Replace:
```js
  const { status: cloverStatus, merchantId: cloverMerchantId, ecommercePublicKey } = useCloverConnection();
```
with:
```js
  const { status: cloverStatus } = useCloverConnection();
```
Then delete the `cloverResetSignal` state declaration in this component (search `const [cloverResetSignal, setCloverResetSignal] = useState(0)` near the other `useState` calls) and remove its only other use inside `handleSubmit` (handled in Step 4).

- [ ] **Step 3 (inline): replace `showCloverFields` (lines 408-415)**

```js
  const payWithClover =
    step === 2 &&
    form.billingType !== "pay_per_session" &&
    form.billing.collectNow &&
    form.billing.method === "card" &&
    cardChargeAmount > 0 &&
    cloverStatus === "connected";
  const cloverNotConnected =
    step === 2 &&
    form.billingType !== "pay_per_session" &&
    form.billing.collectNow &&
    form.billing.method === "card" &&
    cardChargeAmount > 0 &&
    cloverStatus !== "connected";
```

- [ ] **Step 4 (inline): rewrite `handleSubmit` (lines 472-500)**

```js
  async function handleSubmit() {
    setError("");
    const collect =
      form.billingType !== "pay_per_session" &&
      form.billing.collectNow &&
      Number(form.billing.collectAmount) > 0;
    const payload = {
      ...form,
      billing: {
        ...form.billing,
        collectNow: collect,
        collectAmount: collect ? Number(form.billing.collectAmount) : 0,
      },
    };
    if (form.tip.enabled && form.tip.amount && form.teacherID) {
      payload.tip = { teacherID: form.teacherID, amount: form.tip.amount, method: form.tip.method };
    } else {
      payload.tip = undefined;
    }

    const checkoutTab = payWithClover ? openCheckoutTab() : null;
    setLoading(true);
    const res = await onSubmit?.(payload);
    setLoading(false);
    if (!res?.ok) {
      closeCheckoutTab(checkoutTab);
      setError("Failed to create enrollment and package.");
      return;
    }
    if (res.checkoutUrl) {
      navigateCheckoutTab(checkoutTab, res.checkoutUrl);
      toast.success(CHECKOUT_TOAST);
    }
  }
```
Note: this file already imports `toast` — confirm at the top (`import { toast } from "@/components/ui/toast"`). If it does not, add that import.

- [ ] **Step 5 (inline): delete the `<CloverCardFields>` block (lines 1264-1274)**

Remove:
```js
            {showCloverFields && (
              <CloverCardFields
                ecommercePublicKey={ecommercePublicKey}
                merchantId={cloverMerchantId}
                amount={cardChargeAmount}
                disabled={loading || walletOver}
                resetSignal={cloverResetSignal}
                allowSaveCard={collectsFirstInstallment}
                onToken={(token, { saveCard }) => handleSubmit(token, saveCard)}
              />
            )}
```

- [ ] **Step 6 (inline): restore the step-2 submit button (lines 1369-1382)**

Replace:
```js
        ) : (
          // With Clover fields on screen the purchase is submitted by their own pay button,
          // which owns the card token.
          !showCloverFields && (
            <button
              type="button"
              className="h-8 px-3 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold disabled:opacity-60"
              onClick={() => handleSubmit()}
              disabled={loading || !form.packageID || walletOver || collectWalletShort}
            >
              {loading ? "Creating…" : "Create Enrollment & Package"}
            </button>
          )
        )}
```
with:
```js
        ) : (
          <button
            type="button"
            className="h-8 px-3 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold disabled:opacity-60"
            onClick={() => handleSubmit()}
            disabled={loading || !form.packageID || walletOver || collectWalletShort || cloverNotConnected}
          >
            {loading ? "Creating…" : payWithClover ? "Pay with Clover" : "Create Enrollment & Package"}
          </button>
        )}
```
If `cloverNotConnected` should also surface the hint, add directly above this button (inside the same flex row's parent) — the hint from Task 2 Step 6 copy. Minimal acceptable: rely on the disabled button; the hint is optional here since the wizard already shows the Clover connection state upstream.

- [ ] **Step 7 (CreateEnrollmentSheet): drop card token, collect `checkoutUrl`, return the new shape**

In `components/enrollment/CreateEnrollmentSheet.js`:

In the one-time `/add` billing branch, remove the `cardToken` line (162) and its comment (159-161) so the branch reads:
```js
          ? {
              method: payload.billing?.method || 'cash',
              ...(payload.billing?.useWallet && Number(payload.billing?.walletAmount) > 0
                ? { walletAmount: Number(payload.billing.walletAmount) }
                : {}),
            }
```

After the `addRes` success check (line 212), add a checkout accumulator:
```js
    let checkoutUrl = payload.billingType === 'one_time' ? (addRes.data?.checkoutUrl || null) : null
```

In the `pay-installment` call (231-236) remove `cardToken`/`saveCard`:
```js
        const payRes = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, {
          installmentIndex: firstPending,
          method,
        })
```
and after its success check set `checkoutUrl = payRes.data?.checkoutUrl || null` (inside the `if (plan && firstPending !== -1)` block, right after confirming `payRes.success`).

In the flexible `/api/payment` call (244-251) remove `cardToken`:
```js
      const payRes = await api.post('/api/payment', {
        customerID: resolvedCustomerID,
        enrollmentID,
        type: 'package_purchase',
        amount: collectAmount,
        method,
      })
```
and after its success check set `checkoutUrl = payRes.data?.checkoutUrl || null`.

Change every early `return false` in this function to `return { ok: false }`, and the final tail (259-262):
```js
    setSubmitting(false)
    handleClose()
    onSuccess?.()
    return { ok: true, checkoutUrl }
```
(Keep `handleClose()`/`onSuccess?.()`; the pre-opened tab handle is captured in the inline closure and still navigates after the sheet closes.)

- [ ] **Step 8 (AppointmentComposerPanel): thread `checkoutUrl` through `recordInitialPayment` → `handleNewEnrollment` → `onSubmit`**

In `app/calendar/components/AppointmentComposerPanel.js`:

Rewrite `recordInitialPayment` (2026-2069) to drop card tokens and return the checkout URL:
```js
  const recordInitialPayment = async (customerID, enrollmentID, payload) => {
    const { billingType, billing } = payload;
    if (!billing?.collectNow || !(Number(billing.collectAmount) > 0)) return null;
    const method = billing.method || "cash";

    if (billingType === "payment_plan") {
      const planRes = await api.get(`/api/payment-plan/customer/${customerID}`);
      const plans = planRes.success ? planRes.data || [] : [];
      const matchesEnrollment = (p) =>
        String(p.enrollmentID?._id ?? p.enrollmentID) === String(enrollmentID);
      const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
      const plan =
        plans.filter(matchesEnrollment).sort(byNewest)[0] ??
        [...plans].sort(byNewest)[0];
      const firstPending = (plan?.installments || []).findIndex((i) => i.status === "pending");
      if (!plan || firstPending === -1) {
        console.error("Initial installment not collected: no pending plan found", { enrollmentID, plans });
        return null;
      }
      const payRes = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, {
        installmentIndex: firstPending,
        method,
      });
      if (!payRes.success) {
        console.error("pay-installment failed", payRes);
        return null;
      }
      return payRes.data?.checkoutUrl || null;
    }

    if (billingType === "flexible") {
      const payRes = await api.post("/api/payment", {
        customerID,
        enrollmentID,
        type: "package_purchase",
        amount: Number(billing.collectAmount),
        method,
      });
      return payRes.data?.checkoutUrl || null;
    }
    return null;
  };
```

In `handleNewEnrollment` (2071-2137): remove the `cardToken` line in the one-time billing branch (2108); capture the checkout URL and return an object:
```js
    if (!addRes.success) return null;

    const checkoutUrl =
      payload.billingType === "one_time"
        ? addRes.data?.checkoutUrl || null
        : await recordInitialPayment(customerID, enrollmentID, payload);

    const listRes = await api.get(`/api/enrollment?customerID=${customerID}`);
    if (listRes.success && Array.isArray(listRes.data)) {
      setEnrollments((prev) => ({ ...prev, [customerID]: listRes.data }));
    }
    return { enrollmentID, checkoutUrl };
```
(Replace the old `await recordInitialPayment(...)` call and `return enrollmentID;`.)

Update the `onSubmit` handler (2347-2372) to consume the object and return `{ ok, checkoutUrl }`:
```js
          onSubmit={async (payload) => {
            const created = await handleNewEnrollment(form.customer_id, payload);
            const createdId = created?.enrollmentID;
            if (createdId) {
              setField("enrollment_id", String(createdId));
              const matchingServices = (payload.services || []).filter((s) =>
                tabCatalogServices.some((cat) => cat.serviceCode === s.serviceCode),
              );
              if (matchingServices.length === 1) {
                const catalogSvc = tabCatalogServices.find(
                  (cat) => cat.serviceCode === matchingServices[0].serviceCode,
                );
                if (catalogSvc) {
                  setField("service_id", String(catalogSvc._id));
                  const color = matchingServices[0].color || catalogSvc.color;
                  if (color) setField("event_color", color);
                } else {
                  setField("service_id", "");
                }
              } else {
                setField("service_id", "");
              }
              setShowEnrollmentWizard(false);
              return { ok: true, checkoutUrl: created?.checkoutUrl || null };
            }
            return { ok: false, checkoutUrl: null };
          }}
```

- [ ] **Step 9: Verify + commit**

Run: `npm run lint` — no new errors across the three files.
Manual: `npm run dev`. From the calendar, open the enrollment wizard via both entry points (CreateEnrollmentSheet and AppointmentComposerPanel). One-time + card + Clover connected → step-2 button reads "Pay with Clover", opens a tab. Payment-plan / flexible with card collect-now → also opens a tab. Non-card paths behave as before.

```bash
git add app/calendar/components/NewEnrollmentPackageInline.js components/enrollment/CreateEnrollmentSheet.js app/calendar/components/AppointmentComposerPanel.js
git commit -m "feat: open Clover hosted checkout from enrollment+package wizard"
```

---

### Task 4: CustomerMembershipsTab — installment checkout + pending badge

**Files:**
- Modify: `components/membership/CustomerMembershipsTab.js`

**Interfaces:**
- Consumes: Task 1 helpers; `POST /api/payment-plan/:id/pay-installment` returning `data.checkoutUrl` for card; installment `status: 'payment_pending'`.

- [ ] **Step 1: Swap imports**

Replace line 14:
```js
import CloverCardFields from '@/app/settings/payments/clover/CloverCardFields'
```
with:
```js
import { openCheckoutTab, navigateCheckoutTab, closeCheckoutTab, CHECKOUT_TOAST } from '@/lib/clover'
```

- [ ] **Step 2: Rewrite `PayInstallmentDialog` (lines 36-106)**

```js
function PayInstallmentDialog({ target, onClose, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const { status: cloverStatus } = useCloverConnection()
  if (!target) return null
  const { plan, index } = target
  const inst = plan.installments[index]
  const payWithClover = method === 'card' && cloverStatus === 'connected'
  const cloverNotConnected = method === 'card' && cloverStatus !== 'connected'

  async function handlePay() {
    const checkoutTab = payWithClover ? openCheckoutTab() : null
    setPaying(true)
    try {
      const r = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, { installmentIndex: index, method })
      if (r.success) {
        if (r.data?.checkoutUrl) {
          navigateCheckoutTab(checkoutTab, r.data.checkoutUrl)
          toast.success(CHECKOUT_TOAST)
        } else {
          toast.success('Installment paid')
        }
        onPaid()
      } else {
        closeCheckoutTab(checkoutTab)
        toast.error('Payment failed', { description: r.error })
      }
    } finally { setPaying(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[61] w-[420px] rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-foreground mb-1">Record Payment</h3>
        <p className="text-[12px] text-muted-foreground mb-4">
          Payment {index + 1} · <span className="font-semibold text-foreground">${Number(inst.amount).toFixed(2)}</span>
        </p>
        <label className="text-[12px] font-medium text-foreground block mb-1">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-background text-sm px-2.5 capitalize focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {cloverNotConnected && (
          <p className="mt-2 text-[11px] text-amber-600">Connect Clover in Settings → Payments to charge a card.</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={paying}>Cancel</Button>
          <Button size="sm" onClick={handlePay} disabled={paying || cloverNotConnected} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {paying ? 'Saving…' : payWithClover ? 'Pay with Clover' : `Pay $${Number(inst.amount).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add the pending badge to installment rows**

In the installment row (around lines 376-400), the status pill currently handles `paid`/`failed`/else. Update the circle class and label, and hide the Pay button for `payment_pending`. Replace the circle `div` (376-381):
```js
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            inst.status === 'paid' ? 'bg-emerald-600 text-white'
                              : inst.status === 'failed' ? 'bg-rose-600 text-white'
                                : inst.status === 'payment_pending' ? 'bg-amber-500 text-white'
                                  : 'bg-muted text-muted-foreground'}`}>
                            {inst.status === 'paid' ? '✓' : inst.status === 'payment_pending' ? '⋯' : idx + 1}
                          </div>
```
Replace the "Paid" inline label (384-386):
```js
                              Payment {idx + 1}
                              {inst.status === 'paid' && <span className="ml-1.5 text-[11px] font-normal text-emerald-600">Paid</span>}
                              {inst.status === 'payment_pending' && <span className="ml-1.5 text-[11px] font-normal text-amber-600">Payment pending</span>}
```
Change the Pay button condition (392) so a pending checkout hides it:
```js
                          {inst.status === 'pending' && plan.status === 'active' && m.status === 'active' && (
```
stays as-is (it already only shows for `status === 'pending'`, and a card checkout moves the installment to `payment_pending`, hiding the button automatically).

- [ ] **Step 4: Add pending to the record payment-status badge map (lines 25-29)**

```js
const PAYMENT_STATUS_COLORS = {
  paid: 'bg-emerald-500/10 text-emerald-600',
  partial: 'bg-amber-500/10 text-amber-600',
  unpaid: 'bg-red-500/10 text-red-600',
  payment_pending: 'bg-amber-500/10 text-amber-600',
}
```
And render a readable label — the badge at line 252-254 prints `m.paymentStatus` raw; replace with:
```js
                    {m.paymentStatus === 'payment_pending' ? 'payment pending' : m.paymentStatus}
```

- [ ] **Step 5: Verify + commit**

Run: `npm run lint`.
Manual: open a customer's memberships, a payment-plan installment, click Pay with method=card (Clover connected) → tab opens; the installment shows "Payment pending" and its Pay button disappears after refetch.

```bash
git add components/membership/CustomerMembershipsTab.js
git commit -m "feat: Clover checkout + pending badge in memberships tab"
```

---

### Task 5: Customer detail page — four card sub-forms + pending badges

**Files:**
- Modify: `app/settings/users-roles/customers/[id]/page.js`

**Interfaces:**
- Consumes: Task 1 helpers; `POST /api/payment-plan/:id/pay-installment`, `POST /api/customer-package/add`, `POST /api/payment` returning `data.checkoutUrl` for card.

This file has four Clover sub-forms and three record lists. Apply the same transform to each. All four sub-forms currently: destructure `merchantId`/`ecommercePublicKey`, keep a `cloverResetSignal`, compute `showCloverFields`, branch their submit on a `cardToken`, render `<CloverCardFields>`, and gate their submit button with `!showCloverFields`.

- [ ] **Step 1: Swap the import (line 46)**

Replace:
```js
import CloverCardFields from "@/app/settings/payments/clover/CloverCardFields";
```
with:
```js
import { openCheckoutTab, navigateCheckoutTab, closeCheckoutTab, CHECKOUT_TOAST } from "@/lib/clover";
```

- [ ] **Step 2: PayInstallment dialog (≈1330-1490)**

Slim the hook (1334) to `const { status: cloverStatus } = useCloverConnection();` and delete `cloverResetSignal` (1332).
Replace `showCloverFields` (1337):
```js
  const payWithClover = method === "card" && cloverStatus === "connected";
  const cloverNotConnected = method === "card" && cloverStatus !== "connected";
```
Rewrite `submitPayment` (1352-1376) with no token branch:
```js
  async function submitPayment() {
    const num = validatedAmount();
    if (num === null) return;
    const checkoutTab = payWithClover ? openCheckoutTab() : null;
    setSaving(true);
    const res = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, {
      installmentIndex,
      method,
      amount: num,
    });
    if (res.success) {
      if (res.data?.checkoutUrl) {
        navigateCheckoutTab(checkoutTab, res.data.checkoutUrl);
        toast.success(CHECKOUT_TOAST);
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
```
Simplify `handleSubmit` (1378-1382):
```js
  async function handleSubmit(e) {
    e.preventDefault();
    await submitPayment();
  }
```
Delete the `<CloverCardFields>` block (1457-1466). Replace the `{!showCloverFields && (` gate on the submit button (1480) so the pay button is always rendered — change the surrounding conditional to always show it, set its label to `payWithClover ? "Pay with Clover" : \`Pay $${(Number(amount) || 0).toFixed(2)}\``, and add `disabled={saving || cloverNotConnected}`. When `cloverNotConnected`, render the hint `Connect Clover in Settings → Payments to charge a card.` above the button row.

- [ ] **Step 3: Package add dialog (≈1695-2969)**

Slim the hook (1695 region) to status-only; delete its `cloverResetSignal`.
Replace `showCloverFields` (1826-1831):
```js
  const payWithClover =
    addForm.billingType === "one_time" &&
    addForm.billing.method === "card" &&
    totalAmount > 0 &&
    cloverStatus === "connected";
  const cloverNotConnected =
    addForm.billingType === "one_time" &&
    addForm.billing.method === "card" &&
    totalAmount > 0 &&
    cloverStatus !== "connected";
```
Rewrite `handleAdd` (1866-1918): drop the `cardToken` param and the `cardToken` in the one-time billing (1896 → `{ method: addForm.billing.method }`), pre-open the tab when `payWithClover`, and on success navigate to `res.data?.checkoutUrl` (toast `CHECKOUT_TOAST`) else keep `toast.success("Package added to customer.")`; on failure `closeCheckoutTab`. Remove the `if (cardToken) setCloverResetSignal(...)` line.
Delete the `<CloverCardFields>` block (≈2840) and un-gate the submit button (`!showCloverFields` at ≈2969) exactly as in Step 2 — always render it, label `payWithClover ? "Pay with Clover" : <existing label>`, `disabled` also on `cloverNotConnected`, and show the hint when disconnected.

- [ ] **Step 4: Enrollment add dialog (≈3022-4894)**

Same transform as Step 3 on this dialog's copies: slim hook (3022 region), delete `cloverResetSignal`, replace `showCloverFields` (3198-3203) with `payWithClover`/`cloverNotConnected` (using `enrTotalAmount`), rewrite `handleEnrAdd` (3256): drop the `cardToken` param and the one-time `cardToken` (3300 → `{ method: addForm.billing.method }`), pre-open the tab when `payWithClover`, navigate to `res.data?.checkoutUrl` after the `/api/customer-package/add` success (before the `initialPayment` follow-up), toast accordingly, remove the reset-signal line. Delete the `<CloverCardFields>` block (≈4531) and un-gate the submit button (≈4894) as in Step 2.

- [ ] **Step 5: FlexiblePaymentDueCard (≈4925-5115)**

Slim hook (4930) to status-only; delete `cloverResetSignal` (4928).
Replace `showCloverFields` (4932):
```js
  const payWithClover = method === "card" && cloverStatus === "connected";
  const cloverNotConnected = method === "card" && cloverStatus !== "connected";
```
Rewrite `submitPayment` (4935-4965) to a single `/api/payment` path (no `cardToken`, drop the `/api/payments/clover/charge` branch):
```js
  async function submitPayment() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    const checkoutTab = payWithClover ? openCheckoutTab() : null;
    setSaving(true);
    const res = await api.post("/api/payment", {
      customerID,
      enrollmentID: enr._id,
      type: "package_purchase",
      amount: num,
      method,
    });
    if (res.success) {
      if (res.data?.checkoutUrl) {
        navigateCheckoutTab(checkoutTab, res.data.checkoutUrl);
        toast.success(CHECKOUT_TOAST);
      } else {
        toast.success(num >= outstanding ? "Payment recorded." : "Partial payment recorded.");
      }
      setMode(null);
      onSuccess();
    } else {
      closeCheckoutTab(checkoutTab);
      toast.error(res.error || "Failed to record payment.");
    }
    setSaving(false);
  }
```
Simplify `handlePay` (4967-4971):
```js
  async function handlePay(e) {
    e.preventDefault();
    await submitPayment();
  }
```
Delete the `showCloverFields ? (...) :` branch that renders `<CloverCardFields>` (starting ≈5099) and keep only the plain submit/close controls; the submit button label becomes `payWithClover ? "Pay with Clover" : \`Pay $${...}\``, `disabled` also on `cloverNotConnected`, with the hint shown when disconnected.

- [ ] **Step 6: Pending badges in the three record lists**

Wherever this page renders a record's `paymentStatus` badge (memberships, packages, enrollments lists), add the `payment_pending` color and a readable label. Find each payment-status color map / badge in this file and add `payment_pending: "bg-amber-500/10 text-amber-600"`, and where the raw `paymentStatus` string is printed, render `status === "payment_pending" ? "payment pending" : status`. For installment rows in this file (the payment-plan schedule), mirror Task 4 Step 3: amber circle + "Payment pending" label for `status === "payment_pending"`, and the existing `status === "pending"` Pay button naturally hides once the backend moves it to `payment_pending`.

- [ ] **Step 7: Verify + commit**

Run: `npm run lint`.
Manual: on a customer detail page exercise each of the four flows with method=card and Clover connected → a tab opens each time; with Clover disconnected → the pay button is disabled with the hint. Confirm a card purchase then shows a "payment pending" badge.

```bash
git add "app/settings/users-roles/customers/[id]/page.js"
git commit -m "feat: Clover hosted checkout + pending badges on customer detail page"
```

---

### Task 6: Delete CloverCardFields and verify the removal is total

**Files:**
- Delete: `app/settings/payments/clover/CloverCardFields.js`

- [ ] **Step 1: Confirm there are no remaining consumers**

Run: `git grep -n "CloverCardFields\|cardToken\|allowSaveCard\|saveCard\|charge-installment\|payments/clover/charge"`
Expected: no matches in `app/`, `components/`, or `lib/` (matches only inside `docs/`). If any code match remains, fix that site using the Task 2 transform before continuing.

- [ ] **Step 2: Delete the component**

```bash
git rm app/settings/payments/clover/CloverCardFields.js
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds with no "module not found" for `CloverCardFields` and no unused-import lint failures.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove in-app Clover card tokenization component"
```

---

## Notes for the implementer

- `useCloverConnection` and the Clover settings/OAuth page are intentionally untouched.
- Refunds are unchanged (wallet-only) — no refund code is in scope.
- The `payment_pending` state and every `checkoutUrl` depend on the backend delivering the contract in Global Constraints; if a `checkoutUrl` never arrives for a card request, the frontend just shows the normal success toast and no tab — verify the backend side is deployed before user testing.
