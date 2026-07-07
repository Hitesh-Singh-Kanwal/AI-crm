# Clover Charging for Payment Plan Installments (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built `CloverCardFields` component into both existing `PayInstallmentDialog` components.

**Architecture:** Both dialogs get the identical `showCloverFields` gating pattern already proven in `FlexiblePaymentDueCard`: when Method is "card" and the location's Clover connection is active, render `CloverCardFields` and POST to the new `charge-installment` endpoint; otherwise, completely unchanged.

**Tech Stack:** Next.js 14, React, existing `api`/`useToast`/`useCloverConnection` (`app/settings/payments/clover/useCloverConnection.js`), existing `CloverCardFields` (`app/settings/payments/clover/CloverCardFields.js`).

## Global Constraints

- No test framework in this repo — verification is `npm run build` + manual dev-server checks.
- Backend contract (companion plan, same session): `POST /api/payment-plan/:id/charge-installment` accepts `{installmentIndex, cardToken, amount?, notes?}`, same response envelope as the existing `pay-installment` endpoint.
- The two dialogs are NOT identical — the package-plan dialog (`page.js`) has an editable amount and uses `useToast()`; the membership dialog (`CustomerMembershipsTab.js`) has a fixed amount and uses the standalone `toast` object import. Preserve these existing differences; don't unify them as part of this plan.
- `CloverCardFields` is reused with zero modification — same props (`ecommercePublicKey`, `merchantId`, `amount`, `onToken`, `disabled`, `resetSignal`).

---

### Task 1: Wire Clover into the package-plan `PayInstallmentDialog`

**Files:**
- Modify: `app/settings/users-roles/customers/[id]/page.js:1322-1471` (the `PayInstallmentDialog` function only)

**Interfaces:**
- Consumes: `useCloverConnection` (`@/app/settings/payments/clover/useCloverConnection`), `CloverCardFields` (`@/app/settings/payments/clover/CloverCardFields`).
- Produces: no change to this component's external props (`{open, onClose, plan, installmentIndex, onSuccess}`).

- [ ] **Step 1: Add imports**

At the top of `app/settings/users-roles/customers/[id]/page.js`, alongside the imports already added for `FlexiblePaymentDueCard`:

```js
// (useCloverConnection and CloverCardFields are likely already imported from the
// FlexiblePaymentDueCard task earlier this session — check before adding a duplicate import)
```

- [ ] **Step 2: Modify `PayInstallmentDialog`**

Add state and the Clover gate, and split `handleSubmit` into a shared submit function. Replace the function from its start through `handleSubmit` (originally lines 1322-1370) with:

```js
function PayInstallmentDialog({
  open,
  onClose,
  plan,
  installmentIndex,
  onSuccess,
}) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [cloverResetSignal, setCloverResetSignal] = useState(0);
  const toast = useToast();
  const { status: cloverStatus, merchantId: cloverMerchantId, ecommercePublicKey } = useCloverConnection();

  const installment = plan?.installments?.[installmentIndex];
  const showCloverFields = method === "card" && cloverStatus === "connected" && ecommercePublicKey;

  useEffect(() => {
    if (installment) setAmount(Number(installment.amount).toFixed(2));
  }, [installment]);

  function validatedAmount() {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid amount.");
      return null;
    }
    return num;
  }

  async function submitPayment(cardToken) {
    const num = validatedAmount();
    if (num === null) return;
    setSaving(true);
    const res = cardToken
      ? await api.post(`/api/payment-plan/${plan._id}/charge-installment`, {
          installmentIndex,
          cardToken,
          amount: num,
        })
      : await api.post(`/api/payment-plan/${plan._id}/pay-installment`, {
          installmentIndex,
          method,
          amount: num,
        });
    if (res.success) {
      toast.success("Installment payment recorded.");
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "Failed to record payment.");
      if (cardToken) setCloverResetSignal((n) => n + 1);
    }
    setSaving(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (showCloverFields) return;
    await submitPayment(null);
  }
```

- [ ] **Step 3: Replace the submit-button area in the JSX**

Find the `<div className="flex justify-end gap-2 pt-1">` block containing Cancel/Save/Pay buttons (originally lines 1445-1468) and replace the Pay button section — keep Cancel and Save exactly as they are, but wrap the Pay button in a conditional:

```jsx
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={handleSaveAmount}
            >
              Save
            </Button>
            {!showCloverFields && (
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving
                  ? "Recording…"
                  : `Pay $${(Number(amount) || 0).toFixed(2)}`}
              </Button>
            )}
          </div>
          {showCloverFields && (
            <div className="pt-2">
              <CloverCardFields
                ecommercePublicKey={ecommercePublicKey}
                merchantId={cloverMerchantId}
                amount={parseFloat(amount) || 0}
                disabled={saving}
                resetSignal={cloverResetSignal}
                onToken={(token) => submitPayment(token)}
              />
            </div>
          )}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Open a package-plan installment's "Pay" dialog:
- Method: Cash → confirm unchanged instant-submit behavior.
- Method: Card, Clover not connected for the location → confirm it falls back to the plain "Pay $X" button (no Clover fields, no crash).
- Method: Card, Clover connected → confirm the Clover card-entry fields render instead.

- [ ] **Step 5: Commit**

```bash
git add "app/settings/users-roles/customers/[id]/page.js"
git commit -m "feat: wire Clover charging into the package-plan installment dialog"
```

---

### Task 2: Wire Clover into the membership `PayInstallmentDialog`

**Files:**
- Modify: `components/membership/CustomerMembershipsTab.js:34-75` (the `PayInstallmentDialog` function only)

**Interfaces:**
- Consumes: `useCloverConnection`, `CloverCardFields` (same imports as Task 1, but this is a different file — add fresh imports here).
- Produces: no change to this component's external props (`{target, onClose, onPaid}`).

- [ ] **Step 1: Add imports**

At the top of `components/membership/CustomerMembershipsTab.js`, alongside the existing imports:

```js
import { useCloverConnection } from '@/app/settings/payments/clover/useCloverConnection'
import CloverCardFields from '@/app/settings/payments/clover/CloverCardFields'
```

- [ ] **Step 2: Modify `PayInstallmentDialog`**

Replace the whole function (originally lines 34-75) with:

```jsx
function PayInstallmentDialog({ target, onClose, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [cloverResetSignal, setCloverResetSignal] = useState(0)
  const { status: cloverStatus, merchantId: cloverMerchantId, ecommercePublicKey } = useCloverConnection()
  if (!target) return null
  const { plan, index } = target
  const inst = plan.installments[index]
  const showCloverFields = method === 'card' && cloverStatus === 'connected' && ecommercePublicKey

  async function submitPayment(cardToken) {
    setPaying(true)
    try {
      const r = cardToken
        ? await api.post(`/api/payment-plan/${plan._id}/charge-installment`, { installmentIndex: index, cardToken })
        : await api.post(`/api/payment-plan/${plan._id}/pay-installment`, { installmentIndex: index, method })
      if (r.success) { toast.success('Installment paid'); onPaid() }
      else {
        toast.error('Payment failed', { description: r.error })
        if (cardToken) setCloverResetSignal((n) => n + 1)
      }
    } finally { setPaying(false) }
  }

  async function handlePay() {
    if (showCloverFields) return
    await submitPayment(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[61] w-[360px] rounded-xl border border-border bg-card p-5 shadow-2xl">
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
        {showCloverFields ? (
          <div className="mt-4">
            <CloverCardFields
              ecommercePublicKey={ecommercePublicKey}
              merchantId={cloverMerchantId}
              amount={Number(inst.amount)}
              disabled={paying}
              resetSignal={cloverResetSignal}
              onToken={(token) => submitPayment(token)}
            />
            <div className="flex justify-end mt-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={paying}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={paying}>Cancel</Button>
            <Button size="sm" onClick={handlePay} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {paying ? 'Saving…' : `Pay $${Number(inst.amount).toFixed(2)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Open a membership's installment "Pay" dialog:
- Method: Cash → confirm unchanged instant behavior.
- Method: Card, Clover not connected → confirm fallback to the plain Pay button.
- Method: Card, Clover connected → confirm Clover card-entry fields render.

- [ ] **Step 4: Commit**

```bash
git add components/membership/CustomerMembershipsTab.js
git commit -m "feat: wire Clover charging into the membership installment dialog"
```

---

### Task 3: Manual sandbox verification

**Files:** None — verification only.

- [ ] **Step 1: Confirm the build passes**

Run: `npm run build`

- [ ] **Step 2: End-to-end verification**

Once the companion backend plan is deployed: pay a package-plan installment and a membership-plan installment via Clover sandbox test cards (success + decline for each), confirming success updates the plan/installment and a decline shows a retryable error with the card form resetting (reusing `CloverCardFields`' existing `resetSignal` mechanism).

## Self-Review Notes

- **Spec coverage:** both dialogs wired (Tasks 1-2), manual verification (Task 3). "Change Date" flow explicitly untouched.
- **Placeholder scan:** no TBD/TODO; complete code throughout.
- **Type consistency:** `CloverCardFields` props identical across both tasks and matching its existing definition from the "Pay Now" feature (`ecommercePublicKey`, `merchantId`, `amount`, `disabled`, `resetSignal`, `onToken`). `submitPayment(cardToken)`'s branching (charge-installment vs. pay-installment endpoint) mirrors the backend plan's two endpoints exactly.
