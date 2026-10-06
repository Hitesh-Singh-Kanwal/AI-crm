'use client'

import { toast as sonnerToast } from 'sonner'
import { isNotificationEnabled } from '@/lib/notificationPreferences'

// Per-user preference: success/info pop-ups and error pop-ups are separate
// switches (plus the master one), checked at the moment the toast is raised.
const allowed = (kind) => isNotificationEnabled(kind === 'error' ? 'toast.error' : 'toast.success')

/**
 * Toast utility using Sonner.
 *
 * Accepts EITHER shape:
 *   toast.error('Could not save the customer.')          // string
 *   toast.error({ title: 'Save failed', message: '...' }) // object
 *
 * Both are in use across the app — roughly 450 object-form calls and 257
 * string-form ones. The hook previously destructured `({ title, message })`
 * unconditionally, and destructuring a string yields undefined for both, so every
 * string-form call rendered as a bare "Error" / "Success" with the actual reason
 * dropped. Normalising here fixes all of them without touching the call sites.
 */
function normalize(input, fallbackTitle) {
  // A string is the message itself — show it as the headline rather than burying
  // it under a generic title, which is what the caller clearly intended.
  if (typeof input === 'string') return [input || fallbackTitle, undefined]
  if (input && typeof input === 'object') {
    return [input.title || input.message || fallbackTitle, input.title ? input.message : undefined]
  }
  return [fallbackTitle, undefined]
}

export function useToast() {
  return {
    success: (input) => {
      if (!allowed('success')) return
      const [title, description] = normalize(input, 'Success')
      sonnerToast.success(title, description ? { description } : undefined)
    },
    error: (input) => {
      if (!allowed('error')) return
      const [title, description] = normalize(input, 'Error')
      sonnerToast.error(title, description ? { description } : undefined)
    },
    info: (input) => {
      if (!allowed('info')) return
      const [title, description] = normalize(input, 'Info')
      sonnerToast.info(title, description ? { description } : undefined)
    },
  }
}

// Direct export for use outside components. Sonner's own (title, options) signature.
export const toast = {
  success: (title, options) => allowed('success') && sonnerToast.success(title, options),
  error: (title, options) => allowed('error') && sonnerToast.error(title, options),
  info: (title, options) => allowed('info') && sonnerToast.info(title, options),
}
