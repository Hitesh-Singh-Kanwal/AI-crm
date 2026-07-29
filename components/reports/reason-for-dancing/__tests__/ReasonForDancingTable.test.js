import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReasonForDancingTable } from '../ReasonForDancingTable'

const rows = [
  {
    id: 'reason:Wedding',
    reason: 'Wedding',
    studentCount: 3,
    totalSales: 1200,
    cashCollected: 800,
    conversionPct: 67,
    studioName: 'Downtown',
  },
]

describe('ReasonForDancingTable', () => {
  it('renders a row with the reason and metrics', () => {
    render(<ReasonForDancingTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Reason')).toBeInTheDocument()
    expect(screen.getByText('Wedding')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1200')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<ReasonForDancingTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No reasons found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<ReasonForDancingTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Wedding'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
