# Clover — going live checklist

Companion to [`DanceStudio-CRM-Backend/docs/CLOVER_ENVIRONMENT.md`](../../DanceStudio-CRM-Backend/docs/CLOVER_ENVIRONMENT.md),
which documents the env vars and the two-webhook design in detail. This file is the
one-time "what do I actually click" checklist for taking Clover payments live.

## Current state (as of 2026-08-25)

The backend is already wired and working against **Clover sandbox**, using a
different Clover app than the one shown in the Developer Dashboard screenshot this
checklist is based on:

| | Value |
|---|---|
| `CLOVER_ENV` | `sandbox` |
| `CLOVER_CLIENT_ID` | `H13VYEYH2SE1A` — a sandbox test app, not "CADANCE AI" |
| `CLOVER_CALLBACK_URL` | `https://backend.cadance.ai/api/payments/clover/callback` |
| `PUBLIC_API_URL` | `https://backend.cadance.ai` |
| `FRONTEND_URL` | `https://ai-crm-teal.vercel.app` |

This is expected, not a mistake: Clover sandbox and production apps are always
separate registrations with separate IDs — you build/test in sandbox, then
"recreate" the app in production. **"CADANCE AI" (`W4V14WYCT23NT`) is that
production recreation**, still `DRAFT` and unsubmitted in the Clover Developer
Dashboard. Going live = finishing that app, then swapping the backend over to it.

## Step 1 — Finish the "CADANCE AI" app on Clover (production)

Developer Dashboard → Your Apps → CADANCE AI → App Settings.

| Field | Set it to |
|---|---|
| **REST Configuration → Site URL** | `https://backend.cadance.ai/api/payments/clover/callback` — must match `CLOVER_CALLBACK_URL` exactly, char for char. |
| **Default OAuth Response** | `Code` (the backend exchanges the code server-side in `cloverCallback.controller.js`). |
| **App Type** | Drop the **Android (Mini 2nd Gen)** checkbox — keep only **REST Clients**. There is no native Android SDK/APK anywhere in either repo. Device charges go through `connect/v1/payments` (REST Pay Display's cloud API — see `clover.service.js` `chargeDevice()`), a plain HTTPS/WSS call, not an installed app on the Mini. Leaving Android checked will likely make Clover's reviewers ask for an APK that doesn't exist. |
| **Requested Permissions** | Keep **Merchant: Read** + **Ecommerce**. That covers everything the code actually calls: `/v3/merchants/:id`, `/v1/charges`, `/v1/refunds`, `/pakms/apikey`. Clover's docs don't list explicit scope names for `/v3/merchants/:id/devices` (device listing) or `/connect/v1/payments` (terminal charge) — **before submitting**, do one sandbox device pairing + one sandbox terminal charge against this exact permission set. A 401/403 on either tells you which extra scope to add. |
| **Ecommerce Settings** | Check "Enable online payments," Integration Type = **Hosted Checkout**. All card capture starts as a Hosted Checkout session (`hostedCheckout.service.js`); later reuse (installments, wallet top-ups) charges the *vaulted* token from that session via the same Ecommerce API — still Hosted Checkout's stored-credential flow, not a separate raw-card "API" integration, so no card-entry iframe is needed. |
| **Webhooks** (dashboard-level, app webhook) | URL = `https://backend.cadance.ai/api/webhooks/clover/<CLOVER_WEBHOOK_SECRET>` — use the real value from the backend's `CLOVER_WEBHOOK_SECRET` env var. This **is** required: `cloverReconcile.service.js` uses it to catch charges Clover captured that the DB never recorded, and refunds issued from Clover's own dashboard. Clicking Generate/Verify makes Clover POST a `verificationCode`, which the backend already echoes back automatically (`webhooks/clover.controller.js`) — nothing manual needed there. |
| **Android APKs** | Leave empty (see App Type above). |

Then click **Submit App** for Clover's review/approval — required even for a private
app used only by your own merchants.

## Step 2 — Cut the backend over, once approved

In the backend's production `.env`:

```
CLOVER_ENV=production
CLOVER_CLIENT_ID=<CADANCE AI's App ID, W4V14WYCT23NT>
CLOVER_CLIENT_SECRET=<CADANCE AI's App Secret from the dashboard>
```

`CLOVER_CALLBACK_URL`, `PUBLIC_API_URL`, and `CLOVER_WEBHOOK_SECRET` can stay as they
are — they already point at `backend.cadance.ai`, which is what the production app
is registered against.

Cleanup while in there: the backend `.env` has a leftover
`PUBLIC_API_BASE_URL=...ngrok-free.app` line above the real
`PUBLIC_API_BASE_URL=https://backend.cadance.ai` line — harmless (the later line
wins), but worth deleting so it doesn't confuse anyone.

**Do not flip `CLOVER_ENV` until the new client ID/secret are in place.** Sandbox
and production credentials aren't interchangeable across hosts — every Clover call
starts 401ing the moment you switch one without the other.

## Step 3 — Existing studios reconnect

Once the backend is cut over, merchant tokens obtained under the sandbox app stop
working. Every location that already clicked "Connect Clover" needs to:

1. Click **Connect Clover** again in Settings → Integrations (now hitting real
   Clover login).
2. Redo the 4-step webhook paste (already built, no code changes needed —
   `CloverWebhookSetup.js`):
   - Copy the location's webhook URL from Settings → Integrations.
   - Paste it into that studio's own Clover Dashboard → Settings → Ecommerce →
     Hosted Checkout → Webhook URL.
   - Click Generate, copy the signing secret.
   - Paste the signing secret back into Settings → Integrations.

## Verify it actually works

1. Connect one real location, confirm `status: connected` and a real `merchantId`
   show up.
2. Save that studio's real hosted-checkout signing secret, run one real small-value
   payment through the enrollment flow, and confirm the webhook flips it to paid
   (watch `webhookLastReceivedAt` / `webhookLastError` on that connection).
3. Pair one physical Clover Mini and run one terminal charge — this is what will
   surface a missing permission scope from Step 1 immediately as a 401/403, rather
   than later in production.
