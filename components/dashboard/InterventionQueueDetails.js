'use client'

import { useState } from 'react'
import { User, Lightbulb } from 'lucide-react'

// Figma: 300-27867 – Intervention Que Details (exact specs from get_figma_data)
const SECTION_TITLE = 'INTERVENTION QUE DETAILS'
const TABS = [
  { id: 'all', label: 'All', count: 23, border: 'var(--studio-primary)', inactiveText: 'var(--studio-primary)' },
  { id: 'urgent', label: 'Urgent', count: 2, border: 'hsl(var(--destructive))', inactiveText: 'hsl(var(--destructive))' },
  { id: 'mine', label: 'Mine', count: 8, border: 'hsl(var(--warning))', inactiveText: 'hsl(var(--warning))' },
]
const TIP_PREFIX = 'Tip:'
const TIP_TEXT = 'Prioritise leads waiting > 1 hour first'

// Time colors from Figma: green = normal, amber = warning, red = urgent
const TIME_COLOR_GREEN = 'hsl(var(--success))'
const TIME_COLOR_AMBER = 'hsl(var(--warning))'
const TIME_COLOR_RED = 'hsl(var(--destructive))'

const mockLeads = [
  { id: 1, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_GREEN },
  { id: 2, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_AMBER },
  { id: 3, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_RED },
  { id: 4, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_AMBER },
  { id: 5, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_RED },
  { id: 6, name: 'Liam Jones', location: 'Miami Beach', email: 'liam.jones@example.com', phone: '512-123-4567', waitTime: '2h 1m', tag: 'Offer', timeColor: TIME_COLOR_GREEN },
]

export default function InterventionQueueDetails() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{
        borderRadius: 20,
        padding: 20,
        gap: 16,
        background: 'hsl(var(--card))',
        border: '2px solid hsl(var(--border))',
        boxShadow: '4px 4px 26px 0px rgba(65, 65, 65, 0.06)',
      }}
    >
      {/* Title – slightly smaller than original */}
      <p
        className="uppercase font-bold tracking-wide text-xs"
        style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.5, color: 'hsl(var(--foreground))' }}
      >
        {SECTION_TITLE}
      </p>

      {/* Tabs – Figma: layout_2MRXY4 row gap 12px; each tab layout_LWG9WB padding 8px 12px, borderRadius 4px */}
      <div className="flex flex-row flex-wrap gap-3" style={{ gap: 12 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                minWidth: 113,
                background: isActive ? 'var(--studio-primary)' : 'hsl(var(--card))',
                border: `1px solid ${isActive ? tab.border : tab.border}`,
                color: isActive ? 'hsl(var(--primary-foreground))' : tab.inactiveText,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: 13,
                lineHeight: 1.43,
              }}
            >
              {tab.label} ({tab.count})
            </button>
          )
        })}
      </div>

      {/* Cards grid – Figma: layout_XJME0M row wrap gap 16px; card 338px width, padding 16px 12px, gap 12, borderRadius 8 */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 overflow-y-auto"
        style={{ gap: 16 }}
      >
        {mockLeads.map((lead) => (
          <div
            key={lead.id}
            className="flex flex-row justify-between items-flex-start rounded-lg relative overflow-hidden"
            style={{
              minWidth: 0,
              padding: '16px 12px',
              gap: 12,
              padding: '16px 12px',
              gap: 12,
              background: 'hsl(var(--card))',
              border: '1.5px solid hsl(var(--border))',
              borderRadius: 8,
              boxShadow: '0px 4px 10px 0px rgba(211, 218, 226, 0.24)',
            }}
          >
            {/* Offer tag – Figma: absolute (1,1), fill_Y412DH #6B7280, borderRadius 8px 0 8px 0, Inter 12px, white text */}
            <div
              className="absolute top-0 left-0 flex items-center justify-center"
              style={{
                padding: '2px 12px',
                background: 'hsl(var(--muted-foreground))',
                color: 'hsl(var(--primary-foreground))',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                lineHeight: 1.5,
                borderBottomRightRadius: 8,
              }}
            >
              {lead.tag}
            </div>

            {/* Left: avatar + name/location + email/phone – Figma: layout_WKM82T column gap 8 */}
            <div className="flex flex-col gap-2 flex-1 min-w-0 pt-4">
              <div className="flex flex-row items-center gap-2">
                <div
                  className="flex-shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden"
                  style={{ width: 48, height: 48 }}
                >
                  <User className="w-6 h-6 text-muted-foreground" style={{ width: 24, height: 24 }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: 1.5, color: 'hsl(var(--foreground))' }}>
                    {lead.name}
                  </span>
                  <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 13, lineHeight: 1.43, color: 'hsl(var(--muted-foreground))' }}>
                    {lead.location}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 13, lineHeight: 1.43, color: 'hsl(var(--foreground))' }}>
                  {lead.email}
                </span>
                <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 13, lineHeight: 1.43, color: 'hsl(var(--muted-foreground))' }}>
                  {lead.phone}
                </span>
              </div>
            </div>

            {/* Right: time – Figma: Inter 30px Bold */}
            <div
              className="flex-shrink-0 font-bold self-center text-xl sm:text-2xl"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 22,
                lineHeight: 1.2,
                color: lead.timeColor,
              }}
            >
              {lead.waitTime}
            </div>
          </div>
        ))}
      </div>

      {/* Divider – Figma: Vector 6 gradient line */}
      <div
        className="w-full"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, rgba(224,225,226,0) 0%, rgba(224,225,226,1) 47%, rgba(224,225,226,0.16) 94%)',
        }}
      />

      {/* Tip – Figma: Insights frame, lightbulb icon + "Tip:" + text */}
      <div className="flex flex-row items-center flex-wrap gap-1">
        <div className="flex flex-row items-center gap-1">
          <Lightbulb className="flex-shrink-0" style={{ width: 20, height: 20, color: 'var(--studio-primary)' }} />
          <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 13, lineHeight: 1.43, color: 'hsl(var(--muted-foreground))' }}>
            {TIP_PREFIX}
          </span>
        </div>
        <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 13, lineHeight: 1.43, color: 'hsl(var(--muted-foreground))' }}>
          {TIP_TEXT}
        </span>
      </div>
    </div>
  )
}
