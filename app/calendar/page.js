"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import MainLayout from "@/components/layout/MainLayout";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import AppointmentComposerPanel from "./components/AppointmentComposerPanel";
import EventDetailPanel from "./components/EventDetailPanel";
import api from "@/lib/api";

const COLORS = {
  border: "hsl(var(--border))",
  shadow: "0px 2px 5px 0px hsl(var(--foreground) / 0.06)",
};

// Visually distinct hues — works on both light and dark backgrounds
const CALENDAR_PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ef4444", // red
];

const VIEW_MODE = { DAY: "day", WEEK: "week", MONTH: "month", LIST: "list" };
const FULLCALENDAR_VIEW = {
  [VIEW_MODE.DAY]: "timeGridDay",
  [VIEW_MODE.WEEK]: "timeGridWeek",
  [VIEW_MODE.MONTH]: "dayGridMonth",
};
const FULL_START_HOUR = 6;
const FULL_END_HOUR = 22;
const COMPACT_START_HOUR = 8;
const COMPACT_END_HOUR = 21;
const DAY_ROW_HEIGHT = 72;
const DAY_LEFT_RAIL_WIDTH = 86;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mapViewTypeToMode(viewType) {
  if (viewType === "timeGridDay") return VIEW_MODE.DAY;
  if (viewType === "timeGridWeek") return VIEW_MODE.WEEK;
  return VIEW_MODE.MONTH;
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeekSunday(date) {
  const base = new Date(date);
  base.setDate(base.getDate() - base.getDay());
  base.setHours(0, 0, 0, 0);
  return base;
}

function formatHeaderLabel(date, mode) {
  if (mode === VIEW_MODE.DAY) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (mode === VIEW_MODE.WEEK) {
    const start = startOfWeekSunday(date);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    return `${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  }

  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function deriveInstructors(appointments) {
  const seen = {};
  let colorIdx = 0;
  appointments.forEach((appt) => {
    const id = String(appt.teacherID?._id || appt.teacherID || "");
    const name = appt.teacherID?.name || "";
    if (id && id !== "undefined" && !seen[id]) {
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (name.slice(0, 2) || "??").toUpperCase();
      seen[id] = {
        key: id,
        initials,
        name,
        color: CALENDAR_PALETTE[colorIdx % CALENDAR_PALETTE.length],
      };
      colorIdx += 1;
    }
  });
  return Object.values(seen);
}

function buildColorMap(instructors) {
  const map = {};
  instructors.forEach((inst) => {
    map[inst.key] = inst.color;
  });
  return map;
}

// If an event has no explicit terminal status and its end time is in the past,
// treat it as visually "completed" without writing to the backend.
function deriveEffectiveStatus(appt) {
  const explicit = appt.status;
  if (explicit && explicit !== "scheduled") return explicit;
  if (appt.endDateTime && new Date(appt.endDateTime) < new Date()) return "completed";
  return explicit || "scheduled";
}

function transformAppointments(appointments, colorMap) {
  return appointments.map((appt) => {
    const teacherId = String(
      appt.teacherID?._id || appt.teacherID || "unknown",
    );
    const teacherName = appt.teacherID?.name || "";
    const color =
      appt.lessonID?.color || appt.color || CALENDAR_PALETTE[0];

    const start = new Date(appt.startDateTime);
    const end = new Date(appt.endDateTime);
    const isAllDay = Boolean(appt.allDay);
    const effectiveStatus = deriveEffectiveStatus(appt);
    const isCancelled = effectiveStatus === "cancelled";
    const isCompleted = effectiveStatus === "completed";

    const customerNames = Array.isArray(appt.customerIDs)
      ? appt.customerIDs
          .map((c) => (typeof c === "object" ? c.name || c.email : ""))
          .filter(Boolean)
      : [];

    return {
      id: String(appt._id || appt.id),
      title: appt.title || "Event",
      start,
      end,
      allDay: isAllDay,
      backgroundColor: isAllDay ? "var(--studio-primary)" : "transparent",
      borderColor: "transparent",
      textColor: isAllDay ? "rgb(var(--studio-on-primary-rgb))" : "inherit",
      extendedProps: {
        tutorName: teacherName,
        tutorKey: teacherId,
        status: appt.status,
        effectiveStatus,
        color: isCancelled ? "hsl(var(--muted-foreground))" : isCompleted ? color : color,
        customerNames,
        eventType: appt.type,
        publicNote: appt.notes,
        // Inject effectiveStatus into raw so EventDetailPanel sees the correct status
        raw: { ...appt, effectiveStatus },
      },
    };
  });
}

function SegmentedButton({ active, children, className, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 px-4 text-[12px] leading-none select-none bg-background border border-border",
        active
          ? "font-bold text-foreground"
          : "font-medium text-muted-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  );
}

function IconCircleButton({ children, ariaLabel, onClick }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="h-10 w-10 rounded-full bg-background border border-border grid place-items-center"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  );
}

function SmallRoundedButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[20px] px-4 bg-background border border-border text-[12px] font-bold text-muted-foreground"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  );
}

const EVENT_TYPE_LABEL = {
  private: "Appt",
  lesson:  "Group",
  trial:   "Intro",
  event:   "To Do",
  record:  "Record",
};

const STATUS_STYLES = {
  scheduled:          { bg: "bg-blue-100 dark:bg-blue-950/60",    text: "text-blue-700 dark:text-blue-300",    label: "Scheduled" },
  completed:          { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", label: "Completed" },
  cancelled_no_charge:{ bg: "bg-zinc-100 dark:bg-zinc-800/60",    text: "text-zinc-500 dark:text-zinc-400",    label: "Cancelled" },
  cancelled_charged:  { bg: "bg-red-100 dark:bg-red-950/60",      text: "text-red-700 dark:text-red-300",      label: "Cancelled – Charged" },
  no_show_no_charge:  { bg: "bg-orange-100 dark:bg-orange-950/60",text: "text-orange-600 dark:text-orange-400",label: "No Show" },
  no_show_charged:    { bg: "bg-orange-100 dark:bg-orange-950/60",text: "text-orange-700 dark:text-orange-300",label: "No Show – Charged" },
};

function TypeBadge({ type }) {
  if (!type) return null;
  const label = EVENT_TYPE_LABEL[type] ?? type;
  return (
    <span className="shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase leading-none bg-black/10 text-foreground/70">
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status || status === "scheduled") return null;
  const s = STATUS_STYLES[status];
  if (!s) return null;
  return (
    <span className={`shrink-0 rounded px-1 py-px text-[8px] font-semibold leading-none ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── List (Agenda) View ───────────────────────────────────────────────────────

function formatListDayLabel(date) {
  const today    = new Date();
  const tomorrow = addDays(today, 1);
  if (isSameDate(date, today))    return "Today";
  if (isSameDate(date, tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function ListEventRow({ event, onEventClick }) {
  const { color, tutorName, customerNames, eventType, status, raw } =
    event.extendedProps || {};
  const accentColor   = color || "var(--studio-primary)";
  const isCancelled   = status === "cancelled";
  const typeLabel     = EVENT_TYPE_LABEL[eventType] ?? eventType ?? "";
  const statusStyle   = STATUS_STYLES[status];

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const startLabel = fmt(event.start);
  const endLabel   = fmt(event.end);
  const durationMins =
    event.end && event.start
      ? (new Date(event.end) - new Date(event.start)) / 60000
      : 0;
  const durationLabel = (() => {
    if (!durationMins) return "";
    if (durationMins < 60) return `${durationMins}m`;
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  })();

  const initials = (tutorName || "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const customers =
    Array.isArray(customerNames) && customerNames.length > 0
      ? customerNames.join(", ")
      : null;

  return (
    <button
      type="button"
      onClick={() => raw && onEventClick?.(raw)}
      className={`w-full text-left group flex items-stretch gap-0 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors overflow-hidden ${isCancelled ? "opacity-60" : ""}`}
    >
      {/* Accent left bar */}
      <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />

      {/* Time column */}
      <div className="w-28 shrink-0 flex flex-col justify-center px-3 py-3 border-r border-border">
        {event.allDay ? (
          <span className="text-[11px] font-semibold text-muted-foreground">All day</span>
        ) : (
          <>
            <span className="text-[12px] font-bold text-foreground leading-tight">{startLabel}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{endLabel}</span>
            {durationLabel && (
              <span className="mt-0.5 text-[10px] text-muted-foreground/70 leading-tight">{durationLabel}</span>
            )}
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[13px] font-semibold text-foreground leading-tight ${
              isCancelled ? "line-through text-muted-foreground" : ""
            }`}
          >
            {event.title}
          </span>
          {typeLabel && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 18%, transparent)`,
                color: accentColor,
              }}
            >
              {typeLabel}
            </span>
          )}
          {statusStyle && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider leading-none ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
          )}
        </div>
        {customers && (
          <div className="text-[11px] text-muted-foreground leading-tight truncate">
            {customers}
          </div>
        )}
      </div>

      {/* Teacher column */}
      {tutorName && (
        <div className="flex items-center gap-2 px-4 py-3 border-l border-border shrink-0">
          <span
            className="h-6 w-6 rounded-full text-[9px] font-bold grid place-items-center text-white shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {initials}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
            {tutorName}
          </span>
        </div>
      )}
    </button>
  );
}

function ListCalendarView({ events, focusDate, onEventClick }) {
  // Show a 14-day window starting from focusDate
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(focusDate, i));
  }, [focusDate]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      day,
      events: events
        .filter(
          (e) =>
            !e.allDay
              ? isSameDate(new Date(e.start), day)
              : isSameDate(new Date(e.start), day),
        )
        .sort(
          (a, b) =>
            new Date(a.start) - new Date(b.start) ||
            new Date(a.end) - new Date(b.end),
        ),
    }));
  }, [events, days]);

  const hasAny = grouped.some((g) => g.events.length > 0);

  return (
    <div className="h-full overflow-auto rounded-[12px] border border-border bg-background">
      <div className="divide-y divide-border">
        {grouped.map(({ day, events: dayEvents }) => {
          const isToday   = isSameDate(day, new Date());
          const isPast    = day < new Date() && !isToday;
          return (
            <div key={day.toISOString()} className={isPast ? "opacity-50" : ""}>
              {/* Day header */}
              <div
                className={`sticky top-0 z-10 flex items-center gap-3 px-5 py-2.5 border-b border-border ${
                  isToday
                    ? "bg-[color-mix(in_srgb,var(--studio-primary)_10%,hsl(var(--background)))]"
                    : "bg-muted/50"
                }`}
              >
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-[12px] font-bold shrink-0 ${
                    isToday
                      ? "bg-[var(--studio-primary)] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day.getDate()}
                </div>
                <span
                  className={`text-[12px] font-semibold ${
                    isToday ? "text-[var(--studio-primary)]" : "text-muted-foreground"
                  }`}
                >
                  {formatListDayLabel(day)}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  {dayEvents.length > 0
                    ? `${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}`
                    : "No events"}
                </span>
              </div>

              {/* Events */}
              {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-2 px-4 py-3">
                  {dayEvents.map((event) => (
                    <ListEventRow
                      key={event.id}
                      event={event}
                      onEventClick={onEventClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-5 py-4 text-[11px] text-muted-foreground/50 italic">
                  No events scheduled
                </div>
              )}
            </div>
          );
        })}

        {!hasAny && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <span className="text-4xl">📅</span>
            <p className="text-[13px] font-semibold text-muted-foreground">No events in this period</p>
            <p className="text-[11px] text-muted-foreground/60">Try navigating to a different date range</p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderEventContent(info) {
  const { tutorName, status, effectiveStatus, color, customerNames, eventType } =
    info.event.extendedProps || {};
  const cancelled = effectiveStatus === "cancelled_no_charge" || effectiveStatus === "cancelled_charged";
  const completed = effectiveStatus === "completed";
  const accentColor = color || "var(--studio-primary)";

  if (info.event.allDay) {
    return (
      <div
        className="h-full w-full px-2 py-0.5 flex items-center rounded text-[10px] font-semibold truncate"
        style={{
          backgroundColor: "var(--studio-primary)",
          color: "rgb(var(--studio-on-primary-rgb))",
        }}
      >
        {info.event.title}
      </div>
    );
  }

  const durationMins =
    info.event.end && info.event.start
      ? (info.event.end - info.event.start) / 60000
      : 60;

  const fmt = (d) =>
    d
      ? d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const startLabel = fmt(info.event.start);
  const endLabel = fmt(info.event.end);
  const timeRange =
    startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel;

  const durationLabel = (() => {
    if (durationMins < 60) return `${durationMins}m`;
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  })();

  // thresholds: <30 min → title only; 30–44 min → title + time; 45+ → all details
  const showTime = durationMins >= 30;
  const showDetails = durationMins >= 45;

  const initials = (tutorName || "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const customersLabel =
    Array.isArray(customerNames) && customerNames.length > 0
      ? customerNames.join(", ")
      : null;

  return (
    <div
      className={`min-h-[100%] w-full overflow-visible rounded-[5px] flex flex-col relative ${cancelled ? "opacity-50" : ""} ${completed ? "opacity-80" : ""}`}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        backgroundColor: `color-mix(in srgb, ${accentColor} 28%, hsl(var(--card)))`,
      }}
    >
      {/* Completed green check */}
      {completed && (
        <span
          className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center z-10 shrink-0"
          title="Completed"
        >
          <svg viewBox="0 0 10 10" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1.5,5 4,7.5 8.5,2.5" />
          </svg>
        </span>
      )}
      <div className="px-1.5 py-0.5 flex flex-col overflow-visible min-h-full">
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <span
            className={`text-[10px] font-bold text-foreground leading-tight truncate ${cancelled ? "line-through" : ""}`}
          >
            {info.event.title}
          </span>
          <TypeBadge type={eventType} />
        </div>
        {status && status !== "scheduled" && (
          <div className="shrink-0 mt-0.5">
            <StatusBadge status={status} />
          </div>
        )}
        {showTime && (timeRange || durationLabel) && (
          <div className="text-[9px] text-muted-foreground leading-tight truncate shrink-0">
            {timeRange}{timeRange && durationLabel ? ` (${durationLabel})` : durationLabel}
          </div>
        )}
        {showDetails && customersLabel && (
          <div className="text-[9px] text-foreground/70 leading-tight truncate shrink-0">
            {customersLabel}
          </div>
        )}
        {showDetails && tutorName && (
          <div className="flex items-center gap-1 mt-auto pb-0.5 shrink-0 overflow-hidden">
            <span
              className="h-3 w-3 rounded-full text-[7px] font-bold grid place-items-center text-white shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {initials.charAt(0)}
            </span>
            <span className="text-[8px] text-muted-foreground truncate">
              {tutorName}
            </span>
          </div>
        )}
        {showDetails && info.event.extendedProps?.publicNote && (
          <div className="text-[8px] text-black dark:text-white italic leading-tight truncate shrink-0 mt-0.5 opacity-90 border-t border-black/10 dark:border-white/10 pt-0.5">
            {info.event.extendedProps.publicNote}
          </div>
        )}
      </div>
    </div>
  );
}

function formatHourLabel(hour24) {
  if (hour24 === 0) return "12 AM";
  if (hour24 < 12) return `${hour24} AM`;
  if (hour24 === 12) return "12 PM";
  return `${hour24 - 12} PM`;
}

function formatTime(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function layoutOverlappingEvents(events) {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.start) - new Date(b.start) ||
      new Date(a.end) - new Date(b.end),
  );
  const active = [];
  const laidOut = [];
  let maxLanes = 1;

  sorted.forEach((event) => {
    const eventStart = new Date(event.start);
    for (let i = active.length - 1; i >= 0; i--) {
      if (new Date(active[i].end) <= eventStart) active.splice(i, 1);
    }

    const used = new Set(active.map((e) => e.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;

    const withLane = { ...event, lane };
    active.push(withLane);
    laidOut.push(withLane);
    maxLanes = Math.max(maxLanes, active.length, lane + 1);
  });

  return laidOut.map((event) => ({ ...event, totalLanes: maxLanes }));
}

const UNASSIGNED_KEY = "__unassigned__";

function deriveTutorsFromEvents(events, passedTutors) {
  if (passedTutors.length > 0) return passedTutors;
  const seen = {};
  events.forEach((event) => {
    const key = event.extendedProps?.tutorKey || UNASSIGNED_KEY;
    if (!seen[key]) {
      const name =
        event.extendedProps?.tutorName ||
        (key === UNASSIGNED_KEY ? "Unassigned" : key);
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (name.slice(0, 2) || "??").toUpperCase();
      seen[key] = {
        key,
        name,
        initials,
        color:
          key === UNASSIGNED_KEY
            ? "hsl(var(--muted-foreground))"
            : event.extendedProps?.color || CALENDAR_PALETTE[0],
      };
    }
  });
  return Object.values(seen);
}

function TutorDayCalendar({
  startHour,
  endHour,
  focusDate,
  now,
  dayTimedEvents,
  dayAllDayEvents,
  tutors,
  allEvents,
  onEventClick,
  onSlotClick,
  customSlotMins = 30,
  slotAlignMins = 0,
}) {
  const totalMins = (endHour - startHour) * 60;
  const slotsCount = Math.floor(totalMins / customSlotMins);
  const dayHeight = (slotsCount + 1) * DAY_ROW_HEIGHT;

  const effectiveTutors = tutors.slice(0, 5);

  const byTutorTimed = useMemo(() => {
    const map = {};
    effectiveTutors.forEach((tutor) => {
      const filtered = dayTimedEvents.filter((event) => {
        const key = event.extendedProps?.tutorKey || "unknown";
        return key === tutor.key;
      });
      map[tutor.key] = layoutOverlappingEvents(filtered);
    });
    return map;
  }, [dayTimedEvents, effectiveTutors]);

  const byTutorAllDay = useMemo(() => {
    const map = {};
    effectiveTutors.forEach((tutor) => {
      map[tutor.key] = dayAllDayEvents.filter((event) => {
        const key = event.extendedProps?.tutorKey || "unknown";
        return key === tutor.key;
      });
    });
    return map;
  }, [dayAllDayEvents, effectiveTutors]);

  const weekCountByTutor = useMemo(() => {
    const map = {};
    const weekStart = startOfWeekSunday(focusDate);
    const weekEnd = addDays(weekStart, 7);
    allEvents.forEach((event) => {
      const d = new Date(event.start);
      if (d >= weekStart && d < weekEnd) {
        const key = event.extendedProps?.tutorKey || "unknown";
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [allEvents, focusDate]);

  const isToday = isSameDate(focusDate, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayStartMins = startHour * 60 + slotAlignMins;
  const nowOffset =
    isToday && nowMinutes >= dayStartMins && nowMinutes <= endHour * 60
      ? ((nowMinutes - dayStartMins) / customSlotMins) * DAY_ROW_HEIGHT
      : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-border bg-background shadow-sm">
      <div className="flex shrink-0 border-b border-border bg-muted/40">
        <div className="w-[86px] shrink-0 border-r border-border" />
        {effectiveTutors.map((tutor, idx) => (
          <div
            key={tutor.key}
            className="flex-1 px-3 py-2.5 text-center"
            style={{
              borderRight:
                idx < effectiveTutors.length - 1
                  ? "1px solid hsl(var(--border))"
                  : "none",
            }}
          >
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {tutor.initials || "T"}
              </span>
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[11px] font-bold text-foreground truncate max-w-full">
                  {tutor.name || tutor.label || "Unknown"}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  Today
                  <span className="text-primary font-bold">
                    {" "}
                    &mdash;{" "}
                    {(byTutorTimed[tutor.key]?.length ?? 0) +
                      (byTutorAllDay[tutor.key]?.length ?? 0)}
                    /{weekCountByTutor[tutor.key] ?? 0}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex h-10 border-b border-border bg-muted/40">
          <div className="w-[86px] shrink-0 border-r border-border px-2 py-2 text-[10px] font-medium text-muted-foreground">
            All day
          </div>
          {effectiveTutors.map((tutor, idx) => (
            <div
              key={`allday-${tutor.key}`}
              className="flex-1 px-1.5 py-1"
              style={{
                borderRight:
                  idx < effectiveTutors.length - 1
                    ? "1px solid hsl(var(--border))"
                    : "none",
              }}
            >
              {(byTutorAllDay[tutor.key] || []).slice(0, 1).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${event.extendedProps?.color || "var(--studio-primary)"} 28%, hsl(var(--card)))`,
                    borderLeft: `3px solid ${event.extendedProps?.color || "var(--studio-primary)"}`,
                    color:
                      event.extendedProps?.color || "var(--studio-primary)",
                  }}
                >
                  <span className="truncate">{event.title}</span>
                  <TypeBadge type={event.extendedProps?.eventType} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="relative flex">
          <div
            className="relative w-[86px] shrink-0 border-r border-border"
            style={{ height: dayHeight }}
          >
            {Array.from({ length: slotsCount + 1 }).map((_, idx) => {
              const currentMins = dayStartMins + idx * customSlotMins;
              const h = Math.floor(currentMins / 60);
              const m = currentMins % 60;
              const isFirst = idx === 0;
              const isTopOfHour = m === 0;
              const isCustomSize = customSlotMins !== 30;
              const label = (isFirst || isTopOfHour || isCustomSize) 
                ? `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`
                : "";

              return (
                <div
                  key={idx}
                  className="absolute left-0 right-0"
                  style={{ top: idx * DAY_ROW_HEIGHT }}
                >
                  <div className="-translate-y-1/2 px-2 text-[10px] font-medium text-muted-foreground">
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {effectiveTutors.map((tutor, colIdx) => (
            <div
              key={`${tutor.key}-day-col`}
              className="relative flex-1 bg-muted/25 cursor-pointer"
              style={{
                height: dayHeight,
                borderRight:
                  colIdx < effectiveTutors.length - 1
                    ? "1px solid hsl(var(--border))"
                    : "none",
              }}
              onClick={(e) => {
                if (e.target.closest("[data-event]")) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                const slotIdx = Math.floor(offsetY / DAY_ROW_HEIGHT);
                const totalSlotMins = dayStartMins + slotIdx * customSlotMins;
                const h = Math.floor(totalSlotMins / 60);
                const m = totalSlotMins % 60;
                onSlotClick?.({
                  date: focusDate.toISOString().slice(0, 10),
                  time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
                });
              }}
            >
              {Array.from({ length: slotsCount + 1 }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-b border-border/50"
                  style={{ top: idx * DAY_ROW_HEIGHT, height: DAY_ROW_HEIGHT }}
                />
              ))}

              {(byTutorTimed[tutor.key] || []).map((event) => {
                const s = new Date(event.start);
                const e = new Date(event.end);
                const startMins = s.getHours() * 60 + s.getMinutes();
                const endMins = e.getHours() * 60 + e.getMinutes();
                const duration = endMins - startMins;

                const top =
                  ((startMins - dayStartMins) / customSlotMins) * DAY_ROW_HEIGHT;
                const height = (duration / customSlotMins) * DAY_ROW_HEIGHT;

                const widthPercent = 100 / (event.totalLanes || 1);
                const leftPercent = (event.lane || 0) * widthPercent;

                const accentColor =
                  event.extendedProps?.color || "var(--studio-primary)";
                const isCancelledEvent =
                  event.extendedProps?.effectiveStatus === "cancelled";
                const initials = (event.extendedProps?.tutorName || "?").charAt(0).toUpperCase();
                const dayEventType = event.extendedProps?.eventType;

                return (
                  <div
                    key={event.id}
                    data-event="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event.extendedProps?.raw);
                    }}
                    className={`absolute overflow-visible cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md rounded-lg ${
                      isCancelledEvent ? "opacity-50" : ""
                    } ${
                      event.extendedProps?.effectiveStatus === "completed" ? "opacity-80" : ""
                    }`}
                    style={{
                      top,
                      minHeight: height,
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      borderLeft: `3px solid ${accentColor}`,
                      backgroundColor: `color-mix(in srgb, ${accentColor} 28%, hsl(var(--card)))`,
                      zIndex: 10,
                    }}
                  >
                    {/* Completed green check */}
                    {event.extendedProps?.effectiveStatus === "completed" && (
                      <span
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center z-10"
                        title="Completed"
                      >
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1.5,5 4,7.5 8.5,2.5" />
                        </svg>
                      </span>
                    )}
                    <div className="min-h-full flex flex-col px-2 py-1 overflow-visible">
                      <div className="flex items-center gap-1 min-w-0 shrink-0">
                        <span
                          className={`text-[11px] font-bold text-foreground leading-tight truncate ${isCancelledEvent ? "line-through" : ""}`}
                        >
                          {event.title}
                        </span>
                        <TypeBadge type={dayEventType} />
                      </div>
                      {height >= 32 && (
                        <div className="text-[9px] text-muted-foreground leading-tight truncate shrink-0">
                          {formatTime(event.start)} – {formatTime(event.end)}
                        </div>
                      )}
                      {height >= 56 &&
                        event.extendedProps?.customerNames?.length > 0 && (
                          <div className="text-[9px] text-foreground/70 truncate leading-tight shrink-0">
                            {event.extendedProps.customerNames.join(", ")}
                          </div>
                        )}
                      {height >= 56 && event.extendedProps?.tutorName && (
                        <div className="flex items-center gap-1 mt-auto pb-0.5 shrink-0 overflow-hidden">
                          <span
                            className="h-4 w-4 rounded-full text-[8px] font-bold grid place-items-center text-white shrink-0"
                            style={{ backgroundColor: accentColor }}
                          >
                            {initials}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {event.extendedProps.tutorName}
                          </span>
                        </div>
                      )}
                      {height >= 72 && event.extendedProps?.publicNote && (
                        <div className="text-[9px] text-black dark:text-white italic truncate leading-tight shrink-0 mt-1 opacity-90 border-t border-black/10 dark:border-white/10 pt-1">
                          {event.extendedProps.publicNote}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {nowOffset !== null && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-30"
              style={{ top: nowOffset }}
            >
              <div className="relative flex items-center">
                <div className="absolute -left-[86px] flex h-5 w-[86px] items-center justify-end pr-2">
                  <div className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-brand-foreground shadow-sm">
                    {formatTime(now)}
                  </div>
                </div>
                <div className="h-px flex-1 bg-brand" />
                <div className="h-2 w-2 rounded-full bg-brand" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function SlotSizePicker({ value, onApply }) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [minutes, setMinutes] = useState(value);

  function handleApply() {
    const m = parseInt(minutes, 10);
    if (m > 0 && m <= 240) {
      const [, startMins] = startTime.split(":").map(Number);
      onApply(m, startMins);
      setOpen(false);
    }
  }

  const isActive = value !== 30;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "h-10 rounded-[20px] border px-4 text-[12px] font-bold transition-colors inline-flex items-center gap-1.5",
          isActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background text-foreground hover:bg-muted",
        ].join(" ")}
        style={{ boxShadow: COLORS.shadow }}
      >
        Slot: {value}m
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-popover shadow-lg p-3 z-50 space-y-4"
        >
          <p className="text-[11px] font-semibold text-foreground">Custom Slot Size</p>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-[10px] font-medium text-muted-foreground">Alignment (Start)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-medium text-muted-foreground">Minutes</label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[30, 45, 50, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                    Number(minutes) === m
                      ? "bg-primary border-primary text-white"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => { onApply(30, 0); setOpen(false); }}
              className="h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-muted-foreground hover:bg-muted/40"
            >
              Reset (30m)
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!minutes || minutes <= 0 || minutes > 240}
              className="h-8 rounded-lg bg-brand text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: "all",                label: "All Statuses" },
  { value: "scheduled",          label: "Scheduled" },
  { value: "completed",          label: "Completed" },
  { value: "cancelled_no_charge",label: "Cancelled – No Charge" },
  { value: "cancelled_charged",  label: "Cancelled – Charged" },
  { value: "no_show_no_charge",  label: "No Show – No Charge" },
  { value: "no_show_charged",    label: "No Show – Charged" },
];

const STATUS_DOT = {
  scheduled:           "bg-blue-400",
  completed:           "bg-emerald-400",
  cancelled_no_charge: "bg-zinc-400",
  cancelled_charged:   "bg-red-400",
  no_show_no_charge:   "bg-orange-300",
  no_show_charged:     "bg-orange-500",
};

function StatusFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = STATUS_FILTER_OPTIONS.find((o) => o.value === value) ?? STATUS_FILTER_OPTIONS[0];
  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 rounded-[20px] border border-border bg-background px-4 text-[12px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
        style={{ boxShadow: COLORS.shadow }}
      >
        {value !== "all" && (
          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[value] ?? "bg-muted-foreground"}`} />
        )}
        {current.label}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-popover shadow-lg py-1.5 z-50"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
                value === opt.value
                  ? "font-bold text-foreground bg-muted/60"
                  : "text-foreground hover:bg-muted/40"
              }`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                opt.value === "all" ? "bg-muted-foreground" : STATUS_DOT[opt.value] ?? "bg-muted-foreground"
              }`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
        className="h-10 rounded-[20px] border border-border bg-background px-5 text-[12px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
      >
        Services
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg py-1.5 z-50">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navigate to
          </div>
          <Link
            href="/calendar/services"
            onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            Services
          </Link>
          <Link
            href="/calendar/packages"
            onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            Packages
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODE.WEEK);
  const [isAppointmentPanelOpen, setIsAppointmentPanelOpen] = useState(false);
  const [nowMarker, setNowMarker] = useState(() => Date.now());
  const now = useMemo(() => new Date(nowMarker), [nowMarker]);

  const [events, setEvents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotSelection, setSlotSelection] = useState(null);
  const [compactHours, setCompactHours] = useState(false);
  const [hideEmptySlots, setHideEmptySlots] = useState(false);
  const [customSlotMins, setCustomSlotMins] = useState(30);
  const [slotAlignMins, setSlotAlignMins] = useState(0);

  const dayStartHour = compactHours ? COMPACT_START_HOUR : FULL_START_HOUR;
  const dayEndHour   = compactHours ? COMPACT_END_HOUR   : FULL_END_HOUR;

  // slotDuration string for FullCalendar (HH:MM:SS)
  const slotDurationStr = useMemo(() => {
    const h = Math.floor(customSlotMins / 60);
    const m = customSlotMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  }, [customSlotMins]);

  const rangeStart = useMemo(() => {
    const monthStart = new Date(
      focusDate.getFullYear(),
      focusDate.getMonth(),
      1,
    );
    return addDays(startOfWeekSunday(monthStart), -28);
  }, [focusDate]);

  const rangeEnd = useMemo(() => addDays(rangeStart, 120), [rangeStart]);

  const fetchCalendarEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    const params = new URLSearchParams({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      limit: 1000,
    });
    const result = await api.get(`/api/calendar?${params}`);
    if (result.success && Array.isArray(result.data)) {
      const derived = deriveInstructors(result.data);
      const colorMap = buildColorMap(derived);
      setEvents(transformAppointments(result.data, colorMap));
      if (derived.length > 0) setInstructors(derived);
    }
    setIsLoadingEvents(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const headerLabel = useMemo(() => {
    if (viewMode === VIEW_MODE.LIST) {
      const end = addDays(focusDate, 13);
      const startStr = focusDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr   = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} – ${endStr}`;
    }
    return formatHeaderLabel(focusDate, viewMode);
  }, [focusDate, viewMode]);

  // Apply status filter — compare against effectiveStatus (auto-completed for past events)
  const filteredEvents = useMemo(() => {
    if (statusFilter === "all") return events;
    return events.filter(
      (e) => (e.extendedProps?.effectiveStatus ?? e.extendedProps?.status ?? "scheduled") === statusFilter,
    );
  }, [events, statusFilter]);

  // When hideEmptySlots is on, shrink the visible hour range to where events actually are
  const { effectiveSlotMin, effectiveSlotMax, effectiveSlotMinStr, effectiveSlotMaxStr } = useMemo(() => {
    if (!hideEmptySlots) {
      return {
        effectiveSlotMin: dayStartHour,
        effectiveSlotMax: dayEndHour,
        effectiveSlotMinStr: `${String(dayStartHour).padStart(2, "0")}:${String(slotAlignMins).padStart(2, "0")}:00`,
        effectiveSlotMaxStr: `${String(dayEndHour).padStart(2, "0")}:00:00`,
      };
    }
    const weekStart = startOfWeekSunday(focusDate);
    const weekEnd = addDays(weekStart, 7);
    const visible = filteredEvents.filter((e) => {
      const s = new Date(e.start);
      return !e.allDay && s >= weekStart && s < weekEnd;
    });
    if (visible.length === 0) {
      return {
        effectiveSlotMin: dayStartHour,
        effectiveSlotMax: dayEndHour,
        effectiveSlotMinStr: `${String(dayStartHour).padStart(2, "0")}:${String(slotAlignMins).padStart(2, "0")}:00`,
        effectiveSlotMaxStr: `${String(dayEndHour).padStart(2, "0")}:00:00`,
      };
    }
    let minH = 24, maxH = 0;
    visible.forEach((e) => {
      const s = new Date(e.start);
      const end = new Date(e.end);
      minH = Math.min(minH, s.getHours());
      maxH = Math.max(maxH, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
    });
    return {
      effectiveSlotMin: Math.max(0, minH - 1),
      effectiveSlotMax: Math.min(24, maxH + 1),
      effectiveSlotMinStr: `${String(Math.max(0, minH - 1)).padStart(2, "0")}:${String(slotAlignMins).padStart(2, "0")}:00`,
      effectiveSlotMaxStr: `${String(Math.min(24, maxH + 1)).padStart(2, "0")}:00:00`,
    };
  }, [hideEmptySlots, filteredEvents, focusDate, dayStartHour, dayEndHour, slotAlignMins]);
  
  const effectiveSlotLabelInterval = useMemo(() => {
    if (customSlotMins === 30) return "01:00:00";
    return slotDurationStr;
  }, [customSlotMins, slotDurationStr]);

  const dayTimedEvents = useMemo(
    () =>
      filteredEvents.filter(
        (event) =>
          !event.allDay && isSameDate(new Date(event.start), focusDate),
      ),
    [filteredEvents, focusDate],
  );
  const dayAllDayEvents = useMemo(
    () =>
      filteredEvents.filter(
        (event) => event.allDay && isSameDate(new Date(event.start), focusDate),
      ),
    [filteredEvents, focusDate],
  );

  const getCalendarApi = () => calendarRef.current?.getApi();

  const syncDateFromApi = () => {
    const api = getCalendarApi();
    if (!api) return;
    setFocusDate(new Date(api.getDate()));
  };

  const switchToMode = (mode, date = null) => {
    if (mode === VIEW_MODE.DAY || mode === VIEW_MODE.LIST) {
      setViewMode(mode);
      if (date) setFocusDate(new Date(date));
      return;
    }

    const calApi = getCalendarApi();
    if (!calApi) {
      setViewMode(mode);
      if (date) setFocusDate(new Date(date));
      return;
    }
    calApi.changeView(FULLCALENDAR_VIEW[mode], date ?? calApi.getDate());
    setViewMode(mode);
    setFocusDate(new Date(date ?? calApi.getDate()));
  };

  const goToToday = () => {
    if (viewMode === VIEW_MODE.DAY || viewMode === VIEW_MODE.LIST) {
      setFocusDate(new Date());
      return;
    }

    const calApi = getCalendarApi();
    if (!calApi) return;
    calApi.today();
    syncDateFromApi();
  };

  const shiftView = (direction) => {
    if (viewMode === VIEW_MODE.DAY) {
      setFocusDate((prev) => addDays(prev, direction));
      return;
    }
    if (viewMode === VIEW_MODE.LIST) {
      // shift by 14 days (one list window)
      setFocusDate((prev) => addDays(prev, direction * 14));
      return;
    }

    const calApi = getCalendarApi();
    if (!calApi) return;
    if (direction < 0) calApi.prev();
    else calApi.next();
    syncDateFromApi();
  };

  useEffect(() => {
    const timer = setInterval(() => setNowMarker(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (viewMode === VIEW_MODE.DAY || viewMode === VIEW_MODE.LIST) return;
    const calApi = getCalendarApi();
    if (!calApi) return;
    calApi.changeView(FULLCALENDAR_VIEW[viewMode]);
  }, [viewMode]);

  return (
    <MainLayout title="Calendar" subtitle="">
      <div className="w-full h-full">
        <div
          className="bg-background rounded-[24px_0px_24px_24px] w-full flex flex-col"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div className="shrink-0 px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SmallRoundedButton onClick={goToToday}>Today</SmallRoundedButton>
              <SmallRoundedButton onClick={() => setCompactHours((v) => !v)}>
                {compactHours ? "Full Hours" : "Compact"}
              </SmallRoundedButton>
              <SmallRoundedButton
                onClick={() => setHideEmptySlots((v) => !v)}
              >
                {hideEmptySlots ? "Show All Slots" : "Hide Empty"}
              </SmallRoundedButton>
              <div className="flex items-center gap-3">
                <IconCircleButton
                  ariaLabel="Previous"
                  onClick={() => shiftView(-1)}
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
                <div className="text-[12px] font-bold text-muted-foreground">
                  {headerLabel}
                </div>
                <IconCircleButton ariaLabel="Next" onClick={() => shiftView(1)}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isLoadingEvents && (
                <span className="text-[11px] text-muted-foreground animate-pulse">
                  Loading…
                </span>
              )}

              <div className="flex items-center">
                <SegmentedButton
                  active={viewMode === VIEW_MODE.DAY}
                  className="rounded-[30px_0px_0px_30px]"
                  onClick={() => switchToMode(VIEW_MODE.DAY)}
                >
                  Day
                </SegmentedButton>
                <SegmentedButton
                  active={viewMode === VIEW_MODE.WEEK}
                  className="rounded-none border-l-0"
                  onClick={() => switchToMode(VIEW_MODE.WEEK)}
                >
                  Week
                </SegmentedButton>
                <SegmentedButton
                  active={viewMode === VIEW_MODE.MONTH}
                  className="rounded-none border-l-0"
                  onClick={() => switchToMode(VIEW_MODE.MONTH)}
                >
                  Month
                </SegmentedButton>
                <SegmentedButton
                  active={viewMode === VIEW_MODE.LIST}
                  className="rounded-[0px_30px_30px_0px] border-l-0"
                  onClick={() => switchToMode(VIEW_MODE.LIST)}
                >
                  List
                </SegmentedButton>
              </div>

              <Link
                href="/calendar/lessons"
                className="h-10 rounded-[20px] border border-border bg-background px-5 text-[12px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center"
              >
                Lessons
              </Link>

              <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
              <SlotSizePicker value={customSlotMins} onApply={(mins, startOff) => {
                setCustomSlotMins(mins);
                setSlotAlignMins(startOff);
              }} />

              <ServicesDropdown />

              <button
                type="button"
                onClick={() => setIsAppointmentPanelOpen(true)}
                className="h-10 rounded-[20px] bg-brand px-5 text-[12px] font-bold text-brand-foreground hover:bg-brand-dark transition-colors"
              >
                Create Appointment
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 px-6 pt-6 pb-6">
            <div className="flex h-full gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                {viewMode === VIEW_MODE.DAY ? (
                  <TutorDayCalendar
                    startHour={effectiveSlotMin}
                    endHour={effectiveSlotMax}
                    focusDate={focusDate}
                    now={now}
                    dayTimedEvents={dayTimedEvents}
                    dayAllDayEvents={dayAllDayEvents}
                    tutors={instructors}
                    allEvents={filteredEvents}
                    onEventClick={(raw) => {
                      setSelectedEvent(raw);
                      setIsAppointmentPanelOpen(false);
                    }}
                    onSlotClick={({ date, time }) => {
                      setSlotSelection({ date, time });
                      setSelectedEvent(null);
                      setIsAppointmentPanelOpen(true);
                    }}
                    customSlotMins={customSlotMins}
                    slotAlignMins={slotAlignMins}
                  />
                ) : viewMode === VIEW_MODE.LIST ? (
                  <ListCalendarView
                    events={filteredEvents}
                    focusDate={focusDate}
                    onEventClick={(raw) => {
                      setSelectedEvent(raw);
                      setIsAppointmentPanelOpen(false);
                    }}
                  />
                ) : (
                  <div className="h-full overflow-hidden rounded-[12px] border border-border bg-background calendar-shell">
                    <FullCalendar
                      ref={calendarRef}
                      plugins={[
                        dayGridPlugin,
                        timeGridPlugin,
                        interactionPlugin,
                      ]}
                      initialView={FULLCALENDAR_VIEW[viewMode]}
                      initialDate={focusDate}
                      headerToolbar={false}
                      height="100%"
                      nowIndicator
                      allDaySlot
                      slotMinTime={effectiveSlotMinStr}
                      slotMaxTime={effectiveSlotMaxStr}
                      slotDuration={slotDurationStr}
                      slotLabelInterval={effectiveSlotLabelInterval}
                      slotLabelFormat={{
                        hour: "numeric",
                        minute: "2-digit",
                        omitZeroMinute: false,
                        meridiem: "short",
                      }}
                      expandRows
                      stickyHeaderDates
                      dayMaxEvents={false}
                      eventMaxStack={10}
                      events={filteredEvents}
                      editable={false}
                      selectable
                      navLinks
                      eventOverlap
                      datesSet={(arg) => {
                        setViewMode(mapViewTypeToMode(arg.view.type));
                        setFocusDate(new Date(arg.view.calendar.getDate()));
                      }}
                      dateClick={(arg) => {
                        const clickedDate = arg.dateStr?.slice(0, 10) ?? "";
                        const clickedTime = arg.dateStr?.slice(11, 16) ?? "";
                        setSlotSelection({ date: clickedDate, time: clickedTime });
                        setSelectedEvent(null);
                        setIsAppointmentPanelOpen(true);
                      }}
                      navLinkDayClick={(date) =>
                        switchToMode(VIEW_MODE.DAY, date)
                      }
                      eventClick={(arg) => {
                        const raw = arg.event.extendedProps?.raw;
                        if (raw) {
                          setSelectedEvent(raw);
                          setIsAppointmentPanelOpen(false);
                        }
                      }}
                      eventContent={renderEventContent}
                      views={{
                        dayGridMonth: { dayMaxEventRows: 3 },
                        timeGridWeek: {
                          dayHeaderFormat: { weekday: "short", day: "numeric" },
                        },
                      }}
                    />
                  </div>
                )}
              </div>

              {isAppointmentPanelOpen && (
                <AppointmentComposerPanel
                  onClose={() => {
                    setIsAppointmentPanelOpen(false);
                    setSlotSelection(null);
                  }}
                  onCreated={fetchCalendarEvents}
                  initialDate={slotSelection?.date}
                  initialTime={slotSelection?.time}
                  initialDuration={customSlotMins}
                />
              )}
              {selectedEvent && !isAppointmentPanelOpen && (
                <EventDetailPanel
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                  onUpdated={() => {
                    fetchCalendarEvents();
                    setSelectedEvent(null);
                  }}
                  onDeleted={() => {
                    fetchCalendarEvents();
                    setSelectedEvent(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
