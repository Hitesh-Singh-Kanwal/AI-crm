'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, PhoneCall, Mic, ListChecks, CheckCircle2, User, FileText } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from '@/components/ui/toast'

const WIZARD_LEADS_PAGE_SIZE = 10

const DEFAULT_SCRIPT = {
  id: 'default',
  name: 'Dance Studio America — Illias',
  description: 'Lively and personable intro script for Dance Studio America.',
  firstMessage: 'Hello.',
  backgroundSound: 'office',
  endCallMessage: 'Goodbye.',
  script: `[Identity]
You are Illias, a lively and personable AI voice assistant for Dance Studio America. Your mission is to greet callers, introduce the studio's vibrant culture, share details about classes, and encourage genuine conversation about dance possibilities.

[Style]
- Be friendly, upbeat, and naturally conversational—like a passionate dance community member.
- Use plain, relatable language and sprinkle in gentle pauses or warm hesitations ("um," "let me think...") as needed for realism.
- Invite callers to share and ask questions, creating a dialogue rather than simply delivering information.
- Use light humor or encouragement (e.g., "Don't be shy, I love talking dance!") to put callers at ease.
- Speak in a relaxed tone—never rushed or overly scripted.

[Response Guidelines]
- Start each call by introducing yourself and Dance Studio America, highlighting the inclusive, joyful spirit of the studio.
- When describing schedules, spell out days and use "morning," "afternoon," or "evening" for clarity; avoid strict numeric formats.
- Mention a few popular class styles (ballet, hip-hop, salsa, jazz, beginner, adult, etc.), and reference suitable ages or experience levels.
- After sharing information, invite the caller to chime in—ask open-ended questions like, "Is there a kind of dance you've always wanted to try?" or "What brings you to dance today?"
- Always pause after asking a question and let the caller speak—never move forward without their input.
- Respond to doubts or questions with warmth, offering extra details and encouragement.
- If the caller expresses interest, explain next steps like joining, registration, or free trial options, and let them guide the pace of the conversation.

[Task & Goals]
1. Begin with a warm greeting, introducing yourself as Illias and Dance Studio America. Express excitement about connecting through dance.
2. Give a lively, short overview of class options—name a few dance styles and note who classes are for (kids, adults, all levels).
3. Highlight what makes the studio special: energetic community, fun atmosphere, passionate teachers, and flexible class times.
4. Ask a friendly, open-ended question to understand the caller's interest or needs (e.g., "Are you looking for a specific style, or just exploring what's possible?").
   < wait for user response >
5. If the caller is interested, share more details tailored to their interest, including schedules and how to join or try a class.
   - Offer to answer any questions or help them take the next step.
   < wait for user response >
6. If the caller is just inquiring, unsure, or not interested, thank them genuinely, emphasize they're welcome any time, and offer to send more details or connect with staff if needed.
7. At any point, invite questions: "Is there anything you're curious about, or any doubts I can clear up for you?"
8. Close the call on a positive note, welcoming them to drop by or call again, and wishing them a wonderful day.

[Error Handling / Fallback]
- If the caller's intent or question is unclear, gently prompt for more info: "Could you share a bit more about what interests you in dance classes?"
- If asked something beyond your knowledge, kindly offer to connect them with a human staff member for expert help.
- With technical issues or if you can't understand, apologize and politely ask them to repeat or clarify.
- If the caller is quiet or unsure, prompt with encouragement: "Don't worry, take your time—I'm here to help with anything you're curious about."
- If there is no response after prompting, reassure them they're welcome to call again, and end the call gracefully.`,
}

const DEFAULT_ASSISTANT_DATA = {
  backgroundSound: DEFAULT_SCRIPT.backgroundSound,
  endCallMessage: DEFAULT_SCRIPT.endCallMessage,
  fileID: '',
  firstMessage: DEFAULT_SCRIPT.firstMessage,
  scriptData: { script: DEFAULT_SCRIPT.script },
  voiceMessage: 'Hey, I tried calling you!',
}

export default function MakeCallsPage() {
  const [wizardStep, setWizardStep] = useState(1) // 1: contacts, 2: persona, 3: script, 4: review
  const [launching, setLaunching] = useState(false)
  const [scriptSelected, setScriptSelected] = useState(false)

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
  const [personasLoading, setPersonasLoading] = useState(false)
  const [personasError, setPersonasError] = useState(null)
  const [selectedPersonaId, setSelectedPersonaId] = useState(null)

  const wizardLeadsTotalPages = Math.max(
    1,
    Math.ceil((wizardLeadsTotal || 0) / WIZARD_LEADS_PAGE_SIZE)
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

  const loadPersonas = useCallback(async () => {
    setPersonasLoading(true)
    setPersonasError(null)
    try {
      const result = await api.get('/api/ai-persona')
      if (result.success && Array.isArray(result.data)) {
        setPersonas(result.data)
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

  useEffect(() => {
    loadWizardLeads(wizardLeadsPage, wizardLeadsSearch)
  }, [wizardLeadsPage, wizardLeadsSearch, loadWizardLeads])

  useEffect(() => {
    loadPersonas()
  }, [loadPersonas])

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
  const canContinue =
    (wizardStep === 1 && selectedLeads.length > 0) ||
    (wizardStep === 2 && !!selectedPersona) ||
    (wizardStep === 3 && scriptSelected) ||
    wizardStep === 4

  const resetFlow = () => {
    setWizardStep(1)
    setLaunching(false)
    setWizardLeadsPage(1)
    setWizardLeadsSearch('')
    setSelectedLeadIds([])
    setSelectedLeadsData([])
    setSelectedPersonaId(null)
    setScriptSelected(false)
  }

  const handleLaunchCalls = async () => {
    if (!selectedLeads.length) {
      toast.error('Select at least one contact', {
        description: 'Choose one or more contacts in Step 1 before launching.',
      })
      setWizardStep(1)
      return
    }
    if (!selectedPersona) {
      toast.error('Select a persona', {
        description: 'Choose an AI persona in Step 2 before launching.',
      })
      setWizardStep(2)
      return
    }

    const leadsPayload = selectedLeads.map((lead) => ({
      name: String(lead.name ?? ''),
      email: String(lead.email ?? ''),
      phoneNumber: String(lead.phoneNumber ?? lead.phone ?? ''),
    }))

    const assistantData = {
      backgroundSound: DEFAULT_ASSISTANT_DATA.backgroundSound,
      endCallMessage: DEFAULT_ASSISTANT_DATA.endCallMessage,
      fileID: DEFAULT_ASSISTANT_DATA.fileID,
      firstMessage: DEFAULT_ASSISTANT_DATA.firstMessage,
      persona: {
        provider: selectedPersona.provider,
        voiceId: selectedPersona.voiceId,
      },
      scriptData: DEFAULT_ASSISTANT_DATA.scriptData,
      voiceMessage: DEFAULT_ASSISTANT_DATA.voiceMessage,
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
                Select persona
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
                Script
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

            {/* Step 2: select persona */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <Mic className="h-4 w-4 text-[#6366F1]" />
                    Select AI persona
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Using the same personas as the AI Calling page.
                  </p>
                </div>

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
                )}
              </div>
            )}

            {/* Step 3: select script */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#6366F1]" />
                    Select script
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Choose the script that will be used for this AI calling run.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setScriptSelected(true)}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    scriptSelected
                      ? 'border-[#9224EF] bg-[#F3E8FF] shadow-sm'
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#4F46E5]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {DEFAULT_SCRIPT.name}
                        </p>
                        <p className="text-[11px] text-[#94A3B8]">
                          {DEFAULT_SCRIPT.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748B]">
                          <span>
                            <span className="font-medium text-[#475569]">Opens with:</span>{' '}
                            &ldquo;{DEFAULT_SCRIPT.firstMessage}&rdquo;
                          </span>
                          <span className="text-[#CBD5E1]">·</span>
                          <span>
                            <span className="font-medium text-[#475569]">Sound:</span>{' '}
                            {DEFAULT_SCRIPT.backgroundSound}
                          </span>
                        </div>
                      </div>
                    </div>
                    {scriptSelected && (
                      <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white/70 p-2.5 max-h-52 overflow-y-auto">
                    <pre className="text-[11px] text-[#475569] whitespace-pre-wrap font-mono leading-relaxed">
                      {DEFAULT_SCRIPT.script}
                    </pre>
                  </div>
                </button>
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
                    Confirm the contacts, persona, and script that will be used for this AI calling run.
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
                  <p className="font-medium text-[#0F172A] text-sm">Persona</p>
                  {selectedPersona ? (
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
                  )}
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                  <p className="font-medium text-[#0F172A] text-sm">Script</p>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-[#4F46E5]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#0F172A]">{DEFAULT_SCRIPT.name}</p>
                      <p className="text-[11px] text-[#94A3B8]">{DEFAULT_SCRIPT.description}</p>
                    </div>
                  </div>
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
