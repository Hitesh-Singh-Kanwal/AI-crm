'use client'

import { Toaster } from 'sonner'
import { InboxHeaderProvider } from '@/contexts/InboxHeaderContext'

export default function Providers({ children }) {
  return (
    <InboxHeaderProvider>
      {children}
      <Toaster position="top-right" richColors />
    </InboxHeaderProvider>
  )
}

