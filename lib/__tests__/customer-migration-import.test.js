import { describe, it, expect } from 'vitest'
import {
  parseCsvFile,
  CUSTOMER_COLUMNS,
  ENROLLMENT_COLUMNS,
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

  it('computeSheetTotals sums cashCollected from Payments rows when supplied, instead of Enrollments.cashCollected', () => {
    const customers = [{ legacyCustomerID: 'AM-1', studio: 'Austin' }]
    const enrollments = [{ legacyCustomerID: 'AM-1', cashCollected: '700', contractedValue: '1000', balanceDue: '300' }]
    const payments = [
      { legacyCustomerID: 'AM-1', amount: '100' },
      { legacyCustomerID: 'AM-1', amount: '250' },
    ]

    const totals = computeSheetTotals(enrollments, customers, payments)
    expect(totals[0].cashCollected).toBe(350)
    expect(totals[0].contractedValue).toBe(1000)
  })
})
