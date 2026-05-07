"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import MainLayout from "@/components/layout/MainLayout";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Settings2 } from "lucide-react";
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
const FULL_END_HOUR = 23;
const COMPACT_START_HOUR = 9;
const COMPACT_END_HOUR = 19;
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
      appt.color || colorMap[teacherId] || appt.lessonID?.color || CALENDAR_PALETTE[0];

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

    const serviceCode = appt.calendarServiceID?.serviceCode || "";

    // Find sessions remaining from the first package charge record
    let sessionsRemaining = null;
    let totalSessions = null;
    if (Array.isArray(appt.charges) && appt.charges.length > 0) {
      const pkgCharge = appt.charges.find((c) => c.method === "package" && c.customerPackageID);
      if (pkgCharge?.customerPackageID?.services) {
        const svc = pkgCharge.customerPackageID.services.find(
          (s) => s.serviceCode === pkgCharge.serviceCode,
        );
        if (svc) {
          sessionsRemaining = svc.sessionsRemaining ?? null;
          totalSessions = (svc.sessionsUsed ?? 0) + (svc.sessionsRemaining ?? 0);
        }
      }
    }

    const paymentCollected = appt.payment?.collected || appt.chargeMethod === "package" || appt.chargeMethod === "credits" || appt.chargeMethod === "mixed";

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
        serviceCode,
        sessionsRemaining,
        totalSessions,
        paymentCollected,
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
        "h-8 px-3 text-[11px] leading-none select-none bg-background border border-border transition-colors",
        active
          ? "font-bold text-foreground"
          : "font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
      className="h-8 w-8 rounded-full bg-background border border-border grid place-items-center hover:bg-muted/50 transition-colors"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  );
}

function SmallRoundedButton({ children, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-8 rounded-[20px] px-3 border text-[11px] font-bold transition-colors",
        active
          ? "border-[var(--studio-primary)] bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)] text-[var(--studio-primary)]"
          : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ].join(" ")}
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
  const [showEmpty, setShowEmpty] = useState(false);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(focusDate, i));
  }, [focusDate]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      day,
      events: events
        .filter((e) => isSameDate(new Date(e.start), day))
        .sort((a, b) => new Date(a.start) - new Date(b.start) || new Date(a.end) - new Date(b.end)),
    }));
  }, [events, days]);

  const totalEvents = grouped.reduce((sum, g) => sum + g.events.length, 0);
  const daysWithEvents = grouped.filter((g) => g.events.length > 0).length;
  const visibleGroups = showEmpty ? grouped : grouped.filter((g) => g.events.length > 0);

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-[12px] border border-border bg-background">
      {/* List header bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-foreground">
            {totalEvents} event{totalEvents !== 1 ? "s" : ""}
          </span>
          <span className="text-[11px] text-muted-foreground">
            across {daysWithEvents} day{daysWithEvents !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowEmpty((v) => !v)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showEmpty ? "Hide empty days" : "Show empty days"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {visibleGroups.map(({ day, events: dayEvents }) => {
            const isToday = isSameDate(day, new Date());
            const isPast  = day < new Date() && !isToday;
            return (
              <div key={day.toISOString()} className={isPast ? "opacity-55" : ""}>
                <div
                  className={`sticky top-0 z-10 flex items-center gap-3 px-5 py-2 border-b border-border/60 ${
                    isToday
                      ? "bg-[color-mix(in_srgb,var(--studio-primary)_8%,hsl(var(--background)))]"
                      : "bg-background/95 backdrop-blur-sm"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-full text-[12px] font-bold shrink-0 ${
                      isToday ? "bg-[var(--studio-primary)] text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <span className={`text-[12px] font-semibold ${isToday ? "text-[var(--studio-primary)]" : "text-foreground"}`}>
                    {formatListDayLabel(day)}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {dayEvents.length > 0 ? (
                  <div className="flex flex-col gap-2 px-4 py-3">
                    {dayEvents.map((event) => (
                      <ListEventRow key={event.id} event={event} onEventClick={onEventClick} />
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-3 text-[11px] text-muted-foreground/40 italic">
                    No events scheduled
                  </div>
                )}
              </div>
            );
          })}

          {visibleGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl">📅</div>
              <p className="text-[13px] font-semibold text-foreground">No events in this period</p>
              <p className="text-[11px] text-muted-foreground">Try navigating to a different date range</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Event Tooltip ────────────────────────────────────────────────────────────

let _tooltipEl = null;

function getTooltipEl() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement("div");
    _tooltipEl.id = "cal-event-tooltip";
    _tooltipEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      background: hsl(var(--popover));
      border: 1px solid hsl(var(--border));
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      min-width: 240px;
      max-width: 300px;
      font-size: 11px;
      color: hsl(var(--foreground));
      display: none;
      line-height: 1.5;
    `;
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function showEventTooltip(e, props) {
  const tip = getTooltipEl();
  const raw = props.raw || {};

  // ── Customer ──────────────────────────────────────────────────────────────
  const customerObjs = Array.isArray(raw.customerIDs)
    ? raw.customerIDs.filter((c) => typeof c === "object")
    : [];
  const customerNames = customerObjs.map((c) => c.name || c.email).filter(Boolean);
  const customerEmails = customerObjs.map((c) => c.email).filter(Boolean);

  // ── Teacher ───────────────────────────────────────────────────────────────
  const teacher = raw.teacherID?.name || props.tutorName || "";

  // ── Service ───────────────────────────────────────────────────────────────
  const svc = raw.calendarServiceID || {};
  const serviceName = svc.serviceName || props.serviceCode || "";
  const serviceCode = svc.serviceCode || props.serviceCode || "";
  const servicePrice = svc.price > 0 ? `$${svc.price.toFixed(2)}/session` : null;

  // ── Package & sessions ────────────────────────────────────────────────────
  const pkgCharge = Array.isArray(raw.charges)
    ? raw.charges.find((c) => c.method === "package")
    : null;

  // Try to resolve package name from charge's customerPackageID or enrollmentID
  let packageName = null;
  let packageExpiry = null;
  let sessionsRemaining = props.sessionsRemaining ?? null;
  let totalSessions = props.totalSessions ?? null;

  if (pkgCharge) {
    const cpkg = pkgCharge.customerPackageID;
    if (cpkg) {
      const svcEntry = Array.isArray(cpkg.services)
        ? cpkg.services.find((s) => s.serviceCode === serviceCode)
        : null;
      if (svcEntry) {
        sessionsRemaining = svcEntry.sessionsRemaining ?? sessionsRemaining;
        totalSessions = (svcEntry.sessionsUsed ?? 0) + (svcEntry.sessionsRemaining ?? 0) || totalSessions;
      }
      packageName = cpkg.packageName || "Package";
      if (cpkg.expiryDate) packageExpiry = new Date(cpkg.expiryDate).toLocaleDateString("en-AU");
    }
  }

  // ── Status & payment ──────────────────────────────────────────────────────
  const status = props.effectiveStatus || raw.status || "scheduled";
  const statusColors = {
    scheduled: "#3b82f6", completed: "#22c55e",
    cancelled_no_charge: "#6b7280", cancelled_charged: "#ef4444",
    no_show_no_charge: "#f97316", no_show_charged: "#f97316",
  };
  const statusColor = statusColors[status] || "#6b7280";
  const statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const chargeMethod = raw.chargeMethod;
  const paymentLabel = chargeMethod === "package"
    ? "Charged from package"
    : chargeMethod === "credits"
    ? "Charged from credits"
    : raw.payment?.collected
    ? `Collected (${raw.payment.method || ""})`
    : null;

  const isPaid = chargeMethod === "package" || chargeMethod === "credits" || chargeMethod === "mixed" || raw.payment?.collected;
  const paymentStatus = isPaid ? "Paid" : "Unpaid";
  const paymentStatusColor = isPaid ? "#22c55e" : "#ef4444";

  const divider = `<div style="border-top:1px solid hsl(var(--border));margin:6px 0"></div>`;

  const section = (label, value) =>
    value ? `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0">
      <span style="color:hsl(var(--muted-foreground));white-space:nowrap">${label}</span>
      <span style="font-weight:600;text-align:right">${value}</span>
    </div>` : "";

  const html = `
    <div style="font-weight:700;font-size:12px;margin-bottom:2px">${customerNames.join(", ") || "Unknown"}</div>
    ${customerEmails.length ? `<div style="color:hsl(var(--muted-foreground));font-size:10px;margin-bottom:6px">${customerEmails.join(", ")}</div>` : ""}
    ${divider}
    ${section("Instructor", teacher)}
    ${section("Service", serviceName + (serviceCode && serviceCode !== serviceName ? ` <span style="opacity:.6">(${serviceCode})</span>` : ""))}
    ${section("Price", servicePrice)}
    ${divider}
    ${packageName ? section("Package", packageName) : ""}
    ${packageExpiry ? section("Expires", packageExpiry) : ""}
    ${sessionsRemaining != null ? section("Sessions left", `<span style="color:${sessionsRemaining <= 1 ? "#ef4444" : "#22c55e"}">${sessionsRemaining}${totalSessions != null ? " / " + totalSessions : ""}</span>`) : ""}
    ${divider}
    <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
      <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${statusColor};flex-shrink:0"></span>
      <span style="font-weight:600">${statusLabel}</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
      <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${paymentStatusColor};flex-shrink:0"></span>
      <span style="font-weight:600;color:${paymentStatusColor}">${paymentStatus}</span>
      ${paymentLabel ? `<span style="color:hsl(var(--muted-foreground));font-size:10px">· ${paymentLabel}</span>` : ""}
    </div>
  `;

  tip.innerHTML = html;
  tip.style.display = "block";
  positionTooltip(e);
}

function positionTooltip(e) {
  const tip = getTooltipEl();
  const pad = 12;
  const tw = tip.offsetWidth || 220;
  const th = tip.offsetHeight || 120;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  if (x + tw > window.innerWidth - pad) x = e.clientX - tw - pad;
  if (y + th > window.innerHeight - pad) y = e.clientY - th - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function hideEventTooltip() {
  const tip = getTooltipEl();
  tip.style.display = "none";
}

function renderEventContent(info) {
  const { tutorName, status, effectiveStatus, color, customerNames, eventType, serviceCode, sessionsRemaining, totalSessions, paymentCollected } =
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

  const firstCustomer =
    Array.isArray(customerNames) && customerNames.length > 0
      ? customerNames[0]
      : null;

  const teacherLine = [serviceCode, tutorName].filter(Boolean).join(" — ");

  const sessionsLabel =
    sessionsRemaining != null && totalSessions != null
      ? `${sessionsRemaining}/${totalSessions}`
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
      <div className="px-1.5 py-0.5 flex flex-col overflow-visible min-h-full gap-[1px]">
        {/* Row 1: customer name */}
        {firstCustomer && (
          <div className={`text-[10px] font-bold text-foreground leading-tight truncate shrink-0 ${cancelled ? "line-through" : ""}`}>
            {firstCustomer}
          </div>
        )}
        {/* Row 2: service code — teacher name */}
        {showTime && teacherLine && (
          <div className="text-[9px] text-foreground/80 leading-tight truncate shrink-0 font-medium">
            {teacherLine}
          </div>
        )}
        {/* Row 3: time range */}
        {showTime && (timeRange || durationLabel) && (
          <div className="text-[9px] text-muted-foreground leading-tight truncate shrink-0">
            {timeRange}{timeRange && durationLabel ? ` (${durationLabel})` : durationLabel}
          </div>
        )}
        {/* Row 4: sessions remaining + paid/unpaid */}
        {showDetails && (sessionsLabel || true) && (
          <div className="flex items-center gap-1.5 mt-auto pb-0.5 shrink-0">
            {sessionsLabel && (
              <span className="text-[8px] font-semibold text-foreground/70 bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 leading-none">
                {sessionsLabel} left
              </span>
            )}
            <span
              className={`text-[8px] font-semibold rounded px-1 py-0.5 leading-none ${
                paymentCollected
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}
            >
              {paymentCollected ? "Paid" : "Unpaid"}
            </span>
            <TypeBadge type={eventType} />
          </div>
        )}
        {!showDetails && (
          <div className="flex items-center gap-1 shrink-0">
            <TypeBadge type={eventType} />
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
  const dayStartMins = slotAlignMins;
  const nowOffset =
    isToday && nowMinutes >= dayStartMins && nowMinutes <= endHour * 60
      ? ((nowMinutes - dayStartMins) / customSlotMins) * DAY_ROW_HEIGHT
      : null;

  const focusDateLabel = focusDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-border bg-background shadow-sm">
      <div className="flex shrink-0 border-b border-border bg-muted/30">
        <div className="w-[86px] shrink-0 border-r border-border flex items-end pb-2 px-2">
          <span className="text-[10px] font-medium text-muted-foreground leading-tight">{focusDateLabel}</span>
        </div>
        {effectiveTutors.map((tutor, idx) => {
          const todayCount = (byTutorTimed[tutor.key]?.length ?? 0) + (byTutorAllDay[tutor.key]?.length ?? 0);
          const weekCount = weekCountByTutor[tutor.key] ?? 0;
          return (
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
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: tutor.color }}
                >
                  {tutor.initials || "T"}
                </span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-[11px] font-semibold text-foreground truncate max-w-full leading-tight">
                    {tutor.name || tutor.label || "Unknown"}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="text-[10px] font-bold px-1.5 py-px rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tutor.color} 15%, transparent)`,
                        color: tutor.color,
                      }}
                    >
                      {todayCount} today
                    </span>
                    {weekCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">· {weekCount}/wk</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
              className="relative flex-1 group/col cursor-pointer"
              style={{
                height: dayHeight,
                borderRight:
                  colIdx < effectiveTutors.length - 1
                    ? "1px solid hsl(var(--border))"
                    : "none",
                backgroundColor: `color-mix(in srgb, ${tutor.color} 3%, hsl(var(--background)))`,
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
              {Array.from({ length: slotsCount + 1 }).map((_, idx) => {
                const slotMins = dayStartMins + idx * customSlotMins;
                const isHourBoundary = slotMins % 60 === 0;
                return (
                  <div
                    key={idx}
                    className={`absolute left-0 right-0 ${isHourBoundary ? "border-b border-border/60" : "border-b border-border/20"}`}
                    style={{ top: idx * DAY_ROW_HEIGHT, height: DAY_ROW_HEIGHT }}
                  />
                );
              })}

              {(byTutorTimed[tutor.key] || []).map((event) => {
                const s = new Date(event.start);
                const e = new Date(event.end);
                const startMins = s.getHours() * 60 + s.getMinutes();
                const endMins = e.getHours() * 60 + e.getMinutes();
                const duration = endMins - startMins;

                const top =
                  ((startMins - dayStartMins) / customSlotMins) * DAY_ROW_HEIGHT;
                const height = Math.max((duration / customSlotMins) * DAY_ROW_HEIGHT, 22);

                const widthPercent = 100 / (event.totalLanes || 1);
                const leftPercent = (event.lane || 0) * widthPercent;

                const accentColor =
                  event.extendedProps?.color || "var(--studio-primary)";
                const effectiveStatus = event.extendedProps?.effectiveStatus;
                const isCancelledEvent = effectiveStatus === "cancelled_no_charge" || effectiveStatus === "cancelled_charged";
                const isCompletedEvent = effectiveStatus === "completed";
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
                    className={`absolute cursor-pointer transition-all duration-150 rounded-lg group/event ${
                      isCancelledEvent ? "opacity-40" : ""
                    } ${isCompletedEvent ? "opacity-75" : ""}`}
                    style={{
                      top,
                      minHeight: height,
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      borderLeft: `3px solid ${accentColor}`,
                      backgroundColor: `color-mix(in srgb, ${accentColor} 22%, hsl(var(--card)))`,
                      boxShadow: "0 1px 3px hsl(var(--foreground)/0.06)",
                      zIndex: 10,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}40`; e.currentTarget.style.zIndex = "20"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px hsl(var(--foreground)/0.06)"; e.currentTarget.style.zIndex = "10"; }}
                  >
                    {isCompletedEvent && (
                      <span
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center z-10 shadow-sm"
                        title="Completed"
                      >
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1.5,5 4,7.5 8.5,2.5" />
                        </svg>
                      </span>
                    )}
                    <div className="min-h-full flex flex-col px-2 py-1 overflow-hidden">
                      <div className="flex items-center gap-1 min-w-0 shrink-0">
                        <span
                          className={`text-[11px] font-bold text-foreground leading-tight truncate ${isCancelledEvent ? "line-through opacity-60" : ""}`}
                        >
                          {event.title}
                        </span>
                        <TypeBadge type={dayEventType} />
                      </div>
                      {height >= 36 && (
                        <div className="text-[9px] text-muted-foreground leading-tight truncate shrink-0 mt-px">
                          {formatTime(event.start)} – {formatTime(event.end)}
                        </div>
                      )}
                      {height >= 60 && event.extendedProps?.customerNames?.length > 0 && (
                        <div className="text-[9px] text-foreground/70 truncate leading-tight shrink-0 mt-0.5">
                          {event.extendedProps.customerNames.join(", ")}
                        </div>
                      )}
                      {height >= 80 && event.extendedProps?.publicNote && (
                        <div className="text-[8px] italic truncate leading-tight shrink-0 mt-0.5 opacity-70 border-t border-black/10 dark:border-white/10 pt-0.5">
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
  const [startTime, setStartTime] = useState("06:00");
  const [pendingMins, setPendingMins] = useState(value);

  const isActive = value !== 30;

  function handleApply() {
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = (Number.isFinite(h) && Number.isFinite(m)) ? h * 60 + m : FULL_START_HOUR * 60;
    onApply(pendingMins, totalMins);
    setOpen(false);
  }

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
          "h-8 rounded-[20px] border px-3 text-[11px] font-bold transition-colors inline-flex items-center gap-1.5",
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
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-popover shadow-lg p-3 z-50 space-y-3"
        >
          <div>
            <p className="text-[11px] font-semibold text-foreground mb-1.5">Slot Size</p>
            <div className="flex flex-wrap gap-1.5">
              {[30, 45, 50, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPendingMins(m)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    pendingMins === m
                      ? "bg-primary border-primary text-white"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-foreground mb-1.5">Start Time</p>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStartTime("06:00"); setPendingMins(30); onApply(30, FULL_START_HOUR * 60); setOpen(false); }}
              className="flex-1 h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-muted-foreground hover:bg-muted/40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-8 rounded-lg bg-primary text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors"
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
        className="h-8 rounded-[20px] border border-border bg-background px-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
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

function PrivateLessonSummaryBar({ viewMode, focusDate, events, allServices = [] }) {
  const privateServiceCodes = useMemo(
    () => new Set(allServices.filter((s) => !s.type || s.type === "private").map((s) => s.serviceCode)),
    [allServices],
  );

  const cells = useMemo(() => {
    const privateEvents = events.filter((e) => {
      const { eventType, serviceCode } = e.extendedProps ?? {};
      if (eventType !== "private") return false;
      if (!privateServiceCodes.size) return true;
      return privateServiceCodes.has(serviceCode);
    });

    if (viewMode === VIEW_MODE.DAY) {
      const count = privateEvents.filter((e) => {
        const d = new Date(e.start);
        return isSameDate(d, focusDate);
      }).length;
      return [{ label: focusDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), count }];
    }

    if (viewMode === VIEW_MODE.WEEK) {
      const weekStart = startOfWeekSunday(focusDate);
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const count = privateEvents.filter((e) => isSameDate(new Date(e.start), day)).length;
        return {
          label: day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
          count,
          isToday: isSameDate(day, new Date()),
        };
      });
    }

    if (viewMode === VIEW_MODE.MONTH) {
      // Show per-week totals for the 5 weeks of the month view
      const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
      const firstSunday = startOfWeekSunday(monthStart);
      return Array.from({ length: 5 }, (_, i) => {
        const weekStart = addDays(firstSunday, i * 7);
        const weekEnd = addDays(weekStart, 6);
        const count = privateEvents.filter((e) => {
          const d = new Date(e.start);
          return d >= weekStart && d <= weekEnd;
        }).length;
        const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { day: "numeric" })}`;
        return { label, count };
      });
    }

    return [];
  }, [viewMode, focusDate, events]);

  if (!cells.length || viewMode === VIEW_MODE.LIST) return null;

  const total = cells.reduce((s, c) => s + c.count, 0);

  return (
    <div className="shrink-0 px-6 py-2 border-b border-border/50 flex items-center gap-3 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">
        Private Lessons
      </span>
      <div className="flex items-center gap-1.5">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={[
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium shrink-0 border transition-colors",
              cell.count > 0
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-border/50 bg-muted/30 text-muted-foreground/50",
              cell.isToday ? "ring-1 ring-brand/40" : "",
            ].join(" ")}
          >
            <span className="text-[10px] text-muted-foreground/70">{cell.label}</span>
            <span className={`font-bold ${cell.count > 0 ? "text-brand" : "text-muted-foreground/40"}`}>
              {cell.count}
            </span>
          </div>
        ))}
      </div>
      <span className="text-[11px] font-bold text-foreground shrink-0">
        {total} total
      </span>
    </div>
  );
}

function TeacherFilterDropdown({ instructors, value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = value ? instructors.find((i) => i.key === value) : null;
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
        className="h-8 rounded-[20px] border border-border bg-background px-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1.5"
        style={{ boxShadow: COLORS.shadow }}
      >
        {current && (
          <span
            className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: current.color }}
          >
            {current.initials}
          </span>
        )}
        {current ? current.name : "T"}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg py-1.5 z-50"
        >
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
              !value ? "font-bold text-foreground bg-muted/60" : "text-foreground hover:bg-muted/40"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
            All Teachers
          </button>
          {instructors.map((inst) => (
            <button
              key={inst.key}
              type="button"
              onClick={() => { onChange(inst.key); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
                value === inst.key ? "font-bold text-foreground bg-muted/60" : "text-foreground hover:bg-muted/40"
              }`}
            >
              <span
                className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: inst.color }}
              >
                {inst.initials}
              </span>
              <span className="truncate">{inst.name}</span>
            </button>
          ))}
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
  const [allServices, setAllServices] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotSelection, setSlotSelection] = useState(null);
  const [compactHours, setCompactHours] = useState(false);
  const [hideEmptySlots, setHideEmptySlots] = useState(false);
  const [customSlotMins, setCustomSlotMins] = useState(30);
  const [slotAlignMins, setSlotAlignMins] = useState(FULL_START_HOUR * 60);

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

  useEffect(() => {
    api.get("/api/calendar-service?limit=200").then((res) => {
      if (res.success && Array.isArray(res.data)) setAllServices(res.data);
    });
  }, []);

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
    let result = events;
    if (statusFilter !== "all") {
      result = result.filter(
        (e) => (e.extendedProps?.effectiveStatus ?? e.extendedProps?.status ?? "scheduled") === statusFilter,
      );
    }
    if (selectedTeacherId) {
      result = result.filter((e) => e.extendedProps?.tutorKey === selectedTeacherId);
    }
    return result;
  }, [events, statusFilter, selectedTeacherId]);

  // effectiveStartMins: the later of the user's start-time-picker and compact/full range start
  const effectiveStartMins = Math.max(slotAlignMins, dayStartHour * 60);

  // When hideEmptySlots is on, shrink the visible hour range to where events actually are
  const { effectiveSlotMin, effectiveSlotMax, effectiveSlotMinStr, effectiveSlotMaxStr } = useMemo(() => {
    if (!hideEmptySlots) {
      return {
        effectiveSlotMin: Math.floor(effectiveStartMins / 60),
        effectiveSlotMax: dayEndHour,
        effectiveSlotMinStr: `${String(Math.floor(effectiveStartMins / 60)).padStart(2, "0")}:${String(effectiveStartMins % 60).padStart(2, "0")}:00`,
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
        effectiveSlotMin: Math.floor(effectiveStartMins / 60),
        effectiveSlotMax: dayEndHour,
        effectiveSlotMinStr: `${String(Math.floor(effectiveStartMins / 60)).padStart(2, "0")}:${String(effectiveStartMins % 60).padStart(2, "0")}:00`,
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
    const clampedMinH = Math.max(0, minH - 1);
    const clampedMaxH = Math.min(24, maxH + 1);
    return {
      effectiveSlotMin: clampedMinH,
      effectiveSlotMax: clampedMaxH,
      effectiveSlotMinStr: `${String(clampedMinH).padStart(2, "0")}:${String(effectiveStartMins % 60).padStart(2, "0")}:00`,
      effectiveSlotMaxStr: `${String(clampedMaxH).padStart(2, "0")}:00:00`,
    };
  }, [hideEmptySlots, filteredEvents, focusDate, dayStartHour, dayEndHour, effectiveStartMins]);
  
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
          <div className="shrink-0 px-6 py-1.5 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <SmallRoundedButton onClick={goToToday}>Today</SmallRoundedButton>
              <SmallRoundedButton active={compactHours} onClick={() => setCompactHours((v) => !v)}>
                Compact
              </SmallRoundedButton>
              <SmallRoundedButton active={hideEmptySlots} onClick={() => setHideEmptySlots((v) => !v)}>
                Hide Empty
              </SmallRoundedButton>
              <div className="flex items-center gap-2 ml-1">
                <IconCircleButton ariaLabel="Previous" onClick={() => shiftView(-1)}>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
                <div className="text-[13px] font-semibold text-foreground min-w-[160px] text-center">
                  {headerLabel}
                </div>
                <IconCircleButton ariaLabel="Next" onClick={() => shiftView(1)}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLoadingEvents && (
                <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
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

              {instructors.length > 0 && (
                <TeacherFilterDropdown
                  instructors={instructors}
                  value={selectedTeacherId}
                  onChange={setSelectedTeacherId}
                />
              )}
              <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
              <SlotSizePicker value={customSlotMins} onApply={(mins, startOff) => {
                setCustomSlotMins(mins);
                setSlotAlignMins(startOff);
              }} />

              <div className="w-px h-6 bg-border shrink-0" />

              <Link
                href="/settings/setup"
                title="Calendar Setup"
                className="h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <Settings2 className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => setIsAppointmentPanelOpen(true)}
                className="h-8 rounded-[20px] bg-brand px-4 text-[11px] font-bold text-brand-foreground hover:bg-brand-dark active:scale-[0.98] transition-all shrink-0"
              >
                + Create
              </button>
            </div>
          </div>

          <PrivateLessonSummaryBar
            viewMode={viewMode}
            focusDate={focusDate}
            events={filteredEvents}
            allServices={allServices}
          />

          <div className="flex-1 min-h-0 px-6 pt-6 pb-6">
            <div className="flex h-full gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                {viewMode === VIEW_MODE.DAY ? (
                  <TutorDayCalendar
                    startHour={Math.floor(effectiveStartMins / 60)}
                    endHour={effectiveSlotMax}
                    focusDate={focusDate}
                    now={now}
                    dayTimedEvents={dayTimedEvents}
                    dayAllDayEvents={dayAllDayEvents}
                    tutors={selectedTeacherId ? instructors.filter((i) => i.key === selectedTeacherId) : instructors}
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
                    slotAlignMins={effectiveStartMins}
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
                      eventDidMount={(info) => {
                        const el = info.el;
                        const harness = el.closest(".fc-timegrid-event-harness") || el.parentElement;
                        const props = info.event.extendedProps || {};
                        el.addEventListener("mouseenter", (e) => {
                          harness.style.zIndex = "100";
                          showEventTooltip(e, props);
                        });
                        el.addEventListener("mousemove", (e) => positionTooltip(e));
                        el.addEventListener("mouseleave", () => {
                          harness.style.zIndex = "";
                          hideEventTooltip();
                        });
                      }}
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

              <AppointmentComposerPanel
                open={isAppointmentPanelOpen}
                onClose={() => {
                  setIsAppointmentPanelOpen(false);
                  setSlotSelection(null);
                }}
                onCreated={fetchCalendarEvents}
                initialDate={slotSelection?.date}
                initialTime={slotSelection?.time}
                initialDuration={customSlotMins}
              />
              <EventDetailPanel
                open={Boolean(selectedEvent) && !isAppointmentPanelOpen}
                event={selectedEvent ?? {}}
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
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
