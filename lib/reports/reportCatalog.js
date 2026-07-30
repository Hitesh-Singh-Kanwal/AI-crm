export const CATEGORIES = [
  'Sales',
  'Teachers',
  'Leads',
  'Students',
  'Programs',
  'Studio/Growth',
]

/** @typedef {{ slug: string, title: string, description: string, category: string, keywords: string[], href: string, filters: string[], hasComparison?: boolean, hasActiveWindow?: boolean }} ReportCatalogEntry */

/** @type {ReportCatalogEntry[]} */
export const REPORT_CATALOG = [
  {
    slug: 'sales-cash',
    title: 'Sales and Cash Report',
    description: 'One row per financial event: new sales, payments, tips, refunds, and adjustments.',
    category: 'Sales',
    keywords: ['sales', 'cash', 'payment', 'refund', 'tip', 'transaction'],
    href: '/reports/sales-cash',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'teacher-performance',
    title: 'Lessons Taught by Teacher',
    description: 'Lessons taught by teacher — Intro, Private, Group, To Do — with session details. Group pay uses attendances; also includes revenue, conversions, and retention.',
    category: 'Teachers',
    keywords: ['teacher', 'performance', 'lessons taught', 'retention', 'revenue', 'lessons', 'group', 'intro', 'private', 'todo', 'attendance'],
    href: '/reports/teacher-performance',
    filters: ['dateRange', 'studio', 'teacher'],
    hasActiveWindow: true,
  },
  {
    slug: 'teacher-lesson-count',
    title: 'Teacher Lesson Count Report',
    description: 'Completed, cancelled, no-show, and complimentary lesson counts by teacher.',
    category: 'Teachers',
    keywords: ['teacher', 'lessons', 'count', 'cancelled', 'no-show'],
    href: '/reports/teacher-lesson-count',
    filters: ['dateRange', 'studio', 'teacher'],
  },
  {
    slug: 'revenue-by-teacher',
    title: 'Revenue by Teacher Report',
    description: 'Sale amounts credited to the selling teacher within the selected range.',
    category: 'Teachers',
    keywords: ['revenue', 'teacher', 'sales'],
    href: '/reports/revenue-by-teacher',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'lead-conversion',
    title: 'Lead Conversion Report',
    description: 'Lead pipeline from created to booked, intro, showed, and sold.',
    category: 'Leads',
    keywords: ['lead', 'conversion', 'sold', 'showed', 'intro'],
    href: '/reports/lead-conversion',
    filters: ['dateRange', 'studio', 'teacher', 'leadSource'],
  },
  {
    slug: 'intro-conversion',
    title: 'Intro Conversion Report',
    description: 'Intro lesson outcomes: showed, converted, program sold, and time to convert.',
    category: 'Leads',
    keywords: ['intro', 'conversion', 'trial', 'showed'],
    href: '/reports/intro-conversion',
    filters: ['dateRange', 'studio', 'teacher', 'leadSource'],
  },
  {
    slug: 'program-progression',
    title: 'Program Progression Report',
    description: 'First through third program types purchased per student with conversion timing.',
    category: 'Programs',
    keywords: ['program', 'progression', 'upgrade', 'purchase'],
    href: '/reports/program-progression',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'purchase-progression',
    title: 'Purchase Progression Report',
    description: 'First through fourth purchase types per student with spend and timing.',
    category: 'Programs',
    keywords: ['purchase', 'progression', 'upsell'],
    href: '/reports/purchase-progression',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'lead-source-performance',
    title: 'Lead Source Performance Report',
    description: 'Leads, bookings, shows, sales, and conversion rates by lead source.',
    category: 'Leads',
    keywords: ['lead source', 'source', 'marketing', 'conversion'],
    href: '/reports/lead-source-performance',
    filters: ['dateRange', 'studio', 'leadSource'],
  },
  {
    slug: 'active-inactive-students',
    title: 'Active and Inactive Student Report',
    description: 'Student status, lessons, spend, and program details using the active window.',
    category: 'Students',
    keywords: ['active', 'inactive', 'student', 'status'],
    href: '/reports/active-inactive-students',
    filters: ['dateRange', 'studio', 'teacher', 'program', 'leadSource'],
    hasActiveWindow: true,
  },
  {
    slug: 'student-retention',
    title: 'Student Retention Report',
    description: 'Retention signals from first/last lesson dates, activity gaps, and spend.',
    category: 'Students',
    keywords: ['retention', 'student', 'churn'],
    href: '/reports/student-retention',
    filters: ['dateRange', 'studio', 'teacher'],
    hasActiveWindow: true,
    hasComparison: true,
  },
  {
    slug: 'revenue-by-program',
    title: 'Revenue by Program Report',
    description: 'Sales, cash collected, and student counts rolled up by program.',
    category: 'Programs',
    keywords: ['revenue', 'program', 'product'],
    href: '/reports/revenue-by-program',
    filters: ['dateRange', 'studio', 'program'],
  },
  {
    slug: 'payment-plan',
    title: 'Payment Plan Report',
    description: 'Installment schedules, amounts paid, remaining balance, and next due dates.',
    category: 'Sales',
    keywords: ['payment plan', 'installment', 'due', 'balance'],
    href: '/reports/payment-plan',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'outstanding-balance',
    title: 'Outstanding Balance Report',
    description: 'Remaining balances after successful payments, credits, and refund adjustments.',
    category: 'Sales',
    keywords: ['outstanding', 'balance', 'owed', 'receivable'],
    href: '/reports/outstanding-balance',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'package-utilization',
    title: 'Package Utilization Report',
    description: 'Lessons purchased vs used vs remaining and utilization percentage.',
    category: 'Programs',
    keywords: ['package', 'utilization', 'lessons remaining'],
    href: '/reports/package-utilization',
    filters: ['dateRange', 'studio', 'teacher', 'program'],
  },
  {
    slug: 'reason-for-dancing',
    title: 'Reason for Dancing Report',
    description: 'Student volume and sales broken down by reason for dancing.',
    category: 'Students',
    keywords: ['reason', 'dancing', 'motivation'],
    href: '/reports/reason-for-dancing',
    filters: ['dateRange', 'studio', 'teacher', 'program', 'leadSource'],
  },
  {
    slug: 'growth',
    title: 'Growth Reports (MoM, YoY)',
    description: 'Period comparisons for sales, cash, leads, conversions, and active students.',
    category: 'Studio/Growth',
    keywords: ['growth', 'mom', 'yoy', 'comparison', 'trend'],
    href: '/reports/growth',
    filters: ['dateRange', 'studio'],
    hasComparison: true,
    hasActiveWindow: true,
  },
  {
    slug: 'studio-comparison',
    title: 'Studio Comparison Report',
    description: 'Side-by-side studio metrics for sales, cash, students, leads, and lessons.',
    category: 'Studio/Growth',
    keywords: ['studio', 'comparison', 'location', 'branch'],
    href: '/reports/studio-comparison',
    filters: ['dateRange'],
    hasComparison: true,
  },
  {
    slug: 'group-attendance',
    title: 'Group Attendance Report',
    description: 'Group class sessions with expandable student attendance and payment status.',
    category: 'Students',
    keywords: ['group', 'attendance', 'class', 'drop-in'],
    href: '/reports/group-attendance',
    filters: ['dateRange', 'studio', 'teacher'],
  },
]

export function getReportBySlug(slug) {
  return REPORT_CATALOG.find((r) => r.slug === slug)
}

export function filterCatalog({ search = '', category = '', favoriteSlugs } = {}) {
  const q = String(search || '').trim().toLowerCase()
  let rows = REPORT_CATALOG

  if (category) {
    rows = rows.filter((r) => r.category === category)
  }

  if (q) {
    rows = rows.filter((r) => {
      const hay = [r.title, r.description, r.slug, ...(r.keywords || [])].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }

  if (Array.isArray(favoriteSlugs)) {
    const set = new Set(favoriteSlugs)
    rows = rows.filter((r) => set.has(r.slug))
  }

  return rows
}

export function partitionCatalogByFavorites(favoriteSlugs = [], { search = '', category = '' } = {}) {
  const favoriteSet = new Set(favoriteSlugs)
  const filtered = filterCatalog({ search, category })
  const favoriteRows = filtered.filter((r) => favoriteSet.has(r.slug))
  const orderedFavorites = favoriteSlugs
    .map((slug) => favoriteRows.find((r) => r.slug === slug))
    .filter(Boolean)

  return {
    favorites: orderedFavorites,
    all: filtered,
  }
}
