import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ default: api }))
vi.mock('@/components/layout/MainLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
const playSound = vi.hoisted(() => vi.fn())
vi.mock('@/lib/notificationSounds', () => ({ playIncomingRing: playSound }))

import NotificationSettingsPage from '../page'

function signIn() {
  localStorage.setItem('crm_user_session', JSON.stringify({ token: 't', user: { _id: 'u1', role: 'admin' } }))
}

beforeEach(() => {
  localStorage.clear()
  signIn()
  vi.clearAllMocks()
  api.get.mockResolvedValue({ success: true, data: { 'humanQueue.sound': false } })
})

describe('Notification settings page', () => {
  it('loads the saved preferences into the switches', async () => {
    render(<NotificationSettingsPage />)
    const sound = await screen.findByRole('switch', { name: 'Sound when a lead is waiting' })
    expect(sound).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Confirmations' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves a change straight away and caches it on the session', async () => {
    api.put.mockResolvedValue({ success: true, data: { 'humanQueue.sound': false, 'toast.error': false } })
    render(<NotificationSettingsPage />)
    fireEvent.click(await screen.findByRole('switch', { name: 'Errors and warnings' }))

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/auth/notification-preferences', { 'toast.error': false }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('crm_user_session')).user.notificationPreferences['toast.error']).toBe(false)
  })

  it('undoes the switch and says so when the save fails', async () => {
    api.put.mockResolvedValue({ success: false, error: 'boom' })
    render(<NotificationSettingsPage />)
    const confirmations = await screen.findByRole('switch', { name: 'Confirmations' })
    fireEvent.click(confirmations)

    expect(await screen.findByRole('alert')).toHaveTextContent(/undone/)
    expect(screen.getByRole('switch', { name: 'Confirmations' })).toHaveAttribute('aria-checked', 'true')
  })

  it('turning everything off disables the individual switches without changing them', async () => {
    api.put.mockResolvedValue({ success: true, data: { all: false, 'humanQueue.sound': false } })
    render(<NotificationSettingsPage />)
    fireEvent.click(await screen.findByRole('switch', { name: 'All notifications' }))

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/auth/notification-preferences', { all: false }))
    const confirmations = screen.getByRole('switch', { name: 'Confirmations' })
    expect(confirmations).toBeDisabled()
    expect(confirmations).toHaveAttribute('aria-checked', 'true')
  })

  it('also controls the new-task indicator, and clicking anywhere on a row flips its switch', async () => {
    api.put.mockResolvedValue({ success: true, data: { 'tasks.badge': false } })
    render(<NotificationSettingsPage />)
    const row = (await screen.findByText('New task indicator')).closest('div[class*="cursor-pointer"]')
    fireEvent.click(row)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/auth/notification-preferences', { 'tasks.badge': false }))
  })

  it('previews the sound, but only while that alert is on', async () => {
    render(<NotificationSettingsPage />) // sound is saved as OFF in beforeEach
    const sample = await screen.findByRole('button', { name: 'Play sample sound' })
    expect(sample).toBeDisabled()

    api.put.mockResolvedValue({ success: true, data: {} })
    fireEvent.click(screen.getByRole('switch', { name: 'Sound when a lead is waiting' }))
    await waitFor(() => expect(sample).not.toBeDisabled())
    fireEvent.click(sample)
    expect(playSound).toHaveBeenCalledTimes(1)
  })

  it('warns that failures will be silent when error messages are turned off', async () => {
    api.put.mockResolvedValue({ success: true, data: { 'toast.error': false } })
    render(<NotificationSettingsPage />)
    fireEvent.click(await screen.findByRole('switch', { name: 'Errors and warnings' }))
    expect(await screen.findByText(/will not show any message/)).toBeInTheDocument()
  })

  it('says so and offers a retry when saved settings cannot be loaded', async () => {
    api.get.mockResolvedValueOnce({ success: false, error: 'down' })
    render(<NotificationSettingsPage />)
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument()

    api.get.mockResolvedValueOnce({ success: true, data: { 'humanQueue.sound': false } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument())
  })
})
