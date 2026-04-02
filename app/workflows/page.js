'use client'

import { Suspense, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Workflow, Mail, Phone, MessageSquare, Clock3, Search, Filter, FolderOpen } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import GlobalLoader from '@/components/shared/GlobalLoader'

const workflowData = [
  {
    id: 'wf-1',
    name: 'New Lead Nurture',
    trigger: 'Lead Created',
    steps: 5,
    totalRuns: 28,
    successRate: 75,
    lastRun: 'Jan 27, 2025',
    status: 'active',
  },
  {
    id: 'wf-2',
    name: 'Follow-Up Call',
    trigger: '24 Hours After Lead Creation',
    steps: 3,
    totalRuns: 15,
    successRate: 60,
    lastRun: 'Feb 1, 2025',
    status: 'active',
  },
  {
    id: 'wf-3',
    name: 'Email Campaign',
    trigger: '5 Days After Lead Creation',
    steps: 4,
    totalRuns: 30,
    successRate: 80,
    lastRun: 'Jan 30, 2025',
    status: 'active',
  },
  {
    id: 'wf-4',
    name: 'Survey Follow-Up',
    trigger: 'After First Interaction',
    steps: 2,
    totalRuns: 20,
    successRate: 90,
    lastRun: 'Jan 29, 2025',
    status: 'active',
  },
  {
    id: 'wf-5',
    name: 'Product Demo',
    trigger: '1 Week After Initial Contact',
    steps: 4,
    totalRuns: 10,
    successRate: 60,
    lastRun: 'Jan 28, 2025',
    status: 'active',
  },
  {
    id: 'wf-6',
    name: 'Re-engagement Campaign',
    trigger: 'Paused workflow',
    steps: 0,
    totalRuns: 0,
    successRate: 0,
    lastRun: '-',
    status: 'paused',
  },
]

const stepTypes = [
  { id: 'call', name: 'Call', icon: Phone, color: 'bg-slate-600' },
  { id: 'email', name: 'Email', icon: Mail, color: 'bg-slate-600' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, color: 'bg-slate-600' },
]

const wizardSteps = [
  { id: 1, title: 'Sequence Details', subtitle: 'Provide basic information about your outreach sequence' },
  { id: 2, title: 'Select Contacts', subtitle: 'Choose the contacts you want to include in this sequence' },
  { id: 3, title: 'Create Sequence Steps', subtitle: 'Set up actions and timing for your outreach sequence' },
]

const sampleContacts = [
  { id: 'c1', name: 'Arya Sharma', email: 'arya.sharma@crmtest.com', group: 'US', subtitle: 'Kiran Patel' },
  { id: 'c2', name: 'Priya Verma', email: 'priya.verma@crmtest.com', group: 'US', subtitle: 'Arjun Reddy' },
  { id: 'c3', name: 'Divya Kapoor', email: 'divya.kapoor@crmtest.com', group: 'EMEA', subtitle: 'Rohan Singh' },
  { id: 'c4', name: 'Vikram Iyer', email: 'vikram.iyer@crmtest.com', group: 'APAC', subtitle: 'Sakshi Mehra' },
  { id: 'c5', name: 'Amit Verma', email: 'amit.verma@crmtest.com', group: 'US', subtitle: 'Neha Gupta' },
  { id: 'c6', name: 'Rohan Singh', email: 'rohan.singh@crmtest.com', group: 'EMEA', subtitle: 'Amit Verma' },
]

function Stepper({ currentStep }) {
  return (
    <div className="flex items-center gap-3">
      {wizardSteps.map((step, i) => {
        const isActive = currentStep === step.id
        const isDone = currentStep > step.id
        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#FCE7F3]">
              <span className={cn('text-[30px] font-bold leading-none', isActive || isDone ? 'text-[var(--studio-primary)]' : 'text-[#94A3B8]')}>
                {step.id}
              </span>
            </div>
            {i < wizardSteps.length - 1 && <div className="h-[2px] w-10 bg-[#E2E8F0]" />}
          </div>
        )
      })}
    </div>
  )
}

function WorkflowCard({ workflow }) {
  const isPaused = workflow.status === 'paused'

  return (
    <article
      className="h-[286px] w-full rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_12px_rgba(65,65,65,0.06)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9]">
            <Workflow className="h-4 w-4 text-[#64748B]" />
          </div>
          <span className="inline-flex h-6 items-center rounded-bl-md rounded-tr-md bg-[#FCE7F3] px-2.5 text-[10px] font-medium text-[#C81D77]">
            {isPaused ? 'Paused' : 'Active'}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <h3 className="text-[20px] font-semibold leading-7 text-[#0F172A]">{workflow.name}</h3>
          <Eye className="h-3.5 w-3.5 text-[#94A3B8]" />
        </div>

        <p className="mt-0.5 text-[11px] text-[#64748B]">
          Trigger: {workflow.trigger}
          {!isPaused && <> • {workflow.steps} steps</>}
        </p>

        {!isPaused && (
          <div className="mt-3 space-y-1 text-[12px] text-[#64748B]">
            <div className="flex items-center justify-between">
              <span>Total Runs:</span>
              <span className="font-medium text-[#0F172A]">{workflow.totalRuns}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Success Rate:</span>
              <span className="font-medium text-[#00AA34]">{workflow.successRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Run:</span>
              <span className="font-medium text-[#0F172A]">{workflow.lastRun}</span>
            </div>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D1D5DB] bg-white text-[12px] font-medium text-[#64748B] hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#EF4444] text-[12px] font-medium text-white hover:bg-[#DC2626]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isPaused ? 'Resume' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  )
}

function WorkflowsPageInner() {
  const [isBuilding, setIsBuilding] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [sequenceName, setSequenceName] = useState('')
  const [description, setDescription] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContacts, setSelectedContacts] = useState(['c1', 'c2'])
  const [selectedStepType, setSelectedStepType] = useState('call')
  const [workflowSteps, setWorkflowSteps] = useState([])
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('view') || 'active'
  const filteredWorkflows = workflowData.filter((w) => {
    if (activeTab === 'analytics') return false
    if (activeTab === 'drafts') return false
    return w.status === activeTab
  })

  const addStep = (type) => {
    const stepType = stepTypes.find((s) => s.id === type) || stepTypes[0]
    const newStep = {
      id: Date.now().toString(),
      type: stepType.id,
      action: stepType.name,
      schedule: 'MULTIDITY',
      condition: null,
    }
    setWorkflowSteps([...workflowSteps, newStep])
  }

  const removeStep = (id) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== id))
  }

  const updateStepType = (id, type) => {
    const stepType = stepTypes.find((s) => s.id === type)
    if (!stepType) return
    setWorkflowSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              type,
              action: stepType.name,
            }
          : step
      )
    )
  }

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase()
    if (!q) return sampleContacts
    return sampleContacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
  }, [contactSearch])

  const toggleContact = (id) => {
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <MainLayout title="AI & Automation" subtitle="Automate your marketing and follow-ups">
      {!isBuilding ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#0F172A]">Automate your marketing and follow-ups</p>
            <button
              type="button"
              onClick={() => setIsBuilding(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </button>
          </div>

          {activeTab === 'drafts' && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
              No draft workflows
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
              Analytics view coming soon.
            </div>
          )}

          {activeTab === 'active' && (
            <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </section>
          )}

          {activeTab === 'paused' && (
            <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Stepper currentStep={currentStep} />
            <div className="space-y-1 xl:text-right">
              <h2 className="text-[20px] font-bold text-[#0F172A]">{wizardSteps[currentStep - 1]?.title}</h2>
              <p className="text-[14px] font-medium text-[#64748B]">{wizardSteps[currentStep - 1]?.subtitle}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_12px_rgba(65,65,65,0.06)]">
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-[20px] font-bold text-[#0F172A]">Basic Information</h3>
                  <p className="text-[16px] text-[#64748B]">Enter the name and description for your sequence</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[16px] text-[#0F172A]">Sequence Name *</label>
                    <input
                      value={sequenceName}
                      onChange={(e) => setSequenceName(e.target.value)}
                      placeholder="Enter sequence name"
                      className="h-12 w-full rounded-lg border border-[#D0D5DD] px-3 text-[16px] outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[16px] text-[#0F172A]">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter sequence description"
                      rows={3}
                      className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[16px] outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[20px] font-bold text-[#0F172A]">Contact Selection*</h3>
                  <p className="text-[16px] text-[#64748B]">Choose which contacts to include in this sequence</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg border border-[#D0D5DD] px-3">
                    <Search className="h-4 w-4 text-[#98A2B3]" />
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts by name or email..."
                      className="h-10 w-full text-[16px] outline-none"
                    />
                  </div>
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D0D5DD] px-4 text-[14px] font-medium text-[#64748B]">
                    Filters
                    <Filter className="h-4 w-4" />
                  </button>
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EEF4FF] px-4 text-[14px] font-medium text-[#344054]">
                    <FolderOpen className="h-4 w-4" />
                    Select by Groups
                  </button>
                </div>

                <div className="space-y-3 rounded-lg border border-[#EAECF0] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedContacts(filteredContacts.map((c) => c.id))}
                        className="inline-flex h-8 items-center rounded-md border border-[#D0D5DD] px-3 text-[12px] font-medium text-[#344054]"
                      >
                        Select Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedContacts([])}
                        className="inline-flex h-8 items-center rounded-md border border-[#F04438] px-3 text-[12px] font-medium text-[#F04438]"
                      >
                        Clear All
                      </button>
                    </div>
                    <p className="text-[12px] text-[#667085]">{selectedContacts.length} / 7000 contacts selected</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {filteredContacts.map((contact) => {
                      const checked = selectedContacts.includes(contact.id)
                      return (
                        <label
                          key={contact.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors',
                            checked ? 'border-[var(--studio-primary)] bg-[#FDF2F8]' : 'border-[#EAECF0] bg-white hover:bg-[#F9FAFB]'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContact(contact.id)}
                            className="mt-1 h-3.5 w-3.5 rounded border-[#D0D5DD]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-[#111827]">{contact.name}</p>
                            <p className="truncate text-[10px] text-[#6B7280]">{contact.subtitle}</p>
                            <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">{contact.email}</p>
                            <div className="mt-1 inline-flex items-center rounded-sm bg-[#F2F4F7] px-1.5 py-0.5 text-[10px] text-[#475467]">
                              {contact.group}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-end">
                    <div className="inline-flex h-8 items-center rounded-md border border-[#D0D5DD] px-2 text-[12px] text-[#475467]">
                      <span className="mr-1">Page</span>
                      <span className="font-medium">1</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-bold text-[#0F172A]">Sequence Steps*</h3>
                    <p className="text-[12px] text-[#64748B]">Define the steps in your outreach sequence</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStepType}
                      onChange={(e) => setSelectedStepType(e.target.value)}
                      className="h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-[12px] font-medium text-[#475467]"
                    >
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => addStep(selectedStepType)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-3 text-[12px] font-medium text-[#475467]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Step
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {workflowSteps.map((step, index) => {
                    const stepType = stepTypes.find((s) => s.id === step.type)
                    const Icon = stepType?.icon || Workflow
                    const stepName = step.type === 'call' ? 'Call' : step.type === 'sms' ? 'SMS' : 'Email'

                    return (
                      <div key={step.id} className="rounded-md border border-[#DDE2EA] bg-white p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-[#667085]" />
                            <div>
                              <p className="text-[12px] font-semibold text-[#111827]">Step {index + 1} - {stepName}</p>
                              <p className="text-[10px] text-[#667085]">Set sequence details and contacts</p>
                            </div>
                          </div>
                          <button onClick={() => removeStep(step.id)} className="text-[#98A2B3] hover:text-[#EF4444]">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="mb-1 text-[10px] text-[#667085]">Communication Type</p>
                            <select
                              value={step.type}
                              onChange={(e) => updateStepType(step.id, e.target.value)}
                              className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]"
                            >
                              <option value="call">Call</option>
                              <option value="email">Email</option>
                              <option value="sms">SMS</option>
                            </select>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] text-[#667085]">Script Template*</p>
                            <select className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]">
                              <option>Select Script</option>
                            </select>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] text-[#667085]">Schedule Date*</p>
                            <select className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]">
                              <option>MULTIDITY</option>
                            </select>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] text-[#667085]">Target Stage*</p>
                            <select className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]">
                              <option>All Contacts</option>
                            </select>
                          </div>
                        </div>

                        {step.type === 'call' && (
                          <div className="mt-3 space-y-2 border-t border-[#EAECF0] pt-2">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-[10px] font-semibold text-[#111827]">Call Configuration</p>
                                <p className="text-[10px] text-[#667085]">Make AI-powered phone calls</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="mb-1 text-[10px] text-[#667085]">AI Persona*</p>
                                  <select className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]">
                                    <option>Cheeni</option>
                                  </select>
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] text-[#667085]">Background Sound</p>
                                  <select className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]">
                                    <option>Cafe Environment</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                              <div>
                                <p className="mb-1 text-[10px] text-[#667085]">First Message</p>
                                <input
                                  className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]"
                                  defaultValue="Hello!"
                                />
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] text-[#667085]">End Call Message</p>
                                <input
                                  className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]"
                                  defaultValue="Goodbye!"
                                />
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] text-[#667085]">Voicemail Message</p>
                                <input
                                  className="h-8 w-full rounded-md border border-[#D0D5DD] px-2 text-[11px] text-[#475467]"
                                  defaultValue="Hey, I tried calling you."
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {workflowSteps.length === 0 && (
                    <div className="rounded-md border border-[#DDE2EA] bg-[#F9FAFB] py-8 text-center text-[14px] text-[#98A2B3]">
                      No steps added yet. Click "Add Step" to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-[#EAECF0] pt-4">
              <p className="text-[16px] text-[#667085]">Step {currentStep} of 3</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (currentStep === 1 ? setIsBuilding(false) : setCurrentStep((s) => s - 1))}
                  className="inline-flex h-11 items-center rounded-lg border border-[#D0D5DD] px-5 text-[16px] font-medium text-[#344054]"
                >
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep < 3) setCurrentStep((s) => s + 1)
                    else setIsBuilding(false)
                  }}
                  className="inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[16px] font-medium text-white"
                >
                  {currentStep === 1 && 'Next: Select Contacts'}
                  {currentStep === 2 && 'Next: Create Steps'}
                  {currentStep === 3 && 'Create Sequence'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default function WorkflowsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="AI & Automation" subtitle="Automate your marketing and follow-ups">
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" text="Loading workflows…" />
          </div>
        </MainLayout>
      }
    >
      <WorkflowsPageInner />
    </Suspense>
  )
}

