import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ReportDrillPanel } from '../ReportDrillPanel'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
import { api } from '@/lib/api'

describe('ReportDrillPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches detail for the record and renders it via renderDetail', async () => {
    api.get.mockResolvedValue({ success: true, data: { studentName: 'Jane Doe' } })

    render(
      <ReportDrillPanel
        open
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId="txn-1"
        title="Transaction Detail"
        renderDetail={(detail) => <div>{detail.studentName}</div>}
      />
    )

    expect(api.get).toHaveBeenCalledWith('/api/reports/sales-cash/txn-1')
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
  })

  it('does not fetch when closed', () => {
    render(
      <ReportDrillPanel
        open={false}
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId="txn-1"
        title="Transaction Detail"
        renderDetail={() => null}
      />
    )

    expect(api.get).not.toHaveBeenCalled()
  })

  it('shows loading state before data resolves', async () => {
    let resolvePromise
    api.get.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))

    render(
      <ReportDrillPanel
        open
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId="txn-1"
        title="Transaction Detail"
        renderDetail={(detail) => <div>{detail.studentName}</div>}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    resolvePromise({ success: true, data: { studentName: 'Jane Doe' } })
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
  })

  it('shows an error message when the fetch fails', async () => {
    api.get.mockResolvedValue({ success: false, error: 'Boom' })

    render(
      <ReportDrillPanel
        open
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId="txn-1"
        title="Transaction Detail"
        renderDetail={() => null}
      />
    )

    await waitFor(() => expect(screen.getByText('Boom')).toBeInTheDocument())
  })

  it('does not fetch when recordId is missing', () => {
    render(
      <ReportDrillPanel
        open
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId={null}
        title="Transaction Detail"
        renderDetail={() => null}
      />
    )

    expect(api.get).not.toHaveBeenCalled()
  })

  it('renders nothing in the DOM when closed', () => {
    const { container } = render(
      <ReportDrillPanel
        open={false}
        onClose={vi.fn()}
        reportSlug="sales-cash"
        recordId="txn-1"
        title="Transaction Detail"
        renderDetail={() => null}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
