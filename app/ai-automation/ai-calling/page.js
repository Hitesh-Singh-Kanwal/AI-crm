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
import AiAssistTab from './components/AiAssistTab'

function extractPersonasPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload) ? payload : payload?.personas
  const pagination = payload?.pagination || payload?.data?.pagination || result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
    totalPages: pagination?.totalPages ?? pagination?.pages,
  }
}

function AICallingPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('view') || 'scripts'
  const [personas, setPersonas] = useState([])
  const [personasLoading, setPersonasLoading] = useState(false)
  const [personasError, setPersonasError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [personasPage, setPersonasPage] = useState(1)
  const [personasTotalPages, setPersonasTotalPages] = useState(1)
  const [personasTotal, setPersonasTotal] = useState(0)
  const [personasSearchQuery, setPersonasSearchQuery] = useState('')
  const [debouncedPersonasSearch, setDebouncedPersonasSearch] = useState('')
  const toast = useToast()

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPersonasSearch(personasSearchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [personasSearchQuery])

  useEffect(() => {
    setPersonasPage(1)
  }, [debouncedPersonasSearch])

  const fetchPersonas = async () => {
    try {
      setPersonasLoading(true)
      setPersonasError(null)

      const params = new URLSearchParams({
        page: String(personasPage),
        limit: '9',
      })
      if (debouncedPersonasSearch) params.set('search', debouncedPersonasSearch)

      const result = await api.get(`/api/ai-persona?${params.toString()}`)
      if (result.success) {
        const { list, total, totalPages: totalPagesFromApi } = extractPersonasPayload(result)
        const nextTotalPages = Math.max(1, totalPagesFromApi ?? Math.ceil((total || 0) / 9))
        if (personasPage > nextTotalPages) {
          setPersonasPage(nextTotalPages)
          return
        }
        setPersonas(list)
        setPersonasTotal(total)
        setPersonasTotalPages(nextTotalPages)
      } else {
        setPersonasError(result.error || 'Failed to fetch AI personas')
      }
    } catch (error) {
      setPersonasError(error.message || 'Something went wrong while fetching personas')
    } finally {
      setPersonasLoading(false)
    }
  }

  useEffect(() => {
    fetchPersonas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personasPage, debouncedPersonasSearch])

  const handleDeletePersona = async (id) => {
    try {
      setDeletingId(id)
      const result = await api.delete(`/api/ai-persona/${id}`)
      if (result.success) {
        setPersonas((prev) => prev.filter((persona) => persona._id !== id))
        setPersonasTotal((t) => Math.max(0, (t || 0) - 1))
        toast.success({ title: 'Persona removed', message: 'AI persona has been deleted.' })

        // If we deleted the last item on the page, go back a page (if possible) so the grid doesn't go empty.
        if (personas.length === 1 && personasPage > 1) {
          setPersonasPage((p) => Math.max(1, p - 1))
        }
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
      <div className="h-full min-h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full min-h-full flex flex-col">
        <ScriptsTab />
        <PersonasTab
          personas={personas}
          personasLoading={personasLoading}
          personasError={personasError}
          deletingId={deletingId}
          onDeletePersona={handleDeletePersona}
          currentPage={personasPage}
          totalPages={personasTotalPages}
          totalCount={personasTotal}
          onPrevPage={() => setPersonasPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setPersonasPage((p) => Math.min(personasTotalPages, p + 1))}
          onPageChange={(page) => setPersonasPage(page)}
          onRefresh={fetchPersonas}
          searchQuery={personasSearchQuery}
          onSearchQueryChange={setPersonasSearchQuery}
        />
        <KnowledgeBaseTab />
        <AiAssistTab />
      </Tabs>
      </div>
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
