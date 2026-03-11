'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, PhoneCall, Mic, ListChecks, CheckCircle2, User, Info } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from '@/components/ui/toast'

const WIZARD_LEADS_PAGE_SIZE = 10

// Persona config that backend expects for AI calling
const FIXED_CALLING_PERSONA = {
  _id: '68b2dd5f774650aaaa9631c1',
  model: 'eleven_turbo_v2_5',
  provider: '11labs',
  voice: 'Antoni',
  voiceId: 'ErXwobaYiN019PkySvjV',
}

const DEFAULT_ASSISTANT_DATA = {
  backgroundSound: 'office',
  endCallMessage: 'Goodbye.',
  fileID: '',
  firstMessage: 'Hello.',
  scriptData: {
    script: `[Identity]
You are sneha, a warm and enthusiastic voice assistant for a dance studio. Your primary intent is to introduce callers to the studio (Dance Studio America), provide engaging information about available dance classes, and answer basic questions about offerings, schedules, and how to join.

[Style]
- Use a friendly, inviting, and upbeat tone that conveys enthusiasm about dance and community.
- Speak clearly and naturally, using conversational language.
- Incorporate occasional small pauses, encouraging phrases like "let me tell you a bit more," or mild hesitations for a human touch.
- Be professional but approachable, making all callers feel welcomed.

[Response Guidelines]
- Start every call with an introduction of yourself and the dance studio, highlighting the vibrant, inclusive atmosphere and variety of classes.
- Keep responses concise yet expressive, avoiding jargon.
- When mentioning class times or dates, spell out numbers and use day-of-the-week or "evening/morning" rather than using a strictly numeric format.
- Ask only one question at a time and always wait for the user's response before proceeding.
- Share specific class types (e.g., ballet, hip-hop, salsa, beginner, adult) when describing offerings.
- Offer to provide more details or help the caller get started if interest is shown.

[Task & Goals]
1. Greet the caller and warmly introduce yourself and the dance studio.
2. Briefly describe the range of dance classes offered, mentioning both styles and suitable age/skill groups.
3. Highlight key studio features: welcoming environment, experienced instructors, and flexible class schedules.
4. Ask an open-ended question to understand the caller's interests (e.g., “Are you interested in a particular style or looking for classes for a specific age group?”)
   < wait for user response >
5. If the user expresses interest:
   - Provide more information about applicable classes, schedules, and how to join.
   - Offer to answer questions or assist with the next steps (such as registration or a trial class).
   < wait for user response >
6. If the user is not interested or just wanted information:
   - Kindly thank them for their interest and let them know they're always welcome to reach out in the future.
7. Optionally, offer to send more details or connect the caller with a staff member if they have in-depth questions.
8. End the call politely, reinforcing the welcoming nature of the studio.

[Error Handling / Fallback]
- If the user's intent is unclear, kindly ask a clarifying question (e.g., “Could you tell me a bit more about what you're looking for in a dance class?”).
- If asked a question outside of your scope or knowledge, offer to connect the caller with a studio staff member for further assistance.
- In case of any technical or conversational difficulties, apologize and gently ask to repeat or clarify.
- If the caller is unresponsive, politely prompt once, then offer to answer questions at another time before ending the call.`,
  },
  voiceMessage: 'Hey, I tried calling you!',
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
    wizardStep === 3 ||
    wizardStep === 4

  const resetFlow = () => {
    setWizardStep(1)
    setLaunching(false)
    setWizardLeadsPage(1)
    setWizardLeadsSearch('')
    setSelectedLeadIds([])
    setSelectedLeadsData([])
    setSelectedPersonaId(null)
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
      persona: { ...FIXED_CALLING_PERSONA },
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
      subtitle="Select contacts and a persona, then launch AI-powered outbound calls."
    >
      <div className="max-w-[1204px] mx-auto grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        {/* Sidebar summary */}
        <div className="space-y-4 lg:sticky lg:top-24 self-start">
          <Card className="border-[#E2E8F0] bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF2FF]">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-[#4F46E5]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">
                    AI calling run
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Configure who to call and which AI persona to use.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Selected contacts</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedLeads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Persona</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedPersona?.voice || 'Not selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Schedule</span>
                  <span className="font-semibold text-[#0F172A]">Start now</span>
                </div>
              </div>

              {selectedLeads.length > 0 && (
                <div className="pt-3 border-t border-[#E2E8F0]/70">
                  <p className="text-[11px] font-medium text-[#475569] mb-2">Selected preview</p>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {selectedLeads.slice(0, 6).map((lead) => (
                      <div key={lead._id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-white/70 border border-[#E2E8F0] flex items-center justify-center text-[10px] font-medium text-[#64748B] shrink-0">
                            {lead.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0F172A] truncate">{lead.name}</p>
                            <p className="text-[11px] text-[#94A3B8] truncate">{lead.phoneNumber || '—'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] text-[#64748B] hover:text-[#0F172A] shrink-0"
                          onClick={() => toggleWizardLead(lead)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {selectedLeads.length > 6 && (
                      <p className="text-[11px] text-[#94A3B8]">
                        +{selectedLeads.length - 6} more selected
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed border-[#E2E8F0] bg-[#F8FAFC]">
            <CardContent className="p-4 space-y-2 text-xs text-[#64748B]">
              <p className="font-medium text-[#0F172A]">How this works</p>
              <p>
                1. Pick contacts from your Leads. 2. Choose an AI persona. 3. Review the
                summary and launch calls.
              </p>
              <p>
                The calling script and audio experience are preconfigured to match your
                studio&apos;s tone.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Wizard content */}
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
                                  {persona.provider || '—'} · {persona.model || '—'}
                                </p>
                              </div>
                            </div>
                            {selected && (
                              <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                          {Array.isArray(persona.description) && persona.description.length > 0 && (
                            <p className="text-[11px] text-[#64748B] mt-2 line-clamp-2">
                              {persona.description.join(' · ')}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: script info */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#6366F1]" />
                    Script (default)
                  </p>
                  <p className="text-xs text-[#64748B]">
                    The calling script is currently configured by the backend and applied
                    automatically.
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                  <p className="font-medium mb-1">Default script in use</p>
                  <p>
                    For now, your organization&apos;s default AI calling script will be used for
                    these calls. Script customization will be available here in a future update.
                  </p>
                </div>
                <div className="space-y-1 text-xs text-[#64748B]">
                  <p>
                    <span className="font-medium text-[#0F172A]">First message:</span>{' '}
                    {DEFAULT_ASSISTANT_DATA.firstMessage}
                  </p>
                  <p>
                    <span className="font-medium text-[#0F172A]">Background sound:</span>{' '}
                    {DEFAULT_ASSISTANT_DATA.backgroundSound}
                  </p>
                  <p>
                    <span className="font-medium text-[#0F172A]">End call message:</span>{' '}
                    {DEFAULT_ASSISTANT_DATA.endCallMessage}
                  </p>
                </div>
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
                    Confirm the contacts and persona that will be used for this AI calling run.
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
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 space-y-1">
                  <p className="text-xs text-[#64748B]">
                    <span className="font-medium text-[#0F172A]">Script:</span> using the
                    default backend script.
                  </p>
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

