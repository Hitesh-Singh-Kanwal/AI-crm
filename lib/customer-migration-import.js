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
  // Links this row to another row in the same Customers sheet by its Legacy
  // Customer ID — a couple, spouse, or other paired household member.
  // Validated in preflightCheck (must resolve to a different row in this
  // file) so a typo doesn't silently create two disconnected accounts
  // instead of one linked household.
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

// The booking catalog itself (Service model, app/calendar/services). Optional
// sheet — if the studio's services already exist in the app (the normal
// case), skip this sheet and just use the existing `serviceCode`s on the
// Enrollments/Memberships sheets. Only needed when migrating a studio's
// entire catalog from scratch, since Enrollments/Memberships can't create a
// bookable package/membership against a `serviceCode` that doesn't exist yet.
export const SERVICE_COLUMNS = [
  { key: 'legacyServiceCode', headers: ['legacy service code', 'legacyservicecode'], sample: 'PRIVATE-45' },
  { key: 'serviceName', headers: ['service name'], sample: 'Private Lesson (45 min)' },
  // The real catalog key (Service.serviceCode) that Enrollments/Memberships
  // sheets reference — same column name/meaning as `serviceCode` there.
  { key: 'serviceCode', headers: ['service code (matches booking catalog)', 'service code'], sample: 'PRIVATE-45' },
  { key: 'studio', headers: ['studio', 'location'], sample: 'Studio A' },
  { key: 'type', headers: ['type (private/group/intro/todo)', 'type'], sample: 'private' },
  { key: 'price', headers: ['price per session $', 'price'], sample: '65' },
  { key: 'color', headers: ['color (hex)', 'color'], sample: '#4F46E5' },
  { key: 'isChargeable', headers: ['chargeable (y/n)', 'is chargeable'], sample: 'Y' },
  { key: 'isSundry', headers: ['sundry (y/n)', 'is sundry'], sample: 'N' },
  { key: 'countOnCalendar', headers: ['count on calendar (y/n)'], sample: 'Y' },
  { key: 'isActive', headers: ['active (y/n)', 'is active'], sample: 'Y' },
  { key: 'description', headers: ['description'], sample: '' },
]

export const ENROLLMENT_COLUMNS = [
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'legacyEnrollmentID', headers: ['legacy enrollment id', 'legacyenrollmentid'], sample: 'ENR-2291' },
  { key: 'programName', headers: ['program name'], sample: 'Bronze 10-Lesson' },
  { key: 'programType', headers: ['program type (private/group/wedding/coaching/mixed)', 'program type'], sample: 'private' },
  // Drives whether the imported package is actually bookable. Booking
  // (AppointmentComposerPanel) only offers a package when its enrollment is
  // "active" AND the package itself isn't "cancelled" — without this column
  // an import has no way to say which enrollments should land in that state,
  // which is why imported packages have historically gone in "invisible".
  { key: 'status', headers: ['status (active/completed/cancelled)', 'enrollment status'], sample: 'active' },
  // Matches this program to a real bookable service in the catalog
  // (Service.serviceCode). Booking filters package services by serviceCode,
  // so a package imported without one — or with one that doesn't exist in
  // the catalog — can show nonzero sessionsRemaining on the package/customer
  // page yet never appear as a selectable option when booking.
  { key: 'serviceCode', headers: ['service code (matches booking catalog)', 'service code'], sample: 'PRIVATE-45' },
  { key: 'enrollmentDate', headers: ['enrollment date'], sample: '2026-03-04' },
  // Package expiry (Package/Enrollment.expiryDate) — controls when the
  // remaining counters below stop being usable in booking, independent of
  // `status`. Without it an imported package can look "active" forever.
  { key: 'expiryDate', headers: ['expiry date', 'expiration date'], sample: '2027-03-04' },
  // Teacher assigned specifically to this enrollment (Enrollment.teacherID) —
  // distinct from the customer-level "Assigned Teacher" on the Customers
  // sheet, since a customer can have different teachers on different
  // packages (e.g. one teacher for privates, another for group).
  { key: 'teacher', headers: ['enrollment teacher', 'teacher'], sample: 'Alex Rivera' },
  { key: 'privatesRemaining', headers: ['privates remaining'], sample: '7' },
  { key: 'groupsRemaining', headers: ['groups remaining'], sample: '4' },
  { key: 'partiesRemaining', headers: ['parties remaining'], sample: '2' },
  { key: 'coachingRemaining', headers: ['coaching remaining'], sample: '0' },
  { key: 'contractedValue', headers: ['contracted value $ (0 if bonus/free)', 'contracted value'], sample: '1000' },
  // Discount applied to contractedValue to reach the amount actually owed
  // (Package.discountType/discountAmount/finalAmount) — needed so balance
  // due / credit calculations reconcile the same way a package created
  // through the normal "New Enrollment" flow would (computeAmounts()).
  { key: 'discountType', headers: ['discount type (none/percentage/fixed)', 'discount type'], sample: 'none' },
  { key: 'discountAmount', headers: ['discount amount', 'discount amount $'], sample: '0' },
  // finalAmount = contractedValue minus the discount above. Importer should
  // cross-check this against contractedValue/discountAmount (like the
  // existing Lessons/Payments aggregate cross-checks) rather than trust it
  // blindly, since it's the number balanceDue/paymentStatus are computed from.
  { key: 'finalAmount', headers: ['final amount $ (after discount)', 'final amount'], sample: '1000' },
  { key: 'cashCollected', headers: ['cash collected to date $', 'cash collected'], sample: '700' },
  { key: 'balanceDue', headers: ['balance due $', 'balance due'], sample: '300' },
  { key: 'totalRefunded', headers: ['total refunded $', 'total refunded'], sample: '0' },
  { key: 'paymentStatus', headers: ['payment status (paid/partial/unpaid/payment_pending)', 'payment status'], sample: 'partial' },
  // How the balance is intended to be paid off — matters for whether the
  // backend should also create a PaymentPlan/installment schedule so
  // "balance due" isn't just a static number with no collection plan.
  { key: 'billingType', headers: ['billing type (one_time/payment_plan/flexible/pay_per_session)', 'billing type'], sample: 'one_time' },
  { key: 'notes', headers: ['notes'], sample: 'paying monthly' },
]

// Studio "Membership" plan assignments (e.g. a recurring gym-style
// membership) — a completely separate concept from Enrollments/Packages
// (session counters) and from partnerLegacyCustomerID (household linking).
// Optional sheet: studios that don't sell memberships can omit it entirely.
export const MEMBERSHIP_COLUMNS = [
  { key: 'legacyCustomerID', headers: ['legacy customer id', 'legacycustomerid'], sample: 'AM-10482' },
  { key: 'legacyMembershipID', headers: ['legacy membership id', 'legacymembershipid'], sample: 'MEM-3310' },
  { key: 'membershipPlanName', headers: ['membership plan name', 'plan name'], sample: 'Unlimited Group Classes' },
  // What this membership actually grants access to — a Membership plan
  // covers one or more catalog services, either unlimited or a fixed
  // session count per period. Without this, an imported membership shows
  // as "active" on the customer's profile but grants no bookable access,
  // the same invisible-package failure mode as unlinked Enrollments.
  { key: 'serviceCodes', headers: ['service codes (comma-separated, matches booking catalog)', 'service codes'], sample: 'GROUP-CLASS' },
  { key: 'accessType', headers: ['access type (unlimited/sessions)', 'access type'], sample: 'unlimited' },
  // Only meaningful when accessType = sessions.
  { key: 'sessionsTotal', headers: ['sessions total (if access type = sessions)', 'sessions total'], sample: '' },
  { key: 'status', headers: ['status (active/paused/cancelled/frozen)', 'membership status'], sample: 'active' },
  { key: 'startDate', headers: ['start date'], sample: '2026-01-01' },
  { key: 'expiryDate', headers: ['expiry date (next renewal)', 'expiry date'], sample: '2027-01-01' },
  { key: 'durationDays', headers: ['duration days (billing period)', 'duration days'], sample: '30' },
  { key: 'autoRenew', headers: ['auto renew (y/n)', 'auto renew'], sample: 'Y' },
  { key: 'nextBillingDate', headers: ['next billing date'], sample: '2026-09-01' },
  { key: 'billingAmount', headers: ['billing amount $', 'billing amount'], sample: '99' },
  { key: 'billingType', headers: ['billing type (one_time/flexible)', 'billing type'], sample: 'one_time' },
  { key: 'amountCollected', headers: ['amount collected to date $', 'amount collected'], sample: '99' },
  { key: 'totalRefunded', headers: ['total refunded $', 'total refunded'], sample: '0' },
  { key: 'paymentStatus', headers: ['payment status (paid/partial/unpaid/payment_pending)', 'payment status'], sample: 'paid' },
  { key: 'discountType', headers: ['discount type (none/percentage/fixed)', 'discount type'], sample: 'none' },
  { key: 'discountAmount', headers: ['discount amount', 'discount amount $'], sample: '0' },
  { key: 'notes', headers: ['notes'], sample: '' },
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
  XLSX.utils.book_append_sheet(workbook, toSheet(SERVICE_COLUMNS), 'Services')
  XLSX.utils.book_append_sheet(workbook, toSheet(ENROLLMENT_COLUMNS), 'Enrollments')
  XLSX.utils.book_append_sheet(workbook, toSheet(MEMBERSHIP_COLUMNS), 'Memberships')
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
 * sheets (case-insensitive name match) into { customers, services,
 * enrollments, memberships, lessons, payments }. "Services", "Memberships",
 * "Lessons" and "Payments" are optional — studios whose catalog already
 * exists in the app, or that don't sell memberships, or don't have
 * per-lesson/per-payment history, can omit any of them.
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
        const servicesSheetName = sheetName('services')
        const membershipsSheetName = sheetName('memberships')
        const lessonsSheetName = sheetName('lessons')
        const paymentsSheetName = sheetName('payments')

        const toRows = (sheetName) =>
          XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })

        resolve({
          customers: rowsToCanonical(toRows(customersSheetName), CUSTOMER_COLUMNS),
          services: servicesSheetName ? rowsToCanonical(toRows(servicesSheetName), SERVICE_COLUMNS) : [],
          enrollments: rowsToCanonical(toRows(enrollmentsSheetName), ENROLLMENT_COLUMNS),
          memberships: membershipsSheetName ? rowsToCanonical(toRows(membershipsSheetName), MEMBERSHIP_COLUMNS) : [],
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
export function preflightCheck(customers, enrollments, lessons = [], payments = [], memberships = [], services = []) {
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
    // Credit Balance / Wallet Balance feed Customer.credits and the ledgered
    // Wallet respectively — both must be non-negative numbers, or the
    // customer's balance shown in the app will be wrong or the row will be
    // silently rejected server-side with no visible reason why.
    for (const [field, label] of [['creditBalance', 'Credit Balance'], ['walletBalance', 'Wallet Balance']]) {
      const raw = row[field]
      if (raw === '' || raw === undefined) continue
      const n = Number(raw)
      if (Number.isNaN(n)) {
        errors.push({ sheet: 'customers', rowIndex: i, message: `${label} "${raw}" is not a number`, legacyCustomerID: id })
      } else if (n < 0) {
        errors.push({ sheet: 'customers', rowIndex: i, message: `${label} cannot be negative (got ${n})`, legacyCustomerID: id })
      }
    }
  })

  // Partner/household linking (couples, family members sharing an account
  // relationship) — must point at another row in this same file, not a
  // blank/typo'd ID and not itself, or the two accounts stay disconnected
  // exactly like an unlinked import today.
  customers.forEach((row, i) => {
    const partnerID = row.partnerLegacyCustomerID
    if (!partnerID) return
    if (partnerID === row.legacyCustomerID) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Partner Legacy ID cannot reference the same row', legacyCustomerID: row.legacyCustomerID })
    } else if (!customerIDs.has(partnerID)) {
      errors.push({
        sheet: 'customers',
        rowIndex: i,
        message: `Partner Legacy ID "${partnerID}" has no matching row in the Customers sheet`,
        legacyCustomerID: row.legacyCustomerID,
      })
    }
  })

  const seenEnrollmentIDs = new Set()
  // Service Codes referenced by Enrollments/Memberships are cross-checked
  // against a Services sheet only when one is supplied — most studios rely
  // on a catalog that already exists in the app, so an empty Services sheet
  // means "trust the backend catalog", not "no service codes are valid".
  const seenServiceCodes = new Set()
  const serviceCodes = new Set()
  services.forEach((row, i) => {
    const code = row.serviceCode
    if (!code) {
      errors.push({ sheet: 'services', rowIndex: i, message: 'Missing Service Code' })
      return
    }
    if (seenServiceCodes.has(code)) {
      errors.push({ sheet: 'services', rowIndex: i, message: `Duplicate Service Code "${code}" within this file` })
      return
    }
    seenServiceCodes.add(code)
    serviceCodes.add(code)
    if (!row.serviceName) {
      errors.push({ sheet: 'services', rowIndex: i, message: 'Missing Service Name', legacyServiceCode: row.legacyServiceCode })
    }
    if (row.price !== '' && row.price !== undefined && Number.isNaN(Number(row.price))) {
      errors.push({ sheet: 'services', rowIndex: i, message: `Price "${row.price}" is not a number` })
    }
  })

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
    // These two are what makes an imported package actually bookable
    // (see comments on ENROLLMENT_COLUMNS) — missing either is a warning,
    // not a hard error, since a studio may intentionally import a completed/
    // historic enrollment that was never meant to be bookable.
    const status = (row.status || '').toLowerCase()
    if (status && !['active', 'completed', 'cancelled'].includes(status)) {
      errors.push({ sheet: 'enrollments', rowIndex: i, message: `Status "${row.status}" is not one of active/completed/cancelled` })
    }
    if (status === 'active' && !row.serviceCode) {
      errors.push({
        sheet: 'enrollments',
        rowIndex: i,
        severity: 'warning',
        message: 'Active enrollment has no Service Code — sessions may not appear as bookable until one is set',
      })
    }
    // Only checked against the Services sheet when one was actually
    // supplied — see note above seenServiceCodes.
    if (row.serviceCode && services.length && !serviceCodes.has(row.serviceCode)) {
      errors.push({
        sheet: 'enrollments',
        rowIndex: i,
        severity: 'warning',
        message: `Service Code "${row.serviceCode}" has no matching row in the Services sheet — confirm it already exists in the app's catalog`,
      })
    }
    for (const [field, label] of [
      ['contractedValue', 'Contracted Value'],
      ['discountAmount', 'Discount Amount'],
      ['finalAmount', 'Final Amount'],
      ['cashCollected', 'Cash Collected'],
      ['balanceDue', 'Balance Due'],
      ['totalRefunded', 'Total Refunded'],
    ]) {
      const raw = row[field]
      if (raw === '' || raw === undefined) continue
      const n = Number(raw)
      if (Number.isNaN(n)) {
        errors.push({ sheet: 'enrollments', rowIndex: i, message: `${label} "${raw}" is not a number` })
      } else if (n < 0) {
        errors.push({ sheet: 'enrollments', rowIndex: i, message: `${label} cannot be negative (got ${n})` })
      }
    }
    // finalAmount should reconcile to contractedValue minus discountAmount —
    // this is exactly the number balanceDue/paymentStatus get computed from
    // downstream, so a silent mismatch here is a silent wrong balance later.
    if (row.contractedValue !== '' && row.finalAmount !== '' && row.contractedValue !== undefined && row.finalAmount !== undefined) {
      const contracted = Number(row.contractedValue)
      const discount = Number(row.discountAmount) || 0
      // discountAmount means different things depending on discountType — a
      // "percentage" discount of 10 means 10% of contractedValue, not $10
      // flat. Treating it as always-dollar (as an earlier version of this
      // check did) flags every correctly-computed percentage discount as a
      // mismatch.
      const discountDollars = (row.discountType || '').toLowerCase() === 'percentage' ? contracted * (discount / 100) : discount
      const expected = contracted - discountDollars
      const actual = Number(row.finalAmount)
      if (!Number.isNaN(expected) && !Number.isNaN(actual) && Math.abs(expected - actual) > AGGREGATE_MISMATCH_TOLERANCE) {
        errors.push({
          sheet: 'enrollments',
          rowIndex: i,
          severity: 'warning',
          message: `Final Amount ($${actual}) doesn't match Contracted Value minus Discount ($${expected.toFixed(2)})`,
        })
      }
    }
  })

  const seenMembershipIDs = new Set()
  memberships.forEach((row, i) => {
    const id = row.legacyMembershipID
    if (id) {
      if (seenMembershipIDs.has(id)) {
        errors.push({ sheet: 'memberships', rowIndex: i, message: `Duplicate Legacy Membership ID "${id}" within this file` })
      }
      seenMembershipIDs.add(id)
    }
    if (!row.legacyCustomerID || !customerIDs.has(row.legacyCustomerID)) {
      errors.push({
        sheet: 'memberships',
        rowIndex: i,
        message: `Legacy Customer ID "${row.legacyCustomerID || '(blank)'}" has no matching row in the Customers sheet`,
      })
    }
    if (!row.membershipPlanName) {
      errors.push({ sheet: 'memberships', rowIndex: i, message: 'Missing Membership Plan Name' })
    }
    const accessType = (row.accessType || '').toLowerCase()
    if (accessType && !['unlimited', 'sessions'].includes(accessType)) {
      errors.push({ sheet: 'memberships', rowIndex: i, message: `Access Type "${row.accessType}" is not one of unlimited/sessions` })
    }
    if (accessType === 'sessions' && !row.sessionsTotal) {
      errors.push({ sheet: 'memberships', rowIndex: i, message: 'Access Type "sessions" requires Sessions Total' })
    }
    if (!row.serviceCodes) {
      errors.push({
        sheet: 'memberships',
        rowIndex: i,
        severity: 'warning',
        message: 'No Service Codes — this membership will show as active but grant no bookable access',
      })
    } else if (services.length) {
      const codes = row.serviceCodes.split(',').map((c) => c.trim()).filter(Boolean)
      const missing = codes.filter((c) => !serviceCodes.has(c))
      if (missing.length) {
        errors.push({
          sheet: 'memberships',
          rowIndex: i,
          severity: 'warning',
          message: `Service Code(s) "${missing.join(', ')}" have no matching row in the Services sheet — confirm they already exist in the app's catalog`,
        })
      }
    }
    for (const [field, label] of [
      ['billingAmount', 'Billing Amount'],
      ['amountCollected', 'Amount Collected'],
      ['totalRefunded', 'Total Refunded'],
      ['discountAmount', 'Discount Amount'],
    ]) {
      const raw = row[field]
      if (raw === '' || raw === undefined) continue
      const n = Number(raw)
      if (Number.isNaN(n)) {
        errors.push({ sheet: 'memberships', rowIndex: i, message: `${label} "${raw}" is not a number` })
      } else if (n < 0) {
        errors.push({ sheet: 'memberships', rowIndex: i, message: `${label} cannot be negative (got ${n})` })
      }
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
    // The CRM stores the package's "contracted value" net of discount
    // (Package.totalPaid = finalAmount), not the sheet's raw pre-discount
    // contractedValue — so reconciling against the raw column here would
    // flag every correctly-discounted enrollment as a false mismatch.
    // Mirrors the same finalAmount derivation as preflightCheck below.
    const contracted = Number(row.contractedValue) || 0
    const discount = Number(row.discountAmount) || 0
    const discountDollars = (row.discountType || '').toLowerCase() === 'percentage' ? contracted * (discount / 100) : discount
    const suppliedFinalAmount = row.finalAmount !== '' && row.finalAmount !== undefined ? Number(row.finalAmount) : NaN
    const finalAmount = !Number.isNaN(suppliedFinalAmount) ? suppliedFinalAmount : contracted - discountDollars
    bucket.contractedValue += finalAmount
    bucket.balanceDue += Number(row.balanceDue) || 0
  }

  // cashCollected: sum real Payments-sheet rows, but only *instead of* an
  // enrollment's own Cash Collected column when that enrollment actually has
  // a Payments-sheet row covering it — mirrors the backend exactly, which
  // auto-creates a backdated "cash collected" Payment for any enrollment the
  // Payments sheet doesn't cover (see customerImport.service.js), so the CRM
  // total isn't missing that enrollment's collected amount. Summing every
  // Payments row *and* every enrollment's cashCollected unconditionally would
  // double-count enrollments the Payments sheet *does* cover; the previous
  // "payments.length ? only Payments sheet : only Enrollments" split
  // silently dropped any enrollment the Payments sheet didn't happen to cover.
  const enrollmentIDsWithPayments = new Set(
    payments.map((row) => (row.legacyEnrollmentID ? String(row.legacyEnrollmentID).trim() : '')).filter(Boolean),
  )
  for (const row of enrollments) {
    if (row.legacyEnrollmentID && enrollmentIDsWithPayments.has(String(row.legacyEnrollmentID).trim())) continue
    const bucket = getBucket(studioByLegacyID.get(row.legacyCustomerID) || 'Unknown')
    bucket.cashCollected += Number(row.cashCollected) || 0
  }
  for (const row of payments) {
    const bucket = getBucket(studioByLegacyID.get(row.legacyCustomerID) || 'Unknown')
    bucket.cashCollected += Number(row.amount) || 0
  }

  return Array.from(byStudio.values())
}
