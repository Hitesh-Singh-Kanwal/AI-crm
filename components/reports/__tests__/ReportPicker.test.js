import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportPicker } from '../ReportPicker'

describe('ReportPicker', () => {
  it('renders a link for each report plus Overview', () => {
    render(<ReportPicker activeSlug="sales-cash" />)

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/reports')
    expect(screen.getByRole('link', { name: 'Sales and Cash' })).toHaveAttribute('href', '/reports/sales-cash')
    expect(screen.getByRole('link', { name: 'Outstanding Balance' })).toHaveAttribute('href', '/reports/outstanding-balance')
    expect(screen.getByRole('link', { name: 'Payment Plan' })).toHaveAttribute('href', '/reports/payment-plan')
    expect(screen.getByRole('link', { name: 'Revenue by Teacher' })).toHaveAttribute('href', '/reports/revenue-by-teacher')
    expect(screen.getByRole('link', { name: 'Lead Conversion' })).toHaveAttribute('href', '/reports/lead-conversion')
    expect(screen.getByRole('link', { name: 'Active and Inactive Students' })).toHaveAttribute('href', '/reports/active-inactive-students')
  })

  it('marks the active report link with aria-current', () => {
    render(<ReportPicker activeSlug="sales-cash" />)
    expect(screen.getByRole('link', { name: 'Sales and Cash' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })
})
