'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, PhoneCall, ListChecks, CheckCircle2, User, FileText, Bot } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from '@/components/ui/toast'

const WIZARD_LEADS_PAGE_SIZE = 10
const WIZARD_PERSONAS_PAGE_SIZE = 8
const WIZARD_ASSISTANTS_PAGE_SIZE = 8

const DEFAULT_ASSISTANT_OPTIONS = {
  firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
  firstMessage: 'Hello.',
  voiceMessage: 'Hey, I tried calling you!',
  backgroundSound: 'office', // 'office' | null
  endCallMessage: 'Goodbye.',
}

function getAssistantPrimaryFileId(assistant) {
  if (Array.isArray(assistant?.fileID)) return String(assistant.fileID[0] || '')
  if (Array.isArray(assistant?.fileIDies)) return String(assistant.fileIDies[0] || '')
  return String(assistant?.fileID || assistant?.fileIDies || '')
}

export default function MakeCallsPage() {
  const [wizardStep, setWizardStep] = useState(1) // 1: contacts, 2: persona, 3: script, 4: review
  const [launching, setLaunching] = useState(false)

  // Leads selection (reusing Leads tab API)
  const [wizardLeads, setWizardLeads] = useState([])
  const [wizardLeadsTotal, setWizardLeadsTotal] = useState(0)
  const [wizardLeadsPage, setWizardLeadsPage] = useState(1)
  const [wizardLeadsLoading, setWizardLeadsLoading] = useState(false)
  const [wizardLeadsSearch, setWizardLeadsSearch] = useState('')
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectedLeadsData, setSelectedLeadsData] = useState([])

  // Personas selection (reusing AI Calling personas API)
  const [personas, setPersonas] = useState([])
  const [personasTotal, setPersonasTotal] = useState(0)
  const [personasPage, setPersonasPage] = useState(1)
  const [personasLoading, setPersonasLoading] = useState(false)
  const [personasError, setPersonasError] = useState(null)
  const [selectedPersonaId, setSelectedPersonaId] = useState(null)
  const [setupMode, setSetupMode] = useState('manual') // manual | assistant
  const [assistants, setAssistants] = useState([])
  const [assistantsTotal, setAssistantsTotal] = useState(0)
  const [assistantsPage, setAssistantsPage] = useState(1)
  const [assistantsLoading, setAssistantsLoading] = useState(false)
  const [assistantsError, setAssistantsError] = useState(null)
  const [selectedAssistantId, setSelectedAssistantId] = useState(null)
  const [scripts, setScripts] = useState([])
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [scriptsError, setScriptsError] = useState(null)
  const [selectedScriptId, setSelectedScriptId] = useState(null)
  const [knowledgeFiles, setKnowledgeFiles] = useState([])
  const [knowledgeFilesLoading, setKnowledgeFilesLoading] = useState(false)
  const [knowledgeFilesError, setKnowledgeFilesError] = useState(null)
  const [selectedKnowledgeFileId, setSelectedKnowledgeFileId] = useState('')
  const [firstMessageMode, setFirstMessageMode] = useState(DEFAULT_ASSISTANT_OPTIONS.firstMessageMode)
  const [firstMessage, setFirstMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.firstMessage)
  const [voiceMessage, setVoiceMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
  const [backgroundSound, setBackgroundSound] = useState(DEFAULT_ASSISTANT_OPTIONS.backgroundSound)
  const [endCallMessage, setEndCallMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.endCallMessage)

  const wizardLeadsTotalPages = Math.max(
    1,
    Math.ceil((wizardLeadsTotal || 0) / WIZARD_LEADS_PAGE_SIZE)
  )
  const personasTotalPages = Math.max(
    1,
    Math.ceil((personasTotal || 0) / WIZARD_PERSONAS_PAGE_SIZE)
  )
  const assistantsTotalPages = Math.max(
    1,
    Math.ceil((assistantsTotal || 0) / WIZARD_ASSISTANTS_PAGE_SIZE)
  )

  const loadWizardLeads = useCallback(
    async (page, query) => {
      setWizardLeadsLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(WIZARD_LEADS_PAGE_SIZE),
        })
        if (query) {
          params.set('search', query)
        }

        const result = await api.get(`/api/lead?${params.toString()}`)
        if (result.success) {
          setWizardLeads(result.data || [])
          setWizardLeadsTotal(
            result.pagination?.total || (result.data ? result.data.length : 0)
          )
        } else {
          toast.error('Failed to load contacts', { description: result.error })
        }
      } catch (e) {
        console.error(e)
        toast.error('Error', { description: 'Unable to load contacts' })
      } finally {
        setWizardLeadsLoading(false)
      }
    },
    []
  )

  const loadPersonas = useCallback(async (page = 1) => {
    setPersonasLoading(true)
    setPersonasError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(WIZARD_PERSONAS_PAGE_SIZE),
      })
      const result = await api.get(`/api/ai-persona?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : result.data?.personas
      if (result.success && Array.isArray(list)) {
        setPersonas(list)
        const total = result.pagination?.total ?? list.length
        setPersonasTotal(total)
      } else {
        setPersonasError(result.error || 'Failed to load personas')
      }
    } catch (e) {
      console.error(e)
      setPersonasError('Unable to load personas')
    } finally {
      setPersonasLoading(false)
    }
  }, [])

  const loadScripts = useCallback(async () => {
    setScriptsLoading(true)
    setScriptsError(null)
    try {
      const result = await api.get('/api/ai-script/')
      const list = result.data?.Scripts
      if (result.success && Array.isArray(list)) {
        setScripts(list)
      } else {
        setScriptsError(result.error || 'Failed to load scripts')
      }
    } catch (e) {
      console.error(e)
      setScriptsError('Unable to load scripts')
    } finally {
      setScriptsLoading(false)
    }
  }, [])

  const loadAssistants = useCallback(async (page = 1) => {
    setAssistantsLoading(true)
    setAssistantsError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(WIZARD_ASSISTANTS_PAGE_SIZE),
      })
      const result = await api.get(`/api/ai-assistant/paginated?${params.toString()}`)
      if (!result.success) {
        setAssistantsError(result.error || 'Failed to load assistants')
        return
      }

      const payload = result.data
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : Array.isArray(payload)
        ? payload
        : []
      const total =
        payload?.pagination?.total ?? payload?.data?.pagination?.total ?? result.pagination?.total ?? list.length
      setAssistants(Array.isArray(list) ? list : [])
      setAssistantsTotal(total)
    } catch (e) {
      console.error(e)
      setAssistantsError('Unable to load assistants')
    } finally {
      setAssistantsLoading(false)
    }
  }, [])

  const loadKnowledgeFiles = useCallback(async () => {
    setKnowledgeFilesLoading(true)
    setKnowledgeFilesError(null)
    try {
      const result = await api.get('/api/ai-script/file/')
      const list = result.data?.files
      if (result.success && Array.isArray(list)) {
        setKnowledgeFiles(list)
      } else {
        setKnowledgeFilesError(result.error || 'Failed to load knowledge base files')
      }
    } catch (e) {
      console.error(e)
      setKnowledgeFilesError('Unable to load knowledge base files')
    } finally {
      setKnowledgeFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWizardLeads(wizardLeadsPage, wizardLeadsSearch)
  }, [wizardLeadsPage, wizardLeadsSearch, loadWizardLeads])

  useEffect(() => {
    loadPersonas(personasPage)
  }, [loadPersonas, personasPage])

  useEffect(() => {
    loadAssistants(assistantsPage)
  }, [assistantsPage, loadAssistants])

  useEffect(() => {
    loadScripts()
    loadKnowledgeFiles()
  }, [loadScripts, loadKnowledgeFiles])

  const toggleWizardLead = (lead) => {
    const id = lead._id
    const isSelected = selectedLeadIds.includes(id)
    if (isSelected) {
      setSelectedLeadIds((prev) => prev.filter((x) => x !== id))
      setSelectedLeadsData((prev) => prev.filter((l) => l._id !== id))
    } else {
      setSelectedLeadIds((prev) => [...prev, id])
      setSelectedLeadsData((prev) => [...prev.filter((l) => l._id !== id), lead])
    }
  }

  const toggleWizardLeadsOnPage = () => {
    const allOnPageSelected = wizardLeads.every((l) => selectedLeadIds.includes(l._id))
    if (allOnPageSelected) {
      const pageIds = wizardLeads.map((l) => l._id)
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      setSelectedLeadsData((prev) => prev.filter((l) => !pageIds.includes(l._id)))
    } else {
      const toAdd = wizardLeads.filter((l) => !selectedLeadIds.includes(l._id))
      setSelectedLeadIds((prev) => [...new Set([...prev, ...toAdd.map((l) => l._id)])])
      setSelectedLeadsData((prev) => {
        const existingIds = new Set(prev.map((l) => l._id))
        const newLeads = toAdd.filter((l) => !existingIds.has(l._id))
        return [...prev, ...newLeads]
      })
    }
  }

  const selectedLeads = selectedLeadsData
  const selectedPersona = personas.find((p) => p._id === selectedPersonaId) || null
  const selectedAssistant = assistants.find((a) => a._id === selectedAssistantId) || null
  const selectedScript = scripts.find((s) => s._id === selectedScriptId) || null
  const selectedKnowledgeFile =
    knowledgeFiles.find((f) => f._id === selectedKnowledgeFileId || f.fileID === selectedKnowledgeFileId) || null
  const canContinue =
    (wizardStep === 1 && selectedLeads.length > 0) ||
    (wizardStep === 2 && (setupMode === 'assistant' ? !!selectedAssistant : !!selectedPersona)) ||
    (wizardStep === 3 && (setupMode === 'assistant' ? true : !!selectedScript)) ||
    wizardStep === 4

  const resetFlow = () => {
    setWizardStep(1)
    setLaunching(false)
    setWizardLeadsPage(1)
    setWizardLeadsSearch('')
    setSelectedLeadIds([])
    setSelectedLeadsData([])
    setSelectedPersonaId(null)
    setPersonasPage(1)
    setSetupMode('manual')
    setAssistantsPage(1)
    setSelectedAssistantId(null)
    setSelectedScriptId(null)
    setSelectedKnowledgeFileId('')
    setFirstMessageMode(DEFAULT_ASSISTANT_OPTIONS.firstMessageMode)
    setFirstMessage(DEFAULT_ASSISTANT_OPTIONS.firstMessage)
    setVoiceMessage(DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
    setBackgroundSound(DEFAULT_ASSISTANT_OPTIONS.backgroundSound)
    setEndCallMessage(DEFAULT_ASSISTANT_OPTIONS.endCallMessage)
  }

  const applyAssistantDefaults = (assistant) => {
    if (!assistant) return
    setFirstMessageMode(
      assistant.firstMessageMode || DEFAULT_ASSISTANT_OPTIONS.firstMessageMode
    )
    setFirstMessage(assistant.firstMessage || DEFAULT_ASSISTANT_OPTIONS.firstMessage)
    setVoiceMessage(assistant.voiceMessage || DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
    setBackgroundSound(
      assistant.backgroundSound === 'office' ? 'office' : DEFAULT_ASSISTANT_OPTIONS.backgroundSound
    )
    setEndCallMessage(assistant.endCallMessage || DEFAULT_ASSISTANT_OPTIONS.endCallMessage)
  }

  const handleLaunchCalls = async () => {
    if (!selectedLeads.length) {
      toast.error('Select at least one contact', {
        description: 'Choose one or more contacts in Step 1 before launching.',
      })
      setWizardStep(1)
      return
    }
    if (setupMode === 'assistant' && !selectedAssistant) {
      toast.error('Select an assistant', {
        description: 'Choose a saved assistant in Step 2 before launching.',
      })
      setWizardStep(2)
      return
    }
    if (setupMode !== 'assistant' && !selectedPersona) {
      toast.error('Select a persona', {
        description: 'Choose an AI persona in Step 2 before launching.',
      })
      setWizardStep(2)
      return
    }
    if (setupMode !== 'assistant' && !selectedScript) {
      toast.error('Select a script', {
        description: 'Choose a script in Step 3 before launching.',
      })
      setWizardStep(3)
      return
    }

    const leadsPayload = selectedLeads.map((lead) => ({
      name: String(lead.name ?? ''),
      email: String(lead.email ?? ''),
      phoneNumber: String(lead.phoneNumber ?? lead.phone ?? ''),
    }))

    const assistantData =
      setupMode === 'assistant' && selectedAssistant
        ? {
            backgroundSound: backgroundSound === 'office' ? 'office' : null,
            endCallMessage: String(endCallMessage || ''),
            firstMessageMode: String(firstMessageMode || ''),
            fileID: String(
              getAssistantPrimaryFileId(selectedAssistant)
            ),
            firstMessage:
              firstMessageMode === 'assistant-speaks-first-with-model-generated-message'
                ? ''
                : String(firstMessage || ''),
            persona: {
              provider: selectedAssistant.persona?.provider,
              similarityBoost: Number(selectedAssistant.persona?.similarityBoost ?? 0.45),
              stability: Number(selectedAssistant.persona?.stability ?? 0.2),
              voiceId: selectedAssistant.persona?.voiceId,
            },
            scriptData: { script: String(selectedAssistant.scriptData?.script || '') },
            voiceMessage: String(voiceMessage || ''),
          }
        : {
            backgroundSound: backgroundSound === 'office' ? 'office' : null,
            endCallMessage: String(endCallMessage || ''),
            firstMessageMode: String(firstMessageMode || ''),
            fileID: String(selectedKnowledgeFile?.fileID || selectedKnowledgeFileId || ''),
            firstMessage:
              firstMessageMode === 'assistant-speaks-first-with-model-generated-message'
                ? ''
                : String(firstMessage || ''),
            persona: {
              provider: selectedPersona.provider,
              similarityBoost: Number(selectedPersona.similarityBoost ?? 0.45),
              stability: Number(selectedPersona.stability ?? 0.2),
              voiceId: selectedPersona.voiceId,
            },
            scriptData: { script: String(selectedScript.script || '') },
            voiceMessage: String(voiceMessage || ''),
          }

    const payload = {
      leads: leadsPayload,
      assistantData,
      stage: 'all',
      scheduleNow: true,
    }

    try {
      setLaunching(true)
      const result = await api.post('/api/ai-calling/', payload)
      if (result.success) {
        toast.success('AI calls launched', {
          description: `${leadsPayload.length} call${
            leadsPayload.length > 1 ? 's' : ''
          } have been scheduled.`,
        })
        resetFlow()
      } else {
        toast.error('Launch failed', {
          description: result.error || 'Unable to start AI calls.',
        })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', {
        description: 'Unexpected error while launching AI calls.',
      })
    } finally {
      setLaunching(false)
    }
  }

  return (
    <MainLayout
      title="Make AI Calls"
      subtitle="Move through a guided 4‑step flow to schedule AI-powered outbound calls."
    >
      <div className="max-w-[960px] mx-auto">
        {/* Configure wizard */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 lg:p-6 shadow-sm h-full flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569] mb-2">
                <PhoneCall className="h-3.5 w-3.5 text-[#6366F1]" />
                AI Calling Flow
              </div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Configure and launch
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Move through the steps to choose contacts, a persona, and review.
              </p>
            </div>
            <button
              type="button"
              className="text-[#64748B] hover:text-[#0F172A] text-xs"
              onClick={resetFlow}
            >
              Reset flow
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between gap-2 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 1
                    ? 'bg-[#9224EF] text-white'
                    : wizardStep > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                1
              </div>
              <span className="hidden sm:inline text-[11px] text-[#475569]">
                Select contacts
              </span>
            </div>
            <div className="flex-1 h-px bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 2
                    ? 'bg-[#9224EF] text-white'
                    : wizardStep > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                2
              </div>
              <span className="hidden sm:inline text-[11px] text-[#475569]">
                Setup
              </span>
            </div>
            <div className="flex-1 h-px bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 3
                    ? 'bg-[#9224EF] text-white'
                    : wizardStep > 3
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                3
              </div>
              <span className="hidden sm:inline text-[11px] text-[#475569]">
                Script & settings
              </span>
            </div>
            <div className="flex-1 h-px bg-[#E2E8F0] mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 4
                    ? 'bg-[#9224EF] text-white'
                    : wizardStep > 4
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline text-[11px] text-[#475569]">
                Review & launch
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            {/* Step 1: select contacts (leads) */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#6366F1]" />
                      Select contacts
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Using the same contacts list as the Leads tab.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                    <Input
                      placeholder="Search contacts"
                      value={wizardLeadsSearch}
                      onChange={(e) => {
                        setWizardLeadsPage(1)
                        setWizardLeadsSearch(e.target.value)
                      }}
                      className="pl-8 h-8 rounded-lg border-[#E2E8F0] bg-white text-xs placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                  {wizardLeadsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" text="Loading contacts…" />
                    </div>
                  ) : wizardLeads.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#64748B]">
                      No contacts found. Add leads first in the Leads tab.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E2E8F0] bg-white text-[11px] font-medium text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              wizardLeads.length > 0 &&
                              wizardLeads.every((l) => selectedLeadIds.includes(l._id))
                            }
                            onClick={toggleWizardLeadsOnPage}
                            className="h-3.5 w-3.5 rounded border-[#CBD5E1] data-[state=checked]:bg-[#9224EF] data-[state=checked]:border-[#9224EF]"
                          />
                          <span>Contact</span>
                        </div>
                        <span className="w-28 text-right">Phone</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto bg-white">
                        {wizardLeads.map((lead) => {
                          const isSelected = selectedLeadIds.includes(lead._id)
                          return (
                            <div
                              key={lead._id}
                              onClick={() => toggleWizardLead(lead)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs border-b border-[#F1F5F9] cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#F3E8FF]' : 'bg-white hover:bg-[#F8FAFF]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleWizardLead(lead)
                                  }}
                                  className="h-3.5 w-3.5 rounded border-[#CBD5E1] data-[state=checked]:bg-[#9224EF] data-[state=checked]:border-[#9224EF]"
                                />
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[10px] font-medium text-[#64748B]">
                                    {lead.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-medium text-[#0F172A] leading-tight">
                                      {lead.name}
                                    </p>
                                    <p className="text-[11px] text-[#94A3B8] leading-tight">
                                      {lead.email}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <span className="w-28 text-right text-[11px] text-[#475569] tabular-nums">
                                {lead.phoneNumber || '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#64748B]">
                        <span>
                          Selected {selectedLeadIds.length} contact
                          {selectedLeadIds.length === 1 ? '' : 's'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setWizardLeadsPage((p) => Math.max(1, p - 1))}
                            disabled={wizardLeadsPage === 1 || wizardLeadsLoading}
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <span>
                            {wizardLeadsPage} / {wizardLeadsTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setWizardLeadsPage((p) =>
                                Math.min(wizardLeadsTotalPages, p + 1)
                              )
                            }
                            disabled={
                              wizardLeadsPage === wizardLeadsTotalPages || wizardLeadsLoading
                            }
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: setup mode */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#6366F1]" />
                    Choose setup mode
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Pick a saved assistant or continue with manual persona setup.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupMode('assistant')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      setupMode === 'assistant'
                        ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#0F172A]">Use saved assistant</p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Reuse persona, script, and knowledge base from AI Assist.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupMode('manual')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      setupMode === 'manual'
                        ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#0F172A]">Manual setup</p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Select persona and script manually for this run.
                    </p>
                  </button>
                </div>

                {setupMode === 'assistant' ? (
                  <>
                    {assistantsLoading && (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" text="Loading assistants…" />
                      </div>
                    )}

                    {assistantsError && !assistantsLoading && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                        {assistantsError}
                      </div>
                    )}

                    {!assistantsLoading && !assistantsError && assistants.length === 0 && (
                      <div className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-3">
                        No assistants found. Create one in AI Calling → AI Assist first.
                      </div>
                    )}

                    {!assistantsLoading && !assistantsError && assistants.length > 0 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                          {assistants.map((assistant) => {
                            const selected = selectedAssistantId === assistant._id
                            return (
                              <button
                                key={assistant._id}
                                type="button"
                                onClick={() => {
                                  setSelectedAssistantId(assistant._id)
                                  applyAssistantDefaults(assistant)
                                }}
                                className={`w-full rounded-xl border p-3 text-left transition-all ${
                                  selected
                                    ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                                    : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                                      {assistant.name || 'Unnamed assistant'}
                                    </p>
                                    <p className="text-[11px] text-[#94A3B8] truncate">
                                      {[assistant.persona?.provider, assistant.persona?.voiceId]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                    </p>
                                  </div>
                                  {selected && (
                                    <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#64748B] mt-2 line-clamp-2 whitespace-pre-wrap">
                                  {assistant.scriptData?.script || 'No script'}
                                </p>
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#64748B]">
                          <button
                            type="button"
                            onClick={() => setAssistantsPage((p) => Math.max(1, p - 1))}
                            disabled={assistantsPage === 1 || assistantsLoading}
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: assistantsTotalPages }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setAssistantsPage(n)}
                                disabled={assistantsLoading || n === assistantsPage}
                                className={`h-7 min-w-7 px-2 rounded border text-[11px] ${
                                  n === assistantsPage
                                    ? 'border-[#9224EF] bg-[#F3E8FF] text-[#6D28D9]'
                                    : 'border-[#E2E8F0] bg-white text-[#475569]'
                                } disabled:opacity-60`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssistantsPage((p) => Math.min(assistantsTotalPages, p + 1))}
                            disabled={assistantsPage === assistantsTotalPages || assistantsLoading}
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {personasLoading && (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="sm" text="Loading personas…" />
                      </div>
                    )}

                    {personasError && !personasLoading && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                        {personasError}
                      </div>
                    )}

                    {!personasLoading && !personasError && personas.length === 0 && (
                      <div className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-3">
                        No personas configured yet. Add personas from the AI Calling page first.
                      </div>
                    )}

                    {!personasLoading && !personasError && personas.length > 0 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                          {personas.map((persona) => {
                            const selected = selectedPersonaId === persona._id
                            return (
                              <button
                                key={persona._id}
                                type="button"
                                onClick={() => setSelectedPersonaId(persona._id)}
                                className={`w-full rounded-xl border p-3 text-left transition-all ${
                                  selected
                                    ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                                    : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                                      <User className="h-4 w-4 text-[#4F46E5]" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                                        {persona.voice || 'Unnamed Persona'}
                                      </p>
                                      <p className="text-[11px] text-[#94A3B8] truncate">
                                        {[persona.provider, persona.model, persona.gender]
                                          .filter(Boolean)
                                          .join(' · ') || '—'}
                                      </p>
                                    </div>
                                  </div>
                                  {selected && (
                                    <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                {persona.description && (
                                  <p className="text-[11px] text-[#64748B] mt-2 line-clamp-2">
                                    {Array.isArray(persona.description)
                                      ? persona.description.join(' · ')
                                      : persona.description}
                                  </p>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#64748B]">
                          <button
                            type="button"
                            onClick={() => setPersonasPage((p) => Math.max(1, p - 1))}
                            disabled={personasPage === 1 || personasLoading}
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: personasTotalPages }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setPersonasPage(n)}
                                disabled={personasLoading || n === personasPage}
                                className={`h-7 min-w-7 px-2 rounded border text-[11px] ${
                                  n === personasPage
                                    ? 'border-[#9224EF] bg-[#F3E8FF] text-[#6D28D9]'
                                    : 'border-[#E2E8F0] bg-white text-[#475569]'
                                } disabled:opacity-60`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPersonasPage((p) => Math.min(personasTotalPages, p + 1))}
                            disabled={personasPage === personasTotalPages || personasLoading}
                            className="px-2 py-1 rounded border border-[#E2E8F0] bg-white disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3: select script */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#6366F1]" />
                    Script and assistant settings
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {setupMode === 'assistant'
                      ? 'Using the selected assistant for persona/script/knowledge base. You can still customize messages below.'
                      : 'Choose script, optional knowledge base file, and customize assistant messages.'}
                  </p>
                </div>

                {setupMode !== 'assistant' && scriptsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="sm" text="Loading scripts…" />
                  </div>
                )}

                {setupMode !== 'assistant' && scriptsError && !scriptsLoading && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {scriptsError}
                  </div>
                )}

                {setupMode !== 'assistant' && !scriptsLoading && !scriptsError && scripts.length === 0 && (
                  <div className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-3">
                    No scripts configured yet. Add scripts from AI Calling &gt; Scripts first.
                  </div>
                )}

                {setupMode !== 'assistant' && !scriptsLoading && !scriptsError && scripts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {scripts.map((script) => {
                      const selected = selectedScriptId === script._id
                      return (
                        <button
                          key={script._id}
                          type="button"
                          onClick={() => {
                            setSelectedScriptId(script._id)
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            selected
                              ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                              : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">
                                {script.name || 'Untitled Script'}
                              </p>
                              <p className="text-[11px] text-[#94A3B8] truncate">
                                {[script.categoryID?.name, script.subCategory].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                            {selected && (
                              <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-2 line-clamp-3 whitespace-pre-wrap">
                            {script.script || 'No script content'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {setupMode === 'assistant' && selectedAssistant && (
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[11px] text-[#64748B] space-y-1.5">
                    <p>
                      <span className="font-medium text-[#475569]">Assistant:</span>{' '}
                      {selectedAssistant.name || '—'}
                    </p>
                    <p>
                      <span className="font-medium text-[#475569]">Persona voice:</span>{' '}
                      {selectedAssistant.persona?.voiceId || '—'}
                    </p>
                    <p>
                      <span className="font-medium text-[#475569]">Knowledge file:</span>{' '}
                      {Array.isArray(selectedAssistant.fileID)
                        ? selectedAssistant.fileID[0] || 'No file'
                        : getAssistantPrimaryFileId(selectedAssistant) || 'No file'}
                    </p>
                  </div>
                )}

                <Card className="border-[#E2E8F0]">
                  <CardContent className="p-3 space-y-3">
                    {setupMode !== 'assistant' && (
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">
                          Knowledge base file (optional)
                        </label>
                        <select
                          value={selectedKnowledgeFileId}
                          onChange={(e) => setSelectedKnowledgeFileId(e.target.value)}
                          className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs"
                        >
                          <option value="">No file</option>
                          {knowledgeFiles.map((file) => (
                            <option key={file._id} value={file.fileID || file._id}>
                              {file.name}
                            </option>
                          ))}
                        </select>
                        {knowledgeFilesLoading && (
                          <p className="text-[11px] text-[#94A3B8] mt-1">Loading files…</p>
                        )}
                        {knowledgeFilesError && (
                          <p className="text-[11px] text-red-600 mt-1">{knowledgeFilesError}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">
                          First message mode
                        </label>
                        <select
                          value={firstMessageMode}
                          onChange={(e) => setFirstMessageMode(e.target.value)}
                          className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs"
                        >
                          <option value="assistant-waits-for-user">assistant-waits-for-user</option>
                          <option value="assistant-speaks-first-with-model-generated-message">
                            assistant-speaks-first-with-model-generated-message
                          </option>
                          <option value="assistant-speaks-first">assistant-speaks-first</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">
                          Voice message
                        </label>
                        <Input
                          value={voiceMessage}
                          onChange={(e) => setVoiceMessage(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="Hey, I tried calling you!"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">
                          Background sound
                        </label>
                        <select
                          value={backgroundSound === 'office' ? 'office' : 'none'}
                          onChange={(e) => setBackgroundSound(e.target.value === 'office' ? 'office' : null)}
                          className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs"
                        >
                          <option value="none">none</option>
                          <option value="office">office background</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">
                          End call message
                        </label>
                        <Input
                          value={endCallMessage}
                          onChange={(e) => setEndCallMessage(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="Goodbye."
                        />
                      </div>
                    </div>

                    {firstMessageMode !== 'assistant-speaks-first-with-model-generated-message' && (
                      <div>
                        <label className="text-xs font-medium text-[#475569] mb-1 block">First message</label>
                        <Input
                          value={firstMessage}
                          onChange={(e) => setFirstMessage(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="Hello."
                        />
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          This will be used only when the assistant speaks first.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: review & launch */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Review before launch
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Confirm the contacts and AI configuration that will be used for this run.
                  </p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
                  <p className="font-medium text-[#0F172A] text-sm">Contacts</p>
                  {selectedLeads.length === 0 ? (
                    <p className="text-xs text-[#64748B]">
                      No contacts selected. Go back to Step 1 to choose contacts.
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-28 overflow-y-auto">
                      {selectedLeads.map((lead) => (
                        <li key={lead._id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[10px] font-medium text-[#64748B]">
                              {lead.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#0F172A] leading-tight">
                                {lead.name}
                              </p>
                              <p className="text-[11px] text-[#94A3B8] leading-tight">
                                {lead.phoneNumber}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
                  <p className="font-medium text-[#0F172A] text-sm">
                    {setupMode === 'assistant' ? 'Assistant' : 'Persona'}
                  </p>
                  {setupMode === 'assistant' ? (
                    selectedAssistant ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                          <Bot className="h-4 w-4 text-[#4F46E5]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#0F172A]">
                            {selectedAssistant.name || 'Unnamed Assistant'}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {selectedAssistant.persona?.provider || '—'} ·{' '}
                            {selectedAssistant.persona?.voiceId || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#64748B]">
                        No assistant selected. Go back to Step 2 to choose one.
                      </p>
                    )
                  ) : (
                    selectedPersona ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                          <User className="h-4 w-4 text-[#4F46E5]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#0F172A]">
                            {selectedPersona.voice || 'Unnamed Persona'}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {selectedPersona.provider || '—'} · {selectedPersona.model || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#64748B]">
                        No persona selected. Go back to Step 2 to choose a persona.
                      </p>
                    )
                  )}
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                  <p className="font-medium text-[#0F172A] text-sm">Script</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-[#4F46E5]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#0F172A]">
                        {setupMode === 'assistant'
                          ? selectedAssistant?.name || 'No assistant selected'
                          : selectedScript?.name || 'No script selected'}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {setupMode === 'assistant'
                          ? 'Using assistant script'
                          : [selectedScript?.categoryID?.name, selectedScript?.subCategory]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">Knowledge file:</span>{' '}
                    {setupMode === 'assistant'
                      ? Array.isArray(selectedAssistant?.fileID)
                        ? selectedAssistant?.fileID?.[0] || 'No file'
                        : getAssistantPrimaryFileId(selectedAssistant) || 'No file'
                      : selectedKnowledgeFile?.name || 'No file'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">First message mode:</span>{' '}
                    {firstMessageMode || '—'}
                  </p>
                  {firstMessageMode !== 'assistant-speaks-first-with-model-generated-message' && (
                    <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">First message:</span> {firstMessage || '—'}
                    </p>
                  )}
                  <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">Voice message:</span> {voiceMessage || '—'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">Background sound:</span> {backgroundSound || '—'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    <span className="font-medium text-[#475569]">End call message:</span> {endCallMessage || '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 space-y-1">
                  <p className="text-xs text-[#64748B]">
                    <span className="font-medium text-[#0F172A]">Schedule:</span> calls will be
                    started immediately.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wizard footer actions */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3 sticky bottom-0 bg-white">
            <div className="text-[11px] text-[#64748B]">
              Step {wizardStep} of 4
            </div>
            <div className="flex items-center gap-2">
              {wizardStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-lg text-xs"
                  onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                  disabled={launching}
                >
                  Back
                </Button>
              )}
              {wizardStep < 4 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 rounded-lg bg-[#9224EF] hover:bg-[#7B1FD4] text-xs text-white"
                  onClick={() => setWizardStep((s) => Math.min(4, s + 1))}
                  disabled={launching || !canContinue}
                >
                  Continue
                </Button>
              )}
              {wizardStep === 4 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
                  onClick={handleLaunchCalls}
                  disabled={launching}
                >
                  {launching ? 'Launching…' : 'Launch AI calls'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
