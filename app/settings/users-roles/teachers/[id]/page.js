"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  User,
  BookOpen,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import api from "@/lib/api";
import { getInitials } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function deriveStatus(ev) {
  if (ev.status && ev.status !== "scheduled") return ev.status;
  if (ev.endDateTime && new Date(ev.endDateTime) < new Date()) return "completed";
  return ev.status || "scheduled";
}

function statusBadge(status) {
  const map = {
    scheduled: "bg-blue-500/10 text-blue-600",
    completed: "bg-emerald-500/10 text-emerald-600",
    cancelled_no_charge: "bg-muted text-muted-foreground",
    cancelled_charged: "bg-red-500/10 text-red-500",
    no_show_no_charge: "bg-orange-500/10 text-orange-400",
    no_show_charged: "bg-orange-500/10 text-orange-500",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function statusLabel(status) {
  const map = {
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled_no_charge: "Cancelled",
    cancelled_charged: "Cancelled – Charged",
    no_show_no_charge: "No Show",
    no_show_charged: "No Show – Charged",
  };
  return map[status] ?? status;
}

// ─── Student roster tab ──────────────────────────────────────────────────────

function StudentRow({ customer, sessions, lastDate }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
          {getInitials(customer.name || customer.email || "?")}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">
          {customer.name || "—"}
        </p>
        {customer.email && (
          <p className="text-[11px] text-muted-foreground truncate">
            {customer.email}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-semibold text-foreground">
          {sessions} session{sessions !== 1 ? "s" : ""}
        </p>
        {lastDate && (
          <p className="text-[10px] text-muted-foreground">
            Last:{" "}
            {new Date(lastDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function StudentsTab({ events, type }) {
  // Aggregate unique customers from these events
  const customerMap = new Map(); // id -> { customer, sessions, lastDate }

  events.forEach((ev) => {
    const customers = Array.isArray(ev.customerIDs) ? ev.customerIDs : [];
    customers.forEach((c) => {
      const id = String(c?._id ?? c);
      const existing = customerMap.get(id);
      const evDate = new Date(ev.startDateTime);
      if (!existing) {
        customerMap.set(id, {
          customer: typeof c === "object" ? c : { _id: id },
          sessions: 1,
          lastDate: evDate,
        });
      } else {
        existing.sessions += 1;
        if (evDate > existing.lastDate) existing.lastDate = evDate;
      }
    });
  });

  const rows = [...customerMap.values()].sort((a, b) => b.sessions - a.sessions);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
        No {type} students found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {rows.map(({ customer, sessions, lastDate }) => (
        <StudentRow
          key={String(customer._id)}
          customer={customer}
          sessions={sessions}
          lastDate={lastDate}
        />
      ))}
    </div>
  );
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ events }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.startDateTime) - new Date(a.startDateTime),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
        No sessions found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {sorted.map((ev, i) => {
        const status = deriveStatus(ev);
        const date = new Date(ev.startDateTime);
        const end = ev.endDateTime ? new Date(ev.endDateTime) : null;
        const customers = Array.isArray(ev.customerIDs) ? ev.customerIDs : [];
        const names = customers
          .map((c) => (typeof c === "object" ? c.name : null))
          .filter(Boolean);

        return (
          <div
            key={ev._id ?? i}
            className={`flex items-center justify-between px-5 py-4 gap-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="shrink-0 text-center w-12">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  {date.toLocaleDateString("en-US", { month: "short" })}
                </p>
                <p className="text-[18px] font-bold text-foreground leading-none">
                  {date.getDate()}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {ev.title || ev.calendarServiceID?.serviceName || "Event"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {end &&
                    ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </p>
                {names.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                    {names.join(", ")}
                  </p>
                )}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(status)}`}
            >
              {statusLabel(status)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "private-students", label: "Private Students", Icon: User },
  { id: "group-students", label: "Group Students", Icon: Users },
  { id: "private-sessions", label: "Private Sessions", Icon: BookOpen },
  { id: "group-sessions", label: "Group Sessions", Icon: CalendarDays },
];

export default function TeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [teacher, setTeacher] = useState(null);
  const [privateEvents, setPrivateEvents] = useState([]);
  const [groupEvents, setGroupEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("private-students");

  const load = useCallback(async () => {
    setLoading(true);
    const past = new Date();
    past.setFullYear(past.getFullYear() - 2);
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    const params = new URLSearchParams({
      teacherID: id,
      start: past.toISOString(),
      end: future.toISOString(),
      limit: 1000,
    });

    const [teacherRes, eventsRes] = await Promise.all([
      api.get(`/api/teacher/${id}`),
      api.get(`/api/calendar?${params}`),
    ]);

    if (teacherRes.success) setTeacher(teacherRes.data);

    if (eventsRes.success && Array.isArray(eventsRes.data)) {
      const allEvents = eventsRes.data;
      // Group = type "lesson" or calendarServiceID.type "group"
      // Private = everything else (private, trial, event, etc.)
      const grp = allEvents.filter(
        (ev) =>
          ev.type === "lesson" ||
          ev.calendarServiceID?.type === "group",
      );
      const prv = allEvents.filter(
        (ev) =>
          ev.type !== "lesson" &&
          ev.calendarServiceID?.type !== "group",
      );
      setGroupEvents(grp);
      setPrivateEvents(prv);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <LoadingSpinner />
        </div>
      </MainLayout>
    );
  }

  if (!teacher) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
          <p className="text-[13px] text-muted-foreground">Teacher not found.</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const uniquePrivate = new Set(
    privateEvents.flatMap((ev) =>
      (ev.customerIDs || []).map((c) => String(c?._id ?? c)),
    ),
  ).size;

  const uniqueGroup = new Set(
    groupEvents.flatMap((ev) =>
      (ev.customerIDs || []).map((c) => String(c?._id ?? c)),
    ),
  ).size;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-[13px] font-semibold bg-primary/10 text-primary">
                {getInitials(teacher.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground truncate">
                  {teacher.name}
                </h1>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                    teacher.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {teacher.status}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground truncate">
                {teacher.email}
                {teacher.phoneNumber && ` · ${teacher.phoneNumber}`}
              </p>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {teacher.specialties?.length > 0 && (
            <div className="col-span-2 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-2">
                Specialties
              </p>
              <div className="flex flex-wrap gap-1.5">
                {teacher.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Private Students
            </p>
            <p className="text-[22px] font-bold text-foreground mt-0.5">
              {uniquePrivate}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {privateEvents.length} session{privateEvents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Group Students
            </p>
            <p className="text-[22px] font-bold text-foreground mt-0.5">
              {uniqueGroup}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {groupEvents.length} session{groupEvents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Weekly Capacity
            </p>
            <p className="text-[22px] font-bold text-foreground mt-0.5">
              {teacher.weeklyCapacity === null || teacher.weeklyCapacity === undefined
                ? "—"
                : teacher.weeklyCapacity}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {teacher.weeklyCapacity === null || teacher.weeklyCapacity === undefined
                ? "Not set"
                : "sessions/week"}
            </p>
          </div>
        </div>

        {teacher.bio && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Bio</p>
            <p className="text-[13px] text-foreground">{teacher.bio}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={[
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors",
                tab === tabId
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "private-students" && (
          <StudentsTab events={privateEvents} type="private" />
        )}
        {tab === "group-students" && (
          <StudentsTab events={groupEvents} type="group" />
        )}
        {tab === "private-sessions" && <SessionsTab events={privateEvents} />}
        {tab === "group-sessions" && <SessionsTab events={groupEvents} />}
      </div>
    </MainLayout>
  );
}
