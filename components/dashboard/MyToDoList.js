'use client'

import { Mail, Phone, Calendar, FileText, CheckCircle } from 'lucide-react'

// Figma 304-32738 – My To-Do List (exact specs from get_figma_data)
const SECTION_TITLE = 'My To-Do List'

const ICON_TYPES = {
  mail: { Icon: Mail, bg: '#E6FAFC', color: '#00CBDD' },
  call: { Icon: Phone, bg: '#F1E6FB', color: '#7704D3' },
  meeting: { Icon: Calendar, bg: '#FEF2E6', color: '#F47E00' },
  note: { Icon: FileText, bg: '#FAEBFC', color: '#CE32E0' },
  tick: { Icon: CheckCircle, bg: '#EBF8EF', color: '#00AA34' },
}

const mockPastDue = [
  { id: 1, title: 'Email sent to Sarah Hahnson', description: 'Sent proposal for marketing automation', action: 'Mark it Done', icon: 'mail' },
  { id: 2, title: 'Call with Michael Chen', description: 'Discussed enterprise requirements and pricing', action: 'Mark it Done', icon: 'call' },
  { id: 3, title: 'Team sync meeting', description: 'Weekly sales pipeline review', action: 'Mark it Done', icon: 'meeting' },
  { id: 4, title: 'Note added to David Kim', description: 'Interested in expanding current subscription', action: 'Mark it Done', icon: 'note' },
  { id: 5, title: 'Task Completed', description: 'Sent follow-up email to GlobalSoft', action: 'Mark it Done', icon: 'tick' },
]
const mockTomorrow = [
  { id: 6, title: 'Email sent to Sarah Hahnson', description: 'Sent proposal for marketing automation', action: 'Schedule', icon: 'mail' },
  { id: 7, title: 'Call with Michael Chen', description: 'Discussed enterprise requirements and pricing', action: 'Schedule', icon: 'call' },
]
const mockCompleted = [
  { id: 8, title: 'Email sent to Sarah Hahnson', description: 'Sent proposal for marketing automation', icon: 'mail' },
  { id: 9, title: 'Call with Michael Chen', description: 'Discussed enterprise requirements and pricing', icon: 'call' },
]

function TaskRow({ item, showButton = true }) {
  const { Icon, bg, color } = ICON_TYPES[item.icon] || ICON_TYPES.mail
  return (
    <div
      className="flex flex-row items-center gap-3 w-full min-w-0"
      style={{ gap: 12 }}
    >
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ padding: 8, background: bg, borderRadius: 32 }}
      >
        <Icon style={{ width: 16, height: 16, color }} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 10,
            lineHeight: 1.6,
            color: '#0F172A',
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 10,
            lineHeight: 1.6,
            color: '#64748B',
          }}
        >
          {item.description}
        </span>
      </div>
      {showButton && item.action && (
        <button
          type="button"
          className="flex-shrink-0 rounded transition-colors hover:bg-slate-50"
          style={{
            padding: '6px 12px',
            border: '1px solid #F1F5F9',
            borderRadius: 4,
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 10,
            lineHeight: 1.6,
            color: '#94A3B8',
          }}
        >
          {item.action}
        </button>
      )}
    </div>
  )
}

function TodoSection({ title, count, items, completed }) {
  return (
    <div className="flex flex-col gap-3">
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: 14,
          lineHeight: 1.43,
          color: completed ? '#00AA34' : '#64748B',
        }}
      >
        {title} ({count})
      </p>
      <div className="flex flex-col gap-3" style={{ gap: 12 }}>
        {items.map((item) => (
          <TaskRow key={item.id} item={item} showButton={!completed} />
        ))}
      </div>
    </div>
  )
}

export default function MyToDoList() {
  return (
    <div
      className="flex flex-col w-full h-full min-w-0 overflow-hidden"
      style={{
        width: '100%',
        maxWidth: 400,
        gap: 24,
      }}
    >
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-[20px]"
        style={{
          padding: 24,
          gap: 16,
          background: '#FFFFFF',
          border: '2px solid #F1F5F9',
          boxShadow: '4px 4px 26px 0px rgba(65, 65, 65, 0.06)',
        }}
      >
        {/* Title + divider – Figma: Frame 1000005738, gap 8 */}
        <div className="flex flex-col flex-shrink-0" style={{ gap: 8 }}>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.44,
              color: '#0F172A',
            }}
          >
            {SECTION_TITLE}
          </p>
          <div
            className="w-full"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, rgba(224,225,226,0) 0%, rgba(224,225,226,1) 47%, rgba(224,225,226,0.16) 94%)',
            }}
          />
        </div>

        {/* Past Due (5) */}
        <TodoSection title="Past Due" count={mockPastDue.length} items={mockPastDue} completed={false} />

        {/* Tomorrow (2) */}
        <TodoSection title="Tomorrow" count={mockTomorrow.length} items={mockTomorrow} completed={false} />

        {/* Divider */}
        <div
          className="w-full flex-shrink-0"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, rgba(224,225,226,0) 0%, rgba(224,225,226,1) 47%, rgba(224,225,226,0.16) 94%)',
          }}
        />

        {/* Completed (1) – section title green #00AA34 */}
        <TodoSection title="Completed" count={mockCompleted.length} items={mockCompleted} completed={true} />
      </div>
    </div>
  )
}
