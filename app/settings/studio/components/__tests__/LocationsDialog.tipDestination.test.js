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

describe('LocationsDialog — tip destination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.put.mockResolvedValue({ success: true, data: { ...location } })
  })

  it('offers both destinations and defaults to crediting the enrollment teacher', async () => {
    renderDialog()

    const teacherOption = await screen.findByRole('radio', { name: /Enrollment teacher/i })
    const poolOption = screen.getByRole('radio', { name: /Tip pool/i })

    expect(teacherOption).toHaveAttribute('aria-checked', 'true')
    expect(poolOption).toHaveAttribute('aria-checked', 'false')
  })

  it('reflects a location already set to pool', async () => {
    renderDialog({ tipDestination: 'pool' })

    const poolOption = await screen.findByRole('radio', { name: /Tip pool/i })
    expect(poolOption).toHaveAttribute('aria-checked', 'true')
  })

  // The whole feature hangs on this value actually reaching the API — it was
  // silently dropped by the controller's field whitelist until that was fixed.
  it('sends the chosen destination when saving', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(await screen.findByRole('radio', { name: /Tip pool/i }))
    expect(screen.getByRole('radio', { name: /Tip pool/i })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: /^Save/i }))

    await waitFor(() => expect(api.put).toHaveBeenCalled())
    const [url, payload] = api.put.mock.calls[0]
    expect(url).toBe('/api/location/loc-1')
    expect(payload.tipDestination).toBe('pool')
  })
})
