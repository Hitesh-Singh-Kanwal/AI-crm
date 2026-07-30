import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupAttendanceTable } from '../GroupAttendanceTable'

const rows = [
  {
    id: 'event-1',
    className: 'Adult Ballet',
    classDate: '2026-07-21T10:30:00.000Z',
    teacherName: 'rachel',
    attended: 1,
    studentCount: 1,
    students: [
      {
        id: 'event-1_cust-1',
        studentName: 'Ronaldinho',
        attended: true,
        paymentSource: 'Package',
        paymentStatus: 'Paid',
      },
    ],
  },
]

describe('GroupAttendanceTable', () => {
  it('renders class rows with attended count and formatted date', () => {
    render(<GroupAttendanceTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Adult Ballet')).toBeInTheDocument()
    expect(screen.getByText('rachel')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.queryByText('2026-07-21T10:30:00.000Z')).not.toBeInTheDocument()
    expect(screen.queryByText('Ronaldinho')).not.toBeInTheDocument()
  })

  it('expands to show students who attended', async () => {
    const user = userEvent.setup()
    render(<GroupAttendanceTable rows={rows} onRowClick={vi.fn()} />)
    await user.click(screen.getByLabelText('Expand students'))
    expect(screen.getByText('Ronaldinho')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('Package')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<GroupAttendanceTable rows={[]} onRowClick={vi.fn()} />)
    expect(
      screen.getByText('No group class attendance found for the selected filters.'),
    ).toBeInTheDocument()
  })

  it('calls onRowClick with the class row when clicked', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    render(<GroupAttendanceTable rows={rows} onRowClick={onRowClick} />)
    await user.click(screen.getByText('Adult Ballet'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
