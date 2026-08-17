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
  scoreHeaderMatch,
  suggestColumnMapping,
  applyColumnMapping,
  parseCsvFileForMapping,
  MAPPING_CONFIDENT_THRESHOLD,
  suggestTrialCustomers,
  filterRowsByCustomerIDs,
  rowCustomerKey,
  UNIVERSAL_COLUMNS,
  splitUniversalRows,
} from '../customer-migration-import'

function csvFile(text, name = 'test.csv') {
  return new File([text], name, { type: 'text/csv' })
}

describe('customer-migration-import header parsing', () => {
  it('recognizes required columns even when the sheet marks them with a trailing "*"', async () => {
    const csv = [
      'Email,First Name *,Last Name *,Studio *,Status (active/inactive/archived)',
      'maria.lopez@gmail.com,Maria,Lopez,Houston,active',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)

    expect(row.email).toBe('maria.lopez@gmail.com')
    expect(row.firstName).toBe('Maria')
    expect(row.lastName).toBe('Lopez')
    expect(row.studio).toBe('Houston')
    expect(row.status).toBe('active')
  })

  it('recognizes the client template\'s exact "Status (active/inactive/archived)" wording', async () => {
    const csv = [
      'Email,Studio,Status (active/inactive/archived)',
      'a@x.com,Houston,archived',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.status).toBe('archived')
  })

  it('still recognizes required enrollment columns with a trailing "*"', async () => {
    const csv = [
      'Email *,Program Name *,Sessions Total,Contracted Value $ (0 if bonus/free),Cash Collected to Date $,Balance Due $',
      'maria@test.com,Bronze 10-Lesson,7,1000,700,300',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)

    expect(row.email).toBe('maria@test.com')
    expect(row.programName).toBe('Bronze 10-Lesson')
    expect(row.contractedValue).toBe('1000')
  })

  it('parses the client\'s real multi-service-line row into the correct canonical fields', async () => {
    const csv = [
      'Email *,Program Name *,Program Type (private/group/party/coaching),Enrollment Date,Sessions Total,Sessions Taken,Contracted Value $ (0 if bonus/free),Cash Collected to Date $,Balance Due $,Notes',
      'maria@test.com,Bronze 10-Lesson,private,2026-03-04,7,2,1000,700,300,paying monthly',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)

    expect(row).toMatchObject({
      sessionsTotal: '7',
      sessionsTaken: '2',
      contractedValue: '1000',
      cashCollected: '700',
      balanceDue: '300',
    })
  })

  it('ignores unrecognized historic/contextual columns without erroring, still parsing the known ones', async () => {
    const csv = [
      'Email *,First Name *,Last Name *,Studio *,Anniversary,Dance Level,Assigned Teacher',
      'maria@test.com,Maria,Lopez,Houston,2020-06-15,Bronze III,J. Petrov',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.email).toBe('maria@test.com')
    expect(row.danceLevel).toBe('Bronze III')
    expect(row.assignedTeacher).toBe('J. Petrov')
    expect(row.anniversary).toBe('2020-06-15')
  })

  it('parses Wallet Balance as a distinct column from Credit Balance', async () => {
    const csv = [
      'Email *,First Name *,Last Name *,Studio *,"Credit Balance (prepaid, unallocated)",Wallet Balance (historic)',
      'maria@test.com,Maria,Lopez,Houston,25,150',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.creditBalance).toBe('25')
    expect(row.walletBalance).toBe('150')
  })

  it('parses Callback Date', async () => {
    const csv = [
      'Email *,First Name *,Last Name *,Studio *,Callback Date',
      'maria@test.com,Maria,Lopez,Houston,2026-09-01',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), CUSTOMER_COLUMNS)
    expect(row.callbackDate).toBe('2026-09-01')
  })
})

describe('customer-migration-import Lessons/Payments (line-item history)', () => {
  it('parses a Lessons CSV into canonical rows', async () => {
    const csv = [
      'Email,Program Name,Date,Type,Status,Teacher,Duration Minutes',
      'maria@test.com,Bronze 10-Lesson,2026-02-10,private,completed,Alex Rivera,45',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), LESSON_COLUMNS)
    expect(row.email).toBe('maria@test.com')
    expect(row.status).toBe('completed')
    expect(row.durationMinutes).toBe('45')
  })

  it('parses a Payments CSV into canonical rows', async () => {
    const csv = [
      'Email,Program Name,Date,Amount,Method,Type',
      'maria@test.com,Bronze 10-Lesson,2026-02-10,100,card,payment',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), PAYMENT_COLUMNS)
    expect(row.email).toBe('maria@test.com')
    expect(row.amount).toBe('100')
    expect(row.method).toBe('card')
  })

  it('flags a lesson/payment row whose Email/Phone has no matching Customers row', () => {
    const customers = [{ email: 'a@x.com' }]
    const enrollments = []
    const lessons = [{ email: 'nobody@x.com', programName: '', status: 'completed' }]
    const payments = [{ email: 'nobody@x.com', programName: '', amount: '50' }]

    const errors = preflightCheck(customers, enrollments, lessons, payments)
    expect(errors.some((e) => e.sheet === 'lessons' && /Could not match this row to a customer/.test(e.message))).toBe(true)
    expect(errors.some((e) => e.sheet === 'payments' && /Could not match this row to a customer/.test(e.message))).toBe(true)
  })

  it('warns (non-blocking) when a customer\'s historic lifetimeCollected doesn\'t match the sum of their Payments rows', () => {
    const customers = [{ email: 'a@x.com', lifetimeCollected: '500' }]
    const payments = [
      { email: 'a@x.com', programName: '', amount: '100' },
      { email: 'a@x.com', programName: '', amount: '100' },
    ]

    const errors = preflightCheck(customers, [], [], payments)
    const warning = errors.find((e) => e.sheet === 'customers' && e.severity === 'warning')
    expect(warning).toBeDefined()
    expect(warning.message).toContain('$500')
    expect(warning.message).toContain('$200.00')
  })

  it('parses enrollment Status and Service Code (package-activation columns)', async () => {
    const csv = [
      'Email *,Program Name *,Status (active/completed/cancelled),Service Code (matches booking catalog)',
      'maria@test.com,Bronze 10-Lesson,active,PRIVATE-45',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), ENROLLMENT_COLUMNS)
    expect(row.status).toBe('active')
    expect(row.serviceCode).toBe('PRIVATE-45')
  })

  it('parses a Memberships CSV into canonical rows', async () => {
    const csv = [
      'Email,Membership Plan Name,Status (active/paused/cancelled/frozen),Billing Amount $',
      'maria@test.com,Unlimited Group Classes,active,99',
    ].join('\n')

    const [row] = await parseCsvFile(csvFile(csv), MEMBERSHIP_COLUMNS)
    expect(row.membershipPlanName).toBe('Unlimited Group Classes')
    expect(row.status).toBe('active')
    expect(row.billingAmount).toBe('99')
  })

  it('flags an enrollment with an unrecognized Status and warns when an active enrollment has no Service Code', () => {
    const customers = [{ email: 'a@x.com' }]
    const enrollments = [
      { email: 'a@x.com', programName: 'Plan 1', status: 'pending', serviceCode: '' },
      { email: 'a@x.com', programName: 'Plan 2', status: 'active', serviceCode: '' },
    ]
    const errors = preflightCheck(customers, enrollments)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.message.includes('not one of active/completed/cancelled'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes('Service Code'))).toBe(true)
  })

  it('flags a memberships row with no matching Customers row and a missing plan name', () => {
    const customers = [{ email: 'a@x.com' }]
    const memberships = [{ email: 'nobody@x.com', membershipPlanName: '' }]
    const errors = preflightCheck(customers, [], [], [], memberships)
    expect(errors.some((e) => e.sheet === 'memberships' && /Could not match this row to a customer/.test(e.message))).toBe(true)
    expect(errors.some((e) => e.sheet === 'memberships' && e.message.includes('Membership Plan Name'))).toBe(true)
  })

  it('flags a negative or non-numeric Credit/Wallet Balance', () => {
    const customers = [
      { email: 'a@x.com', creditBalance: '-10', walletBalance: '0' },
      { email: 'b@x.com', creditBalance: '0', walletBalance: 'abc' },
    ]
    const errors = preflightCheck(customers, [])
    expect(errors.some((e) => e.legacyCustomerID === rowCustomerKey({ email: 'a@x.com' }) && e.message.includes('cannot be negative'))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === rowCustomerKey({ email: 'b@x.com' }) && e.message.includes('is not a number'))).toBe(true)
  })

  it('flags missing consent flags (SMS Opt-Out / Email Unsubscribed / DNC) — fix #9 (server hard-fails these but client previously never checked)', () => {
    const customers = [{ email: 'a@x.com' }]
    const errors = preflightCheck(customers, [])
    expect(
      errors.some((e) => e.sheet === 'customers' && e.legacyCustomerID === rowCustomerKey({ email: 'a@x.com' }) && e.message.includes('Consent flags')),
    ).toBe(true)
  })

  it('does not flag consent when all three flags are supplied', () => {
    const customers = [
      { email: 'a@x.com', smsOptOut: 'N', emailUnsubscribed: 'N', doNotContact: 'N' },
    ]
    const errors = preflightCheck(customers, [])
    expect(errors.some((e) => e.message.includes('Consent flags'))).toBe(false)
  })

  it('flags a blank Program Name on an enrollment row — fix #9 (backend requires it, client previously never checked)', () => {
    const customers = [
      { email: 'a@x.com', smsOptOut: 'N', emailUnsubscribed: 'N', doNotContact: 'N' },
    ]
    const enrollments = [{ email: 'a@x.com', programName: '' }]
    const errors = preflightCheck(customers, enrollments)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.message.includes('Program Name'))).toBe(true)
  })

  it('flags a partner Email that is self-referencing or unresolved', () => {
    // Consent flags supplied on every row so this test isolates
    // partner-linking behavior from the separate consent-flag check (fix #9).
    const consent = { studio: 'Studio A', smsOptOut: 'N', emailUnsubscribed: 'N', doNotContact: 'N' }
    const customers = [
      { email: 'a@x.com', partnerEmail: 'a@x.com', ...consent },
      { email: 'b@x.com', partnerEmail: 'nobody@x.com', ...consent },
      { email: 'c@x.com', partnerEmail: 'a@x.com', ...consent },
    ]
    const errors = preflightCheck(customers, [])
    expect(errors.some((e) => e.legacyCustomerID === rowCustomerKey({ email: 'a@x.com' }) && e.message.includes('same row'))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === rowCustomerKey({ email: 'b@x.com' }) && /no matching row/.test(e.message))).toBe(true)
    expect(errors.some((e) => e.legacyCustomerID === rowCustomerKey({ email: 'c@x.com' }))).toBe(false)
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
    const customers = [{ email: 'a@x.com' }]
    const services = [{ serviceCode: 'PRIVATE-45', serviceName: 'Private' }]
    const enrollments = [{ email: 'a@x.com', programName: 'Plan', status: 'active', serviceCode: 'GROUP-99' }]
    const errors = preflightCheck(customers, enrollments, [], [], [], services)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes('GROUP-99'))).toBe(true)
  })

  it('flags an enrollment whose Final Amount does not reconcile with Contracted Value minus Discount Amount', () => {
    const customers = [{ email: 'a@x.com' }]
    const enrollments = [
      { email: 'a@x.com', contractedValue: '1000', discountAmount: '100', finalAmount: '1000' },
    ]
    const errors = preflightCheck(customers, enrollments)
    expect(
      errors.some((e) => e.sheet === 'enrollments' && e.severity === 'warning' && e.message.includes("doesn't match Contracted Value")),
    ).toBe(true)
  })

  it('flags a negative Balance Due on Enrollments and requires Sessions Total when Access Type is "sessions" on Memberships', () => {
    const customers = [{ email: 'a@x.com' }]
    const enrollments = [{ email: 'a@x.com', balanceDue: '-50' }]
    const memberships = [{ email: 'a@x.com', membershipPlanName: 'Plan', accessType: 'sessions', sessionsTotal: '' }]
    const errors = preflightCheck(customers, enrollments, [], [], memberships)
    expect(errors.some((e) => e.sheet === 'enrollments' && e.message.includes('Balance Due cannot be negative'))).toBe(true)
    expect(errors.some((e) => e.sheet === 'memberships' && e.message.includes('requires Sessions Total'))).toBe(true)
  })

  it('computeSheetTotals sums cashCollected from Payments rows when they cover an enrollment, instead of that enrollment\'s own Cash Collected column', () => {
    const customers = [{ email: 'a@x.com', studio: 'Austin' }]
    const enrollments = [{ email: 'a@x.com', programName: 'Plan', cashCollected: '700', contractedValue: '1000', balanceDue: '300' }]
    const payments = [
      { email: 'a@x.com', programName: 'Plan', amount: '100' },
      { email: 'a@x.com', programName: 'Plan', amount: '250' },
    ]

    const totals = computeSheetTotals(enrollments, customers, payments)
    expect(totals[0].cashCollected).toBe(350)
    expect(totals[0].contractedValue).toBe(1000)
  })

  it('computeSheetTotals falls back to an enrollment\'s own Cash Collected column when a Payments sheet exists but has no row for that specific enrollment — matches the backend\'s auto-backdated-payment fallback', () => {
    const customers = [
      { email: 'a@x.com', studio: 'Austin' },
      { email: 'b@x.com', studio: 'Austin' },
    ]
    const enrollments = [
      { email: 'a@x.com', programName: 'Plan A', cashCollected: '700', contractedValue: '1000', balanceDue: '300' },
      // No Payments-sheet row references Plan B — its own Cash Collected must still count.
      { email: 'b@x.com', programName: 'Plan B', cashCollected: '400', contractedValue: '1000', balanceDue: '600' },
    ]
    const payments = [{ email: 'a@x.com', programName: 'Plan A', amount: '700' }]

    const totals = computeSheetTotals(enrollments, customers, payments)
    expect(totals[0].cashCollected).toBe(1100) // 700 (from Payments, covers Plan A) + 400 (Plan B's own column, uncovered)
  })

  it('computeSheetTotals sums the discount-adjusted Final Amount, not the raw pre-discount Contracted Value — matches what the CRM actually stores as totalPaid', () => {
    const customers = [{ email: 'a@x.com', studio: 'Austin' }]
    const enrollments = [
      // Percentage discount, no explicit Final Amount column: 1000 - 10% = 900.
      { email: 'a@x.com', contractedValue: '1000', discountType: 'percentage', discountAmount: '10', balanceDue: '300' },
    ]
    const totals = computeSheetTotals(enrollments, customers)
    expect(totals[0].contractedValue).toBe(900)
  })

  it('computeSheetTotals prefers an explicit Final Amount column over deriving it from Contracted Value minus Discount', () => {
    const customers = [{ email: 'a@x.com', studio: 'Austin' }]
    const enrollments = [
      { email: 'a@x.com', contractedValue: '1000', discountType: 'fixed', discountAmount: '50', finalAmount: '900', balanceDue: '0' },
    ]
    const totals = computeSheetTotals(enrollments, customers)
    expect(totals[0].contractedValue).toBe(900)
  })
})

describe('column mapping (Phase 5 — "the app maps the columns")', () => {
  it('scoreHeaderMatch: exact match scores 1, containment scores high but not perfect, unrelated scores near 0', () => {
    expect(scoreHeaderMatch('Email', 'email')).toBe(1)
    expect(scoreHeaderMatch('Client Email Address', 'email')).toBeGreaterThan(0.5)
    expect(scoreHeaderMatch('Client Email Address', 'email')).toBeLessThan(1)
    expect(scoreHeaderMatch('Favorite Color', 'email')).toBeLessThan(0.3)
  })

  it('suggestColumnMapping finds a confident best guess for a header that is not an exact alias hit', () => {
    const headerRow = ['Client Email', 'Cell #', 'First', 'Last', 'Home Studio']
    const suggestion = suggestColumnMapping(headerRow, CUSTOMER_COLUMNS)
    expect(suggestion.email.sourceHeader).toBe('Client Email')
    expect(suggestion.email.confidence).toBeGreaterThanOrEqual(MAPPING_CONFIDENT_THRESHOLD)
    expect(suggestion.studio.sourceHeader).toBe('Home Studio')
  })

  it('applyColumnMapping converts raw rows into canonical rows using an explicit, operator-confirmed mapping', () => {
    const rawRows = [
      ['Client Email', 'Cell #', 'Home Studio'],
      ['maria@test.com', '555-1234', 'Studio A'],
      ['luis@test.com', '555-5678', 'Studio B'],
    ]
    const mapping = { email: 0, phone: 1, studio: 2 }
    const rows = applyColumnMapping(rawRows, 0, CUSTOMER_COLUMNS, mapping)
    expect(rows).toHaveLength(2)
    expect(rows[0].email).toBe('maria@test.com')
    expect(rows[0].phone).toBe('555-1234')
    expect(rows[0].studio).toBe('Studio A')
    expect(rows[1].studio).toBe('Studio B')
  })

  it('applyColumnMapping leaves an unmapped canonical field blank rather than throwing', () => {
    const rawRows = [['Email'], ['a@x.com']]
    const rows = applyColumnMapping(rawRows, 0, CUSTOMER_COLUMNS, { email: 0 })
    expect(rows[0].email).toBe('a@x.com')
    expect(rows[0].studio).toBe('')
  })

  it('parseCsvFileForMapping falls back to row 0 as the header row for a file with no recognizable aliases at all, instead of throwing', async () => {
    const csv = ['Client Email,Cell #,Home Studio', 'a@x.com,555-1234,Studio A'].join('\n')
    const { headerRowIndex, headerRow, suggestedMapping } = await parseCsvFileForMapping(csvFile(csv), CUSTOMER_COLUMNS)
    expect(headerRowIndex).toBe(0)
    expect(headerRow).toEqual(['Client Email', 'Cell #', 'Home Studio'])
    expect(suggestedMapping.email.sourceHeader).toBe('Client Email')
  })
})

describe('test-10 (Phase 4 — "a couple, a payment plan, a refund, someone with free lessons, someone inactive")', () => {
  const customers = [
    { email: 'c1@x.com', partnerEmail: 'c2@x.com' },
    { email: 'c2@x.com', partnerEmail: 'c1@x.com' },
    { email: 'c3@x.com' },
    { email: 'c4@x.com', status: 'inactive' },
    { email: 'c5@x.com' },
  ]
  const enrollments = [
    { email: 'c3@x.com', billingType: 'payment_plan', contractedValue: '500' },
    { email: 'c5@x.com', contractedValue: '0' },
  ]
  const payments = [{ email: 'c3@x.com', amount: '-50', type: 'refund' }]

  it('suggestTrialCustomers covers the couple, payment-plan, refund, free-package, and inactive checklist', () => {
    const ids = suggestTrialCustomers(customers, enrollments, payments, 10)
    expect(ids).toContain(rowCustomerKey({ email: 'c1@x.com' })) // couple half 1
    expect(ids).toContain(rowCustomerKey({ email: 'c2@x.com' })) // couple half 2
    expect(ids).toContain(rowCustomerKey({ email: 'c3@x.com' })) // payment plan + refund
    expect(ids).toContain(rowCustomerKey({ email: 'c4@x.com' })) // inactive
    expect(ids).toContain(rowCustomerKey({ email: 'c5@x.com' })) // free package
  })

  it('suggestTrialCustomers never exceeds the requested count', () => {
    const ids = suggestTrialCustomers(customers, enrollments, payments, 3)
    expect(ids.length).toBeLessThanOrEqual(3)
  })

  it('filterRowsByCustomerIDs slices every sheet down to only the selected customers, but leaves Services untouched', () => {
    const services = [{ serviceCode: 'PRIVATE-45' }]
    const keys = [rowCustomerKey({ email: 'c1@x.com' }), rowCustomerKey({ email: 'c3@x.com' })]
    const result = filterRowsByCustomerIDs({ customers, enrollments, services, memberships: [], lessons: [], payments }, keys)
    expect(result.customers.map((c) => c.email)).toEqual(['c1@x.com', 'c3@x.com'])
    expect(result.enrollments.map((e) => e.email)).toEqual(['c3@x.com'])
    expect(result.payments.map((p) => p.email)).toEqual(['c3@x.com'])
    expect(result.services).toBe(services) // unfiltered, same reference
  })
})

describe('single-sheet import (splitUniversalRows — "everything in one sheet, not different ones")', () => {
  it('splits one row carrying both customer and enrollment fields into the right two arrays', () => {
    const rows = [
      {
        firstName: 'Maria', lastName: 'Gomez', email: 'maria@test.com', studio: 'Studio A',
        programName: 'Wedding Package', serviceCode: 'PRIVATE-45', sessionsTotal: '12', contractedValue: '1200',
      },
    ]
    const { customers, enrollments, lessons, payments, memberships } = splitUniversalRows(rows)
    expect(customers).toHaveLength(1)
    expect(customers[0]).toMatchObject({ firstName: 'Maria', lastName: 'Gomez', email: 'maria@test.com', studio: 'Studio A' })
    expect(enrollments).toHaveLength(1)
    expect(enrollments[0]).toMatchObject({ email: 'maria@test.com', programName: 'Wedding Package', serviceCode: 'PRIVATE-45', sessionsTotal: '12', contractedValue: '1200' })
    expect(lessons).toHaveLength(0)
    expect(payments).toHaveLength(0)
    expect(memberships).toHaveLength(0)
  })

  it('a multi-service package is two rows sharing email + Program Name — the customer is only captured once', () => {
    const rows = [
      { firstName: 'Maria', email: 'maria@test.com', studio: 'Studio A', programName: 'Wedding Package', serviceCode: 'PRIVATE-45', sessionsTotal: '12' },
      { firstName: 'Maria', email: 'maria@test.com', studio: 'Studio A', programName: 'Wedding Package', serviceCode: 'WEDDING-60', sessionsTotal: '2' },
    ]
    const { customers, enrollments } = splitUniversalRows(rows)
    expect(customers).toHaveLength(1) // captured once, not duplicated
    expect(enrollments).toHaveLength(2) // both service lines preserved
    expect(enrollments.map((e) => e.serviceCode)).toEqual(['PRIVATE-45', 'WEDDING-60'])
  })

  it('a row with a filled-in Lesson Date/Payment Amount also produces a lesson/payment record, using the renamed (disambiguated) columns', () => {
    const rows = [
      {
        email: 'maria@test.com', studio: 'Studio A',
        lessonDate: '2026-02-10', lessonType: 'private', lessonStatus: 'completed',
        amount: '100', method: 'card', paymentType: 'payment',
      },
    ]
    const { lessons, payments } = splitUniversalRows(rows)
    expect(lessons).toHaveLength(1)
    expect(lessons[0]).toMatchObject({ date: '2026-02-10', type: 'private', status: 'completed' })
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ amount: '100', method: 'card', type: 'payment' })
  })

  it('UNIVERSAL_COLUMNS has no duplicate keys — every renamed collision is actually unique', () => {
    const keys = UNIVERSAL_COLUMNS.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('a Lesson/Payment row that references Program Name (to link to a package) is NOT also miscounted as its own enrollment', () => {
    const rows = [
      // The real enrollment row.
      { email: 'maria@test.com', studio: 'Studio A', programName: 'Wedding Package', serviceCode: 'PRIVATE-45', sessionsTotal: '12' },
      // A lesson row that references the SAME Program Name just to link to
      // it — has no Sessions Total of its own, so it must not become a
      // second (empty, serviceCode-less) enrollment.
      { email: 'maria@test.com', programName: 'Wedding Package', lessonDate: '2026-03-10', lessonType: 'private', lessonStatus: 'completed' },
      // Same for a payment row.
      { email: 'maria@test.com', programName: 'Wedding Package', amount: '100', method: 'card', paymentType: 'payment' },
    ]
    const { enrollments, lessons, payments } = splitUniversalRows(rows)
    expect(enrollments).toHaveLength(1)
    expect(enrollments[0].serviceCode).toBe('PRIVATE-45')
    expect(lessons).toHaveLength(1)
    expect(payments).toHaveLength(1)
  })
})
