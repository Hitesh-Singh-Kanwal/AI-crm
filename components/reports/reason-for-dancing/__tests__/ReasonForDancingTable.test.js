import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReasonForDancingTable } from '../ReasonForDancingTable'

const rows = [
  {
    id: 'cust-1',
    studentName: 'Jane Doe',
    type: 'Customer',
    reasonForDancing: 'Wedding',
    studioName: 'Downtown',
    dateCreated: '2026-06-01',
  },
]

describe('ReasonForDancingTable', () => {
  it('renders a row with the reason', () => {
    render(<ReasonForDancingTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Wedding')).toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<ReasonForDancingTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No leads or students found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<ReasonForDancingTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Jane Doe'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
