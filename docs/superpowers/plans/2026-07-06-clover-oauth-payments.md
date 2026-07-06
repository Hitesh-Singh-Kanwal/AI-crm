# Clover OAuth Payments (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Settings → Payments → Clover UI (connect/reconnect/disconnect, status + merchant info display) in this Next.js frontend repo, wired to the backend contract defined in `docs/superpowers/specs/2026-07-06-clover-oauth-payments-design.md`.

**Architecture:** A new `/settings/payments` route lists payment providers (Clover active, others "coming soon"). A `CloverConnectionCard` component + `useCloverConnection` hook call three backend endpoints (`GET /status`, full-redirect to `GET /connect`, `POST /disconnect`) via the existing `api` client. Permission gating reuses the existing `hasPermission()` util and `ROUTE_ACCESS`/`ROUTE_PERMISSIONS` route-guard pattern.

**Tech Stack:** Next.js 14 App Router, React, Tailwind, shadcn/ui primitives (`components/ui/*`), `sonner` toasts via `useToast()`, existing `api` client (`lib/api.js`).

## Global Constraints

- No test framework exists in this repo — every task's "test" step is a manual dev-server verification (`npm run dev`, navigate, inspect), not an automated test file.
- Follow the existing tolerant API contract: every `api.*()` call resolves to `{success, data, error}` — never throws. Always branch on `result.success`.
- Connection is per-location — never per top-level studio account. The backend reads `x-location-id` (already attached automatically by `api.buildHeaders()`); no location ID is passed explicitly by the frontend.
- New permission module key is `payments` / `clover` — matches `docs/superpowers/specs/2026-07-06-clover-oauth-payments-design.md`'s RBAC Schema Addition section. This must be used verbatim in `ROUTE_PERMISSIONS` and `hasPermission()` calls so it lines up with whatever the backend team names the module.
- Never send/store Clover tokens in the frontend — only the status DTO (`status`, `merchantId`, `merchantName`, `connectedAt`, `lastError`) crosses the wire to this repo.
- Backend endpoints assumed (per spec, not built in this repo): `GET /api/payments/clover/status`, `GET /api/payments/clover/connect` (full-page redirect target), `POST /api/payments/clover/disconnect`.

---

### Task 1: Register the `/settings/payments` route (nav + route guards)

**Files:**
- Modify: `components/layout/Sidebar.js` (Settings `children` array)
- Modify: `lib/constants.js` (`ROUTE_ACCESS`, `ROUTE_PERMISSIONS`)

**Interfaces:**
- Produces: route `/settings/payments`, gated by `ROUTE_ACCESS['/settings/payments'] = [ROLES.SUPER_ADMIN, ROLES.ADMIN]` and `ROUTE_PERMISSIONS['/settings/payments'] = { category: 'settings', module: 'payments' }`, consumed by `canAccessRoute()` in `lib/permissions.js` (unmodified — already generic).

- [ ] **Step 1: Add the nav entry**

In `components/layout/Sidebar.js`, find the `Settings` nav item's `children` array (currently ending with `{ name: 'Activity Log', href: '/settings/activity-log' }`) and add a new entry after `Billing`:

```js
{ name: 'Billing', href: '/settings/billing' },
{ name: 'Payments', href: '/settings/payments' },
{ name: 'Activity Log', href: '/settings/activity-log' },
```

- [ ] **Step 2: Add route-access and route-permission entries**

In `lib/constants.js`, find `ROUTE_ACCESS` and add, alongside the existing `/settings/billing` entry:

```js
'/settings/payments': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
```

Find `ROUTE_PERMISSIONS` and add, alongside the existing `/settings/billing` entry:

```js
'/settings/payments': { category: 'settings', module: 'payments' },
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`

Sign in as a super-admin/admin test user, confirm a "Payments" link now appears under Settings in the sidebar (it will 404 until Task 2 adds the page — that's expected at this point). Sign in (or switch role) as a role without `settings.payments` read permission and confirm the sidebar link is hidden or the route redirects (per existing `canAccessRoute` behavior used by other settings routes — verify by comparing to how `/settings/billing` currently behaves for a restricted role).

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.js lib/constants.js
git commit -m "feat: register /settings/payments route with nav entry and permission guard"
```

---

### Task 2: `useCloverConnection` hook

**Files:**
- Create: `app/settings/payments/clover/useCloverConnection.js`

**Interfaces:**
- Consumes: `api` default export from `@/lib/api` (`api.get(path)`, `api.post(path, data)` — both resolve `{success, data, error}`, never throw).
- Produces: `useCloverConnection()` hook returning:
  ```ts
  {
    status: 'loading' | 'connected' | 'disconnected' | 'error',
    merchantId: string | null,
    merchantName: string | null,
    connectedAt: string | null,
    lastError: string | null,
    refresh: () => Promise<void>,
    connect: () => void,
    disconnect: () => Promise<{success: boolean, error?: string}>,
  }
  ```
  Consumed by `CloverConnectionCard.js` (Task 3) and `app/settings/payments/page.js` (Task 4).

- [ ] **Step 1: Write the hook**

```js
'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const initialState = {
  status: 'loading',
  merchantId: null,
  merchantName: null,
  connectedAt: null,
  lastError: null,
}

export function useCloverConnection() {
  const [state, setState] = useState(initialState)

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    const result = await api.get('/api/payments/clover/status')
    if (result.success && result.data) {
      setState({
        status: result.data.status || 'disconnected',
        merchantId: result.data.merchantId ?? null,
        merchantName: result.data.merchantName ?? null,
        connectedAt: result.data.connectedAt ?? null,
        lastError: result.data.lastError ?? null,
      })
    } else {
      setState({ ...initialState, status: 'disconnected', lastError: result.error || null })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(() => {
    window.location.href = `${API_BASE}/api/payments/clover/connect`
  }, [])

  const disconnect = useCallback(async () => {
    const result = await api.post('/api/payments/clover/disconnect', {})
    if (result.success) {
      await refresh()
    }
    return { success: result.success, error: result.error }
  }, [refresh])

  return { ...state, refresh, connect, disconnect }
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. In a throwaway component (or via Task 4's page once built), confirm `refresh()` fires on mount and `status` transitions from `'loading'` to `'disconnected'` when the backend endpoint doesn't exist yet or 404s (expected — `api.get` treats non-2xx as `{success:false}`, hook falls back to `disconnected`). No console errors/unhandled rejections.

- [ ] **Step 3: Commit**

```bash
git add app/settings/payments/clover/useCloverConnection.js
git commit -m "feat: add useCloverConnection hook for Clover status/connect/disconnect"
```

---

### Task 3: `CloverConnectionCard` component

**Files:**
- Create: `app/settings/payments/clover/CloverConnectionCard.js`

**Interfaces:**
- Consumes: `useCloverConnection()` (Task 2) return shape; `hasPermission(category, module, type)` from `@/lib/permissions` (signature confirmed: `hasPermission('settings', 'payments', 'write') → boolean`); `useToast()` from `@/components/ui/toast` (`toast.success({title, message})`, `toast.error({title, message})`); shadcn `Button` from `@/components/ui/button`, `Badge` from `@/components/ui/badge`.
- Produces: default-exported `CloverConnectionCard()` component, consumed by `app/settings/payments/page.js` (Task 4).

- [ ] **Step 1: Write the component**

```jsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { hasPermission } from '@/lib/permissions'
import { useCloverConnection } from './useCloverConnection'

export default function CloverConnectionCard() {
  const { status, merchantId, merchantName, connectedAt, lastError, connect, disconnect } = useCloverConnection()
  const [disconnecting, setDisconnecting] = useState(false)
  const toast = useToast()

  const canWrite = hasPermission('settings', 'payments', 'write')
  const canDelete = hasPermission('settings', 'payments', 'delete')

  async function handleDisconnect() {
    setDisconnecting(true)
    const result = await disconnect()
    setDisconnecting(false)
    if (result.success) {
      toast.success({ title: 'Clover disconnected', message: 'The location is no longer connected to Clover.' })
    } else {
      toast.error({ title: 'Disconnect failed', message: result.error || 'Unable to disconnect Clover.' })
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Clover</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Accept payments directly into this location&apos;s Clover merchant account.
          </p>
        </div>
        {status === 'connected' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Connected</Badge>}
        {status === 'error' && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">Reconnect required</Badge>}
        {status === 'disconnected' && <Badge variant="secondary">Not Connected</Badge>}
      </div>

      {status === 'connected' && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Merchant</dt>
            <dd className="font-medium text-foreground">{merchantName || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Merchant ID</dt>
            <dd className="font-medium text-foreground">{merchantId || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Connected</dt>
            <dd className="font-medium text-foreground">
              {connectedAt ? new Date(connectedAt).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      )}

      {status === 'error' && lastError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {lastError}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        {status === 'disconnected' && (
          <Button onClick={connect} disabled={!canWrite} title={!canWrite ? 'You do not have permission to connect Clover' : undefined}>
            Connect Clover
          </Button>
        )}
        {(status === 'connected' || status === 'error') && (
          <>
            <Button onClick={connect} disabled={!canWrite} title={!canWrite ? 'You do not have permission to reconnect Clover' : undefined}>
              Reconnect
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={!canDelete || disconnecting}
              title={!canDelete ? 'You do not have permission to disconnect Clover' : undefined}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, navigate to a page that renders `<CloverConnectionCard />` temporarily (Task 4 wires the real page). Confirm: "Not Connected" badge + "Connect Clover" button shown by default (since backend endpoint 404s → hook falls back to `disconnected`); button is disabled for a role lacking `settings.payments` write permission; clicking "Connect Clover" as a permitted role attempts `window.location.href` navigation to `{API_BASE}/api/payments/clover/connect` (visible in Network tab / URL bar even if it 404s against a stub backend).

- [ ] **Step 3: Commit**

```bash
git add app/settings/payments/clover/CloverConnectionCard.js
git commit -m "feat: add CloverConnectionCard component"
```

---

### Task 4: Payments settings page (`/settings/payments`)

**Files:**
- Create: `app/settings/payments/page.js`

**Interfaces:**
- Consumes: `MainLayout` from `@/components/layout/MainLayout` (confirmed pattern: `<MainLayout title="..." subtitle="...">...</MainLayout>`); `CloverConnectionCard` (Task 3); `useToast` from `@/components/ui/toast`; Next.js `useRouter`/`useSearchParams` from `next/navigation`.
- Produces: the `/settings/payments` page itself — terminal node, nothing downstream consumes it.

- [ ] **Step 1: Write the page**

```jsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { useToast } from '@/components/ui/toast'
import CloverConnectionCard from './clover/CloverConnectionCard'

const COMING_SOON_PROVIDERS = ['Stripe', 'Square', 'PayPal', 'Authorize.net']

export default function PaymentsSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  useEffect(() => {
    const status = searchParams.get('status')
    if (!status) return

    if (status === 'connected') {
      toast.success({ title: 'Clover connected', message: 'This location is now connected to Clover.' })
    } else if (status === 'error') {
      const reason = searchParams.get('reason')
      toast.error({ title: 'Clover connection failed', message: reason || 'Unable to complete the Clover connection.' })
    }

    router.replace('/settings/payments')
  }, [searchParams, router, toast])

  return (
    <MainLayout title="Payments" subtitle="Connect payment providers for this location.">
      <div className="space-y-4">
        <CloverConnectionCard />
        {COMING_SOON_PROVIDERS.map((name) => (
          <article key={name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 opacity-60 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-foreground">{name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
            </div>
          </article>
        ))}
      </div>
    </MainLayout>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Navigate to `/settings/payments` directly:
- Confirm the Clover card renders (from Task 3) followed by four disabled "coming soon" cards for Stripe/Square/PayPal/Authorize.net.
- Navigate to `/settings/payments?status=connected` and confirm a success toast fires once, then the URL is replaced to `/settings/payments` (no lingering query param, no toast on subsequent re-renders).
- Navigate to `/settings/payments?status=error&reason=State%20mismatch` and confirm an error toast shows "State mismatch", then the URL is cleaned.

- [ ] **Step 3: Commit**

```bash
git add app/settings/payments/page.js
git commit -m "feat: add Settings > Payments page with Clover connection card"
```

---

### Task 5: Wire the new `payments` permission module through the RBAC editor's local fallback (defensive, matches existing fixed pattern)

**Files:**
- Modify: `app\settings\users-roles\roles\components\RoleEditor.js` — **no code change expected**, verification-only task.

**Interfaces:**
- Consumes: master `permissionsSchema` prop as fetched from `GET /api/role/permissions` (backend-owned; must include a `payments` section with a `clover` module once the backend implements the spec).

- [ ] **Step 1: Manual verification (no backend yet — deferred check)**

This task has no frontend code to write: the `RolesDialog.js` fix from the earlier session already ensures every section in the master `permissionsSchema` — whatever the backend returns — renders for every role, including a new `payments` section once the backend adds it. Confirm this by temporarily stubbing the `/api/role/permissions` response (e.g. via browser devtools network override or a local mock) to include:

```json
{
  "payments": {
    "name": "Payments",
    "permissions": {
      "clover": { "read": false, "write": false, "edit": false, "delete": false }
    }
  }
}
```

Open Settings → Users & Roles → Roles → Edit Role for any role and confirm a "Payments" section with a "clover" resource row appears with toggle switches, consistent with every other section. Remove the stub afterward.

- [ ] **Step 2: No commit — verification-only task, skip if backend `payments` schema isn't available yet.**

---

## Self-Review Notes

- **Spec coverage:** Nav/route registration (Task 1), status/connect/disconnect data layer (Task 2), UI card with permission-gated actions and connected/error/disconnected states (Task 3), page shell with coming-soon placeholders and post-callback toast handling (Task 4), and confirmation that the RBAC fix already generalizes to the new `payments` module (Task 5) — all sections of the design spec are covered. Backend endpoints, token storage, and webhook handling are explicitly out of scope per the spec and not tasked here.
- **Placeholder scan:** No TBD/TODO; every step has complete, runnable code.
- **Type consistency:** `useCloverConnection()`'s return shape (`status`, `merchantId`, `merchantName`, `connectedAt`, `lastError`, `refresh`, `connect`, `disconnect`) is used identically in Task 3 and Task 4. `hasPermission('settings', 'payments', 'write'|'delete')` matches the `ROUTE_PERMISSIONS` module key (`payments`) registered in Task 1.
