import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationsDialog from '../LocationsDialog'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))
import api from '@/lib/api'

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const location = {
  _id: 'loc-1',
  name: 'Downtown Studio',
  address: '1 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '73301',
  email: 'downtown@studio.test',
  timezone: 'America/Chicago',
  status: 'active',
  operatingHours: [],
}

function renderDialog(overrides = {}) {
  return render(
    <LocationsDialog
      open
      onClose={vi.fn()}
      locations={[{ ...location, ...overrides }]}
      onRefresh={vi.fn()}
      initialLocationId="loc-1"
    />,
  )
}

describe('LocationsDialog — lesson confirmation channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.put.mockResolvedValue({ success: true, data: { ...location } })
  })

  // Locations saved before this setting existed have no value — they must read as text,
  // which is what the backend senders default to as well.
  it('defaults to text message', async () => {
    renderDialog()

    expect(await screen.findByRole('radio', { name: /Text message/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /^Email/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('sends the chosen channel when saving', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(await screen.findByRole('radio', { name: /^Email/i }))
    await user.click(screen.getByRole('button', { name: /^Save/i }))

    await waitFor(() => expect(api.put).toHaveBeenCalled())
    const [url, payload] = api.put.mock.calls[0]
    expect(url).toBe('/api/location/loc-1')
    expect(payload.lessonMessageChannel).toBe('email')
  })
})
