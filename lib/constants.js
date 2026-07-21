// User Roles
export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  STAFF: 'staff',
}

// Permissions
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_INBOX: 'view_inbox',
  VIEW_USERS: 'view_users',
  VIEW_LEADS: 'view_leads',
  VIEW_CALENDAR: 'view_calendar',
  VIEW_REPORTS: 'view_reports',
  VIEW_FORMS: 'view_forms',
  VIEW_EMAILS: 'view_emails',
  VIEW_SMS: 'view_sms',
  VIEW_WORKFLOWS: 'view_workflows',
  VIEW_AI_CALLING: 'view_ai_calling',
  MANAGE_USERS: 'manage_users',
  MANAGE_BRANCHES: 'manage_branches',
  CREATE_EDIT_DELETE: 'create_edit_delete',
}

// Role Permissions Mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FORMS,
    PERMISSIONS.VIEW_EMAILS,
    PERMISSIONS.VIEW_SMS,
    PERMISSIONS.VIEW_WORKFLOWS,
    PERMISSIONS.VIEW_AI_CALLING,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.CREATE_EDIT_DELETE,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FORMS,
    PERMISSIONS.VIEW_EMAILS,
    PERMISSIONS.VIEW_SMS,
    PERMISSIONS.VIEW_WORKFLOWS,
    PERMISSIONS.VIEW_AI_CALLING,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.CREATE_EDIT_DELETE,
  ],
  [ROLES.STAFF]: [PERMISSIONS.VIEW_INBOX, PERMISSIONS.VIEW_CALENDAR],
}

// Route Access
export const ROUTE_ACCESS = {
  '/': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/dashboard': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/inbox': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/inbox/all-messages': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/inbox/human-queue': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/inbox/calls': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/inbox/talk-to-assistant': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/leads': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/calendar': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/reports': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/marketing/form-builder': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/marketing/campaigns': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/marketing/email-builder': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/marketing/sms-builder': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/make-calls': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/ai-calling': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/ai-messaging': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/followup-settings': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/workflows': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/dynamic-lists': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/dynamic-list': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/ai-calling-data': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-automation/training': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/settings/studio': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/settings/users-roles': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/users-roles/users': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/users-roles/roles': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/integrations': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/phone': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/billing': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/payments': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings/activity-log': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
}

// Route → backend permission category/module, for routes with a real
// backend-enforced permission. Routes with no entry here fall back to
// ROUTE_ACCESS's role-array check (see canAccessRoute in lib/permissions.js).
export const ROUTE_PERMISSIONS = {
  '/leads': { category: 'leads', module: 'manage' },
  '/calendar': { category: 'calendar', module: 'bookings' },
  '/marketing/form-builder': { category: 'marketing', module: 'forms' },
  '/marketing/campaigns': { category: 'marketing', module: 'campaigns' },
  '/marketing/email-builder': { category: 'marketing', module: 'emails' },
  '/marketing/sms-builder': { category: 'marketing', module: 'sms' },
  '/ai-automation/make-calls': { category: 'AiAndAutomation', module: 'aiCalling' },
  '/ai-automation/ai-calling': { category: 'AiAndAutomation', module: 'aiCalling' },
  '/ai-automation/ai-calling-data': { category: 'AiAndAutomation', module: 'aiCalling' },
  '/ai-automation/ai-messaging': { category: 'AiAndAutomation', module: 'assistants' },
  '/ai-automation/followup-settings': { category: 'AiAndAutomation', module: 'assistants' },
  '/ai-automation/workflows': { category: 'AiAndAutomation', module: 'workflows' },
  '/ai-automation/training': { category: 'AiAndAutomation', module: 'assistants' },
  '/ai-automation/dynamic-lists': { category: 'AiAndAutomation', module: 'dynamicLists' },
  '/dynamic-list': { category: 'AiAndAutomation', module: 'dynamicLists' },
  '/inbox': { category: 'inbox', module: 'AllMessages' },
  '/inbox/all-messages': { category: 'inbox', module: 'AllMessages' },
  '/inbox/human-queue': { category: 'inbox', module: 'CallCenter' },
  '/reports': { category: 'reports', module: 'overview' },
  '/reports/teacher-commissions': { category: 'reports', module: 'teacherCommissions' },
  '/reports/callbacks': { category: 'reports', module: 'overview' },
  // '/settings' and '/settings/studio' deliberately have no entry here —
  // viewing the studio/locations page is open to any authenticated user
  // (matches the backend, which no longer gates GET /api/location reads),
  // so these fall back to ROUTE_ACCESS below, which already allows staff.
  '/settings/users-roles': { category: 'settings', module: 'users' },
  '/settings/users-roles/users': { category: 'settings', module: 'users' },
  '/settings/users-roles/roles': { category: 'settings', module: 'roles' },
  // Customers live under this path but are gated by their own permission, not
  // settings.users. Prefix matching in canAccessRoute extends this to the
  // detail route (/settings/users-roles/customers/:id) too.
  '/settings/users-roles/customers': { category: 'customers', module: 'manage' },
  '/settings/setup': { category: 'settings', module: 'setup' },
  '/settings/integrations': { category: 'settings', module: 'integration' },
  '/settings/phone': { category: 'settings', module: 'integration' },
  '/settings/billing': { category: 'settings', module: 'Billings' },
  '/settings/payments': { category: 'settings', module: 'payments' },
  '/settings/activity-log': { category: 'settings', module: 'activityLog' },
}

// Lead Statuses
export const LEAD_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
}

// Lead Health
export const LEAD_HEALTH = {
  COLD: 'Cold',
  CONTACTED: 'Contacted',
  CONVERTED: 'Converted',
}

// Appointment Types
export const APPOINTMENT_TYPES = {
  CALL: 'Call',
  MEETING: 'Meeting',
  DEMO: 'Demo',
  FOLLOW_UP: 'Follow-up',
}

// Contact Types
export const CONTACT_TYPES = {
  ALL: 'All',
  CUSTOMERS: 'Customers',
  LEADS: 'Leads',
  TEACHERS: 'Teachers',
}

// Communication Channels
export const CHANNELS = {
  ALL: 'All',
  EMAIL: 'Email',
  SMS: 'SMS',
  CALL: 'Call',
}

// Branch Statuses
export const BRANCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}


