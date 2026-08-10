'use client'

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toCSVValue, triggerDownload } from '@/lib/csv-utils'

// Canonical column shapes the backend importer expects. Each entry maps a
// canonical key to the set of header spellings we should recognize in the
// source spreadsheet (case/space/underscore-insensitive — see normalizeHeader),
// plus a `sample` value used to build the downloadable sample file.
export const CUSTOMER_COLUMNS = [
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'firstName', headers: ['first name', 'firstname'], sample: 'Maria' },
  { key: 'lastName', headers: ['last name', 'lastname'], sample: 'Gomez' },
  { key: 'email', headers: ['email'], sample: 'maria.gomez@example.com' },
  { key: 'phone', headers: ['cell phone', 'phone', 'phonenumber'], sample: '555-123-4567' },
  { key: 'dob', headers: ['dob', 'date of birth'], sample: '1990-05-14' },
  { key: 'address', headers: ['address'], sample: '123 Main St' },
  { key: 'city', headers: ['city'], sample: 'Austin' },
  { key: 'state', headers: ['state'], sample: 'TX' },
  { key: 'zip', headers: ['zip', 'zipcode'], sample: '78701' },
  { key: 'studio', headers: ['studio'], sample: 'Studio A' },
  { key: 'status', headers: ['status (active/inactive/archived)', 'status (active/inactive)', 'status'], sample: 'active' },
  { key: 'partnerLegacyCustomerID', headers: ['partner legacy id (couples)', 'partner legacy id', 'partnerlegacycustomerid'], sample: '' },
  { key: 'creditBalance', headers: ['credit balance (prepaid, unallocated)', 'credit balance'], sample: '0' },
  // Distinct from Credit Balance above — this studio's Wallet system (a
  // separate ledgered balance, not the same field as Customer.credits).
  { key: 'walletBalance', headers: ['wallet balance (historic)', 'wallet balance'], sample: '0' },
  { key: 'smsOptOut', headers: ['sms opt-out (y/n)', 'sms opt-out'], sample: 'N' },
  { key: 'emailUnsubscribed', headers: ['email unsubscribed (y/n)', 'email unsubscribed'], sample: 'N' },
  { key: 'doNotContact', headers: ['dnc (y/n)', 'dnc'], sample: 'N' },
  { key: 'anniversary', headers: ['anniversary'], sample: '' },
  { key: 'firstSessionDate', headers: ['first session (intro) date', 'first session date'], sample: '' },
  { key: 'source', headers: ['source'], sample: '' },
  { key: 'danceLevel', headers: ['dance level'], sample: '' },
  { key: 'assignedTeacher', headers: ['assigned teacher'], sample: '' },
  { key: 'lifetimeCollected', headers: ['lifetime collected $ (historic)', 'lifetime collected'], sample: '' },
  { key: 'privatesTaken', headers: ['privates taken (historic)', 'privates taken'], sample: '' },
  { key: 'groupsTaken', headers: ['groups taken (historic)', 'groups taken'], sample: '' },
  { key: 'partiesTaken', headers: ['parties taken (historic)', 'parties taken'], sample: '' },
  { key: 'coachingTaken', headers: ['coaching taken (historic)', 'coaching taken'], sample: '' },
  { key: 'lastLessonDate', headers: ['last lesson date (historic)', 'last lesson date'], sample: '' },
  { key: 'customerSince', headers: ['customer since'], sample: '' },
  { key: 'nextAppointmentDate', headers: ['next appointment date'], sample: '' },
  // Real Customer.callbackDate field (not a customFields.migrationLegacy
  // stash like most other historic columns) — drives the same "needs a
  // follow-up call" filter/sort the app already has for both Leads and
  // Customers, so a migrated customer with a pending callback shows up there
  // immediately instead of the reminder being silently dropped on import.
  { key: 'callbackDate', headers: ['callback date'], sample: '' },
  { key: 'notes', headers: ['notes'], sample: 'paying monthly' },
]

export const ENROLLMENT_COLUMNS = [
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'legacyEnrollmentID', headers: ['legacy enrollment id', 'legacyenrollmentid'], sample: 'ENR-2291' },
  { key: 'programName', headers: ['program name'], sample: 'Bronze 10-Lesson' },
  { key: 'programType', headers: ['program type (private/group/wedding/coaching/mixed)', 'program type'], sample: 'private' },
  { key: 'enrollmentDate', headers: ['enrollment date'], sample: '2026-03-04' },
  { key: 'privatesRemaining', headers: ['privates remaining'], sample: '7' },
  { key: 'groupsRemaining', headers: ['groups remaining'], sample: '4' },
  { key: 'partiesRemaining', headers: ['parties remaining'], sample: '2' },
  { key: 'coachingRemaining', headers: ['coaching remaining'], sample: '0' },
  { key: 'contractedValue', headers: ['contracted value $ (0 if bonus/free)', 'contracted value'], sample: '1000' },
  { key: 'cashCollected', headers: ['cash collected to date $', 'cash collected'], sample: '700' },
  { key: 'balanceDue', headers: ['balance due $', 'balance due'], sample: '300' },
  { key: 'notes', headers: ['notes'], sample: 'paying monthly' },
]

// Line-item history sheets — optional. When present, they back a real
// lesson-by-lesson / payment-by-payment history on the customer profile
// instead of just the aggregate "(historic)" counters on Customers, and the
// aggregate counters/totals are cross-checked against them (see
// preflightCheck/computeSheetTotals) rather than trusted blindly.
export const LESSON_COLUMNS = [
  { key: 'legacyLessonID', headers: ['legacy lesson id', 'legacylessonid'], sample: 'LSN-88213' },
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'legacyEnrollmentID', headers: ['legacy enrollment id', 'legacyenrollmentid'], sample: 'ENR-2291' },
  { key: 'date', headers: ['date'], sample: '2026-02-10' },
  { key: 'type', headers: ['type (private/group/party/coaching/wedding)', 'type'], sample: 'private' },
  { key: 'status', headers: ['status (completed/no_show/cancelled/scheduled)', 'status'], sample: 'completed' },
  { key: 'teacher', headers: ['teacher'], sample: 'Alex Rivera' },
  { key: 'durationMinutes', headers: ['duration minutes', 'duration (minutes)'], sample: '45' },
  { key: 'notes', headers: ['notes'], sample: '' },
]

export const PAYMENT_COLUMNS = [
  { key: 'legacyPaymentID', headers: ['legacy payment id', 'legacypaymentid'], sample: 'PMT-55710' },
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'legacyEnrollmentID', headers: ['legacy enrollment id', 'legacyenrollmentid'], sample: 'ENR-2291' },
  { key: 'date', headers: ['date'], sample: '2026-02-10' },
  { key: 'amount', headers: ['amount (+ payment, - refund)', 'amount'], sample: '100' },
  { key: 'method', headers: ['method (cash/card/check/bank_transfer/other)', 'method'], sample: 'card' },
  { key: 'type', headers: ['type (payment/refund/credit_adjustment)', 'type'], sample: 'payment' },
  { key: 'notes', headers: ['notes'], sample: '' },
]

/** Downloads a one-row sample CSV for the given column set (Customers, Enrollments, Lessons, or Payments shape). */
export function downloadSampleCsv(columns, filename) {
  const headers = columns.map((c) => c.headers[0])
  const sampleRow = columns.map((c) => c.sample ?? '')
  const csv = [headers.join(','), sampleRow.map(toCSVValue).join(',')].join('\n')
  triggerDownload(csv, filename)
}

/**
 * Downloads a sample .xlsx workbook with "Customers", "Enrollments",
 * "Lessons", and "Payments" sheets, one example row each. Lessons/Payments
 * are optional at import time but included in the sample so studios that do
 * have per-lesson/per-payment history know the expected shape.
 */
export function downloadSampleXlsx(filename = 'sample_migration_import.xlsx') {
  const toSheet = (columns) => {
    const headers = columns.map((c) => c.headers[0])
    const sampleRow = columns.map((c) => c.sample ?? '')
    return XLSX.utils.aoa_to_sheet([headers, sampleRow])
  }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, toSheet(CUSTOMER_COLUMNS), 'Customers')
  XLSX.utils.book_append_sheet(workbook, toSheet(ENROLLMENT_COLUMNS), 'Enrollments')
  XLSX.utils.book_append_sheet(workbook, toSheet(LESSON_COLUMNS), 'Lessons')
  XLSX.utils.book_append_sheet(workbook, toSheet(PAYMENT_COLUMNS), 'Payments')
  XLSX.writeFile(workbook, filename)
}

// Strips a trailing "required field" marker (e.g. "Legacy Customer ID *")
// before collapsing whitespace/underscores/dashes, so templates that mark
// required columns with an asterisk still match the plain header spelling.
function normalizeHeader(h) {
  return String(h || '').trim().replace(/\*+\s*$/, '').trim().toLowerCase().replace(/[\s_-]+/g, ' ')
}

// Finds the real header row by looking for the row with the most recognizable
// column names, so instructional/example rows above it (per the template's
// own "delete yellow rows before importing" rule) don't need to be stripped
// by hand — anything above the detected header row is simply ignored.
function findHeaderRowIndex(rows, columns) {
  const knownHeaders = new Set(columns.flatMap((c) => c.headers.map(normalizeHeader)))
  let bestIndex = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i] || []
    const score = row.filter((cell) => knownHeaders.has(normalizeHeader(cell))).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  return bestScore >= 2 ? bestIndex : -1
}

// Converts a 2D array-of-arrays (raw sheet rows) into canonical row objects,
// using whichever header row scores best against `columns`.
function rowsToCanonical(rawRows, columns) {
  const headerIndex = findHeaderRowIndex(rawRows, columns)
  if (headerIndex === -1) {
    throw new Error('Could not find a recognizable header row — check the file matches the migration template columns')
  }
  const headerRow = rawRows[headerIndex].map(normalizeHeader)
  const colIndexByKey = new Map()
  columns.forEach(({ key, headers }) => {
    const idx = headerRow.findIndex((h) => headers.some((candidate) => normalizeHeader(candidate) === h))
    if (idx !== -1) colIndexByKey.set(key, idx)
  })

  const out = []
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const raw = rawRows[i] || []
    if (raw.every((cell) => String(cell ?? '').trim() === '')) continue // blank row
    const row = {}
    columns.forEach(({ key }) => {
      const idx = colIndexByKey.get(key)
      row[key] = idx !== undefined && raw[idx] !== undefined ? String(raw[idx]).trim() : ''
    })
    out.push(row)
  }
  return out
}

function csvTextToRawRows(text) {
  const { data } = Papa.parse(text, { skipEmptyLines: false })
  return data
}

/** Parses a single CSV File into canonical rows for the given column set. */
export function parseCsvFile(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(rowsToCanonical(csvTextToRawRows(e.target.result), columns))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

/**
 * Parses an .xlsx workbook expected to contain "Customers" and "Enrollments"
 * sheets (case-insensitive name match) into { customers, enrollments, lessons,
 * payments }. "Lessons" and "Payments" are optional — studios without
 * per-lesson/per-payment history can omit them and only the aggregate
 * "(historic)" fields on Customers/Enrollments are used.
 */
export function parseXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const sheetName = (needle) =>
          workbook.SheetNames.find((n) => n.trim().toLowerCase() === needle) || null

        const customersSheetName = sheetName('customers')
        const enrollmentsSheetName = sheetName('enrollments')
        if (!customersSheetName || !enrollmentsSheetName) {
          throw new Error('Workbook must contain sheets named "Customers" and "Enrollments"')
        }
        const lessonsSheetName = sheetName('lessons')
        const paymentsSheetName = sheetName('payments')

        const toRows = (sheetName) =>
          XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })

        resolve({
          customers: rowsToCanonical(toRows(customersSheetName), CUSTOMER_COLUMNS),
          enrollments: rowsToCanonical(toRows(enrollmentsSheetName), ENROLLMENT_COLUMNS),
          lessons: lessonsSheetName ? rowsToCanonical(toRows(lessonsSheetName), LESSON_COLUMNS) : [],
          payments: paymentsSheetName ? rowsToCanonical(toRows(paymentsSheetName), PAYMENT_COLUMNS) : [],
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

// Rows whose supplied aggregate is off from the computed sum by more than
// this are worth flagging — legacy exports are frequently approximate, so
// this is a warning, not a hard error.
const AGGREGATE_MISMATCH_TOLERANCE = 0.01

/** Cheap client-side checks before hitting the network — catch obvious problems instantly. */
export function preflightCheck(customers, enrollments, lessons = [], payments = []) {
  const errors = []
  const seenCustomerIDs = new Set()
  const customerIDs = new Set()

  customers.forEach((row, i) => {
    const id = row.legacyCustomerID
    if (!id) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Missing Legacy Customer ID' })
      return
    }
    if (seenCustomerIDs.has(id)) {
      errors.push({ sheet: 'customers', rowIndex: i, message: `Duplicate Legacy Customer ID "${id}" within this file` })
      return
    }
    seenCustomerIDs.add(id)
    customerIDs.add(id)
    if (!row.email && !row.phone) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Needs email OR phone', legacyCustomerID: id })
    }
  })

  const seenEnrollmentIDs = new Set()
  const enrollmentIDs = new Set()
  enrollments.forEach((row, i) => {
    const id = row.legacyEnrollmentID
    if (id) {
      if (seenEnrollmentIDs.has(id)) {
        errors.push({ sheet: 'enrollments', rowIndex: i, message: `Duplicate Legacy Enrollment ID "${id}" within this file` })
      }
      seenEnrollmentIDs.add(id)
      enrollmentIDs.add(id)
    }
    if (!row.legacyCustomerID || !customerIDs.has(row.legacyCustomerID)) {
      errors.push({
        sheet: 'enrollments',
        rowIndex: i,
        message: `Legacy Customer ID "${row.legacyCustomerID || '(blank)'}" has no matching row in the Customers sheet`,
      })
    }
  })

  const seenLessonIDs = new Set()
  lessons.forEach((row, i) => {
    const id = row.legacyLessonID
    if (id) {
      if (seenLessonIDs.has(id)) {
        errors.push({ sheet: 'lessons', rowIndex: i, message: `Duplicate Legacy Lesson ID "${id}" within this file` })
      }
      seenLessonIDs.add(id)
    }
    if (!row.legacyCustomerID || !customerIDs.has(row.legacyCustomerID)) {
      errors.push({
        sheet: 'lessons',
        rowIndex: i,
        message: `Legacy Customer ID "${row.legacyCustomerID || '(blank)'}" has no matching row in the Customers sheet`,
      })
    }
    if (row.legacyEnrollmentID && !enrollmentIDs.has(row.legacyEnrollmentID)) {
      errors.push({
        sheet: 'lessons',
        rowIndex: i,
        message: `Legacy Enrollment ID "${row.legacyEnrollmentID}" has no matching row in the Enrollments sheet`,
      })
    }
  })

  const seenPaymentIDs = new Set()
  payments.forEach((row, i) => {
    const id = row.legacyPaymentID
    if (id) {
      if (seenPaymentIDs.has(id)) {
        errors.push({ sheet: 'payments', rowIndex: i, message: `Duplicate Legacy Payment ID "${id}" within this file` })
      }
      seenPaymentIDs.add(id)
    }
    if (!row.legacyCustomerID || !customerIDs.has(row.legacyCustomerID)) {
      errors.push({
        sheet: 'payments',
        rowIndex: i,
        message: `Legacy Customer ID "${row.legacyCustomerID || '(blank)'}" has no matching row in the Customers sheet`,
      })
    }
    if (row.legacyEnrollmentID && !enrollmentIDs.has(row.legacyEnrollmentID)) {
      errors.push({
        sheet: 'payments',
        rowIndex: i,
        message: `Legacy Enrollment ID "${row.legacyEnrollmentID}" has no matching row in the Enrollments sheet`,
      })
    }
  })

  // Cross-check aggregate "(historic)" counters on Customers against what
  // the Lessons/Payments line items actually add up to — non-blocking,
  // since legacy exports are frequently approximate.
  if (lessons.length) {
    const completedByCustomer = new Map()
    for (const row of lessons) {
      if (row.status !== 'completed') continue
      completedByCustomer.set(row.legacyCustomerID, (completedByCustomer.get(row.legacyCustomerID) || 0) + 1)
    }
    customers.forEach((row, i) => {
      const supplied = Number(row.privatesTaken) + Number(row.groupsTaken) + Number(row.partiesTaken) + Number(row.coachingTaken)
      if (!supplied) return
      const computed = completedByCustomer.get(row.legacyCustomerID) || 0
      if (Math.abs(supplied - computed) > 0) {
        errors.push({
          sheet: 'customers',
          rowIndex: i,
          severity: 'warning',
          message: `Historic lesson counters (${supplied}) don't match completed rows in Lessons sheet (${computed})`,
        })
      }
    })
  }
  if (payments.length) {
    const collectedByCustomer = new Map()
    for (const row of payments) {
      collectedByCustomer.set(row.legacyCustomerID, (collectedByCustomer.get(row.legacyCustomerID) || 0) + (Number(row.amount) || 0))
    }
    customers.forEach((row, i) => {
      const supplied = Number(row.lifetimeCollected)
      if (!supplied) return
      const computed = collectedByCustomer.get(row.legacyCustomerID) || 0
      if (Math.abs(supplied - computed) > AGGREGATE_MISMATCH_TOLERANCE) {
        errors.push({
          sheet: 'customers',
          rowIndex: i,
          severity: 'warning',
          message: `Lifetime Collected ($${supplied}) doesn't match sum of Payments sheet rows ($${computed.toFixed(2)})`,
        })
      }
    })
  }

  return errors
}

/**
 * Per-studio totals as reported by the source spreadsheet, for the
 * reconciliation check. Sessions/cash come from the Enrollments aggregate
 * fields by default; when a Payments sheet is supplied, cashCollected is
 * summed from it instead (the more granular, presumably more accurate
 * source) — everything else still comes from Enrollments.
 */
export function computeSheetTotals(enrollments, customers, payments = []) {
  const studioByLegacyID = new Map(customers.map((c) => [c.legacyCustomerID, c.studio]))
  const byStudio = new Map()
  const getBucket = (studio) => {
    if (!byStudio.has(studio)) {
      byStudio.set(studio, { locationName: studio, sessionsRemaining: 0, contractedValue: 0, cashCollected: 0, balanceDue: 0 })
    }
    return byStudio.get(studio)
  }

  for (const row of enrollments) {
    const bucket = getBucket(studioByLegacyID.get(row.legacyCustomerID) || 'Unknown')
    bucket.sessionsRemaining +=
      (Number(row.privatesRemaining) || 0) +
      (Number(row.groupsRemaining) || 0) +
      (Number(row.partiesRemaining) || 0) +
      (Number(row.coachingRemaining) || 0)
    bucket.contractedValue += Number(row.contractedValue) || 0
    bucket.balanceDue += Number(row.balanceDue) || 0
    if (!payments.length) bucket.cashCollected += Number(row.cashCollected) || 0
  }

  if (payments.length) {
    for (const row of payments) {
      const bucket = getBucket(studioByLegacyID.get(row.legacyCustomerID) || 'Unknown')
      bucket.cashCollected += Number(row.amount) || 0
    }
  }

  return Array.from(byStudio.values())
}
