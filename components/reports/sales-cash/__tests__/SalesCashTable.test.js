import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesCashTable } from '../SalesCashTable'

const rows = [
  {
    id: 'txn-1',
    transactionType: 'New Sale',
    studentName: 'Jane Doe',
    teacherName: 'Alex Kim',
    studioName: 'Downtown',
    transactionDate: '2026-07-01',
    saleAmount: 500,
    cashCollected: 200,
    tipAmount: 0,
    discountAmount: 0,
    refundAmount: 0,
    programName: 'Bronze Package',
    paymentMethod: 'card',
    paymentStatus: 'Partial',
    remainingBalance: 300,
  },
]

describe('SalesCashTable', () => {
  it('renders a row per transaction with key fields', () => {
    render(<SalesCashTable rows={rows} onRowClick={vi.fn()} />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('New Sale')).toBeInTheDocument()
    expect(screen.getByText('Bronze Package')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<SalesCashTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No transactions found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when a row is clicked', async () => {
    const onRowClick = vi.fn()
    render(<SalesCashTable rows={rows} onRowClick={onRowClick} />)

    await userEvent.click(screen.getByText('Jane Doe'))

    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
