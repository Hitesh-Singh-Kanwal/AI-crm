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

const pkgLesson = (id, sessionNumber, customerID = 'paul') => ({
  _id: id,
  startDateTime: `2026-10-${10 + sessionNumber}T22:50:00.000Z`,
  chargeMethod: 'package',
  packageBillingType: 'flexible',
  payment: { collected: false },
  calendarServiceID: { serviceCode: 'PL' },
  customerIDs: [customerID],
  charges: [{ customerID, method: 'package', serviceCode: 'PL', enrollmentID: starterEnrollment, sessionNumber }],
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
      services: [{ serviceCode: 'PL', sessionsUsed: 1, sessionsRemaining: 4, pricePerSession: 100, finalAmount: 500, ...svc }],
    },
  })
  const lesson = (enrollment, sessionNumber, extra = {}) => ({
    _id: 'x', startDateTime: '2026-10-01T10:00:00Z', chargeMethod: 'package',
    packageBillingType: enrollment.package.billingType, calendarServiceID: { serviceCode: 'PL' }, customerIDs: ['s1'],
    charges: [{ customerID: 's1', method: 'package', serviceCode: 'PL', enrollmentID: enrollment, sessionNumber }],
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
    expect(r.sessionsRemaining).toBe(4)
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

  it("a student with no charge does not inherit a classmate's package", () => {
    const ctx = buildPackageSessionOrder([ev])
    expect(resolveEventPayment(ev, { ...ctx, customerID: 'cat' }).paid).toBe(false)
    expect(resolveEventPayment({ ...ev, chargeMethod: 'direct' }, { ...ctx, customerID: 'cat' }).paid).toBe(false)
  })
})
