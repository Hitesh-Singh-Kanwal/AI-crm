import { makeCatalogApi } from '@/lib/reports/report-filter-catalog-api'
import { REPORT_COLUMNS } from '@/lib/reports/reportColumns'
import { buildCatalogFromColumns } from '@/lib/reports/buildCatalogFromColumns'

function field(def) {
  return { operators: ['eq'], inputType: 'text', staticOptions: null, optionsKey: null, ...def }
}

const SALES_CASH_FILTER_GROUPS = [
  {
    id: 'sales_cash_columns',
    label: 'Columns',
    fields: [
      field({ value: 'transactionType', label: 'Transaction Type', inputType: 'select', operators: ['eq'], staticOptions: ['New Sale', 'Installment', 'Tip', 'Refund', 'Credit Top-up', 'Session Payment'] }),
      field({ value: 'studentName', label: 'Student Name', operators: ['contains', 'eq'] }),
      field({ value: 'teacherName', label: 'Teacher', operators: ['contains', 'eq'] }),
      field({ value: 'studioName', label: 'Studio', operators: ['contains', 'eq'] }),
      field({ value: 'transactionDate', label: 'Transaction Date', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'saleAmount', label: 'Sale Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'cashCollected', label: 'Cash Collected', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'tipAmount', label: 'Tip Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'discountAmount', label: 'Discount Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'refundAmount', label: 'Refund Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'programName', label: 'Program', operators: ['contains', 'eq'] }),
      field({ value: 'paymentMethod', label: 'Payment Method', inputType: 'select', operators: ['eq'], staticOptions: ['cash', 'card', 'online', 'cheque', 'other', 'wallet'] }),
      field({ value: 'paymentStatus', label: 'Payment Status', inputType: 'select', operators: ['eq'], staticOptions: ['completed', 'pending', 'failed'] }),
      field({ value: 'remainingBalance', label: 'Remaining Balance', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
    ],
  },
]

const OUTSTANDING_BALANCE_FILTER_GROUPS = [
  {
    id: 'outstanding_balance_columns',
    label: 'Columns',
    fields: [
      field({ value: 'studentName', label: 'Student Name', operators: ['contains', 'eq'] }),
      field({ value: 'studioName', label: 'Studio', operators: ['contains', 'eq'] }),
      field({ value: 'teacherName', label: 'Teacher', operators: ['contains', 'eq'] }),
      field({ value: 'programName', label: 'Program', operators: ['contains', 'eq'] }),
      field({ value: 'originalSaleAmount', label: 'Original Sale Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'successfulPayments', label: 'Successful Payments', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'outstandingBalance', label: 'Outstanding Balance', inputType: 'number', operators: ['eq', 'gt', 'lt', 'gte', 'between'] }),
    ],
  },
]

const REVENUE_BY_TEACHER_FILTER_GROUPS = [
  {
    id: 'revenue_by_teacher_columns',
    label: 'Columns',
    fields: [
      field({ value: 'entityName', label: 'Name', operators: ['contains', 'eq'] }),
      field({ value: 'totalLessons', label: 'Total Lessons', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'activeStudents', label: 'Active Students', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'revenueGenerated', label: 'Revenue Generated', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'introConversions', label: 'Intro Conversions', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'programUpgrades', label: 'Program Upgrades', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'retentionPct', label: 'Retention %', inputType: 'number', operators: ['eq', 'gte', 'lt', 'between'] }),
      field({ value: 'avgLessonsPerStudent', label: 'Avg Lessons per Student', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
    ],
  },
]

const LEAD_CONVERSION_FILTER_GROUPS = [
  {
    id: 'lead_conversion_columns',
    label: 'Columns',
    fields: [
      field({ value: 'leadName', label: 'Lead Name', operators: ['contains', 'eq'] }),
      field({ value: 'leadSource', label: 'Lead Source', inputType: 'select', operators: ['eq'], staticOptions: ['Manual', 'Bulk Upload', 'Website Form', 'Incoming SMS', 'Incoming Email', 'WhatsApp', 'Incoming Call'] }),
      field({ value: 'dateCreated', label: 'Date Created', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'dateBooked', label: 'Date Booked', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'dateOfIntro', label: 'Date of Intro', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'showed', label: 'Showed', inputType: 'select', operators: ['eq'], staticOptions: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }),
      field({ value: 'sold', label: 'Sold', inputType: 'select', operators: ['eq'], staticOptions: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }),
      field({ value: 'saleAmount', label: 'Sale Amount', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'teacherAssigned', label: 'Teacher Assigned', operators: ['contains', 'eq'] }),
      field({ value: 'timeToConvertDays', label: 'Time to Convert (days)', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
    ],
  },
]

const PAYMENT_PLAN_FILTER_GROUPS = [
  {
    id: 'payment_plan_columns',
    label: 'Columns',
    fields: [
      field({ value: 'studentName', label: 'Student Name', operators: ['contains', 'eq'] }),
      field({ value: 'studioName', label: 'Studio', operators: ['contains', 'eq'] }),
      field({ value: 'teacherName', label: 'Teacher', operators: ['contains', 'eq'] }),
      field({ value: 'programName', label: 'Program', operators: ['contains', 'eq'] }),
      field({ value: 'planTotal', label: 'Plan Total', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'installmentsPaid', label: 'Installments Paid', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'installmentsRemaining', label: 'Installments Remaining', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'nextDueDate', label: 'Next Due Date', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'paymentStatus', label: 'Payment Status', inputType: 'select', operators: ['eq'], staticOptions: ['active', 'completed', 'paused', 'cancelled', 'past_due'] }),
    ],
  },
]

const ACTIVE_INACTIVE_STUDENTS_FILTER_GROUPS = [
  {
    id: 'active_inactive_students_columns',
    label: 'Columns',
    fields: [
      field({ value: 'studentName', label: 'Student Name', operators: ['contains', 'eq'] }),
      field({ value: 'teacherName', label: 'Teacher', operators: ['contains', 'eq'] }),
      field({ value: 'studioName', label: 'Studio', operators: ['contains', 'eq'] }),
      field({ value: 'status', label: 'Status', inputType: 'select', operators: ['eq'], staticOptions: ['Active', 'Inactive'] }),
      field({ value: 'lastLessonDate', label: 'Last Lesson Date', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'nextLessonDate', label: 'Next Lesson Date', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'lessonsTaken', label: 'Lessons Taken', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'lessonsRemaining', label: 'Lessons Remaining', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'totalSpend', label: 'Total Spend', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'programType', label: 'Program Type', operators: ['contains', 'eq'] }),
    ],
  },
]

const GROUP_ATTENDANCE_FILTER_GROUPS = [
  {
    id: 'group_attendance_columns',
    label: 'Columns',
    fields: [
      field({ value: 'className', label: 'Class Name', operators: ['contains', 'eq'] }),
      field({ value: 'classDate', label: 'Class Date', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'teacherName', label: 'Teacher', operators: ['contains', 'eq'] }),
      field({ value: 'studentName', label: 'Student Name', operators: ['contains', 'eq'] }),
      field({
        value: 'attended',
        label: 'Student Attended',
        inputType: 'select',
        operators: ['eq'],
        staticOptions: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      }),
      field({ value: 'paymentSource', label: 'Payment Source', inputType: 'select', operators: ['eq'], staticOptions: ['Package', 'Membership', 'Drop-in', 'Comp'] }),
      field({ value: 'paymentStatus', label: 'Payment Status', inputType: 'select', operators: ['eq'], staticOptions: ['Paid', 'Unpaid'] }),
    ],
  },
]

const REASON_FOR_DANCING_FILTER_GROUPS = [
  {
    id: 'reason_for_dancing_columns',
    label: 'Columns',
    fields: [
      field({ value: 'reason', label: 'Reason', operators: ['contains', 'eq'] }),
      field({ value: 'studentCount', label: 'Student Count', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'totalSales', label: 'Total Sales', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'cashCollected', label: 'Cash Collected', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'conversionPct', label: 'Conversion %', inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'studioName', label: 'Studio', operators: ['contains', 'eq'] }),
    ],
  },
]

const EXPLICIT_REPORT_FILTER_CATALOGS = {
  'sales-cash': makeCatalogApi(SALES_CASH_FILTER_GROUPS),
  'outstanding-balance': makeCatalogApi(OUTSTANDING_BALANCE_FILTER_GROUPS),
  'revenue-by-teacher': makeCatalogApi(REVENUE_BY_TEACHER_FILTER_GROUPS),
  'lead-conversion': makeCatalogApi(LEAD_CONVERSION_FILTER_GROUPS),
  'payment-plan': makeCatalogApi(PAYMENT_PLAN_FILTER_GROUPS),
  'active-inactive-students': makeCatalogApi(ACTIVE_INACTIVE_STUDENTS_FILTER_GROUPS),
  'group-attendance': makeCatalogApi(GROUP_ATTENDANCE_FILTER_GROUPS),
  'reason-for-dancing': makeCatalogApi(REASON_FOR_DANCING_FILTER_GROUPS),
}

export const REPORT_FILTER_CATALOGS = {
  ...Object.fromEntries(
    Object.entries(REPORT_COLUMNS).map(([slug, columns]) => [slug, buildCatalogFromColumns(columns, `${slug}_columns`)]),
  ),
  ...EXPLICIT_REPORT_FILTER_CATALOGS,
}

const DASHBOARD_LEADS_FILTER_GROUPS = [
  {
    id: 'dashboard_leads_columns',
    label: 'Columns',
    fields: [
      field({ value: 'name', label: 'Name', operators: ['contains', 'eq'] }),
      field({ value: 'email', label: 'Email', operators: ['contains', 'eq'] }),
      field({ value: 'phoneNumber', label: 'Phone', operators: ['contains', 'eq'] }),
      field({ value: 'stage', label: 'Stage', inputType: 'select', operators: ['eq'], staticOptions: ['new', 'engaged', 'qualified', 'booked', 'actualized', 'cold', 'no show', 'disqualified', 'human intervention'] }),
      field({ value: 'studio', label: 'Studio', operators: ['contains', 'eq'] }),
      field({ value: 'createdAt', label: 'Created', inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'] }),
      field({ value: 'uploadType', label: 'Upload Type', inputType: 'select', operators: ['eq'], staticOptions: ['manual', 'bulk_upload', 'form_submission', 'incoming_sms', 'incoming_email', 'incoming_whatsapp', 'incoming_call'] }),
    ],
  },
]

export const DASHBOARD_DETAILS_FILTER_CATALOGS = {
  leads: makeCatalogApi(DASHBOARD_LEADS_FILTER_GROUPS),
}
