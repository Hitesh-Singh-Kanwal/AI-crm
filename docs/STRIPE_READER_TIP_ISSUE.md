# Stripe reader: "customer can't pay without tipping"

**Status:** Investigated on 2026-10-07. The data does not support the reported cause. The fix is a configuration and UX change, plus clean-up of the abandoned attempts.
**Studio affected:** DWM Dance Studio Buckhead, reader `added-holiday-continue` (Stripe Reader S710, `tmr_GrddkQMIB7zCek`, software 2.45.7.0).
**Evidence source:** read-only Stripe API calls on the connected account `acct_1UDBj2PSf3EVt4yQ` and read-only queries on the production database. All times are UTC.

---

## 1. Summary

The client reported that with **"Ask customer for a tip on the reader"** enabled, a customer couldn't complete a payment without adding a tip.

Stripe's records don't support that:

- With the tip screen showing, **8 out of 8 completed payments went through with a $0 tip** (6 real customers and 2 staff tests). Customers chose no tip and paid normally.
- Nothing in our code and no Stripe setting can make a tip mandatory.

The real problem: with the tip screen on, **11 attempts were abandoned and 1 more hit a reader error.** None of them ever had a card presented, and staff resent or cancelled the charge. With the tip screen off, 14 of 14 payments went through.

Most likely cause: the tip screen offers only **15%, 20% and 25%**. On package prices that means suggested tips of roughly **$108–$181** on a $725 sale. The customer or staff took this as a required tip and abandoned the screen instead of choosing no tip.

---

## 2. How the toggle works

| Toggle | Frontend sends | Backend sends to Stripe | Reader shows |
|---|---|---|---|
| On (default) | nothing (`terminalTipPayload()` returns `{}`) | no tipping override | The location's tip screen ("Buckhead Tips": 15% / 20% / 25%), then the card prompt |
| Off | `promptTip: false` | `process_config.skip_tipping: true` | The card prompt directly |

Code:
- Frontend toggle: `AI-crm/components/payments/TerminalDeviceField.js` (`tipPref`, `terminalTipPayload`)
- Backend reader charge: `DanceStudio-CRM-Backend/src/services/stripeTerminal.service.js`, `chargeWithStripeReader` → `terminal.readers.processPaymentIntent`
- Settlement: `src/services/stripeCheckout.service.js`, `completeStripeCheckout`. A $0 tip settles normally and no Tip record is created.

Stripe's tip configuration only defines the three suggestions (`percentages`, `fixed_amounts`, `smart_tip_threshold`). There is **no setting to require a tip.** Per Stripe's docs, the customer "can choose a suggested tip, specify a custom tip, or leave no tip."

---

## 3. What the data shows

All reader charges at Buckhead from 2026-09-28 to 2026-10-07:

| | Tip screen on | Tip screen off |
|---|---|---|
| Paid | **8**, all with tip = $0 | **14** |
| Never paid | **11**, plus 1 `reader_error` | none |
| Unknown setting | The $725 on Oct 2 (the client says the toggle was on; no Stripe event records it) | |
| Tips ever collected | **$0** | n/a |

Timeline highlights:

| Time (UTC) | Amount | Tip screen | Result |
|---|---|---|---|
| Sep 29 21:16 | $278 | on | Never paid, replaced 23 s later |
| Sep 29 21:17 | $278 | on | Never paid |
| Sep 29 21:57 | $155 | on | Never paid |
| Sep 29 22:52 | $278 | on | **Paid, tip $0** |
| Sep 29 22:57 | $155 | on | **Paid, tip $0** |
| Oct 1 00:35 | $1,450 | on | **Paid, tip $0** |
| Oct 1 17:56 | $1,065 | on | Never paid |
| Oct 1 21:14 | $1.06 | **off** | Paid (staff test). The toggle has been off on every charge since. |
| Oct 2 19:29 | $725 | on (per client) | Never paid |
| Oct 2 19:30 | $725 | off | Paid 6 s after dispatch |

The $278 and $155 sales that stalled at 21:16–21:57 on Sep 29 **went through later that evening with the tip screen still on and a $0 tip.**

### What the abandoned attempts have in common (all except the `reader_error`)

- Status is still `requires_payment_method`, with **no card attached** and **no decline**. The customer never got as far as tapping a card.
- **No reader event at all**: no `action_succeeded` and no `action_failed`. Per Stripe's docs, that only happens when:
  - a new charge is sent to the reader and **replaces** one that hasn't started processing, or
  - the action is cancelled through `cancel_action` or the Dashboard, which sends no webhook.
- The customer can't cancel on the reader, because we send `enable_customer_cancellation: false`.

So every abandoned attempt was ended by staff, usually by resending the charge.

---

## 4. Is there a timeout?

No.

- **Stripe:** no documented timeout on `process_payment_intent`, whether on the tip screen, the card prompt or overall. A reader-side failure would emit `terminal.reader.action_failed`. None was emitted for the 12 abandoned attempts (11 before Oct 2, plus the $725), and they are still `requires_payment_method` days later.
- **Our app:** the Stripe checkout expiry job only matches rows with `expiresAt`. Reader charges are created without one, so they are never expired. The frontend doesn't poll or time out a reader charge.

A customer left on the tip screen stays there until staff resend or cancel. Nothing is recorded as a failure, which is why this looked like "the payment won't go through."

---

## 5. What is proven and what is inferred

**Proven by Stripe and database records:**
- Customers can and do pay with $0 tip on this reader with this configuration.
- Unpaid attempts never reached card presentment and were replaced or cancelled by staff.
- Neither our code nor Stripe imposes a timer or a tip requirement.

**Inferred, because Stripe doesn't log what was on screen or what was tapped:**
- That the 15/20/25% suggestions on large package amounts led customers or staff to treat the tip as required.
- **How to confirm:** the client runs the $1 test in section 7.

---

## 6. Side effect: orphaned records

Each abandoned attempt left records behind:

- **8 `Payment` rows still `pending`** since Sep 28, plus one already marked `failed`. The two checked so far ($725 and $1,065) also have `StripeCheckout` rows left in `pending`.
- **Duplicate active enrollment** `6ac0063767eecbb8b4bcffcc`, from the abandoned $725 attempt on Oct 2. The customer paid once, on the retry.
- A pending $1,065 `event_purchase` payment from Oct 1.

Why: `supersedePendingReaderCharges` only cancels an earlier attempt for the **same** enrollment, membership, purchase or installment. Each "Create Enrollment & Package" press creates a new enrollment, so a retry never matches the abandoned one.

---

## 7. Resolution

1. **Change the tip suggestions (Stripe configuration, no code).** Switch the "Buckhead Tips" configuration (`tmc_61VU6IYVEGaDt7egx41PSf3EVt4yQOUi`) to smart tips, for example fixed $5 / $10 / $20 below a threshold and percentages above it, or lower the percentages. Needs the studio owner's agreement.
2. **Default the toggle to off.** Change `tipPref = { ask: true }` to `false` in `TerminalDeviceField.js`. Tipping becomes opt-in per charge, which matches how staff have used it since Oct 1.
3. **Clean up and fix the gap:**
   - Cancel the 13 unpaid PaymentIntents in the appendix at Stripe.
   - Mark the pending `Payment` rows `failed` and their `StripeCheckout` rows `expired`.
   - Remove the duplicate enrollment.
   - Change the retry path so an abandoned reader charge from the same sheet is cancelled when staff resend.
4. **Optional: let customers back out.** Set `enable_customer_cancellation: true`. A customer who backs out then produces an `action_failed` event (`customer_canceled`), so the app can tell staff instead of leaving the attempt silently pending.

### Verification test

1. The client runs a **$1 charge** with the toggle **on**.
2. The customer taps **No tip**, then taps a card.
3. Expected: `terminal.reader.action_succeeded` and a PaymentIntent with `amount_details.tip.amount = 0`.
4. If the reader shows no "No tip" option, or tapping it doesn't continue, capture a photo and the PaymentIntent ID and raise it with Stripe support. That would be a reader-side defect.

---

## Appendix: unpaid PaymentIntents (Buckhead)

| Created (UTC) | PaymentIntent | Amount |
|---|---|---|
| 2026-09-28 16:59 | `pi_3UKhtPPSf3EVt4yQ04sllZ4x` | $30.00 |
| 2026-09-28 17:23 | `pi_3UKiGsPSf3EVt4yQ00lOcOMs` | $30.00 |
| 2026-09-28 17:29 | `pi_3UKiNEPSf3EVt4yQ0FhL8FGp` | $155.00 |
| 2026-09-28 18:10 | `pi_3UKj0wPSf3EVt4yQ1WPQncup` | $155.00 (`reader_error`) |
| 2026-09-28 22:42 | `pi_3UKnFTPSf3EVt4yQ15OChIXC` | $30.00 |
| 2026-09-29 21:16 | `pi_3UL8ODPSf3EVt4yQ1DMwKT8c` | $278.00 |
| 2026-09-29 21:17 | `pi_3UL8OaPSf3EVt4yQ0ZZeA2iA` | $278.00 |
| 2026-09-29 21:57 | `pi_3UL926PSf3EVt4yQ1U0Vmr12` | $155.00 |
| 2026-09-29 22:45 | `pi_3UL9ltPSf3EVt4yQ0SYqhEMO` | $1.06 |
| 2026-09-30 16:54 | `pi_3ULQlsPSf3EVt4yQ15LBtkDT` | $1.06 |
| 2026-09-30 16:55 | `pi_3ULQnRPSf3EVt4yQ0XH4olfF` | $1.06 |
| 2026-10-01 17:56 | `pi_3ULoDVPSf3EVt4yQ1UYvZ0jq` | $1,065.00 |
| 2026-10-02 19:29 | `pi_3UMC9bPSf3EVt4yQ0PGslf7D` | $725.00 |

Completed with the tip screen on (tip = $0): `pi_3UKo50…`, `pi_3UL9nF…`, `pi_3UL9sU…`, `pi_3UL9yC…`, `pi_3ULRaH…`, `pi_3ULX6J…`, `pi_3ULXyI…`, `pi_3ULoGQ…`.
