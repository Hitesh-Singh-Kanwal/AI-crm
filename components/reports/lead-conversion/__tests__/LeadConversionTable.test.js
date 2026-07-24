import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadConversionTable } from '../LeadConversionTable'

const rows = [
  {
    id: 'lead-1',
    leadName: 'Sam Rivera',
    leadSource: 'website',
    dateCreated: '2026-06-01',
    dateBooked: '2026-06-03',
    dateOfIntro: '2026-06-10',
    showed: true,
    sold: true,
    saleAmount: 500,
    teacherAssigned: 'Alex Kim',
    timeToConvert: '9 days',
  },
]

describe('LeadConversionTable', () => {
  it('renders a row and formats booleans as Yes/No', () => {
    render(<LeadConversionTable rows={rows} onRowClick={vi.fn()} />)
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument()
    expect(screen.getAllByText('Yes')).toHaveLength(2)
  })

  it('shows an empty state when there are no rows', () => {
    render(<LeadConversionTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No leads found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when clicked', async () => {
    const onRowClick = vi.fn()
    render(<LeadConversionTable rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Sam Rivera'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
