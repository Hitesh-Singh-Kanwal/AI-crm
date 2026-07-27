import { getCurrentUser } from './auth'
import { ROUTE_ACCESS, ROUTE_PERMISSIONS, ROLES } from './constants'

// CallCenter renamed from HumanQueue — honor either key until all roles are re-saved.
const MODULE_ALIASES = {
  CallCenter: ['HumanQueue'],
  HumanQueue: ['CallCenter'],
}

export function hasPermission(category, module, type, options = {}) {
  const { allowAliases = true } = options
  const user = getCurrentUser()
  if (!user) return false
  if (user.role === ROLES.SUPER_ADMIN) return true
  // "All Permissions" master switch: master.* grants the requested action on
  // every resource, mirroring the backend's roleMiddleware. Checked first so a
  // Master-granted role sees the menus and routes it can actually access.
  if (user.permissions?.master?.permissions?.['*']?.[type]) return true
  const modules = user.permissions?.[category]?.permissions
  if (!modules) return false
  if (modules?.[module]?.[type]) return true
  if (!allowAliases) return false
  const aliases = MODULE_ALIASES[module] || []
  return aliases.some((alias) => Boolean(modules?.[alias]?.[type]))
}

/** Call Center write/edit — ignores legacy HumanQueue keys. */
export function canManageCallCenter() {
  return (
    hasPermission('inbox', 'CallCenter', 'write', { allowAliases: false }) ||
    hasPermission('inbox', 'CallCenter', 'edit', { allowAliases: false })
  )
}

export function hasAnyPermission(checks) {
  return checks.some(([category, module, type]) => hasPermission(category, module, type))
}

export function hasAllPermissions(checks) {
  return checks.every(([category, module, type]) => hasPermission(category, module, type))
}

// Longest-prefix lookup so a mapping on a parent route (e.g. the customers
// list) also covers its dynamic children (/…/customers/:id), mirroring the
// ROUTE_ACCESS matching further down.
function matchRoutePrefix(map, route) {
  if (map[route]) return map[route]
  let bestKey = null
  for (const key of Object.keys(map)) {
    if (route.startsWith(`${key}/`) && (!bestKey || key.length > bestKey.length)) {
      bestKey = key
    }
  }
  return bestKey ? map[bestKey] : null
}

export function canAccessRoute(route) {
  const user = getCurrentUser()
  if (!user) return false

  // Real backend-enforced permission check takes priority over the legacy
  // role-array system, for any route the backend actually gates.
  const permissionEntry = matchRoutePrefix(ROUTE_PERMISSIONS, route)
  if (permissionEntry) {
    const modules = Array.isArray(permissionEntry.module) ? permissionEntry.module : [permissionEntry.module]
    if (modules.some((module) => hasPermission(permissionEntry.category, module, 'read'))) {
      return true
    }
    // Safety net for /settings/studio specifically: a custom or miscased
    // role (see the ROUTE_ACCESS branch below for the full explanation)
    // that hasn't been granted settings.locations.read yet — e.g. a brand
    // new custom role created after the backend migration ran — must
    // still be able to land somewhere, or getDefaultRedirect() sends it
    // here and canAccessRoute rejects it, reproducing the original
    // infinite-redirect-loop bug via this new permission-check path
    // instead of the old role-array one.
    if (route === '/settings/studio' && !Object.values(ROLES).includes(user.role)) {
      return true
    }
    return false
  }

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


