import { getCurrentUser } from './auth'
import { ROUTE_ACCESS, ROLES } from './constants'

export function hasPermission(category, module, type) {
  const user = getCurrentUser()
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true
  return Boolean(user.permissions?.[category]?.permissions?.[module]?.[type])
}

export function hasAnyPermission(checks) {
  return checks.some(([category, module, type]) => hasPermission(category, module, type))
}

export function hasAllPermissions(checks) {
  return checks.every(([category, module, type]) => hasPermission(category, module, type))
}

export function canAccessRoute(route) {
  const user = getCurrentUser()
  if (!user) return false

  // Exact match first; if not found, fall back to the longest matching prefix route.
  // This supports dynamic segments like `/ai-automation/workflows/:id` without needing to list every id.
  let allowedRoles = ROUTE_ACCESS[route]
  if (!allowedRoles) {
    let bestMatch = null
    for (const key of Object.keys(ROUTE_ACCESS)) {
      if (route === key || route.startsWith(`${key}/`)) {
        if (!bestMatch || key.length > bestMatch.length) bestMatch = key
      }
    }
    if (bestMatch) allowedRoles = ROUTE_ACCESS[bestMatch]
  }
  if (!allowedRoles) return true // No restrictions

  // ROUTE_ACCESS only models the three canonical roles (and is
  // case-sensitive — a role stored as "SuperAdmin" does not match
  // ROLES.SUPER_ADMIN = 'superadmin'). A custom or miscased role has no
  // matching entry anywhere in ROUTE_ACCESS, so every listed route rejects
  // it — including wherever getDefaultRedirect() sends it, which otherwise
  // produces an infinite redirect loop with nowhere left to go.
  //
  // Note: `/settings` itself (app/settings/page.js) immediately
  // server-redirects to `/settings/studio` — the client-side pathname this
  // check actually runs against is `/settings/studio`, never the bare
  // `/settings`. The exemption must target the real landing route, not the
  // one that redirects away before canAccessRoute ever sees it.
  if (route === '/settings/studio' && !Object.values(ROLES).includes(user.role)) {
    return true
  }

  return allowedRoles.includes(user.role)
}

export function getAccessibleRoutes() {
  const user = getCurrentUser()
  if (!user) return []

  return Object.entries(ROUTE_ACCESS)
    .filter(([route, roles]) => roles.includes(user.role))
    .map(([route]) => route)
}

export function isSuperAdmin() {
  const user = getCurrentUser()
  return user?.role === ROLES.SUPER_ADMIN
}

export function isAdmin() {
  const user = getCurrentUser()
  return user?.role === ROLES.ADMIN
}

export function isStaff() {
  const user = getCurrentUser()
  return user?.role === ROLES.STAFF
}

export function getDefaultRedirect() {
  const user = getCurrentUser()
  if (!user) return '/auth/login'

  // Staff users go to inbox by default
  if (user.role === ROLES.STAFF) {
    return '/inbox'
  }

  // Admin and Super Admin go to dashboard
  if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
    return '/'
  }

  // Custom or miscased role (see canAccessRoute above): land directly on
  // /settings/studio — not /settings, which immediately redirects there
  // anyway and would cost an extra bounce through a route this function's
  // caller never actually gets to check.
  return '/settings/studio'
}


