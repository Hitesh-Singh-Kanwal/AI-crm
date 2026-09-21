import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SavedCardField from '../SavedCardField'

vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))
import api from '@/lib/api'

const CARDS = [
  { id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 4, expYear: 2029, savedAt: '2026-09-12T10:00:00.000Z' },
  { id: 'pm_2', brand: 'mastercard', last4: '8210', expMonth: 11, expYear: 2027, savedAt: null },
]

const props = {
  method: 'saved_card',
  locationID: 'loc-1',
  customerID: 'cust-1',
  cardToken: '',
  onCardChange: vi.fn(),
}

describe('SavedCardField', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing unless the saved-card method is chosen', () => {
    const { container } = render(<SavedCardField {...props} method="cash" />)
    expect(container).toBeEmptyDOMElement()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('lists the customer saved cards for this location', async () => {
    api.get.mockResolvedValue({ success: true, data: CARDS })
    render(<SavedCardField {...props} />)

    await waitFor(() => expect(screen.getByRole('option', { name: /VISA •••• 4242/ })).toBeInTheDocument())
    expect(screen.getByRole('option', { name: /exp 04\/29/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /MASTERCARD •••• 8210/ })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith(
      '/api/payments/stripe/customers/cust-1/cards?locationID=loc-1',
    )
  })

  // Otherwise staff face a blank dropdown with no clue why, and no way to fix it.
  it('explains that a card is only saved after a reader payment', async () => {
    api.get.mockResolvedValue({ success: true, data: [] })
    render(<SavedCardField {...props} />)

    await waitFor(() => expect(screen.getByText(/No saved cards for this customer/)).toBeInTheDocument())
    expect(screen.getByText(/first time they pay on a Stripe reader/)).toBeInTheDocument()
  })

  // A single card is not a choice — preselect it so the charge cannot be submitted
  // with nothing attached.
  it('auto-selects when there is exactly one card', async () => {
    const onCardChange = vi.fn()
    api.get.mockResolvedValue({ success: true, data: [CARDS[0]] })
    render(<SavedCardField {...props} onCardChange={onCardChange} />)

    await waitFor(() => expect(onCardChange).toHaveBeenCalledWith('pm_1'))
  })

  // Two cards can read identically without it; the date is what tells them apart.
  it('shows when a card was saved', async () => {
    api.get.mockResolvedValue({ success: true, data: CARDS })
    render(<SavedCardField {...props} />)

    await waitFor(() => expect(screen.getByRole('option', { name: /saved 12 Sep/ })).toBeInTheDocument())
  })

  it('omits the date for a card that has none, rather than printing Invalid Date', async () => {
    api.get.mockResolvedValue({ success: true, data: [CARDS[1]] })
    render(<SavedCardField {...props} />)

    const option = await screen.findByRole('option', { name: /MASTERCARD/ })
    expect(option.textContent).not.toMatch(/saved|Invalid/)
  })

  it('does not auto-select when there is a real choice to make', async () => {
    const onCardChange = vi.fn()
    api.get.mockResolvedValue({ success: true, data: CARDS })
    render(<SavedCardField {...props} onCardChange={onCardChange} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    expect(onCardChange).not.toHaveBeenCalled()
  })

  it('says so when the customer has no location to charge against', () => {
    render(<SavedCardField {...props} locationID={null} />)
    expect(screen.getByText(/No location on this customer/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })
})
