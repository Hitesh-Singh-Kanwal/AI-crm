'use client'

import { useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

const COLORS = {
  border: '#F5F6F7',
  shadow: '0px 2px 5px 0px rgba(38, 51, 77, 0.03)',
}

const TUTORS = [
  { key: 't-1', initials: 'RG', name: 'Rachel Green', color: '#29CC39' },
  { key: 't-2', initials: 'RG', name: 'Rachel Green', color: '#FFCB33' },
  { key: 't-3', initials: 'RG', name: 'Rachel Green', color: '#CD3358' },
  { key: 't-4', initials: 'RG', name: 'Rachel Green', color: '#4CC9F0' },
  { key: 't-5', initials: 'RG', name: 'Rachel Green', color: '#CE32E0' },
  { key: 't-6', initials: 'RG', name: 'Rachel Green', color: '#7704D3' },
  { key: 't-7', initials: 'RG', name: 'Rachel Green', color: '#1DB165' },
]

const MIN_COL_W = 120  // px — horizontal scroll kicks in below this
const ROW_H = 70       // px per date row
const TIME_W = 60      // px for the date-number column
const HEADER_H = 70    // px for the tutor header row

const EVENT_VARIANTS = [
  { bg: '#EEFFEF', border: '#29CC39', pill: '#29CC39' },
  { bg: '#FFFBF1', border: '#FFCB33', pill: '#FFCB33' },
  { bg: '#FAEBEE', border: '#CD3358', pill: '#CD3358' },
  { bg: '#EAF7FF', border: '#4CC9F0', pill: '#4CC9F0' },
  { bg: '#F9EEFF', border: '#CE32E0', pill: '#CE32E0' },
  { bg: '#F4EDFF', border: '#7704D3', pill: '#7704D3' },
]
const TIME_SLOTS = [
  '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
  '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
]
const EVENT_LABEL = 'A Night in Roma- Mini Match'

/* ────────────────── small UI pieces ────────────────── */

function SegmentedButton({ active, children, className }) {
  return (
    <button
      type="button"
      className={[
        'h-10 px-4 text-[12px] leading-none select-none bg-white border border-[#F5F6F7]',
        active ? 'font-bold text-[#64748B]' : 'font-medium text-[#94A3B8]',
        className,
      ].filter(Boolean).join(' ')}
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

function IconCircleButton({ children, ariaLabel, onClick }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="h-10 w-10 rounded-full bg-white border border-[#F5F6F7] grid place-items-center"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

function SmallRoundedButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[20px] px-4 bg-white border border-[#F5F6F7] text-[12px] font-bold text-[#94A3B8]"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

/* ────────────────── calendar sub-components ────────────────── */

/**
 * The header row uses CSS table layout so each cell naturally gets
 * an equal share of the available width — exactly like <table> does,
 * but without any JS measurement.
 */
function TutorHeader({ tutors }) {
  return (
    // display:table fills 100% and distributes cells evenly
    <div
      style={{
        display: 'table',
        width: '100%',
        tableLayout: 'fixed',
        height: HEADER_H,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      {tutors.map((t) => (
        <div
          key={t.key}
          style={{
            display: 'table-cell',
            verticalAlign: 'middle',
            paddingLeft: 12,
            paddingRight: 12,
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div
              style={{
                height: 24, width: 24, borderRadius: '50%', flexShrink: 0,
                backgroundColor: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}
            >
              {t.initials}
            </div>
            <span
              style={{
                fontSize: 11, fontWeight: 500, color: '#64748B',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {t.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The grid body also uses CSS table layout. Each column cell is a
 * table-cell so width distributes automatically and exactly matches
 * the header above.
 */
function GridBody({ tutors, dates, events }) {
  // Build a lookup: row → col → event
  const eventMap = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      if (!map[e.row]) map[e.row] = {}
      map[e.row][e.col] = e
    })
    return map
  }, [events])

  return (
    <div style={{ position: 'relative' }}>
      {/* Row-by-row table layout */}
      {dates.map((d, rowIdx) => (
        <div
          key={d.key}
          style={{
            display: 'table',
            width: '100%',
            tableLayout: 'fixed',
            height: ROW_H,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {/* Date number cell */}
          <div
            style={{
              display: 'table-cell',
              width: TIME_W,
              verticalAlign: 'top',
              paddingTop: 8,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#94A3B8',
              borderRight: `1px solid ${COLORS.border}`,
            }}
          >
            {d.date}
          </div>

          {/* One cell per tutor */}
          {tutors.map((t, colIdx) => {
            const ev = eventMap[rowIdx]?.[colIdx]
            return (
              <div
                key={t.key}
                style={{
                  display: 'table-cell',
                  position: 'relative',
                  verticalAlign: 'top',
                  borderRight: colIdx < tutors.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  overflow: 'visible',
                }}
              >
                {ev && (
                  <EventCard event={ev} rowIdx={rowIdx} />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function EventCard({ event }) {
  const { span, bg, border, pill, time, label } = event
  const PAD = 4

  return (
    <div
      style={{
        position: 'absolute',
        inset: `${PAD}px`,
        // For multi-row events, extend height downward
        height: span * ROW_H - PAD * 2,
        zIndex: 10,
        borderRadius: 8,
        border: `1.5px solid ${border}`,
        backgroundColor: bg,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Time pill */}
      <div
        style={{
          backgroundColor: pill,
          borderRadius: 6,
          padding: '0 7px',
          height: 20,
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-start',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {time}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: '#0F172A',
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {label}
      </div>

      {/* Avatar stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ height: 20, width: 20, borderRadius: '50%', border: '2px solid #fff', backgroundColor: '#CBD5E1' }} />
        <div style={{ height: 20, width: 20, borderRadius: '50%', border: '2px solid #fff', backgroundColor: '#E2E8F0', marginLeft: -8 }} />
      </div>
    </div>
  )
}

/* ────────────────── page ────────────────── */

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const daysInMonth = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(),
    [currentMonth]
  )

  const monthDates = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => ({
      key: `d-${i + 1}`,
      date: String(i + 1).padStart(2, '0'),
    })),
    [currentMonth, daysInMonth]
  )

  const events = useMemo(() => {
    const list = []
    for (let di = 0; di < daysInMonth; di++) {
      for (let ti = 0; ti < TUTORS.length; ti++) {
        if ((di + ti) % 5 === 0 || (di + 2 * ti) % 11 === 0) {
          list.push({
            id: `e-${di}-${ti}`,
            col: ti,
            row: di,
            span: (di + ti) % 6 === 0 ? 2 : 1,
            ...EVENT_VARIANTS[(di + ti) % EVENT_VARIANTS.length],
            time: TIME_SLOTS[(di + ti) % TIME_SLOTS.length],
            label: EVENT_LABEL,
          })
        }
      }
    }
    return list
  }, [daysInMonth])

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <MainLayout title="Calendar" subtitle="">
      <div className="w-full h-full">
        <div
          className="bg-white rounded-[24px_0px_24px_24px] w-full flex flex-col"
          style={{ height: 'calc(100vh - 120px)' }}
        >
          {/* ── Toolbar ── */}
          <div className="shrink-0 px-6 pt-6 flex items-center justify-between">
            <SmallRoundedButton
              onClick={() => {
                const now = new Date()
                setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
              }}
            >
              Today
            </SmallRoundedButton>

            <div className="flex items-center gap-3">
              <IconCircleButton
                ariaLabel="Previous"
                onClick={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="h-4 w-4 text-[#94A3B8]" />
              </IconCircleButton>
              <div className="text-[12px] font-bold text-[#94A3B8]">{monthLabel}</div>
              <IconCircleButton
                ariaLabel="Next"
                onClick={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
              </IconCircleButton>
            </div>

            <div className="flex items-center">
              <SegmentedButton active={false} className="rounded-[30px_0px_0px_30px]">Year</SegmentedButton>
              <SegmentedButton active className="rounded-none border-l-0">Week</SegmentedButton>
              <SegmentedButton active={false} className="rounded-none border-l-0">Month</SegmentedButton>
              <SegmentedButton active={false} className="rounded-[0px_30px_30px_0px] border-l-0">Day</SegmentedButton>
            </div>
          </div>

          {/* ── Calendar area ── */}
          <div className="flex-1 min-h-0 px-6 pt-6 pb-6">
            <div
              className="w-full h-full overflow-auto rounded-[12px] border border-[#F5F6F7]"
              /*
                min-width forces horizontal scroll when there are many tutors.
                TIME_W + N * MIN_COL_W is the threshold.
              */
              style={{ minWidth: TIME_W + TUTORS.length * MIN_COL_W }}
            >
              {/* Sticky header: clock cell + tutor chips */}
              <div
                className="sticky top-0 z-20 bg-white flex"
                style={{ borderBottom: `1px solid ${COLORS.border}` }}
              >
                {/* Clock cell */}
                <div
                  style={{
                    flexShrink: 0,
                    width: TIME_W,
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Clock className="h-4 w-4 text-[#94A3B8]" />
                </div>

                {/* Tutor chips — flex-1 on the wrapper, each chip flex:1 */}
                <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                  {TUTORS.map((t, i) => (
                    <div
                      key={t.key}
                      style={{
                        flex: 1,
                        minWidth: MIN_COL_W,
                        height: HEADER_H,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: 12,
                        paddingRight: 12,
                        overflow: 'hidden',
                        borderRight: i < TUTORS.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                      }}
                    >
                      <div
                        style={{
                          height: 24, width: 24, borderRadius: '50%', flexShrink: 0,
                          backgroundColor: t.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}
                      >
                        {t.initials}
                      </div>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 500, color: '#64748B',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body rows */}
              {monthDates.map((d, rowIdx) => (
                <div
                  key={d.key}
                  style={{
                    display: 'flex',
                    height: ROW_H,
                    borderBottom: `1px solid ${COLORS.border}`,
                    position: 'relative',
                  }}
                >
                  {/* Date number */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: TIME_W,
                      paddingTop: 8,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#94A3B8',
                      borderRight: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {d.date}
                  </div>

                  {/* Tutor cells */}
                  {TUTORS.map((t, colIdx) => {
                    const ev = events.find((e) => e.row === rowIdx && e.col === colIdx)
                    return (
                      <div
                        key={t.key}
                        style={{
                          flex: 1,
                          minWidth: MIN_COL_W,
                          position: 'relative',
                          borderRight: colIdx < TUTORS.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                          overflow: 'visible',
                        }}
                      >
                        {ev && <EventCard event={ev} />}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}