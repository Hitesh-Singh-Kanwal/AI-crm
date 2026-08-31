/**
 * Display helpers for user invite status (invited / invite expired / active / inactive).
 */

export function getUserInviteStatusMeta(user) {
  const status = String(user?.status || '').toLowerCase()
  if (status === 'invited') {
    const expired =
      user?.inviteExpired === true ||
      (user?.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() <= Date.now())
    if (expired) {
      return {
        label: 'Invite expired',
        variant: 'error',
        className: 'badge-error',
        isInvited: true,
        isExpired: true,
      }
    }
    return {
      label: 'Invited',
      variant: 'warning',
      className: 'badge-warning',
      isInvited: true,
      isExpired: false,
    }
  }
  if (status === 'active') {
    return {
      label: 'Active',
      variant: 'success',
      className: 'badge-success',
      isInvited: false,
      isExpired: false,
    }
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    variant: 'error',
    className: 'badge-error',
    isInvited: false,
    isExpired: false,
  }
}
