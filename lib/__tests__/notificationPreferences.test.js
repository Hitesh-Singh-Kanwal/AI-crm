import { describe, it, expect, vi, beforeEach } from 'vitest'

const sonner = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: sonner }))

import { isNotificationEnabled, resolvePreferences, getNotificationPreferences } from '../notificationPreferences'
import { useToast, toast } from '@/components/ui/toast'

function signIn(notificationPreferences) {
  localStorage.setItem(
    'crm_user_session',
    JSON.stringify({ token: 't', user: { _id: 'u1', role: 'admin', notificationPreferences } })
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('notification preferences', () => {
  it('treats every unset preference as ON, so existing users see no change', () => {
    signIn(undefined)
    expect(getNotificationPreferences()['toast.success']).toBe(true)
    expect(isNotificationEnabled('humanQueue.sound')).toBe(true)
    expect(resolvePreferences({}).all).toBe(true)
  })

  it('respects an individual switch', () => {
    signIn({ 'humanQueue.sound': false })
    expect(isNotificationEnabled('humanQueue.sound')).toBe(false)
    expect(isNotificationEnabled('dashboard.urgentBanner')).toBe(true)
  })

  it('the master switch silences everything but remembers the individual choices', () => {
    signIn({ all: false, 'toast.error': true })
    expect(isNotificationEnabled('toast.error')).toBe(false)
    expect(getNotificationPreferences()['toast.error']).toBe(true)
  })

  it('is ON when nobody is signed in rather than throwing', () => {
    expect(isNotificationEnabled('toast.success')).toBe(true)
  })
})

describe('toasts follow the preferences', () => {
  it('suppresses success and info toasts but still shows errors when only confirmations are off', () => {
    signIn({ 'toast.success': false })
    const t = useToast()
    t.success('Saved')
    t.info('FYI')
    t.error('Failed')
    expect(sonner.success).not.toHaveBeenCalled()
    expect(sonner.info).not.toHaveBeenCalled()
    expect(sonner.error).toHaveBeenCalledWith('Failed', undefined)
  })

  it('suppresses everything with the master switch, including the direct toast export', () => {
    signIn({ all: false })
    const t = useToast()
    t.success('Saved')
    t.error('Failed')
    toast.success('x')
    toast.error('y')
    expect(sonner.success).not.toHaveBeenCalled()
    expect(sonner.error).not.toHaveBeenCalled()
  })

  it('shows toasts normally by default', () => {
    signIn(undefined)
    useToast().success('Saved')
    expect(sonner.success).toHaveBeenCalledWith('Saved', undefined)
  })
})
