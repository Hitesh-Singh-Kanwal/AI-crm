"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Pin, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

const TABS = [
  { key: "enrollments", label: "Enrollments" },
  { key: "appointments", label: "Appointments" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
];

function statusColor(status) {
  if (status === "completed") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  if (status === "no_show") return "bg-orange-500/10 text-orange-400";
  return "bg-blue-500/10 text-blue-400";
}

export default function MiniStudentPanel({ customerId, customerName, onBack }) {
  const [activeTab, setActiveTab] = useState("enrollments");
  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingCustomer(true);
      const result = await api.get(`/api/customer/${customerId}`);
      if (result.success) setCustomer(result.data);
      setLoadingCustomer(false);
    }
    load();
  }, [customerId]);

  useEffect(() => {
    if (activeTab !== "appointments") return;
    async function load() {
      setLoadingAppts(true);
      const result = await api.get(`/api/calendar/customer/${customerId}`);
      if (result.success && Array.isArray(result.data)) setAppointments(result.data);
      setLoadingAppts(false);
    }
    load();
  }, [activeTab, customerId]);

  async function handleAddNote() {
    if (!newNoteText.trim()) return;
    setIsSavingNote(true);
    const result = await api.post(`/api/customer/${customerId}/notes`, { text: newNoteText.trim() });
    if (result.success) {
      setCustomer((prev) => ({ ...prev, notes: result.data }));
      setNewNoteText("");
    }
    setIsSavingNote(false);
  }

  async function handleTogglePin(noteId) {
    const result = await api.patch(`/api/customer/${customerId}/notes/${noteId}`);
    if (result.success) setCustomer((prev) => ({ ...prev, notes: result.data }));
  }

  async function handleDeleteNote(noteId) {
    const result = await api.delete(`/api/customer/${customerId}/notes/${noteId}`);
    if (result.success) setCustomer((prev) => ({ ...prev, notes: result.data }));
  }

  const now = new Date();
  const privateAppts = appointments.filter((a) => a.type === "private" || a.type === "trial");
  const groupAppts = appointments.filter((a) => a.type === "lesson");
  const visiblePrivate = showPast
    ? privateAppts
    : privateAppts.filter((a) => new Date(a.startDateTime) >= now);
  const visibleAppts = showGroups ? [...visiblePrivate, ...groupAppts] : visiblePrivate;

  const sortedNotes = [...(customer?.notes || [])].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <aside className="h-full w-[380px] shrink-0 rounded-xl border border-border bg-card shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Back to event"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{customerName}</p>
          <p className="text-[10px] text-muted-foreground">Student Account</p>
        </div>
        {customer && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            ${customer.credits ?? 0} credits
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "flex-1 py-2.5 text-[10px] font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {loadingCustomer ? (
          <p className="text-center pt-10 text-[12px] text-muted-foreground animate-pulse">Loading…</p>
        ) : !customer ? (
          <p className="text-center pt-10 text-[12px] text-destructive">Failed to load student.</p>
        ) : (
          <>
            {/* ── ENROLLMENTS ── */}
            {activeTab === "enrollments" && (
              <div className="space-y-2">
                {!customer.classAssigned?.length ? (
                  <p className="text-[12px] text-muted-foreground">No active enrollments.</p>
                ) : (
                  customer.classAssigned.map((lesson) => (
                    <div
                      key={lesson._id}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                    >
                      <p className="text-[12px] font-semibold text-foreground">{lesson.name}</p>
                      <p className="text-[11px] text-muted-foreground">{lesson.credits} credits</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── APPOINTMENTS ── */}
            {activeTab === "appointments" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPast((v) => !v)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold border transition-colors ${
                      showPast
                        ? "bg-brand text-brand-foreground border-brand"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                    }`}
                  >
                    {showPast ? "Upcoming Only" : "Past Lessons"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGroups((v) => !v)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold border transition-colors ${
                      showGroups
                        ? "bg-brand text-brand-foreground border-brand"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                    }`}
                  >
                    {showGroups ? "Hide Groups" : "Groups"}
                  </button>
                </div>

                {loadingAppts ? (
                  <p className="text-[12px] text-muted-foreground animate-pulse">Loading…</p>
                ) : !visibleAppts.length ? (
                  <p className="text-[12px] text-muted-foreground">No appointments found.</p>
                ) : (
                  visibleAppts
                    .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
                    .map((appt) => (
                      <div
                        key={appt._id}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-foreground truncate">{appt.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor(appt.status)}`}>
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(appt.startDateTime).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                          })}{" · "}
                          {new Date(appt.startDateTime).toLocaleTimeString("en-US", {
                            hour: "numeric", minute: "2-digit", hour12: true,
                          })}
                        </p>
                        {appt.teacherID?.name && (
                          <p className="text-[10px] text-muted-foreground">{appt.teacherID.name}</p>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === "payments" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Credits Remaining</p>
                  <p className="text-[24px] font-bold text-foreground">${customer.credits ?? 0}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Full payment plans will appear here once the payment system is configured.
                </p>
              </div>
            )}

            {/* ── NOTES ── */}
            {activeTab === "notes" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note…"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={isSavingNote || !newNoteText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    {isSavingNote ? "Saving…" : "Add Note"}
                  </button>
                </div>

                {!sortedNotes.length ? (
                  <p className="text-[12px] text-muted-foreground">No notes yet.</p>
                ) : (
                  sortedNotes.map((note) => (
                    <div
                      key={note._id}
                      className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${
                        note.isPinned
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <p className="text-[12px] text-foreground whitespace-pre-wrap">{note.text}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(note._id)}
                            title={note.isPinned ? "Unpin" : "Pin to top"}
                            className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                              note.isPinned
                                ? "text-primary hover:bg-primary/10"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note._id)}
                            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
