import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentPlanTable } from '../PaymentPlanTable'

const rows = [
  {
    id: 'plan-1',
    studentName: 'Jane Doe',
    studioName: 'Downtown',
    teacherName: 'Alex Kim',
    programName: 'Bronze Package',
    planTotal: 1200,
    installmentsPaid: 3,
    installmentsRemaining: 9,
    nextDueDate: '2026-08-01',
    paymentStatus: 'On Track',
  },
]

describe('PaymentPlanTable', () => {
  it('renders a row with installment progress', () => {
    render(<PaymentPlanTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('On Track')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<PaymentPlanTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No payment plans found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<PaymentPlanTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Jane Doe'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
