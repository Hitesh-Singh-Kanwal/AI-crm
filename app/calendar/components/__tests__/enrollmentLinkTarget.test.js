import { describe, it, expect } from 'vitest'
import { enrollmentLinkTarget } from '../NewEnrollmentPackageInline'

// A "Share Link" enrollment must link to what would have been collected now — never the
// whole balance when a plan already schedules the rest.
describe('enrollmentLinkTarget', () => {
  it('one-time links the whole package balance', () => {
    expect(enrollmentLinkTarget({ billingType: 'one_time' }, 'enr-1', null)).toEqual({
      kind: 'package',
      enrollmentID: 'enr-1',
    })
  })

  it('payment plan links the first pending installment', () => {
    const plan = { _id: 'plan-1', installments: [{ status: 'paid' }, { status: 'pending' }] }
    expect(enrollmentLinkTarget({ billingType: 'payment_plan' }, 'enr-1', plan)).toEqual({
      kind: 'installment',
      paymentPlanID: 'plan-1',
      installmentIndex: 1,
    })
    expect(enrollmentLinkTarget({ billingType: 'payment_plan' }, 'enr-1', null)).toBeNull()
  })

  it('flexible links only the initial payment', () => {
    const payload = { billingType: 'flexible', billing: { initialAmount: '150' } }
    expect(enrollmentLinkTarget(payload, 'enr-1', null)).toEqual({
      kind: 'package',
      enrollmentID: 'enr-1',
      amount: 150,
    })
  })
})
