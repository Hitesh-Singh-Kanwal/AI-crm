'use client'

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toCSVValue, triggerDownload } from '@/lib/csv-utils'

// Canonical column shapes the backend importer expects. Each entry maps a
// canonical key to the set of header spellings we should recognize in the
// source spreadsheet (case/space/underscore-insensitive — see normalizeHeader),
// plus a `sample` value used to build the downloadable sample file.
// Rule 1 — "Nobody invents IDs. People are matched by name, email and
// phone. The app creates its own IDs internally." No sheet has an ID column
// to fill in by hand anymore; a person is identified purely by Email/Phone
// (and, for a package, by Program Name — see ENROLLMENT_COLUMNS), which the
// app then uses to derive its own internal keys automatically.
export const CUSTOMER_COLUMNS = [
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
  // Links this row to another row in the same Customers sheet by Email (or
  // Phone, if no email) — a couple, spouse, or other paired household
  // member. Validated in preflightCheck (must resolve to a different row in
  // this file) so a typo doesn't silently create two disconnected accounts
  // instead of one linked household.
  { key: 'partnerEmail', headers: ['partner email (couples)', 'partner email'], sample: '' },
  { key: 'partnerPhone', headers: ['partner phone (couples)', 'partner phone'], sample: '' },
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
  // Rule 1 — identifies which customer this row belongs to (no ID column).
  { key: 'email', headers: ['email'], sample: 'maria.gomez@example.com' },
  { key: 'phone', headers: ['cell phone', 'phone', 'phonenumber'], sample: '' },
  // The one thing every row of a multi-service package (rule 3 — "12
  // privates + 2 parties = one package") shares: rows with the same
  // customer + Program Name become line items of ONE package automatically.
  { key: 'programName', headers: ['program name'], sample: 'Bronze 10-Lesson' },
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
  // Rule 2 — "every fact appears once. We give lessons bought and lessons
  // used; the app calculates lessons remaining." One row = one service line
  // (a multi-service package is several rows sharing one Program Name, each
  // with its own Sessions Total/Taken and Service Code — see the Wedding
  // Package example in the sample file). Sessions Remaining is never a
  // column here; it's always computed as Total − Taken.
  { key: 'sessionsTotal', headers: ['sessions total (bought)', 'sessions total'], sample: '12' },
  { key: 'sessionsTaken', headers: ['sessions taken (used)', 'sessions taken'], sample: '0' },
  // Only used as a fallback when Service Code doesn't resolve to a real
  // catalog entry — picks which generic bucket (private/group/party/
  // coaching) this line falls into so it's still counted somewhere.
  { key: 'programType', headers: ['program type (private/group/party/coaching)', 'program type'], sample: 'private' },
  // Lets a multi-service package (rule 3 — "12 privates + 2 parties = one
  // package") still be entered as ONE row instead of one row per service
  // line: each extra service is "code:sessions total:sessions taken",
  // separated by ";" — e.g. "PARTY-60:2:0;COACHING-30:1:1". splitUniversalRows
  // expands this into the same synthetic extra line-item rows the backend
  // already expects (sharing this row's Program Name/Email/Phone), so
  // nothing downstream needs to change to support it. Only the FIRST service
  // of a package goes in the main Service Code/Sessions Total/Sessions Taken
  // columns above — this column is purely for any additional ones.
  { key: 'additionalServiceLines', headers: ['additional services (code:total:taken; separated by ;)', 'additional services'], sample: '' },
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
// (session counters) and from partnerEmail (household linking).
// Optional sheet: studios that don't sell memberships can omit it entirely.
export const MEMBERSHIP_COLUMNS = [
  { key: 'email', headers: ['email'], sample: 'maria.gomez@example.com' },
  { key: 'phone', headers: ['cell phone', 'phone', 'phonenumber'], sample: '' },
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
  { key: 'email', headers: ['email'], sample: 'maria.gomez@example.com' },
  { key: 'phone', headers: ['cell phone', 'phone', 'phonenumber'], sample: '' },
  // Optional — links this lesson to a specific package (rows sharing this
  // customer + Program Name in the Enrollments sheet). Blank is fine; the
  // lesson just isn't tied to a particular package's session count.
  { key: 'programName', headers: ['program name'], sample: 'Bronze 10-Lesson' },
  { key: 'date', headers: ['date'], sample: '2026-02-10' },
  { key: 'type', headers: ['type (private/group/party/coaching/wedding)', 'type'], sample: 'private' },
  { key: 'status', headers: ['status (completed/no_show/cancelled/scheduled)', 'status'], sample: 'completed' },
  { key: 'teacher', headers: ['teacher'], sample: 'Alex Rivera' },
  { key: 'durationMinutes', headers: ['duration minutes', 'duration (minutes)'], sample: '45' },
  { key: 'notes', headers: ['notes'], sample: '' },
]

export const PAYMENT_COLUMNS = [
  { key: 'email', headers: ['email'], sample: 'maria.gomez@example.com' },
  { key: 'phone', headers: ['cell phone', 'phone', 'phonenumber'], sample: '' },
  // Optional — same "which package" link as Lessons above.
  { key: 'programName', headers: ['program name'], sample: 'Bronze 10-Lesson' },
  { key: 'date', headers: ['date'], sample: '2026-02-10' },
  { key: 'amount', headers: ['amount (+ payment, - refund)', 'amount'], sample: '100' },
  { key: 'method', headers: ['method (cash/card/check/bank_transfer/other)', 'method'], sample: 'card' },
  { key: 'type', headers: ['type (payment/refund/credit_adjustment)', 'type'], sample: 'payment' },
  // Optional: which staff member historically took this payment. When
  // present, the backend attributes the migrated payment to them
  // (processedBy) instead of whoever runs today's import.
  { key: 'staffName', headers: ['staff name', 'staffname', 'rep name', 'repname'], sample: '' },
  { key: 'notes', headers: ['notes'], sample: '' },
]

// --- Single-sheet import ---------------------------------------------
// "everything in a single sheet, not different ones — too many sheets is
// bad UX." One flat file (CSV or XLSX) with one row per fact (a customer's
// own row, plus one row per enrollment/lesson/payment/membership that
// references them by Email/Phone + Program Name) replaces uploading 5
// separate Customers/Enrollments/Memberships/Lessons/Payments files.
// UNIVERSAL_COLUMNS is the union of all 5 column sets with colliding field
// names disambiguated (e.g. Enrollment's "Status" vs Lesson's "Status"
// become distinct columns) — splitUniversalRows below un-prefixes them back
// to the exact shape CUSTOMER_COLUMNS/ENROLLMENT_COLUMNS/etc. already
// produce, so nothing downstream (preflightCheck, the backend API) changes.
// The Services catalog stays a separate optional upload: it's shared
// catalog data, not one row per customer, and most studios already have
// their catalog set up in the app (see SERVICE_COLUMNS above).
const UNIVERSAL_RENAMES = {
  enrollment: { status: 'enrollmentStatus', notes: 'enrollmentNotes' },
  membership: {
    status: 'membershipStatus',
    sessionsTotal: 'membershipSessionsTotal',
    expiryDate: 'membershipExpiryDate',
    totalRefunded: 'membershipTotalRefunded',
    paymentStatus: 'membershipPaymentStatus',
    billingType: 'membershipBillingType',
    discountType: 'membershipDiscountType',
    discountAmount: 'membershipDiscountAmount',
    notes: 'membershipNotes',
  },
  lesson: { status: 'lessonStatus', teacher: 'lessonTeacher', type: 'lessonType', date: 'lessonDate', notes: 'lessonNotes' },
  payment: { date: 'paymentDate', type: 'paymentType', notes: 'paymentNotes' },
}

function tagColumnsForUniversalSheet(columns, group, renameMap = {}) {
  return columns.map((c) => {
    const newKey = renameMap[c.key] || c.key
    // Renamed columns get the group name folded into their header label so
    // "Enrollment Status" and "Lesson Status" read as distinct columns in
    // the mapping-review UI and sample file, not just internally-distinct
    // keys. Deliberately NOT keeping the plain (unprefixed) header as a
    // fallback alias here, unlike a normal column — a renamed column exists
    // specifically because its plain header text collides with another
    // group's real column in this same flat sheet (e.g. Membership's own
    // "Expiry Date"/"Discount Type" columns are worded identically to
    // Enrollment's). Keeping the plain text as an alias meant the header
    // scanner could silently match the WRONG group's column first and read
    // an enrollment's price/date/status into a membership row (or vice
    // versa) with zero error — exactly the collision renaming exists to
    // prevent. See the tests this comment is paired with.
    const headers = renameMap[c.key] ? [`${group} ${c.headers[0]}`] : c.headers
    return { ...c, key: newKey, group, originalKey: c.key, headers }
  })
}

// Two import levels, so a studio that only has old-system TOTALS (no
// lesson-by-lesson / payment-by-payment history) gets a visibly shorter,
// less error-prone sheet instead of the full column set with a bunch of
// columns they're expected to leave blank. 'totals' drops the Lessons/
// Payments groups entirely (the two full extra sheets of columns) plus the
// Enrollments/Customers columns that only matter once real history exists —
// each of those has a safe backend default when omitted (see
// customerImport.service.js: discountType -> "none", billingType -> derived
// from Balance Due, teacher -> just unassigned, etc.), so dropping them from
// the template never changes what a totals-only row means, it just removes
// columns that were never required to make a mistake in.
const TOTALS_ONLY_EXCLUDE = {
  // partnerEmail/partnerPhone (spouse/family-member linking) is deliberately
  // NOT in this list — it's real identity data the backend actively acts on
  // (see customerImport.service.js's partner-merge pass), not optional
  // history, so it stays in the Totals Only template too.
  customer: [
    'anniversary', 'firstSessionDate', 'source',
    'danceLevel', 'assignedTeacher', 'lifetimeCollected', 'privatesTaken',
    'groupsTaken', 'partiesTaken', 'coachingTaken', 'lastLessonDate', 'nextAppointmentDate',
  ],
  enrollment: ['teacher', 'discountType', 'discountAmount', 'finalAmount', 'totalRefunded', 'paymentStatus', 'billingType'],
}

export function buildUniversalColumns(level = 'history') {
  const exclude = level === 'totals' ? TOTALS_ONLY_EXCLUDE : { customer: [], enrollment: [] }
  const columns = [
    ...tagColumnsForUniversalSheet(CUSTOMER_COLUMNS.filter((c) => !exclude.customer.includes(c.key)), 'customer'),
    ...tagColumnsForUniversalSheet(
      ENROLLMENT_COLUMNS.filter((c) => !exclude.enrollment.includes(c.key)),
      'enrollment',
      UNIVERSAL_RENAMES.enrollment,
    ).filter((c) => !['email', 'phone'].includes(c.originalKey)),
    ...tagColumnsForUniversalSheet(MEMBERSHIP_COLUMNS, 'membership', UNIVERSAL_RENAMES.membership).filter(
      (c) => !['email', 'phone'].includes(c.originalKey),
    ),
  ]
  // Totals-only import means exactly that — no per-lesson/per-payment rows
  // at all, so the two history sheets' columns are left out of the template
  // entirely rather than shown as "optional, leave blank".
  if (level !== 'totals') {
    columns.push(
      ...tagColumnsForUniversalSheet(LESSON_COLUMNS, 'lesson', UNIVERSAL_RENAMES.lesson).filter(
        (c) => !['email', 'phone', 'programName'].includes(c.originalKey),
      ),
      ...tagColumnsForUniversalSheet(PAYMENT_COLUMNS, 'payment', UNIVERSAL_RENAMES.payment).filter(
        (c) => !['email', 'phone', 'programName'].includes(c.originalKey),
      ),
    )
  }
  return columns
}

// Default/full column set — unchanged shape, kept for anything that still
// imports UNIVERSAL_COLUMNS directly (e.g. splitUniversalRows below reads
// row keys that only ever appear when present, so the wider list is always
// safe to check against regardless of which template produced the row).
export const UNIVERSAL_COLUMNS = buildUniversalColumns('history')
// The "Totals Only" template — same shape, fewer columns.
export const UNIVERSAL_COLUMNS_TOTALS_ONLY = buildUniversalColumns('totals')

function isBlankCell(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

/**
 * Splits rows parsed against UNIVERSAL_COLUMNS back into the 5 arrays the
 * backend/preflightCheck/computeSheetTotals already expect. One row can
 * carry a customer's own fields AND an enrollment/lesson/payment/membership
 * in the same row (the common flat-export shape), or just one — whichever
 * fields are actually filled in on that row determine what it becomes.
 * The customer's own fields are captured once per unique Email/Phone (first
 * row wins); later rows for the same person only contribute their
 * enrollment/lesson/payment/membership data.
 */
// Customer-profile fields other than the email/phone join key itself — used
// below to tell "this row IS a customer's profile row" apart from "this row
// just repeats an existing customer's email/phone to link an enrollment/
// lesson/payment/membership back to them" (the normal, intended shape of a
// multi-row package or lesson/payment history entry).
const CUSTOMER_PROFILE_KEYS = CUSTOMER_COLUMNS.map((c) => c.key).filter((k) => k !== 'email' && k !== 'phone')
// Same idea for Memberships — every membership field except the plan name
// itself (the field whose presence normally triggers treating a row as a
// membership at all). Uses UNIVERSAL_COLUMNS' (possibly renamed, e.g.
// "status" -> "membershipStatus") .key, since that's what actually appears
// on a parsed universal row — not MEMBERSHIP_COLUMNS' own originalKey.
const MEMBERSHIP_PROFILE_KEYS = UNIVERSAL_COLUMNS.filter(
  (c) => c.group === 'membership' && c.originalKey !== 'membershipPlanName',
).map((c) => c.key)

export function splitUniversalRows(rows) {
  const customers = []
  const enrollments = []
  const memberships = []
  const lessons = []
  const payments = []
  const seenCustomerKeys = new Set()

  const pick = (row, group) => {
    const out = { email: row.email, phone: row.phone, programName: row.programName }
    for (const c of UNIVERSAL_COLUMNS) if (c.group === group) out[c.originalKey] = row[c.key]
    return out
  }
  const looksLikeCustomerRow = (row) => CUSTOMER_PROFILE_KEYS.some((k) => !isBlankCell(row[k]))
  const looksLikeMembershipRow = (row) => MEMBERSHIP_PROFILE_KEYS.some((k) => !isBlankCell(row[k]))

  for (const row of rows) {
    const custKey = rowCustomerKey(row)
    if (custKey) {
      if (!seenCustomerKeys.has(custKey)) {
        seenCustomerKeys.add(custKey)
        customers.push(pick(row, 'customer'))
      } else if (looksLikeCustomerRow(row)) {
        // Same email/phone as an earlier row, but THIS row also carries its
        // own profile fields (not just a link-back for an enrollment/lesson/
        // payment/membership row) — surface it to preflightCheck as a
        // duplicate instead of silently discarding whatever it disagreed
        // with the first row about.
        customers.push(pick(row, 'customer'))
      }
    } else if (looksLikeCustomerRow(row)) {
      // No email/phone at all, but this clearly reads as an attempted
      // customer row (has a name/studio/etc. filled in) — push it through
      // anyway so preflightCheck's "Needs Email OR Phone" error actually
      // fires, instead of the row silently vanishing with no feedback at all.
      customers.push(pick(row, 'customer'))
    }
    // Program Name alone doesn't mean "this row is an enrollment" — a
    // Lessons/Payments row also carries Program Name (just to link back to
    // the package), which would otherwise get double-counted as an empty
    // enrollment line too. Sessions Total is the field that's actually
    // unique to a real enrollment line.
    if (!isBlankCell(row.programName) && !isBlankCell(row.sessionsTotal)) {
      const enrollmentRow = pick(row, 'enrollment')
      enrollments.push(enrollmentRow)
      // Additional Services column — lets a multi-service package be typed
      // as one row instead of one row per service line (rule 3). Each extra
      // "code:total:taken" becomes its own line-item row sharing this row's
      // Email/Phone/Program Name, exactly as if the operator had added
      // another row by hand — everything else about the package (price,
      // discount, dates, status) still comes from the row above only, since
      // the backend reads those fields from the FIRST line item of a group.
      if (!isBlankCell(row.additionalServiceLines)) {
        for (const part of String(row.additionalServiceLines).split(';')) {
          const [code, total, taken] = part.split(':').map((s) => (s ?? '').trim())
          if (!code && !total && !taken) continue
          enrollments.push({
            ...enrollmentRow,
            serviceCode: code || '',
            sessionsTotal: total || '',
            sessionsTaken: taken || '0',
            additionalServiceLines: '',
          })
        }
      }
    }
    // Same "don't silently drop it" treatment as the customer row above: a
    // row that's clearly attempting to be a Membership (has an Access Type,
    // Service Codes, Status, Billing Amount, etc. filled in) but is just
    // missing the Plan Name itself should still reach preflightCheck's
    // "Missing Membership Plan Name" error, not vanish with zero feedback.
    if (!isBlankCell(row.membershipPlanName) || looksLikeMembershipRow(row)) memberships.push(pick(row, 'membership'))
    if (!isBlankCell(row.lessonDate)) lessons.push(pick(row, 'lesson'))
    if (!isBlankCell(row.amount)) payments.push(pick(row, 'payment'))
  }

  return { customers, enrollments, memberships, lessons, payments }
}

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
// One sheet ("Import") for everything customer/enrollment/lesson/payment/
// membership-shaped, plus a second "Services" sheet since the catalog is a
// genuinely different shape (not one row per customer) — see the comment on
// UNIVERSAL_COLUMNS above. Two rows shown: the second illustrates a
// multi-service package (rule 3) by repeating the same customer/Program
// Name with a second Service Code line.
export function downloadSampleXlsx(filename = 'sample_migration_import.xlsx', level = 'history') {
  const columns = level === 'totals' ? UNIVERSAL_COLUMNS_TOTALS_ONLY : UNIVERSAL_COLUMNS
  const headers = columns.map((c) => c.headers[0])
  const row1 = columns.map((c) => c.sample ?? '')
  const row2 = columns.map((c) => {
    if (c.key === 'serviceCode') return 'WEDDING-60'
    if (c.key === 'sessionsTotal') return '2'
    if (['sessionsTaken', 'discountAmount', 'membershipSessionsTotal'].includes(c.key)) return c.sample ?? ''
    if (c.group === 'customer') return c.sample ?? '' // same customer repeated
    if (c.group !== 'enrollment') return '' // only the second Enrollments line item repeats
    return c.sample ?? ''
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, row1, row2]), 'Import')
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([SERVICE_COLUMNS.map((c) => c.headers[0]), SERVICE_COLUMNS.map((c) => c.sample ?? '')]),
    'Services',
  )
  XLSX.writeFile(workbook, filename)
}

/** Same shape as downloadSampleXlsx's "Import" sheet, as a single CSV. */
export function downloadUniversalSampleCsv(filename = 'sample_migration_import.csv', level = 'history') {
  downloadSampleCsv(level === 'totals' ? UNIVERSAL_COLUMNS_TOTALS_ONLY : UNIVERSAL_COLUMNS, filename)
}

// Mirrors DanceStudio-CRM-Backend/src/services/customerImport.service.js's
// exported REQUIRED_CUSTOMER_FIELDS / REQUIRED_ENROLLMENT_FIELDS /
// REQUIRED_LESSON_FIELDS / REQUIRED_PAYMENT_FIELDS EXACTLY. The backend is a
// separate ESM package with no shared build/import step into this Next.js
// frontend package, so these have to be a hand-mirrored copy rather than a
// real shared import — if you touch either list, touch both (search this
// comment on the backend side too; it points back here). Also mirrors the
// backend's *un-exported* consent-flag requirement (customerImport.service.js
// validateCustomerRow, ~:433) which previously had no client-side check at
// all, letting a whole customer row hard-fail server-side with nothing
// flagged in this preflight.
// No Legacy *ID field in any of these — rule 1: a row is matched to a
// person by Email/Phone, checked separately (see the "email or phone"
// checks below) since it's an either/or requirement, not a fixed column.
const REQUIRED_CUSTOMER_FIELDS = ['studio']
const REQUIRED_CUSTOMER_CONSENT_FIELDS = ['smsOptOut', 'emailUnsubscribed', 'doNotContact']
const REQUIRED_ENROLLMENT_FIELDS = ['programName']
const REQUIRED_LESSON_FIELDS = ['date']
const REQUIRED_PAYMENT_FIELDS = ['date', 'amount']

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

// --- Column mapping (the "we export whatever the old CRM produces, the app
// maps the columns" step) ------------------------------------------------
//
// rowsToCanonical above only matches a header that's an EXACT hit against
// one of a column's known aliases — which is exactly the "must pre-format
// to our template" pain the rework is meant to kill. The functions below add
// a scored fuzzy pass on top, for use by a mapping-review UI: the operator
// sees a best-guess mapping and confirms/corrects it once, rather than
// hand-renaming their old CRM's export to match our exact column names.

// Overlap-of-words score, 0-1: exact normalized match wins outright,
// substring containment ("client email" vs "email") scores high but not
// perfect, otherwise Jaccard similarity over whitespace-split tokens. No
// external fuzzy-matching library — this is intentionally simple/predictable
// so a studio's mapping is easy to reason about, not a black box.
export function scoreHeaderMatch(sourceHeader, candidateHeader) {
  const a = normalizeHeader(sourceHeader)
  const b = normalizeHeader(candidateHeader)
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.85
  const aWords = new Set(a.split(' ').filter(Boolean))
  const bWords = new Set(b.split(' ').filter(Boolean))
  if (!aWords.size || !bWords.size) return 0
  const overlap = [...aWords].filter((w) => bWords.has(w)).length
  const union = new Set([...aWords, ...bWords]).size
  return union ? overlap / union : 0
}

/**
 * Best-guess mapping from an arbitrary source header row to `columns`'
 * canonical keys. Returns { [key]: { sourceHeader, sourceIndex, confidence } }
 * — one entry per canonical key that found ANY plausible match (confidence
 * > 0); the caller decides its own confidence threshold for "auto-accept vs.
 * ask the operator to confirm" (confidence >= 0.6 is a reasonable default —
 * see MAPPING_CONFIDENT_THRESHOLD).
 */
export const MAPPING_CONFIDENT_THRESHOLD = 0.6

export function suggestColumnMapping(sourceHeaderRow, columns) {
  const sources = sourceHeaderRow.map((h, i) => ({ raw: h, index: i })).filter((s) => normalizeHeader(s.raw))
  const suggestion = {}
  for (const { key, headers } of columns) {
    let best = null
    for (const source of sources) {
      let score = 0
      for (const candidate of headers) score = Math.max(score, scoreHeaderMatch(source.raw, candidate))
      if (score > 0 && (!best || score > best.confidence)) {
        best = { sourceHeader: source.raw, sourceIndex: source.index, confidence: Math.round(score * 100) / 100 }
      }
    }
    if (best) suggestion[key] = best
  }
  return suggestion
}

/**
 * Converts raw 2D sheet rows into canonical row objects using an EXPLICIT,
 * operator-confirmed mapping ({ [key]: sourceIndex | null }) instead of
 * re-guessing — the mapping-review step's final "apply" action, after the
 * operator has seen and corrected suggestColumnMapping's guesses.
 */
export function applyColumnMapping(rawRows, headerRowIndex, columns, mapping) {
  const out = []
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const raw = rawRows[i] || []
    if (raw.every((cell) => String(cell ?? '').trim() === '')) continue // blank row
    const row = {}
    columns.forEach(({ key }) => {
      const idx = mapping[key]
      row[key] = idx !== undefined && idx !== null && raw[idx] !== undefined ? String(raw[idx]).trim() : ''
    })
    out.push(row)
  }
  return out
}

/**
 * Parses a CSV File into { rawRows, headerRowIndex, headerRow, suggestedMapping }
 * for the mapping-review step, instead of committing straight to
 * rowsToCanonical's exact-alias-only matching. Falls back to row 0 as the
 * header row (rather than throwing, like rowsToCanonical does) when nothing
 * scores well against the known aliases — an arbitrary old-CRM export's
 * headers may not match ANY alias closely, which is exactly the case this
 * step exists to handle; the operator maps it by hand instead of the file
 * being rejected outright.
 */
export function parseCsvFileForMapping(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rawRows = csvTextToRawRows(e.target.result)
        const detected = findHeaderRowIndex(rawRows, columns)
        const headerRowIndex = detected === -1 ? 0 : detected
        const headerRow = rawRows[headerRowIndex] || []
        resolve({ rawRows, headerRowIndex, headerRow, suggestedMapping: suggestColumnMapping(headerRow, columns) })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

/**
 * Single entry point for the one-file, one-sheet import: accepts either a
 * .csv or the first sheet of an .xlsx (preferring one literally named
 * "Import", to match the sample file), and returns the same
 * {rawRows, headerRowIndex, headerRow, suggestedMapping} shape
 * parseCsvFileForMapping does — the mapping-review step doesn't need to
 * know or care which file type the operator uploaded.
 */
export function parseFileForMapping(file, columns) {
  const isXlsx = /\.xlsx?$/i.test(file.name)
  if (!isXlsx) return parseCsvFileForMapping(file, columns)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const preferred = workbook.SheetNames.find((n) => n.trim().toLowerCase() === 'import')
        const sheetName = preferred || workbook.SheetNames[0]
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })
        const detected = findHeaderRowIndex(rawRows, columns)
        const headerRowIndex = detected === -1 ? 0 : detected
        const headerRow = rawRows[headerRowIndex] || []
        resolve({ rawRows, headerRowIndex, headerRow, suggestedMapping: suggestColumnMapping(headerRow, columns) })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Auto-picks up an optional extra sheet (by exact name, e.g. "Services")
 * from the SAME .xlsx the single combined "Import" sheet was uploaded from,
 * if present — downloadSampleXlsx bundles "Import" + "Services" into one
 * workbook, so a round-tripped copy of our own template has the Services
 * sheet sitting right there; without this, parseFileForMapping's own "Import"
 * sheet lookup silently ignores it and every serviceCode on the Enrollments/
 * Memberships sheets comes back "not found in the studio's catalog" even
 * though the operator's file DID include it. Only exact-header matches (like
 * every other un-mapped upload path) — a Services tab from a different
 * source with its own header wording should still go through the normal
 * separate Services upload + mapping-review flow instead. Resolves to `null`
 * for a CSV file or a workbook with no such sheet, never throws.
 */
export function parseXlsxSheetIfPresent(file, sheetName, columns) {
  const isXlsx = /\.xlsx?$/i.test(file.name)
  if (!isXlsx) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const match = workbook.SheetNames.find((n) => n.trim().toLowerCase() === sheetName.trim().toLowerCase())
        if (!match) { resolve(null); return }
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[match], { header: 1, raw: false, defval: '' })
        resolve(rowsToCanonical(rawRows, columns))
      } catch {
        // A malformed/irrelevant same-named sheet shouldn't block the main
        // Import sheet's own upload — just behave as if it wasn't there.
        resolve(null)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
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

// Rule 1 — mirrors the backend's computeCustomerKey/computeEnrollmentKey
// EXACTLY (see customerImport.service.js), so a "matched"/"duplicate" here
// means the same thing it will server-side. No sheet has an ID column
// anymore; a person is identified by Email (or Phone, if no email), and a
// package by that customer key + Program Name.
export function rowCustomerKey(row) {
  if (row.email) return `email:${String(row.email).trim().toLowerCase().replace(/\s+/g, ' ')}`
  if (row.phone) return `phone:${String(row.phone).replace(/\D/g, '')}`
  return ''
}
function rowEnrollmentKey(customerKey, programName) {
  return customerKey && programName ? `${customerKey}||${String(programName).trim().toLowerCase().replace(/\s+/g, ' ')}` : ''
}

/** Cheap client-side checks before hitting the network — catch obvious problems instantly. */
export function preflightCheck(customers, enrollments, lessons = [], payments = [], memberships = [], services = []) {
  const errors = []
  const seenCustomerIDs = new Set()
  const customerIDs = new Set()

  customers.forEach((row, i) => {
    const id = rowCustomerKey(row)
    if (!id) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Needs Email OR Phone to identify this customer' })
      return
    }
    if (seenCustomerIDs.has(id)) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Duplicate customer within this file (same Email/Phone as another row)' })
      return
    }
    seenCustomerIDs.add(id)
    customerIDs.add(id)
    // Studio — hard-required server-side (REQUIRED_CUSTOMER_FIELDS below was
    // declared to mirror the backend's own required-field list but was never
    // actually checked here, so a missing Studio only ever surfaced after a
    // round trip to the backend, with the row's data effectively wasted.
    const missingRequired = REQUIRED_CUSTOMER_FIELDS.filter((f) => row[f] === '' || row[f] === undefined)
    if (missingRequired.length) {
      errors.push({
        sheet: 'customers',
        rowIndex: i,
        message: `Missing required field(s): ${missingRequired.join(', ')}`,
        legacyCustomerID: id,
      })
    }
    // Consent flags — hard-required server-side (missing any one fails the
    // whole customer row), but previously never checked here, so the error
    // only ever surfaced after a round trip to the backend.
    const missingConsent = REQUIRED_CUSTOMER_CONSENT_FIELDS.filter((f) => row[f] === '' || row[f] === undefined)
    if (missingConsent.length) {
      errors.push({
        sheet: 'customers',
        rowIndex: i,
        message: `Consent flags (SMS Opt-Out / Email Unsubscribed / DNC) are required — missing: ${missingConsent.join(', ')}`,
        legacyCustomerID: id,
      })
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
  // relationship) — identified by partnerEmail/partnerPhone (rule 1), must
  // resolve to another row in this same file, not a blank/typo'd value and
  // not itself, or the two accounts stay disconnected exactly like an
  // unlinked import today.
  customers.forEach((row, i) => {
    if (!row.partnerEmail && !row.partnerPhone) return
    const ownID = rowCustomerKey(row)
    const partnerID = rowCustomerKey({ email: row.partnerEmail, phone: row.partnerPhone })
    if (partnerID === ownID) {
      errors.push({ sheet: 'customers', rowIndex: i, message: 'Partner Email/Phone cannot reference the same row', legacyCustomerID: ownID })
    } else if (!customerIDs.has(partnerID)) {
      errors.push({
        sheet: 'customers',
        rowIndex: i,
        message: "Partner's Email/Phone has no matching row in the Customers sheet",
        legacyCustomerID: ownID,
      })
    }
  })

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
      errors.push({ sheet: 'services', rowIndex: i, message: 'Missing Service Name' })
    }
    if (row.price !== '' && row.price !== undefined && Number.isNaN(Number(row.price))) {
      errors.push({ sheet: 'services', rowIndex: i, message: `Price "${row.price}" is not a number` })
    }
  })

  const enrollmentIDs = new Set()
  enrollments.forEach((row, i) => {
    const custKey = rowCustomerKey(row)
    const id = rowEnrollmentKey(custKey, row.programName)
    if (id) {
      // NOT a duplicate error (rule 3 — multiple rows sharing one customer +
      // Program Name are line items of the SAME multi-service package, not
      // rejected) — just tracked so Lessons/Payments can FK-check against it.
      enrollmentIDs.add(id)
    }
    if (!custKey || !customerIDs.has(custKey)) {
      errors.push({
        sheet: 'enrollments',
        rowIndex: i,
        message: 'Could not match this row to a customer in the Customers sheet (check Email/Phone)',
      })
    }
    // Required per REQUIRED_ENROLLMENT_FIELDS (mirrors the backend) but
    // previously never checked here — a blank Program Name hard-fails the
    // row server-side with no client-side warning beforehand.
    if (!row.programName) {
      errors.push({ sheet: 'enrollments', rowIndex: i, message: 'Missing Program Name', legacyCustomerID: custKey })
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
      ['sessionsTotal', 'Sessions Total'],
      ['sessionsTaken', 'Sessions Taken'],
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
    // Balance Due should reconcile to Final Amount minus Cash Collected — the
    // backend BLOCKS the row over this exact mismatch (rule 5's pre-commit
    // totals gate), but previously this was never checked client-side, so a
    // typo here only surfaced after a full round trip through Validate.
    // Mirrors customerImport.service.js's own finalAmount derivation (supplied
    // Final Amount wins; otherwise Contracted Value minus the discount above).
    if (row.balanceDue !== '' && row.balanceDue !== undefined && row.cashCollected !== '' && row.cashCollected !== undefined) {
      const contracted = Number(row.contractedValue) || 0
      const discount = Number(row.discountAmount) || 0
      const discountDollars = (row.discountType || '').toLowerCase() === 'percentage' ? contracted * (discount / 100) : discount
      const suppliedFinal = row.finalAmount !== '' && row.finalAmount !== undefined ? Number(row.finalAmount) : NaN
      const finalAmount = !Number.isNaN(suppliedFinal) ? suppliedFinal : contracted - discountDollars
      const cashCollected = Number(row.cashCollected) || 0
      const balanceDue = Number(row.balanceDue)
      if (!Number.isNaN(finalAmount) && !Number.isNaN(balanceDue) && Math.abs(finalAmount - cashCollected - balanceDue) > AGGREGATE_MISMATCH_TOLERANCE) {
        errors.push({
          sheet: 'enrollments',
          rowIndex: i,
          message: `Balance Due ($${balanceDue}) does not equal Final Amount ($${finalAmount.toFixed(2)}) minus Cash Collected ($${cashCollected})`,
        })
      }
    }
  })

  const seenMembershipIDs = new Set()
  memberships.forEach((row, i) => {
    const custKey = rowCustomerKey(row)
    const id = custKey && row.membershipPlanName ? `${custKey}||${String(row.membershipPlanName).trim().toLowerCase()}||${String(row.startDate || '').trim().toLowerCase()}` : ''
    if (id) {
      if (seenMembershipIDs.has(id)) {
        errors.push({ sheet: 'memberships', rowIndex: i, message: 'Duplicate row within this file — matches another membership for this same customer/plan/start date' })
      }
      seenMembershipIDs.add(id)
    }
    if (!custKey || !customerIDs.has(custKey)) {
      errors.push({
        sheet: 'memberships',
        rowIndex: i,
        message: 'Could not match this row to a customer in the Customers sheet (check Email/Phone)',
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
    const custKey = rowCustomerKey(row)
    const id = custKey ? `${custKey}|${String(row.date || '').trim()}|${String(row.type || '').trim().toLowerCase()}|${String(row.durationMinutes || '').trim()}` : ''
    if (id) {
      if (seenLessonIDs.has(id)) {
        errors.push({ sheet: 'lessons', rowIndex: i, message: 'Duplicate row within this file — matches another lesson for this same customer' })
      }
      seenLessonIDs.add(id)
    }
    if (!custKey || !customerIDs.has(custKey)) {
      errors.push({
        sheet: 'lessons',
        rowIndex: i,
        message: 'Could not match this row to a customer in the Customers sheet (check Email/Phone)',
      })
    }
    const enrollmentKey = rowEnrollmentKey(custKey, row.programName)
    if (enrollmentKey && !enrollmentIDs.has(enrollmentKey)) {
      errors.push({
        sheet: 'lessons',
        rowIndex: i,
        message: `Program Name "${row.programName}" does not match any enrollment for this customer in the Enrollments sheet`,
      })
    }
  })

  const seenPaymentIDs = new Set()
  payments.forEach((row, i) => {
    const custKey = rowCustomerKey(row)
    const id = custKey ? `${custKey}|${String(row.date || '').trim()}|${String(row.amount || '').trim()}|${String(row.type || '').trim().toLowerCase()}` : ''
    if (id) {
      if (seenPaymentIDs.has(id)) {
        errors.push({ sheet: 'payments', rowIndex: i, message: 'Duplicate row within this file — matches another payment for this same customer' })
      }
      seenPaymentIDs.add(id)
    }
    if (!custKey || !customerIDs.has(custKey)) {
      errors.push({
        sheet: 'payments',
        rowIndex: i,
        message: 'Could not match this row to a customer in the Customers sheet (check Email/Phone)',
      })
    }
    const enrollmentKey = rowEnrollmentKey(custKey, row.programName)
    if (enrollmentKey && !enrollmentIDs.has(enrollmentKey)) {
      errors.push({
        sheet: 'payments',
        rowIndex: i,
        message: `Program Name "${row.programName}" does not match any enrollment for this customer in the Enrollments sheet`,
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
      const k = rowCustomerKey(row)
      completedByCustomer.set(k, (completedByCustomer.get(k) || 0) + 1)
    }
    customers.forEach((row, i) => {
      const supplied = Number(row.privatesTaken) + Number(row.groupsTaken) + Number(row.partiesTaken) + Number(row.coachingTaken)
      if (!supplied) return
      const computed = completedByCustomer.get(rowCustomerKey(row)) || 0
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
      const k = rowCustomerKey(row)
      collectedByCustomer.set(k, (collectedByCustomer.get(k) || 0) + (Number(row.amount) || 0))
    }
    customers.forEach((row, i) => {
      const supplied = Number(row.lifetimeCollected)
      if (!supplied) return
      const computed = collectedByCustomer.get(rowCustomerKey(row)) || 0
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
  const studioByLegacyID = new Map(customers.map((c) => [rowCustomerKey(c), c.studio]))
  const byStudio = new Map()
  const getBucket = (studio) => {
    if (!byStudio.has(studio)) {
      byStudio.set(studio, { locationName: studio, sessionsRemaining: 0, contractedValue: 0, cashCollected: 0, balanceDue: 0 })
    }
    return byStudio.get(studio)
  }

  for (const row of enrollments) {
    const bucket = getBucket(studioByLegacyID.get(rowCustomerKey(row)) || 'Unknown')
    // Rule 2 — remaining is always computed (Total − Taken), never a direct
    // column, so this reconciliation can't silently drift from the backend's
    // own math.
    bucket.sessionsRemaining += Math.max((Number(row.sessionsTotal) || 0) - (Number(row.sessionsTaken) || 0), 0)
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
    payments.map((row) => rowEnrollmentKey(rowCustomerKey(row), row.programName)).filter(Boolean),
  )
  for (const row of enrollments) {
    const enrollmentKey = rowEnrollmentKey(rowCustomerKey(row), row.programName)
    if (enrollmentKey && enrollmentIDsWithPayments.has(enrollmentKey)) continue
    const bucket = getBucket(studioByLegacyID.get(rowCustomerKey(row)) || 'Unknown')
    bucket.cashCollected += Number(row.cashCollected) || 0
  }
  for (const row of payments) {
    const bucket = getBucket(studioByLegacyID.get(rowCustomerKey(row)) || 'Unknown')
    bucket.cashCollected += Number(row.amount) || 0
  }

  return Array.from(byStudio.values())
}

// --- Test-10 (Phase 4 — "Import 10 real customers first: a couple, a
// payment plan, a refund, someone with free lessons, someone inactive. Open
// all 10 profiles and check every number by hand.") -----------------------

/**
 * Picks up to `count` customer keys (rule 1 — the auto-computed Email/Phone
 * key, not an invented ID) that between them cover the doc's own checklist —
 * a couple, a payment-plan/deferred package, a refund, a free/$0 package, an
 * inactive customer — then fills any remaining slots with whichever
 * customers come first in the file, so the operator always gets a real
 * trial batch even on a small/simple file that doesn't hit every category.
 * A pure suggestion, not a requirement — the operator can always
 * check/uncheck rows by hand afterward.
 */
export function suggestTrialCustomers(customers, enrollments = [], payments = [], count = 10) {
  const picked = new Set()
  const byLegacyID = new Map(customers.map((c) => [rowCustomerKey(c), c]))
  const add = (key) => {
    if (key && byLegacyID.has(key) && picked.size < count) picked.add(key)
  }

  // A couple — either half links the pair.
  const couple = customers.find((c) => {
    const partnerKey = rowCustomerKey({ email: c.partnerEmail, phone: c.partnerPhone })
    return partnerKey && byLegacyID.has(partnerKey)
  })
  if (couple) {
    add(rowCustomerKey(couple))
    add(rowCustomerKey({ email: couple.partnerEmail, phone: couple.partnerPhone }))
  }

  // A payment-plan / deferred-billing package.
  const paymentPlan = enrollments.find((e) => ['payment_plan', 'flexible', 'pay_per_session'].includes(String(e.billingType || '').trim().toLowerCase()))
  if (paymentPlan) add(rowCustomerKey(paymentPlan))

  // A refund (negative amount, or explicit type).
  const refund = payments.find((p) => Number(p.amount) < 0 || String(p.type || '').trim().toLowerCase() === 'refund')
  if (refund) add(rowCustomerKey(refund))

  // A free/$0 package.
  const free = enrollments.find((e) => Number(e.contractedValue) === 0)
  if (free) add(rowCustomerKey(free))

  // Someone inactive.
  const inactive = customers.find((c) => String(c.status || '').trim().toLowerCase() === 'inactive')
  if (inactive) add(rowCustomerKey(inactive))

  // Fill the rest with whoever's first in the file.
  for (const c of customers) {
    if (picked.size >= count) break
    add(rowCustomerKey(c))
  }
  return Array.from(picked)
}

/**
 * Slices every sheet down to only the rows belonging to `customerKeys` (the
 * auto-computed Email/Phone keys from suggestTrialCustomers, or the
 * operator's own checkbox selection) — the actual trial-batch payload.
 * Services aren't customer-scoped (they're the shared booking catalog) so
 * they're passed through unfiltered; a trial enrollment referencing a
 * serviceCode still needs it resolvable.
 */
export function filterRowsByCustomerIDs({ customers, enrollments = [], services = [], memberships = [], lessons = [], payments = [] }, customerKeys) {
  const keys = new Set(customerKeys)
  const byCustomer = (row) => keys.has(rowCustomerKey(row))
  return {
    customers: customers.filter(byCustomer),
    enrollments: enrollments.filter(byCustomer),
    services,
    memberships: memberships.filter(byCustomer),
    lessons: lessons.filter(byCustomer),
    payments: payments.filter(byCustomer),
  }
}
