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
  '/inbox': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/users': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/leads': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/calendar': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
  '/reports': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/forms': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/emails': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/sms': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/workflows': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/ai-calling': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  '/settings': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF],
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


