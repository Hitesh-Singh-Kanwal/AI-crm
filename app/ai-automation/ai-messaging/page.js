'use client'

import { Suspense, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Tabs } from '@/components/ui/tabs'
import EmbeddingsTab from './components/EmbeddingsTab'
import SmsPromptTab from './components/SmsPromptTab'

function AiMessagingPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawView = searchParams?.get('view')
  const activeTab = rawView === 'prompt' ? 'prompt' : 'embeddings'

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const subtitle = useMemo(() => {
    if (activeTab === 'prompt') {
      return 'Manage system prompts for the AI SMS agent. Use Embeddings for studio PDFs and playbook.'
    }
    return 'Studio PDFs for messaging agents and playbook embeddings — switch to Prompt for SMS system prompts.'
  }, [activeTab])

  return (
    <MainLayout title="AI Messaging" subtitle={subtitle}>
      <div className="flex h-full min-h-full flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-full w-full flex-col">
          <EmbeddingsTab />
          <SmsPromptTab activeView={activeTab} />
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default function AiMessagingPage() {
  return (
    <Suspense fallback={null}>
      <AiMessagingPageInner />
    </Suspense>
  )
}
