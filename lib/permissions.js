import { getCurrentUser } from './auth'
import { ROUTE_ACCESS, PERMISSIONS, ROLES } from './constants'

export function hasPermission(permission) {
  const user = getCurrentUser()
  if (!user) return false

  return user.permissions?.includes(permission) || false
}

export function hasAnyPermission(permissions) {
  return permissions.some((permission) => hasPermission(permission))
}

export function hasAllPermissions(permissions) {
  return permissions.every((permission) => hasPermission(permission))
}

export function canAccessRoute(route) {
  const user = getCurrentUser()
  if (!user) return false

  // Exact match first; if not found, fall back to the longest matching prefix route.
  // This supports dynamic segments like `/workflow/:id` without needing to list every id.
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

  return allowedRoles.includes(user.role)
}

export function getAccessibleRoutes() {
  const user = getCurrentUser()
  if (!user) return []

  return Object.entries(ROUTE_ACCESS)
    .filter(([route, roles]) => roles.includes(user.role))
    .map(([route]) => route)
}

export function canManageUsers() {
  return hasPermission(PERMISSIONS.MANAGE_USERS)
}

export function canManageBranches() {
  return hasPermission(PERMISSIONS.MANAGE_BRANCHES)
}

export function canCreateEditDelete() {
  return hasPermission(PERMISSIONS.CREATE_EDIT_DELETE)
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
  return '/'
}


