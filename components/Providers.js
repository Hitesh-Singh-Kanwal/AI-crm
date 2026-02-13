'use client'

import { ToastProvider } from '@/components/ui/toast'

export default function Providers({ children }) {
  return <ToastProvider>{children}</ToastProvider>
}

