import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupAttendanceTable } from '../GroupAttendanceTable'

const rows = [
  {
    id: 'event-1_cust-1',
    className: 'Adult Ballet Group Class',
    classDate: '2026-07-01',
    teacherName: 'Alex Kim',
    studentName: 'Jane Doe',
    attended: true,
    paymentSource: 'Membership',
    paymentStatus: 'Paid',
  },
]

describe('GroupAttendanceTable', () => {
  it('renders a row and formats attended as Yes/No', () => {
    render(<GroupAttendanceTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<GroupAttendanceTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No group class attendance found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<GroupAttendanceTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Jane Doe'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
