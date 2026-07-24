import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutstandingBalanceTable } from '../OutstandingBalanceTable'

const rows = [
  {
    id: 'stu-1',
    studentName: 'Jane Doe',
    studioName: 'Downtown',
    teacherName: 'Alex Kim',
    programName: 'Bronze Package',
    originalSaleAmount: 1000,
    successfulPayments: 400,
    credits: 0,
    refundAdjustments: 0,
    outstandingBalance: 600,
  },
]

describe('OutstandingBalanceTable', () => {
  it('renders a row with the computed outstanding balance', () => {
    render(<OutstandingBalanceTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('600')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<OutstandingBalanceTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No outstanding balances found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<OutstandingBalanceTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Jane Doe'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
