import { getCurrentUser, getEffectiveBranch } from './auth'
import { ROLES, isRole } from './constants'

/**
 * Get branch query parameter for API calls
 * @returns {string|null} - Branch ID or null for all branches
 */
export function getBranchQueryParam() {
  return getEffectiveBranch()
}

/**
 * Check if current view is showing all branches
 * @returns {boolean}
 */
export function isViewingAllBranches() {
  const user = getCurrentUser()
  const effectiveBranch = getEffectiveBranch()

  return isRole(user?.role, ROLES.SUPER_ADMIN) && !effectiveBranch
}
