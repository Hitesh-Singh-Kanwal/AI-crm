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

function getAssistantFileIds(assistant) {
  const rawIds = [
    ...(Array.isArray(assistant?.fileIDs) ? assistant.fileIDs : []),
    ...(Array.isArray(assistant?.fileIDies) ? assistant.fileIDies : []),
    ...(Array.isArray(assistant?.fileID) ? assistant.fileID : []),
    ...(!Array.isArray(assistant?.fileIDs) && assistant?.fileIDs ? [assistant.fileIDs] : []),
    ...(!Array.isArray(assistant?.fileIDies) && assistant?.fileIDies ? [assistant.fileIDies] : []),
    ...(!Array.isArray(assistant?.fileID) && assistant?.fileID ? [assistant.fileID] : []),
  ]
  return [...new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean))]
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
  const [selectedKnowledgeFileIds, setSelectedKnowledgeFileIds] = useState([])
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
          const pagination = result.data?.pagination ?? result.pagination
          const total = pagination?.total || (result.data ? result.data.length : 0)
          const nextTotalPages = Math.max(1, Math.ceil((total || 0) / WIZARD_LEADS_PAGE_SIZE))
          if (page > nextTotalPages) {
            setWizardLeadsPage(nextTotalPages)
            return
          }
          setWizardLeads(result.data || [])
          setWizardLeadsTotal(total)
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
        const pagination = result.data?.pagination ?? result.pagination
        const total = pagination?.total ?? list.length
        const nextTotalPages = Math.max(1, Math.ceil((total || 0) / WIZARD_PERSONAS_PAGE_SIZE))
        if (page > nextTotalPages) {
          setPersonasPage(nextTotalPages)
          return
        }
        setPersonas(list)
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
  const selectedKnowledgeFiles = knowledgeFiles.filter((f) =>
    selectedKnowledgeFileIds.includes(String(f.fileID || f._id || ''))
  )
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
    setSelectedKnowledgeFileIds([])
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

  const toggleKnowledgeFileId = (fileId) => {
    const normalizedId = String(fileId || '')
    setSelectedKnowledgeFileIds((prev) =>
      prev.includes(normalizedId)
        ? prev.filter((id) => id !== normalizedId)
        : [...prev, normalizedId]
    )
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
            fileIDs: getAssistantFileIds(selectedAssistant),
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
            fileIDs: selectedKnowledgeFileIds,
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
        <div className="rounded-xl border border-border bg-card p-4 lg:p-6 shadow-sm h-full flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground mb-2 border border-border/60">
                <PhoneCall className="h-3.5 w-3.5 text-primary" />
                AI Calling Flow
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Configure and launch
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Move through the steps to choose contacts, a persona, and review.
              </p>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs"
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
                    ? 'bg-brand text-brand-foreground'
                    : wizardStep > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                1
              </div>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                Select contacts
              </span>
            </div>
            <div className="flex-1 h-px bg-border mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 2
                    ? 'bg-brand text-brand-foreground'
                    : wizardStep > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </div>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                Setup
              </span>
            </div>
            <div className="flex-1 h-px bg-border mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 3
                    ? 'bg-brand text-brand-foreground'
                    : wizardStep > 3
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                3
              </div>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                Script & settings
              </span>
            </div>
            <div className="flex-1 h-px bg-border mx-1" />
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  wizardStep === 4
                    ? 'bg-brand text-brand-foreground'
                    : wizardStep > 4
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
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
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Select contacts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Using the same contacts list as the Leads tab.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts"
                      value={wizardLeadsSearch}
                      onChange={(e) => {
                        setWizardLeadsPage(1)
                        setWizardLeadsSearch(e.target.value)
                      }}
                      className="pl-8 h-8 rounded-lg bg-background text-xs placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                  {wizardLeadsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" text="Loading contacts…" />
                    </div>
                  ) : wizardLeads.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No contacts found. Add leads first in the Leads tab.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background text-[11px] font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              wizardLeads.length > 0 &&
                              wizardLeads.every((l) => selectedLeadIds.includes(l._id))
                            }
                            onClick={toggleWizardLeadsOnPage}
                            className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                          />
                          <span>Contact</span>
                        </div>
                        <span className="w-28 text-right">Phone</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto bg-background">
                        {wizardLeads.map((lead) => {
                          const isSelected = selectedLeadIds.includes(lead._id)
                          return (
                            <div
                              key={lead._id}
                              onClick={() => toggleWizardLead(lead)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs border-b border-border/60 cursor-pointer transition-colors ${
                                isSelected ? 'bg-brand/10' : 'bg-background hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleWizardLead(lead)
                                  }}
                                  className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                                />
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                    {lead.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-medium text-foreground leading-tight">
                                      {lead.name}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                      {lead.email}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <span className="w-28 text-right text-[11px] text-muted-foreground tabular-nums">
                                {lead.phoneNumber || '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
                        <span>
                          Selected {selectedLeadIds.length} contact
                          {selectedLeadIds.length === 1 ? '' : 's'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setWizardLeadsPage((p) => Math.max(1, p - 1))}
                            disabled={wizardLeadsPage === 1 || wizardLeadsLoading}
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Choose setup mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pick a saved assistant or continue with manual persona setup.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupMode('assistant')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      setupMode === 'assistant'
                        ? 'border-brand bg-brand/10 shadow-sm'
                        : 'border-border bg-background hover:bg-muted/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Use saved assistant</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Reuse persona, script, and knowledge base from AI Assist.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupMode('manual')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      setupMode === 'manual'
                        ? 'border-brand bg-brand/10 shadow-sm'
                        : 'border-border bg-background hover:bg-muted/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Manual setup</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
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
                      <div className="text-xs text-muted-foreground bg-muted/20 border border-border rounded-md px-3 py-3">
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
                                    ? 'border-brand bg-brand/10 shadow-sm'
                                    : 'border-border bg-background hover:bg-muted/30'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {assistant.name || 'Unnamed assistant'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
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
                                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 whitespace-pre-wrap">
                                  {assistant.scriptData?.script || 'No script'}
                                </p>
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => setAssistantsPage((p) => Math.max(1, p - 1))}
                            disabled={assistantsPage === 1 || assistantsLoading}
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                                    ? 'border-brand bg-brand/10 text-brand'
                                    : 'border-border bg-background text-muted-foreground'
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
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                      <div className="text-xs text-muted-foreground bg-muted/20 border border-border rounded-md px-3 py-3">
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
                                    ? 'border-brand bg-brand/10 shadow-sm'
                                    : 'border-border bg-background hover:bg-muted/30'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {persona.voice || 'Unnamed Persona'}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground truncate">
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
                                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                                    {Array.isArray(persona.description)
                                      ? persona.description.join(' · ')
                                      : persona.description}
                                  </p>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => setPersonasPage((p) => Math.max(1, p - 1))}
                            disabled={personasPage === 1 || personasLoading}
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                                    ? 'border-brand bg-brand/10 text-brand'
                                    : 'border-border bg-background text-muted-foreground'
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
                            className="px-2 py-1 rounded border border-border bg-background disabled:opacity-40"
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
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Script and assistant settings
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground bg-muted/20 border border-border rounded-md px-3 py-3">
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
                              ? 'border-brand bg-brand/10 shadow-sm'
                              : 'border-border bg-background hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {script.name || 'Untitled Script'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {[script.categoryID?.name, script.subCategory].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                            {selected && (
                              <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                            {script.script || 'No script content'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {setupMode === 'assistant' && selectedAssistant && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
                    <p>
                      <span className="font-medium text-foreground">Assistant:</span>{' '}
                      {selectedAssistant.name || '—'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Persona voice:</span>{' '}
                      {selectedAssistant.persona?.voiceId || '—'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Knowledge files:</span>{' '}
                      {getAssistantFileIds(selectedAssistant).join(', ') || 'No file'}
                    </p>
                  </div>
                )}

                <Card className="border-border">
                  <CardContent className="p-3 space-y-3">
                    {setupMode !== 'assistant' && (
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">
                          Knowledge base files (optional)
                        </label>
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background px-2.5 py-2 space-y-2">
                          {knowledgeFiles.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">No files available.</p>
                          ) : (
                            knowledgeFiles.map((file) => {
                              const id = String(file.fileID || file._id || '')
                              const checked = selectedKnowledgeFileIds.includes(id)
                              return (
                                <label
                                  key={file._id}
                                  className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onClick={() => toggleKnowledgeFileId(id)}
                                    className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                                  />
                                  <span className="truncate">{file.name}</span>
                                </label>
                              )
                            })
                          )}
                        </div>
                        {knowledgeFilesLoading && (
                          <p className="text-[11px] text-muted-foreground mt-1">Loading files…</p>
                        )}
                        {knowledgeFilesError && (
                          <p className="text-[11px] text-red-600 mt-1">{knowledgeFilesError}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">
                          First message mode
                        </label>
                        <select
                          value={firstMessageMode}
                          onChange={(e) => setFirstMessageMode(e.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs"
                        >
                          <option value="assistant-waits-for-user">assistant-waits-for-user</option>
                          <option value="assistant-speaks-first-with-model-generated-message">
                            assistant-speaks-first-with-model-generated-message
                          </option>
                          <option value="assistant-speaks-first">assistant-speaks-first</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">
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
                        <label className="text-xs font-medium text-foreground mb-1 block">
                          Background sound
                        </label>
                        <select
                          value={backgroundSound === 'office' ? 'office' : 'none'}
                          onChange={(e) => setBackgroundSound(e.target.value === 'office' ? 'office' : null)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs"
                        >
                          <option value="none">none</option>
                          <option value="office">office background</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">
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
                        <label className="text-xs font-medium text-foreground mb-1 block">First message</label>
                        <Input
                          value={firstMessage}
                          onChange={(e) => setFirstMessage(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="Hello."
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
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
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Review before launch
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Confirm the contacts and AI configuration that will be used for this run.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="font-medium text-foreground text-sm">Contacts</p>
                  {selectedLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No contacts selected. Go back to Step 1 to choose contacts.
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-28 overflow-y-auto">
                      {selectedLeads.map((lead) => (
                        <li key={lead._id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              {lead.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground leading-tight">
                                {lead.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                {lead.phoneNumber}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="font-medium text-foreground text-sm">
                    {setupMode === 'assistant' ? 'Assistant' : 'Persona'}
                  </p>
                  {setupMode === 'assistant' ? (
                    selectedAssistant ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {selectedAssistant.name || 'Unnamed Assistant'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedAssistant.persona?.provider || '—'} ·{' '}
                            {selectedAssistant.persona?.voiceId || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No assistant selected. Go back to Step 2 to choose one.
                      </p>
                    )
                  ) : (
                    selectedPersona ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {selectedPersona.voice || 'Unnamed Persona'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedPersona.provider || '—'} · {selectedPersona.model || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No persona selected. Go back to Step 2 to choose a persona.
                      </p>
                    )
                  )}
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                  <p className="font-medium text-foreground text-sm">Script</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {setupMode === 'assistant'
                          ? selectedAssistant?.name || 'No assistant selected'
                          : selectedScript?.name || 'No script selected'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {setupMode === 'assistant'
                          ? 'Using assistant script'
                          : [selectedScript?.categoryID?.name, selectedScript?.subCategory]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Knowledge files:</span>{' '}
                    {setupMode === 'assistant'
                      ? getAssistantFileIds(selectedAssistant).join(', ') || 'No file'
                      : selectedKnowledgeFiles.map((f) => f.name).join(', ') || 'No file'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">First message mode:</span>{' '}
                    {firstMessageMode || '—'}
                  </p>
                  {firstMessageMode !== 'assistant-speaks-first-with-model-generated-message' && (
                    <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">First message:</span> {firstMessage || '—'}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Voice message:</span> {voiceMessage || '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Background sound:</span> {backgroundSound || '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">End call message:</span> {endCallMessage || '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Schedule:</span> calls will be
                    started immediately.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wizard footer actions */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3 sticky bottom-0 bg-card">
            <div className="text-[11px] text-muted-foreground">
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
                  className="h-8 px-3 rounded-lg bg-brand hover:bg-brand-dark text-xs text-brand-foreground"
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
