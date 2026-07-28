import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RevenueByTeacherTable } from '../RevenueByTeacherTable'

const rows = [
  {
    id: 'teacher-1',
    entityName: 'Alex Kim',
    totalLessons: 40,
    activeStudents: 12,
    revenueGenerated: 15000,
    introConversions: 5,
    programUpgrades: 2,
    retentionPct: 80,
    avgLessonsPerStudent: 3.3,
  },
]

describe('RevenueByTeacherTable', () => {
  it('renders a row with revenue and retention metrics', () => {
    render(<RevenueByTeacherTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Alex Kim')).toBeInTheDocument()
    expect(screen.getByText('15000')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<RevenueByTeacherTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No revenue data found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<RevenueByTeacherTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Alex Kim'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
