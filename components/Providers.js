'use client'

import { SWRConfig } from 'swr'
import { Toaster } from 'sonner'
import { InboxHeaderProvider } from '@/contexts/InboxHeaderContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { analyticsSwrConfig } from '@/lib/hooks/useAnalyticsOverview'

function ThemedToaster() {
  const { theme, mounted } = useTheme()
  return (
    <Toaster
      position="top-right"
      richColors
      theme={mounted ? theme : 'light'}
    />
  )
}

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <SWRConfig value={analyticsSwrConfig}>
        <InboxHeaderProvider>
          {children}
          <ThemedToaster />
        </InboxHeaderProvider>
      </SWRConfig>
    </ThemeProvider>
  )
}
