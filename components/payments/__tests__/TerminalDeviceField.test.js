import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TerminalDeviceField from '../TerminalDeviceField'

vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))
import api from '@/lib/api'

vi.mock('@/app/settings/payments/clover/useCloverDevices', () => ({
  useCloverDevices: vi.fn(() => ({ devices: [], loading: false })),
}))
import { useCloverDevices } from '@/app/settings/payments/clover/useCloverDevices'

const props = { method: 'terminal', locationID: 'loc-1', deviceID: '', onDeviceChange: vi.fn() }

describe('TerminalDeviceField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCloverDevices.mockReturnValue({ devices: [], loading: false })
  })

  it('preselects a Stripe reader when it is the only one', async () => {
    api.get.mockResolvedValue({ success: true, data: [{ _id: 'r1', label: 'Front desk' }] })
    render(<TerminalDeviceField {...props} />)

    await waitFor(() => expect(props.onDeviceChange).toHaveBeenCalledWith('r1'))
  })

  it('preselects a Clover device when it is the only one', async () => {
    useCloverDevices.mockReturnValue({ devices: [{ _id: 'd1', name: 'Mini' }], loading: false })
    render(<TerminalDeviceField {...props} />)

    await waitFor(() => expect(props.onDeviceChange).toHaveBeenCalledWith('d1'))
  })

  it('makes staff choose when there are several', async () => {
    api.get.mockResolvedValue({ success: true, data: [{ _id: 'r1', label: 'A' }, { _id: 'r2', label: 'B' }] })
    render(<TerminalDeviceField {...props} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    expect(props.onDeviceChange).not.toHaveBeenCalled()
  })

  it('never overrides a terminal that is already chosen', async () => {
    api.get.mockResolvedValue({ success: true, data: [{ _id: 'r1', label: 'A' }] })
    render(<TerminalDeviceField {...props} deviceID="r1" />)

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    expect(props.onDeviceChange).not.toHaveBeenCalled()
  })

  it('does nothing when the method is not terminal', () => {
    api.get.mockResolvedValue({ success: true, data: [{ _id: 'r1' }] })
    render(<TerminalDeviceField {...props} method="cash" />)

    expect(props.onDeviceChange).not.toHaveBeenCalled()
  })
})
