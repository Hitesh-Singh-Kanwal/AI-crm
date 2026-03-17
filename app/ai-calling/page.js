'use client'

import { useEffect, useState, Suspense } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Tabs } from '@/components/ui/tabs'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import ScriptsTab from './components/ScriptsTab'
import PersonasTab from './components/PersonasTab'
import KnowledgeBaseTab from './components/KnowledgeBaseTab'

function AICallingPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('view') || 'scripts'
  const [personas, setPersonas] = useState([])
  const [personasLoading, setPersonasLoading] = useState(false)
  const [personasError, setPersonasError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        setPersonasLoading(true)
        setPersonasError(null)

        const result = await api.get('/api/ai-persona')
        if (result.success && Array.isArray(result.data)) {
          setPersonas(result.data)
        } else {
          setPersonasError(result.error || 'Failed to fetch AI personas')
        }
      } catch (error) {
        setPersonasError(error.message || 'Something went wrong while fetching personas')
      } finally {
        setPersonasLoading(false)
      }
    }

    fetchPersonas()
  }, [])

  const handleDeletePersona = async (id) => {
    try {
      setDeletingId(id)
      const result = await api.delete(`/api/ai-persona/${id}`)
      if (result.success) {
        setPersonas((prev) => prev.filter((persona) => persona._id !== id))
        toast.success({ title: 'Persona removed', message: 'AI persona has been deleted.' })
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete persona.' })
      }
    } catch (error) {
      console.error(error)
      toast.error({ title: 'Error', message: 'Something went wrong.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <MainLayout title="AI Calling" subtitle="Manage AI-powered calling scripts and personas">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScriptsTab />
        <PersonasTab
          personas={personas}
          personasLoading={personasLoading}
          personasError={personasError}
          deletingId={deletingId}
          onDeletePersona={handleDeletePersona}
        />
        <KnowledgeBaseTab />
      </Tabs>
    </MainLayout>
  )
}

export default function AICallingPage() {
  return (
    <Suspense fallback={null}>
      <AICallingPageInner />
    </Suspense>
  )
}

