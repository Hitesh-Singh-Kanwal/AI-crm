'use client'

import { ROLES, ROLE_PERMISSIONS } from './constants'

// Session storage key (stores { token, user })
const USER_STORAGE_KEY = 'crm_user_session'

// Build API URL: prefer NEXT_PUBLIC_API_BASE_URL when provided, otherwise use relative paths
function apiUrl(path) {
  const base = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || ''
  // if base provided, strip trailing slash and prepend base; otherwise return relative path
  if (base) {
    return `${base.replace(/\/$/, '')}${path}`
  }
  return path
}

export async function login(email, password) {
  try {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const body = await res.json().catch(() => null)

    if (res.ok && body && body.success) {
      const { token, user } = body.data || {}
      const session = { token, user }
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session))
      }
      return { success: true, user }
    }

    return { success: false, error: (body && body.message) || 'Invalid credentials' }
  } catch (err) {
    // Network error - return friendly message
    return { success: false, error: 'Network error. Please try again.' }
  }
}

export async function registerOrganization(organisationInfo, userInfo) {
  try {
    const res = await fetch(apiUrl('/api/auth/registerOrganization'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrganisationInfo: organisationInfo, userInfo }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && body && body.success) {
      return { success: true, data: body.data, message: body.message }
    }
    return { success: false, error: (body && body.message) || 'Registration failed' }
  } catch (err) {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem('crm_selected_branch')
    window.location.href = '/login'
  }
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null

  const sessionJson = localStorage.getItem(USER_STORAGE_KEY)
  if (!sessionJson) return null

  try {
    const session = JSON.parse(sessionJson)
    return session?.user || null
  } catch {
    return null
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null
  const sessionJson = localStorage.getItem(USER_STORAGE_KEY)
  if (!sessionJson) return null
  try {
    const session = JSON.parse(sessionJson)
    return session?.token || null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return getCurrentUser() !== null
}

export function getUserRole() {
  const user = getCurrentUser()
  return user?.role || null
}

export function isSuperAdmin() {
  return getUserRole() === ROLES.SUPER_ADMIN
}

export function isAdmin() {
  return getUserRole() === ROLES.ADMIN
}

export function isStaff() {
  return getUserRole() === ROLES.STAFF
}

export function getUserBranch() {
  const user = getCurrentUser()
  return user?.branchId || null
}

export function getUserBranchName() {
  const user = getCurrentUser()
  return user?.branchName || null
}

// For Super Admin - get/set selected branch
export function getSelectedBranch() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('crm_selected_branch')
}

export function setSelectedBranch(branchId) {
  if (typeof window === 'undefined') return
  if (branchId) {
    localStorage.setItem('crm_selected_branch', branchId)
  } else {
    localStorage.removeItem('crm_selected_branch')
  }
  window.dispatchEvent(
    new CustomEvent('branch-change', {
      detail: { branchId },
    })
  )
}

// Get effective branch for queries (considers selected branch for super admin)
export function getEffectiveBranch() {
  const user = getCurrentUser()
  if (!user) return null

  if (user.role === ROLES.SUPER_ADMIN) {
    return getSelectedBranch() // Can be null for "All Branches"
  }

  return user.branchId
}

