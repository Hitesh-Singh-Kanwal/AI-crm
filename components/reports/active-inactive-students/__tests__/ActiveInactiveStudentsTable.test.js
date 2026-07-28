import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveInactiveStudentsTable } from '../ActiveInactiveStudentsTable'

const rows = [
  {
    id: 'stu-1',
    studentName: 'Jane Doe',
    teacherName: 'Alex Kim',
    studioName: 'Downtown',
    status: 'Active',
    lastLessonDate: '2026-07-10',
    nextLessonDate: '2026-07-24',
    lessonsTaken: 12,
    lessonsRemaining: 3,
    totalSpend: 1500,
    programType: 'Bronze',
  },
]

describe('ActiveInactiveStudentsTable', () => {
  it('renders a row with status', () => {
    render(<ActiveInactiveStudentsTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<ActiveInactiveStudentsTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No students found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<ActiveInactiveStudentsTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Jane Doe'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
