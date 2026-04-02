'use client'

import { Suspense, useMemo, useState } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Tabs } from '@/components/ui/tabs'
import SmsTemplatesTab from './components/SmsTemplatesTab'
import SmsCreatorTab from './components/SmsCreatorTab'
import SmsAnalyticsTab from './components/SmsAnalyticsTab'
import GlobalLoader from '@/components/shared/GlobalLoader'

function SMSPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') || 'templates'
  const [creatorInitial, setCreatorInitial] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const tabValue = useMemo(() => activeTab, [activeTab])

  return (
    <MainLayout title="SMS Campaigns" subtitle="Create and send SMS messages">
      {/* Tabs provider only (no visible tab list here). */}
      <Tabs value={tabValue} onValueChange={setActiveTab} className="w-full">
        <SmsTemplatesTab
          dataVersion={dataVersion}
          onDataChanged={() => setDataVersion((v) => v + 1)}
          onCreateNew={() => {
            setCreatorInitial(null)
            setActiveTab('creator')
          }}
        />
        <SmsCreatorTab
          initialTemplate={creatorInitial}
          dataVersion={dataVersion}
          onCreated={() => {
            setDataVersion((v) => v + 1)
            setActiveTab('templates')
          }}
        />
        <SmsAnalyticsTab />
      </Tabs>
    </MainLayout>
  )
}

export default function SMSPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="SMS Campaigns" subtitle="Create and send SMS messages">
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" />
          </div>
        </MainLayout>
      }
    >
      <SMSPageInner />
    </Suspense>
  )
}

