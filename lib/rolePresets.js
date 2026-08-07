// Starting points offered in the "Start from a template" picker when creating a
// role. Each entry only sets the modules it cares about — modules a preset is
// silent on stay at their schema default (all-false, scope 'all'), so applying
// one is safe even against a catalog that's grown new modules since these were
// written.
//
// Keys are "category.module" (matching the shape of permissionsSchema); values
// are the four action booleans plus scope. Only 'all'/'own' scoped modules
// (see the backend catalog's `scopeable` flag) do anything with `scope` —
// setting it on a non-scopeable module is harmless, just unused.

const RW = { read: true, write: true, edit: true, delete: false, scope: 'all', subPermissions: {} }
const RWD = { read: true, write: true, edit: true, delete: true, scope: 'all', subPermissions: {} }
const R = { read: true, write: false, edit: false, delete: false, scope: 'all', subPermissions: {} }
const OWN_RW = { read: true, write: true, edit: true, delete: false, scope: 'own', subPermissions: {} }
const OWN_R = { read: true, write: false, edit: false, delete: false, scope: 'own', subPermissions: {} }

/** Merge sub-permission grants onto a base action preset (e.g. RWD). */
const withSub = (base, subPermissions) => ({ ...base, subPermissions })

export const ROLE_PRESETS = [
  {
    id: 'teacher',
    label: 'Teacher / Instructor',
    description: 'Sees only their own classes, students, and commissions.',
    permissions: {
      'calendar.bookings': OWN_RW,
      'calendar.lessons': OWN_R,
      'calendar.todos': OWN_RW,
      'calendar.enrollment': OWN_R,
      'calendar.teachers': OWN_R,
      'customers.manage': OWN_R,
      'reports.overview': OWN_R,
      'reports.teacherCommissions': OWN_R,
    },
  },
  {
    id: 'front-desk',
    label: 'Front Desk / Receptionist',
    description: 'Full calendar, leads, customers, and inbox. No reports, automation, or settings.',
    permissions: {
      'calendar.bookings': RWD,
      'calendar.lessons': RW,
      'calendar.todos': RW,
      'calendar.enrollment': RW,
      'calendar.teachers': R,
      'calendar.memberships': RW,
      'calendar.packages': RW,
      'calendar.services': R,
      'leads.manage': RWD,
      'customers.manage': RWD,
      'inbox.AllMessages': RW,
      'inbox.CallCenter': RW,
      'settings.payments': RW,
    },
  },
  {
    id: 'call-center-agent',
    label: 'Call Center Agent',
    description: 'Inbox and call center queue only — their own calls plus the shared waiting pool.',
    permissions: {
      'inbox.CallCenter': OWN_RW,
      'customers.manage': OWN_R,
    },
  },
  {
    id: 'sales-rep',
    label: 'Sales Rep',
    description: 'Leads and marketing, full calendar and customers, their own commission figures.',
    permissions: {
      'leads.manage': withSub(RWD, { export: true, bulkImport: false }),
      'customers.manage': RW,
      'calendar.bookings': RW,
      'calendar.enrollment': RW,
      'marketing.forms': RW,
      'marketing.campaigns': RW,
      'marketing.emails': RW,
      'marketing.sms': RW,
      'inbox.AllMessages': RW,
      'reports.overview': OWN_R,
    },
  },
  {
    id: 'studio-manager',
    label: 'Studio Manager',
    description: 'Everything at one location: calendar, customers, leads, reports, and team management.',
    permissions: {
      'dashboard.leadConversion': R,
      'dashboard.AiAnalytics': R,
      'calendar.lessons': RWD,
      'calendar.todos': RWD,
      'calendar.enrollment': RWD,
      'calendar.teachers': RWD,
      'calendar.memberships': RWD,
      'calendar.packages': RWD,
      'calendar.services': RWD,
      'calendar.curriculum': RW,
      'calendar.bookings': withSub(RWD, { cancel: true, reschedule: true }),
      'leads.manage': withSub(RWD, { export: true, bulkImport: true }),
      'customers.manage': withSub(RWD, { export: true }),
      'inbox.AllMessages': RWD,
      'inbox.CallCenter': RWD,
      'reports.overview': R,
      'reports.teacherCommissions': R,
      'settings.users': RW,
      'settings.roles': R,
      'settings.locations': R,
      'settings.payments': withSub(RW, { refund: true }),
      'settings.activityLog': R,
    },
  },
]

/**
 * Apply a preset onto a permissions object shaped like editingRole.permissions
 * (deepClonePermissions' output). Mutates nothing — returns a new object.
 * Modules the preset doesn't mention are left untouched.
 */
export function applyRolePreset(permissions, preset) {
  const next = JSON.parse(JSON.stringify(permissions || {}))
  for (const [key, actions] of Object.entries(preset.permissions)) {
    const [category, module] = key.split('.')
    if (!next[category]) next[category] = { permissions: {} }
    if (!next[category].permissions) next[category].permissions = {}
    next[category].permissions[module] = { ...actions }
  }
  return next
}
