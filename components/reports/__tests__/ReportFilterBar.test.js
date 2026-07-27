import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportFilterBar } from '../ReportFilterBar'

const baseFilters = { dateFrom: '', dateTo: '', studioId: '', teacherId: '', programId: '', leadSource: '' }

describe('ReportFilterBar', () => {
  it('renders a studio option and calls onChange with the selected studioId', async () => {
    const onChange = vi.fn()
    render(
      <ReportFilterBar
        filters={baseFilters}
        onChange={onChange}
        studios={[{ id: 'studio-1', label: 'Downtown Studio' }]}
        teachers={[]}
        programs={[]}
        leadSources={[]}
      />
    )

    await userEvent.selectOptions(screen.getByLabelText('Studio'), 'studio-1')

    expect(onChange).toHaveBeenCalledWith({ ...baseFilters, studioId: 'studio-1' })
  })

  it('hides the lead source filter when showLeadSource is false', () => {
    render(
      <ReportFilterBar
        filters={baseFilters}
        onChange={vi.fn()}
        studios={[]}
        teachers={[]}
        programs={[]}
        leadSources={[]}
        showLeadSource={false}
      />
    )

    expect(screen.queryByLabelText('Lead Source')).not.toBeInTheDocument()
  })

  it('shows the lead source filter by default and calls onChange with leadSource', async () => {
    const onChange = vi.fn()
    render(
      <ReportFilterBar
        filters={baseFilters}
        onChange={onChange}
        studios={[]}
        teachers={[]}
        programs={[]}
        leadSources={[{ id: 'referral', label: 'Referral' }]}
      />
    )

    const select = screen.getByLabelText('Lead Source')
    await userEvent.selectOptions(select, 'referral')

    expect(onChange).toHaveBeenCalledWith({ ...baseFilters, leadSource: 'referral' })
  })

  it('propagates a custom date range from DateRangePresets', async () => {
    const onChange = vi.fn()
    render(
      <ReportFilterBar
        filters={baseFilters}
        onChange={onChange}
        studios={[]}
        teachers={[]}
        programs={[]}
        leadSources={[]}
      />
    )

    await userEvent.click(screen.getByTitle('Custom date range'))
    const [fromInput, toInput] = screen.getAllByDisplayValue('')
    await userEvent.type(fromInput, '2026-01-01')
    await userEvent.type(toInput, '2026-01-31')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange).toHaveBeenCalledWith({ ...baseFilters, dateFrom: '2026-01-01', dateTo: '2026-01-31' })
  })
})
