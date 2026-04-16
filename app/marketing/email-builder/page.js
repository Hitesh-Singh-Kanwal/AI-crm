'use client'

import { Suspense, useMemo, useState } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Tabs } from '@/components/ui/tabs'
import EmailTemplatesTab from './components/EmailTemplatesTab'
import EmailBuilderTab from './components/EmailBuilderTab'
import EmailAnalyticsTab from './components/EmailAnalyticsTab'
import GlobalLoader from '@/components/shared/GlobalLoader'

function EmailsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') || 'templates'
  const [dataVersion, setDataVersion] = useState(0)

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const tabValue = useMemo(() => activeTab, [activeTab])

  return (
    <MainLayout title="Email Builder" subtitle="Create and send beautiful email campaigns">
      {/* Tabs provider only (no duplicate visible tab list here). */}
      <div className="h-full min-h-full flex flex-col">
      <Tabs value={tabValue} onValueChange={setActiveTab} className="w-full h-full min-h-full flex flex-col">
        <EmailTemplatesTab
          dataVersion={dataVersion}
          onDataChanged={() => setDataVersion((v) => v + 1)}
          onCreateNew={() => setActiveTab('builder')}
        />
        <EmailBuilderTab
          onCreated={() => {
            setDataVersion((v) => v + 1)
            setActiveTab('templates')
          }}
        />
        <EmailAnalyticsTab />
      </Tabs>
      </div>
    </MainLayout>
  )
}

export default function EmailsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="Email Builder" subtitle="Create and send beautiful email campaigns">
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" />
          </div>
        </MainLayout>
      }
    >
      <EmailsPageInner />
    </Suspense>
  )
}
