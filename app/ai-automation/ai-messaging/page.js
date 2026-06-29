'use client'

import { Suspense, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Tabs } from '@/components/ui/tabs'
import DocumentLibraryTab from './components/DocumentLibraryTab'
import SmsPromptTab from './components/SmsPromptTab'

const VALID_VIEWS = ['prompt', 'knowledge-base', 'playbook']

function AiMessagingPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawView = searchParams?.get('view')
  const activeTab = VALID_VIEWS.includes(rawView) ? rawView : 'prompt'

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const subtitle = useMemo(() => {
    if (activeTab === 'knowledge-base') {
      return 'Manage studio knowledge base documents the AI messaging agent can retrieve facts from.'
    }
    if (activeTab === 'playbook') {
      return 'Manage conversation playbooks so the AI messaging agent matches your tone and pacing.'
    }
    return 'Manage system prompts for the AI messaging agent.'
  }, [activeTab])

  return (
    <MainLayout title="AI Messaging" subtitle={subtitle}>
      <div className="flex h-full min-h-full flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-full w-full flex-col">
          <SmsPromptTab activeView={activeTab} />
          <DocumentLibraryTab
            activeView={activeTab}
            tabValue="knowledge-base"
            endpoint="/api/knowledge-base"
            heading="Knowledge base"
            subheading="Upload studio PDFs (locations, classes, pricing, policies) the AI agent can reference."
            entityLabel="document"
            entityPlural="documents"
            requireActive
          />
          <DocumentLibraryTab
            activeView={activeTab}
            tabValue="playbook"
            endpoint="/api/conversational-playbook"
            heading="Conversation playbook"
            subheading="Upload example conversation PDFs so the AI agent matches your studio's tone and pacing."
            entityLabel="playbook"
            entityPlural="playbooks"
          />
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
