'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

const TABS = ['Appointment', 'Group Class', 'To Do', 'Record Only']

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-11 px-3 text-[12px] font-medium border-b-2 transition-colors',
        active
          ? 'text-foreground border-primary'
          : 'text-muted-foreground border-transparent hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function Label({ children }) {
  return <label className="block mb-1.5 text-[12px] font-medium text-foreground">{children}</label>
}

function Input({ placeholder }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function Select({ placeholder }) {
  return (
    <div className="relative">
      <select className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-muted-foreground outline-none focus:border-primary">
        <option>{placeholder}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function TextArea({ placeholder }) {
  return (
    <textarea
      rows={3}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function TimeRangeField() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Select placeholder="09:10 AM" />
      <span className="text-[12px] text-muted-foreground">to</span>
      <Select placeholder="10:10 AM" />
    </div>
  )
}

function AppointmentFields() {
  return (
    <>
      <h3 className="mb-4 text-[14px] font-semibold text-foreground">Individual Appointment</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Instructor</Label>
          <Select placeholder="Select Instructor" />
        </div>
        <div>
          <Label>Customer</Label>
          <Select placeholder="Select Customer" />
        </div>

        <div>
          <Label>Enrolment ID</Label>
          <Select placeholder="Select Enrolment ID" />
        </div>
        <div>
          <Label>Scheduling Code</Label>
          <Select placeholder="Select Scheduling Code" />
        </div>

        <div>
          <Label>Date</Label>
          <Select placeholder="MM/DD/YYYY" />
        </div>
        <div>
          <Label>Time</Label>
          <TimeRangeField />
        </div>

        <div>
          <Label>Public Note</Label>
          <TextArea placeholder="Enter your Note here" />
        </div>
        <div>
          <Label>Internal Note</Label>
          <TextArea placeholder="Enter your Note here" />
        </div>
      </div>
    </>
  )
}

function ToDoFields() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">To Do</h3>
      <div className="col-span-2">
        <Label>Title</Label>
        <Input placeholder="Study" />
      </div>
      <div>
        <Label>Instructor</Label>
        <Select placeholder="Select Instructor" />
      </div>
      <div>
        <Label>Scheduling Code</Label>
        <Select placeholder="Select Scheduling Code" />
      </div>
      <div>
        <Label>Status</Label>
        <Select placeholder="Not Started" />
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Select placeholder="MM/DD/YYYY" />
        </div>
        <div>
          <Label>Time</Label>
          <TimeRangeField />
        </div>
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <TextArea placeholder="Enter your Description here" />
      </div>
    </div>
  )
}

function GroupClassFields() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">Group Class</h3>
      <div className="col-span-2">
        <Label>Group Name</Label>
        <Input placeholder="Enter Group Name" />
      </div>
      <div>
        <Label>Instructor</Label>
        <Select placeholder="Select Instructor" />
      </div>
      <div>
        <Label>Service</Label>
        <Select placeholder="Select Service" />
      </div>
      <div className="col-span-2">
        <Label>Scheduling Code</Label>
        <Select placeholder="Select Scheduling Code" />
      </div>
      <div>
        <Label>Date</Label>
        <Select placeholder="MM/DD/YYYY" />
      </div>
      <div>
        <Label>Time</Label>
        <TimeRangeField />
      </div>
      <div>
        <Label>Public Note</Label>
        <TextArea placeholder="Enter your Note here" />
      </div>
      <div>
        <Label>Internal Note</Label>
        <TextArea placeholder="Enter your Note here" />
      </div>
    </div>
  )
}

function RecordOnlyFields() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">Record Only</h3>
      <div>
        <Label>Instructor</Label>
        <Select placeholder="Select Instructor" />
      </div>
      <div>
        <Label>Customer</Label>
        <Select placeholder="Select Customer" />
      </div>
      <div className="col-span-2">
        <Label>Scheduling Code</Label>
        <Select placeholder="Select Scheduling Code" />
      </div>
      <div>
        <Label>Date</Label>
        <Select placeholder="MM/DD/YYYY" />
      </div>
      <div>
        <Label>Time</Label>
        <TimeRangeField />
      </div>
      <div className="col-span-2">
        <Label>Internal Note</Label>
        <TextArea placeholder="Enter your Note here" />
      </div>
    </div>
  )
}

export default function AppointmentComposerPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('Appointment')

  const tabContent = useMemo(() => {
    if (activeTab === 'Appointment') return <AppointmentFields />
    if (activeTab === 'To Do') return <ToDoFields />
    if (activeTab === 'Group Class') return <GroupClassFields />
    return <RecordOnlyFields />
  }, [activeTab])

  return (
    <aside className="h-full w-[430px] shrink-0 rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border pr-1">
        <div className="flex items-center overflow-x-auto">
          {TABS.map((tab) => (
            <TabButton key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close appointment panel"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-[calc(100%-44px)] flex-col">
        <div className="flex-1 overflow-y-auto p-4">{tabContent}</div>
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-10 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Save Changes
          </button>
        </div>
      </div>
    </aside>
  )
}
