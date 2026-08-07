import { describe, it, expect } from 'vitest'
import { parseCsvFile, CUSTOMER_COLUMNS, ENROLLMENT_COLUMNS } from '../customer-migration-import'

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
})
