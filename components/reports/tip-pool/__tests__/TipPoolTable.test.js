import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TipPoolTable, TIP_POOL_COLUMNS } from '../TipPoolTable'

const row = {
  id: 'tip-1',
  transactionDate: '2026-09-19T15:00:00.000Z',
  studentName: 'Jane Doe',
  studioName: 'Downtown Studio',
  paymentMethod: 'card',
  collectedBy: 'Alex Kim',
  amount: 18,
}

describe('TipPoolTable', () => {
  it('renders a pooled tip across every column', () => {
    render(<TipPoolTable rows={[row]} />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Downtown Studio')).toBeInTheDocument()
    expect(screen.getByText('Alex Kim')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  // The pool is empty for two very different reasons — no tips yet, or the
  // location is still set to credit teachers. The empty state has to name the
  // second one or staff conclude the feature is broken.
  it('explains why the pool may be empty', () => {
    render(<TipPoolTable rows={[]} />)
    expect(screen.getByText(/No pooled tips/i)).toBeInTheDocument()
    expect(screen.getByText(/Settings → Studio → Locations/)).toBeInTheDocument()
  })

  it('exposes the amount column as a total so the shell can sum it', () => {
    const amount = TIP_POOL_COLUMNS.find((c) => c.key === 'amount')
    expect(amount.total).toBe(true)
  })
})
