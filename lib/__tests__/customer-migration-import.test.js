import { describe, it, expect } from 'vitest'
import {
  parseCsvFile,
  CUSTOMER_COLUMNS,
  SERVICE_COLUMNS,
  ENROLLMENT_COLUMNS,
  MEMBERSHIP_COLUMNS,
  LESSON_COLUMNS,
  PAYMENT_COLUMNS,
  preflightCheck,
  computeSheetTotals,
} from '../customer-migration-import'

function csvFile(text, name = 'test.csv') {
  return new File([text], name, { type: 'text/csv' })
}

describe('customer-migration-import header parsing', () => {
  it('recognizes required columns even when the sheet marks them with a trailing "*"', async () => {
    const csv = [
      'Legacy Customer ID *,First Name *,Last Name *,Email,Studio *,Status (active/inactive/archived)',
      'AM-10482,Maria,Lopez,maria.lopez@gmail.com,Houston,active',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)

    expect(row.legacyCustomerID).toBe('AM-10482')
    expect(row.firstName).toBe('Maria')
    expect(row.lastName).toBe('Lopez')
    expect(row.studio).toBe('Houston')
    expect(row.status).toBe('active')
  })

  it('recognizes the client template\'s exact "Status (active/inactive/archived)" wording', async () => {
    const csv = [
      'Legacy Customer ID,Studio,Status (active/inactive/archived)',
      'AM-1,Houston,archived',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.status).toBe('archived')
  })

  it('still recognizes required enrollment columns with a trailing "*"', async () => {
    const csv = [
      'Legacy Customer ID *,Legacy Enrollment ID *,Program Name *,Privates Remaining,Contracted Value $ (0 if bonus/free),Cash Collected to Date $,Balance Due $',
      'AM-10482,ENR-2291,Bronze 10-Lesson,7,1000,700,300',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)

    expect(row.legacyCustomerID).toBe('AM-10482')
    expect(row.legacyEnrollmentID).toBe('ENR-2291')
    expect(row.programName).toBe('Bronze 10-Lesson')
    expect(row.contractedValue).toBe('1000')
  })

  it('parses the client\'s real multi-service-type row into the correct canonical fields', async () => {
    const csv = [
      'Legacy Customer ID *,Legacy Enrollment ID *,Program Name *,Program Type (private/group/wedding/coaching/mixed),Enrollment Date,Privates Remaining,Groups Remaining,Parties Remaining,Coaching Remaining,Contracted Value $ (0 if bonus/free),Cash Collected to Date $,Balance Due $,Notes',
      'AM-10482,ENR-2291,Bronze 10-Lesson,private,2026-03-04,7,4,2,0,1000,700,300,paying monthly',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)

    expect(row).toMatchObject({
      privatesRemaining: '7',
      groupsRemaining: '4',
      partiesRemaining: '2',
      coachingRemaining: '0',
      contractedValue: '1000',
      cashCollected: '700',
      balanceDue: '300',
    })
  })

  it('ignores unrecognized historic/contextual columns without erroring, still parsing the known ones', async () => {
    const csv = [
      'Legacy Customer ID *,First Name *,Last Name *,Studio *,Anniversary,Dance Level,Assigned Teacher',
      'AM-10482,Maria,Lopez,Houston,2020-06-15,Bronze III,J. Petrov',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.legacyCustomerID).toBe('AM-10482')
    expect(row.danceLevel).toBe('Bronze III')
    expect(row.assignedTeacher).toBe('J. Petrov')
    expect(row.anniversary).toBe('2020-06-15')
  })

  it('parses Wallet Balance as a distinct column from Credit Balance', async () => {
    const csv = [
      'Legacy Customer ID *,First Name *,Last Name *,Studio *,"Credit Balance (prepaid, unallocated)",Wallet Balance (historic)',
      'AM-10482,Maria,Lopez,Houston,25,150',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.creditBalance).toBe('25')
    expect(row.walletBalance).toBe('150')
  })

  it('parses Callback Date', async () => {
    const csv = [
      'Legacy Customer ID *,First Name *,Last Name *,Studio *,Callback Date',
      'AM-10482,Maria,Lopez,Houston,2026-09-01',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.callbackDate).toBe('2026-09-01')
  })
})

describe('customer-migration-import Lessons/Payments (line-item history)', () => {
  it('parses a Lessons CSV into canonical rows', async () => {
    const csv = [
      'Legacy Lesson ID,Legacy Customer ID,Legacy Enrollment ID,Date,Type,Status,Teacher,Duration Minutes',
      'LSN-1,AM-10482,ENR-2291,2026-02-10,private,completed,Alex Rivera,45',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), LESSON_COLUMNS)
    expect(row.legacyLessonID).toBe('LSN-1')
    expect(row.legacyCustomerID).toBe('AM-10482')
    expect(row.status).toBe('completed')
    expect(row.durationMinutes).toBe('45')
  })

  it('parses a Payments CSV into canonical rows', async () => {
    const csv = [
      'Legacy Payment ID,Legacy Customer ID,Legacy Enrollment ID,Date,Amount,Method,Type',
      'PMT-1,AM-10482,ENR-2291,2026-02-10,100,card,payment',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), PAYMENT_COLUMNS)
    expect(row.legacyPaymentID).toBe('PMT-1')
    expect(row.amount).toBe('100')
    expect(row.method).toBe('card')
  })

  it('flags a lesson/payment row whose Legacy Customer ID has no matching Customers row', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const enrollments = []
    const lessons = [{ legacyLessonID: 'LSN-1', legacyCustomerID: 'AM-999', legacyEnrollmentID: '', status: 'completed' }]
    const payments = [{ legacyPaymentID: 'PMT-1', legacyCustomerID: 'AM-999', legacyEnrollmentID: '', amount: '50' }]

    const errors = preflightCheck(customers, enrollments, lessons, payments)
    expect(errors.some((e) => e.sheet === 'lessons' && e.message.includes('AM-999'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'payments' && e.message.includes('AM-999'))).toBe(true)
  })

  it('warns (non-blocking) when a customer\'s historic lifetimeCollected doesn\'t match the sum of their Payments rows', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com', lifetimeCollected: '500' }]
    const payments = [
      { legacyPaymentID: 'PMT-1', legacyCustomerID: 'AM-1', legacyEnrollmentID: '', amount: '100' },
      { legacyPaymentID: 'PMT-2', legacyCustomerID: 'AM-1', legacyEnrollmentID: '', amount: '100' },
    ]

    const errors = preflightCheck(customers, [], [], payments)
    const warning = errors.find((e) => e.sheet === 'customers' && e.severity === 'warning')
    expect(warning).toBeDefined()
    expect(warning.message).toContain('$500')
    expect(warning.message).toContain('$200.00')
  })

  it('parses enrollment Status and Service Code (package-activation columns)', async () => {
    const csv = [
      'Legacy Customer ID *,Legacy Enrollment ID *,Program Name *,Status (active/completed/cancelled),Service Code (matches booking catalog)',
      'AM-10482,ENR-2291,Bronze 10-Lesson,active,PRIVATE-45',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)
    expect(row.status).toBe('active')
    expect(row.serviceCode).toBe('PRIVATE-45')
  })

  it('parses a Memberships CSV into canonical rows', async () => {
    const csv = [
      'Legacy Customer ID,Legacy Membership ID,Membership Plan Name,Status (active/paused/cancelled/frozen),Billing Amount $',
      'AM-10482,MEM-3310,Unlimited Group Classes,active,99',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), MEMBERSHIP_COLUMNS)
    expect(row.legacyMembershipID).toBe('MEM-3310')
    expect(row.membershipPlanName).toBe('Unlimited Group Classes')
    expect(row.status).toBe('active')
    expect(row.billingAmount).toBe('99')
  })

  it('flags an enrollment with an unrecognized Status and warns when an active enrollment has no Service Code', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const enrollments = [
      { legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', status: 'pending', serviceCode: '' },
      { legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-2', status: 'active', serviceCode: '' },
    ]
    const errors = preflightCheck(customers, enrollments)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.message.includes('not one of active/completed/cancelled'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes('Service Code'))).toBe(true)
  })

  it('flags a memberships row with no matching Customers row and a missing plan name', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const memberships = [{ legacyCustomerID: 'AM-999', legacyMembershipID: 'MEM-1', membershipPlanName: '' }]
    const errors = preflightCheck(customers, [], [], [], memberships)
    expect(errors.some((e) => e.sheet === 'memberships' && e.message.includes('AM-999'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'memberships' && e.message.includes('Membership Plan Name'))).toBe(true)
  })

  it('flags a negative or non-numeric Credit/Wallet Balance', () => {
    const customers = [
      { legacyCustomerID: 'AM-1', email: 'a@x.com', creditBalance: '-10', walletBalance: '0' },
      { legacyCustomerID: 'AM-2', email: 'b@x.com', creditBalance: '0', walletBalance: 'abc' },
    ]
    const errors = preflightCheck(customers, [])
    expect(errors.some((e) => e.legacyCustomerID === 'AM-1' && e.message.includes('cannot be negative'))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === 'AM-2' && e.message.includes('is not a number'))).toBe(true)
  })

  it('flags a Partner Legacy ID that is self-referencing or unresolved', () => {
    const customers = [
      { legacyCustomerID: 'AM-1', email: 'a@x.com', partnerLegacyCustomerID: 'AM-1' },
      { legacyCustomerID: 'AM-2', email: 'b@x.com', partnerLegacyCustomerID: 'AM-999' },
      { legacyCustomerID: 'AM-3', email: 'c@x.com', partnerLegacyCustomerID: 'AM-1' },
    ]
    const errors = preflightCheck(customers, [])
    expect(errors.some((e) => e.legacyCustomerID === 'AM-1' && e.message.includes('same row'))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === 'AM-2' && e.message.includes('no matching row'))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === 'AM-3')).toBe(false)
  })

  it('parses a Services CSV into canonical rows', async () => {
    const csv = [
      'Service Name,Service Code (matches booking catalog),Studio,Type (private/group/intro/todo),Price per Session $,Chargeable (Y/N),Active (Y/N)',
      'Private Lesson (45 min),PRIVATE-45,Studio A,private,65,Y,Y',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), SERVICE_COLUMNS)
    expect(row.serviceName).toBe('Private Lesson (45 min)')
    expect(row.serviceCode).toBe('PRIVATE-45')
    expect(row.price).toBe('65')
    expect(row.isChargeable).toBe('Y')
  })

  it('flags a Services row missing a Service Code or Service Name, and a duplicate Service Code', () => {
    const services = [
      { serviceCode: '', serviceName: 'No code' },
      { serviceCode: 'A', serviceName: '' },
      { serviceCode: 'B', serviceName: 'Dup 1' },
      { serviceCode: 'B', serviceName: 'Dup 2' },
    ]
    const errors = preflightCheck([], [], [], [], [], services)
    expect(errors.some((e) => e.sheet === 'services' && e.message.includes('Missing Service Code'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'services' && e.message.includes('Missing Service Name'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'services' && e.message.includes('Duplicate Service Code'))).toBe(true)
  })

  it('warns when an enrollment Service Code has no matching row in a supplied Services sheet', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const services = [{ serviceCode: 'PRIVATE-45', serviceName: 'Private' }]
    const enrollments = [{ legacyCustomerID: 'AM-1', status: 'active', serviceCode: 'GROUP-99' }]
    const errors = preflightCheck(customers, enrollments, [], [], [], services)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes('GROUP-99'))).toBe(true)
  })

  it('flags an enrollment whose Final Amount does not reconcile with Contracted Value minus Discount Amount', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const enrollments = [
      { legacyCustomerID: 'AM-1', contractedValue: '1000', discountAmount: '100', finalAmount: '1000' },
    ]
    const errors = preflightCheck(customers, enrollments)
    expect(
      errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes("doesn't match Contracted Value")),
    ).toBe(true)
  })

  it('flags a negative Balance Due on Enrollments and requires Sessions Total when Access Type is "sessions" on Memberships', () => {
    const customers = [{ legacyCustomerID: 'AM-1', email: 'a@x.com' }]
    const enrollments = [{ legacyCustomerID: 'AM-1', balanceDue: '-50' }]
    const memberships = [{ legacyCustomerID: 'AM-1', membershipPlanName: 'Plan', accessType: 'sessions', sessionsTotal: '' }]
    const errors = preflightCheck(customers, enrollments, [], [], memberships)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.message.includes('Balance Due cannot be negative'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'memberships' && e.message.includes('requires Sessions Total'))).toBe(true)
  })

  it('computeSheetTotals sums cashCollected from Payments rows when they cover an enrollment, instead of that enrollment\'s own Cash Collected column', () => {
    const customers = [{ legacyCustomerID: 'AM-1', studio: 'Austin' }]
    const enrollments = [{ legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', cashCollected: '700', contractedValue: '1000', balanceDue: '300' }]
    const payments = [
      { legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', amount: '100' },
      { legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', amount: '250' },
    ]

    const totals = computeSheetTotals(enrollments, customers, payments)
    expect(totals[0].cashCollected).toBe(350)
    expect(totals[0].contractedValue).toBe(1000)
  })

  it('computeSheetTotals falls back to an enrollment\'s own Cash Collected column when a Payments sheet exists but has no row for that specific enrollment — matches the backend\'s auto-backdated-payment fallback', () => {
    const customers = [
      { legacyCustomerID: 'AM-1', studio: 'Austin' },
      { legacyCustomerID: 'AM-2', studio: 'Austin' },
    ]
    const enrollments = [
      { legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', cashCollected: '700', contractedValue: '1000', balanceDue: '300' },
      // No Payments-sheet row references ENR-2 — its own Cash Collected must still count.
      { legacyCustomerID: 'AM-2', legacyEnrollmentID: 'ENR-2', cashCollected: '400', contractedValue: '1000', balanceDue: '600' },
    ]
    const payments = [{ legacyCustomerID: 'AM-1', legacyEnrollmentID: 'ENR-1', amount: '700' }]

    const totals = computeSheetTotals(enrollments, customers, payments)
    expect(totals[0].cashCollected).toBe(1100) // 700 (from Payments, covers ENR-1) + 400 (ENR-2's own column, uncovered)
  })

  it('computeSheetTotals sums the discount-adjusted Final Amount, not the raw pre-discount Contracted Value — matches what the CRM actually stores as totalPaid', () => {
    const customers = [{ legacyCustomerID: 'AM-1', studio: 'Austin' }]
    const enrollments = [
      // Percentage discount, no explicit Final Amount column: 1000 - 10% = 900.
      { legacyCustomerID: 'AM-1', contractedValue: '1000', discountType: 'percentage', discountAmount: '10', balanceDue: '300' },
    ]
    const totals = computeSheetTotals(enrollments, customers)
    expect(totals[0].contractedValue).toBe(900)
  })

  it('computeSheetTotals prefers an explicit Final Amount column over deriving it from Contracted Value minus Discount', () => {
    const customers = [{ legacyCustomerID: 'AM-1', studio: 'Austin' }]
    const enrollments = [
      { legacyCustomerID: 'AM-1', contractedValue: '1000', discountType: 'fixed', discountAmount: '50', finalAmount: '900', balanceDue: '0' },
    ]
    const totals = computeSheetTotals(enrollments, customers)
    expect(totals[0].contractedValue).toBe(900)
  })
})
