import { describe, expect, it } from 'vitest'
import { buildPackageSessionOrder, resolveEventPayment } from '../event-payment'

// Shape of a real "Starter 5 - Individual" flexible enrollment: $725 contract,
// $155 collected — enough for one private lesson at its $145 discounted rate.
const starterEnrollment = {
  _id: 'enr1',
  package: {
    billingType: 'flexible',
    paymentStatus: 'partial',
    totalPaid: 725,
    amountCollected: 155,
    services: [
      { serviceCode: 'PL', sessionsUsed: 1, sessionsRemaining: 4, pricePerSession: 155, finalAmount: 725 },
      { serviceCode: 'GRP', sessionsUsed: 0, sessionsRemaining: 5, pricePerSession: 30, finalAmount: 0 },
    ],
  },
}

// A booked lesson is already counted in its package's sessionsUsed (the backend
// deducts at booking), so a lesson at position N means at least N are booked.
const withBooked = (enrollment, booked) => ({
  ...enrollment,
  package: {
    ...enrollment.package,
    services: enrollment.package.services.map((s, i) => {
      if (i > 0) return s
      const total = s.sessionsTotal ?? s.sessionsUsed + s.sessionsRemaining
      const used = Math.max(s.sessionsUsed, booked || 0)
      return { ...s, sessionsTotal: total, sessionsUsed: used, sessionsRemaining: Math.max(0, total - used) }
    }),
  },
})

const pkgLesson = (id, sessionNumber, customerID = 'paul') => ({
  _id: id,
  startDateTime: `2026-10-${10 + sessionNumber}T22:50:00.000Z`,
  chargeMethod: 'package',
  packageBillingType: 'flexible',
  payment: { collected: false },
  calendarServiceID: { serviceCode: 'PL' },
  customerIDs: [customerID],
  charges: [{ customerID, method: 'package', serviceCode: 'PL', enrollmentID: withBooked(starterEnrollment, sessionNumber), sessionNumber }],
})

describe('resolveEventPayment', () => {
  it('a flexible package lesson the collected money covers is paid', () => {
    expect(resolveEventPayment(pkgLesson('e1', 1)).paid).toBe(true)
  })

  it('the next lesson on the same package is not covered yet', () => {
    expect(resolveEventPayment(pkgLesson('e2', 2)).paid).toBe(false)
  })

  it('falls back to booking order when the charge has no sessionNumber stamp', () => {
    const a = pkgLesson('a', 1)
    const b = pkgLesson('b', 2)
    // Both bookings exist, so the package counts two booked sessions for each.
    a.charges[0].enrollmentID = b.charges[0].enrollmentID
    a.charges[0].sessionNumber = null
    b.charges[0].sessionNumber = null
    const ctx = buildPackageSessionOrder([a, b])
    expect(resolveEventPayment(a, ctx).paid).toBe(true)
    expect(resolveEventPayment(b, ctx).paid).toBe(false)
  })

  it('a direct-paid trial and a migrated lesson are paid', () => {
    expect(resolveEventPayment({ chargeMethod: 'direct', charges: [{ customerID: 'paul', method: 'direct' }] }).paid).toBe(true)
    expect(resolveEventPayment({ importBatchID: 'b1', chargeMethod: 'none', charges: [] }).paid).toBe(true)
  })

  it('judges each student in a mixed group lesson by their own charge', () => {
    const ev = pkgLesson('g1', 2)
    ev.chargeMethod = 'mixed'
    ev.customerIDs = ['paul', 'ann']
    ev.charges.push({ customerID: 'ann', method: 'direct', amount: 30 })
    expect(resolveEventPayment(ev, { customerID: 'paul' }).paid).toBe(false)
    expect(resolveEventPayment(ev, { customerID: 'ann' }).paid).toBe(true)
  })

  it('a lesson covered by an active membership is paid', () => {
    const ev = { chargeMethod: 'none', calendarServiceID: { serviceCode: 'PL' }, customerIDs: ['paul'], charges: [] }
    expect(resolveEventPayment(ev, { membershipCoverageSet: new Set(['paul::PL']) }).paid).toBe(true)
    expect(resolveEventPayment(ev).paid).toBe(false)
  })
})

// One case per payment mode the backend can store (calendarEvent.model.js).
describe('resolveEventPayment — every payment mode', () => {
  const pkg = (billingType, paymentStatus, amountCollected, totalPaid, svc = {}) => ({
    _id: `enr-${billingType}-${paymentStatus}`,
    package: {
      billingType, paymentStatus, amountCollected, totalPaid,
      services: [{ serviceCode: 'PL', sessionsTotal: 5, sessionsUsed: 1, sessionsRemaining: 4, pricePerSession: 100, finalAmount: 500, ...svc }],
    },
  })
  const lesson = (enrollment, sessionNumber, extra = {}) => ({
    _id: 'x', startDateTime: '2026-10-01T10:00:00Z', chargeMethod: 'package',
    packageBillingType: enrollment.package.billingType, calendarServiceID: { serviceCode: 'PL' }, customerIDs: ['s1'],
    charges: [{ customerID: 's1', method: 'package', serviceCode: 'PL', enrollmentID: withBooked(enrollment, sessionNumber), sessionNumber }],
    ...extra,
  })
  const paid = (ev, opts) => resolveEventPayment(ev, opts).paid

  it('one_time: paid package covers every session it holds; an unpaid one covers none', () => {
    expect(paid(lesson(pkg('one_time', 'paid', 500, 500), 5))).toBe(true)
    expect(paid(lesson(pkg('one_time', 'unpaid', 0, 500), 1))).toBe(false)
  })

  it('one_time: booked past the sessions it holds is unpaid', () => {
    expect(paid(lesson(pkg('one_time', 'paid', 500, 500), 6))).toBe(false)
  })

  it('payment_plan: sessions accrue from the instalments collected so far', () => {
    expect(paid(lesson(pkg('payment_plan', 'partial', 200, 500), 2))).toBe(true)
    expect(paid(lesson(pkg('payment_plan', 'partial', 200, 500), 3))).toBe(false)
  })

  it('pay_per_session: settled package is paid', () => {
    expect(paid(lesson(pkg('pay_per_session', 'paid', 500, 500), 1))).toBe(true)
  })

  it('a free (fully discounted) package service has nothing to pay', () => {
    expect(paid(lesson(pkg('one_time', 'unpaid', 0, 0, { finalAmount: 0, pricePerSession: 0 }), 1))).toBe(true)
  })

  it('credits, direct and membership charges are paid; an uncharged lesson is not', () => {
    for (const method of ['credits', 'direct', 'membership']) {
      expect(paid({ chargeMethod: method, customerIDs: ['s1'], charges: [{ customerID: 's1', method }] })).toBe(true)
    }
    expect(paid({ chargeMethod: 'none', customerIDs: ['s1'], charges: [] })).toBe(false)
  })

  it('a payment recorded on the lesson itself makes it paid', () => {
    expect(paid({ chargeMethod: 'none', customerIDs: ['s1'], charges: [], payment: { collected: true } })).toBe(true)
    expect(paid(lesson(pkg('flexible', 'partial', 0, 500), 1, { payment: { collected: true } }))).toBe(true)
  })

  it('a migrated lesson is paid but keeps its session details for the calendar card', () => {
    const r = resolveEventPayment(lesson(pkg('flexible', 'partial', 0, 500), 2, { importBatchID: 'b1' }))
    expect(r.paid).toBe(true)
    expect(r.pkgSessionNumber).toBe(2)
    expect(r.sessionsRemaining).toBe(3) // 5-session package, this lesson (#2) booked
  })
})

describe('resolveEventPayment — group lessons, per student', () => {
  // Real case ("Tailgate Party"): the second student's own $20/$20 package must
  // be found even though another student's package charge comes first.
  const bronze = { _id: 'bronze', package: { billingType: 'one_time', paymentStatus: 'paid', amountCollected: 3190, totalPaid: 3190, services: [{ serviceCode: 'PP', sessionsUsed: 5, sessionsRemaining: 6, pricePerSession: 20, finalAmount: 220 }] } }
  const party = { _id: 'party', package: { billingType: 'one_time', paymentStatus: 'paid', amountCollected: 20, totalPaid: 20, services: [{ serviceCode: 'PP', sessionsUsed: 1, sessionsRemaining: 0, pricePerSession: 20, finalAmount: 20 }] } }
  const ev = {
    _id: 'tailgate', startDateTime: '2026-10-09T23:40:00Z', chargeMethod: 'mixed', packageBillingType: null,
    calendarServiceID: { serviceCode: 'PP' }, customerIDs: ['ann', 'bob', 'cat'],
    charges: [
      { customerID: 'ann', method: 'package', serviceCode: 'PP', enrollmentID: bronze, sessionNumber: null },
      { customerID: 'bob', method: 'package', serviceCode: 'PP', enrollmentID: party, sessionNumber: null },
    ],
  }

  it("each student's own package pool decides their status", () => {
    const ctx = buildPackageSessionOrder([ev])
    expect(resolveEventPayment(ev, { ...ctx, customerID: 'bob' }).paid).toBe(true)
    expect(resolveEventPayment(ev, { ...ctx, customerID: 'ann' }).paid).toBe(true)
  })

  // A 30-class group pass, booked into many classes at once. Stamped positions can
  // run high (bookings are numbered in the order staff made them), but while the
  // paid credit covers everything booked, every class is paid.
  const pass = (amountCollected, used) => ({
    _id: 'pass',
    package: {
      billingType: 'flexible', paymentStatus: amountCollected >= 900 ? 'paid' : 'partial', amountCollected, totalPaid: 900,
      services: [{ serviceCode: 'GRP', sessionsTotal: 30, sessionsUsed: used, sessionsRemaining: 30 - used, pricePerSession: 30, finalAmount: 900 }],
    },
  })
  const grpClass = (enrollment, sessionNumber) => ({
    _id: 'latin', startDateTime: '2026-10-26T23:40:00Z', chargeMethod: 'package', packageBillingType: 'flexible',
    calendarServiceID: { serviceCode: 'GRP' }, customerIDs: ['ann'],
    charges: [{ customerID: 'ann', method: 'package', serviceCode: 'GRP', enrollmentID: enrollment, sessionNumber }],
  })

  it('a fully paid group pass with credit left is paid, whatever its stamped position', () => {
    expect(resolveEventPayment(grpClass(pass(900, 10), 26), { customerID: 'ann' }).paid).toBe(true)
  })

  it('a half-paid group pass is paid while its credit covers what is booked', () => {
    // $450 of $900 = 15 paid classes; 12 booked -> credit 3 left.
    expect(resolveEventPayment(grpClass(pass(450, 12), 12), { customerID: 'ann' }).paid).toBe(true)
  })

  it('once bookings run past the paid credit, the classes beyond it are unpaid', () => {
    // 15 paid, 18 booked: class 15 is still paid, class 16 onwards is not.
    expect(resolveEventPayment(grpClass(pass(450, 18), 15), { customerID: 'ann' }).paid).toBe(true)
    expect(resolveEventPayment(grpClass(pass(450, 18), 16), { customerID: 'ann' }).paid).toBe(false)
  })

  it("'N left' is the paid credit still unbooked on this service, not the sessions held", () => {
    // Real case (Allie): $1470 of $4350 paid; Group Class gets 820.8/4350 of it = 3.38
    // classes, 4 booked -> no paid class left, though 6 sessions remain on the line.
    const allie = {
      _id: 'allie',
      package: {
        billingType: 'flexible', paymentStatus: 'partial', amountCollected: 1470, totalPaid: 4350,
        services: [
          { serviceCode: 'PL', sessionsTotal: 30, sessionsUsed: 3, sessionsRemaining: 27, pricePerSession: 82.08, finalAmount: 2462.4 },
          { serviceCode: 'GRP', sessionsTotal: 10, sessionsUsed: 4, sessionsRemaining: 6, pricePerSession: 82.08, finalAmount: 820.8 },
          { serviceCode: 'PP', sessionsTotal: 13, sessionsUsed: 0, sessionsRemaining: 13, pricePerSession: 82.08, finalAmount: 1066.8 },
        ],
      },
    }
    const r = resolveEventPayment(grpClass(allie, 4), { customerID: 'ann' })
    expect(r.creditBalance).toBe(0)
    expect(r.paid).toBe(false)
    // A fully paid 30-class pass with 10 booked has 20 paid classes left.
    expect(resolveEventPayment(grpClass(pass(900, 10), 10), { customerID: 'ann' }).creditBalance).toBe(20)
  })

  it("a group class uses the Group Class line's credits, not another service's", () => {
    // Private lessons fully paid; the group-class line has no money on it yet.
    const mixed = {
      _id: 'mixed',
      package: {
        billingType: 'flexible', paymentStatus: 'partial', amountCollected: 300, totalPaid: 1200,
        services: [
          { serviceCode: 'PL', sessionsTotal: 3, sessionsUsed: 0, sessionsRemaining: 3, pricePerSession: 100, finalAmount: 300 },
          { serviceCode: 'GRP', sessionsTotal: 30, sessionsUsed: 1, sessionsRemaining: 29, pricePerSession: 30, finalAmount: 900 },
        ],
      },
    }
    // $300 of $1200 split by net price: GRP gets 900/1200 = $225 -> 7.5 classes, 1 booked.
    expect(resolveEventPayment(grpClass(mixed, 1), { customerID: 'ann' }).paid).toBe(true)
    // A charge for a service the package doesn't hold has no credit to draw on.
    const other = grpClass(mixed, 1)
    other.charges[0].serviceCode = 'PP'
    expect(resolveEventPayment(other, { customerID: 'ann' }).sessionsRemaining).toBe(null)
  })

  it("a student with no charge does not inherit a classmate's package", () => {
    const ctx = buildPackageSessionOrder([ev])
    expect(resolveEventPayment(ev, { ...ctx, customerID: 'cat' }).paid).toBe(false)
    expect(resolveEventPayment({ ...ev, chargeMethod: 'direct' }, { ...ctx, customerID: 'cat' }).paid).toBe(false)
  })
})
