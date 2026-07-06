# Clover OAuth Payments Integration — Design

## Context

Multi-tenant dance studio CRM. Tenancy today is location/branch-based (not top-level
studio-account-based) — see `docs/superpowers/specs/2026-07-03-x-location-id-header-wiring-design.md`.
Each location currently resolves via the `x-location-id` header on every request.

We're adding the ability for each **location** to connect its own Clover merchant account so
payments flow directly to that location's Clover account, never through the CRM's own funds.

This repo (`AI-crm`) is the Next.js frontend only. The backend lives in a separate repo
(`DanceStudio-CRM-Backend`) and is out of scope to build in this session — this spec covers the
full system so the backend team can implement their half from the same contract, but only the
frontend pieces are implemented here.

## Scope Decisions

- **Connection is scoped per location**, not per studio account. A studio with 3 locations
  connects Clover 3 separate times, matching the existing `x-location-id` tenancy model.
- **New Settings → Payments section** (not folded into existing Billing or Integrations pages),
  matching the source spec. `Payments` sits alongside `Billing` and `Integrations` in the
  Settings nav. Only Clover ships now; Stripe/Square/PayPal/Authorize.net show as
  "coming soon" placeholders per the Future Expansion section.
- **Gated by a new `payments` permission module** (with a `clover` resource) in the existing
  RBAC schema (`Read`/`Write`/`Edit`/`Delete`), consistent with how other settings areas are
  gated. See the RBAC bug fix in `RolesDialog.js` — the master `permissionsSchema` fetched from
  `/api/role/permissions` must include this new section so it appears for every role.
- **OAuth callback lands directly on a backend endpoint**, not a frontend page. Clover redirects
  the browser to `GET /api/payments/clover/callback` on the backend; the backend completes the
  token exchange server-side (keeping `client_secret` and tokens off the frontend entirely) and
  then 302s the browser back to the frontend Payments page with a `status` query param.

## Architecture

```
Frontend (this repo)                    Backend (separate repo, not built here)
─────────────────────                   ────────────────────────────────────────
Settings → Payments → Clover
  CloverConnectionCard
    "Connect Clover" button  ────────►  GET /api/payments/clover/connect
                                           - builds Clover authorize URL
                                           - signs `state` = {locationId, nonce, returnPath}
                                           - 302 → Clover's OAuth authorize page

                                         Clover authorize page (studio owner logs in, grants access)
                                           - 302 → GET /api/payments/clover/callback?code=...&state=...

                                         GET /api/payments/clover/callback
                                           - validates `state` (nonce + signature)
                                           - exchanges `code` for access/refresh tokens
                                           - upserts CloverConnection keyed by locationId
                                           - 302 → {FRONTEND_URL}/settings/payments/clover
                                                     ?status=connected|error&reason=...

  Page reads ?status, shows toast,
  strips query param, re-fetches   ────►  GET /api/payments/clover/status
    status                                  - returns status DTO for current x-location-id

  Disconnect button          ────────►  POST /api/payments/clover/disconnect
                                           - revokes tokens with Clover, deletes/soft-deletes
                                             the CloverConnection for this location

  (customer payment flow, unrelated
   to this session's build)              POST /api/webhooks/clover
                                           - verifies Clover webhook signature
                                           - identifies merchant → location
                                           - updates payment record status
```

## Data Model (backend-owned; informs the frontend contract)

```
CloverConnection
├── locationId        — tenant key, matches existing x-location-id
├── provider           "clover"
├── merchantId
├── merchantName
├── accessToken         (encrypted at rest; never sent to frontend)
├── refreshToken        (encrypted at rest; never sent to frontend)
├── tokenExpiresAt
├── status              connected | disconnected | error
├── lastError            nullable — populated when status = error (e.g. token revoked/expired)
├── connectedAt
└── updatedAt
```

Frontend only ever sees the status DTO:

```json
{
  "status": "connected",
  "merchantId": "ABC123",
  "merchantName": "Downtown Dance Studio",
  "connectedAt": "2026-07-01T12:00:00Z",
  "lastError": null
}
```

## Frontend Components (this repo — implemented here)

- `app/settings/payments/page.js` — Payments settings shell. Lists available providers; only
  Clover is active, others render as disabled "coming soon" cards.
- `app/settings/payments/clover/CloverConnectionCard.js` — status card:
  - **Not connected**: "Connect Clover" button
  - **Connected**: merchant name/ID, connected date, "Reconnect" and "Disconnect" buttons
  - **Error**: "Reconnect required" banner + reason, "Reconnect" button prominent
- `app/settings/payments/clover/useCloverConnection.js` — hook:
  - `status` — fetched via existing `api.get('/api/payments/clover/status')` on mount
  - `connect()` / `reconnect()` — `window.location.href = ${API_BASE}/api/payments/clover/connect`
    (full browser redirect, not a fetch — this is a real OAuth redirect flow)
  - `disconnect()` — `api.post('/api/payments/clover/disconnect')`, then re-fetch status
- On mount, the page checks `?status=connected|error&reason=` in the URL (set by the backend's
  post-callback redirect), shows a toast accordingly, then strips the query param via
  `router.replace` and re-fetches status.
- Permission gating: `Connect`/`Reconnect`/`Disconnect` actions require `payments.clover` write
  permission (via the existing permission-check hook/util used elsewhere in Settings); view-only
  users with read permission see the status card without action buttons.

## RBAC Schema Addition

New section added to the master permissions schema (`/api/role/permissions`, backend-owned):

```
Payments (NEW)
└── clover
    Read | Write | Edit | Delete
```

This flows through the existing `RolesDialog.js` / `RoleEditor.js` components (fixed earlier this
session to always render every section of the master schema) with no frontend changes needed
beyond the backend adding this section to its schema response.

## Error Handling

- Connect/Reconnect/Disconnect buttons disabled with a tooltip if the current role lacks
  `payments.clover` write permission.
- `status: "error"` (expired/revoked token) renders a distinct "Reconnect required" banner —
  never silently shown as "Connected."
- A failed callback (backend redirects with `status=error&reason=...`) surfaces a toast with the
  reason; the connection record is left in its prior state — a failed exchange never marks the
  connection as connected.
- Network/API failures on `status`/`disconnect` calls show a generic error toast and leave the UI
  in its last known-good state (no optimistic status flips).

## Out of Scope (this session)

- Backend OAuth exchange, token storage/encryption, webhook receiver, checkout session
  creation — all backend-repo work, spec'd above for the backend team to implement against.
- Stripe/Square/PayPal/Authorize.net providers — placeholders only, per Future Expansion.
