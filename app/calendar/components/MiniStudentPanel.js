"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Pin, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

const TABS = [
  { key: "enrollments",  label: "Enrollments" },
  { key: "appointments", label: "Appointments" },
  { key: "packages",     label: "Packages" },
  { key: "payments",     label: "Payments" },
  { key: "notes",        label: "Notes" },
  { key: "messages",     label: "Messages" },
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

  const [customerPackages, setCustomerPackages] = useState([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [catalogPackages, setCatalogPackages] = useState([]);
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({ packageID: "", purchaseDate: "", totalPaid: "", notes: "" });
  const [isSelling, setIsSelling] = useState(false);
  const [sellError, setSellError] = useState(null);

  const [collectedPayments, setCollectedPayments] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [msgMode, setMsgMode] = useState("sms"); // "sms" | "email"
  const [smsText, setSmsText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(null);
  const [msgError, setMsgError] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loadingSmsHistory, setLoadingSmsHistory] = useState(false);

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

  useEffect(() => {
    if (activeTab !== "packages") return;
    async function load() {
      setLoadingPkgs(true);
      const [pkgsResult, catalogResult] = await Promise.all([
        api.get(`/api/customer-package/customer/${customerId}`),
        api.get("/api/package?limit=200&isActive=true"),
      ]);
      if (pkgsResult.success && Array.isArray(pkgsResult.data)) setCustomerPackages(pkgsResult.data);
      if (catalogResult.success && Array.isArray(catalogResult.data)) setCatalogPackages(catalogResult.data);
      setLoadingPkgs(false);
    }
    load();
  }, [activeTab, customerId]);

  async function handleSellPackage() {
    if (!sellForm.packageID) { setSellError("Please select a package."); return; }
    setIsSelling(true);
    setSellError(null);
    const result = await api.post("/api/customer-package", {
      customerID: customerId,
      packageID: sellForm.packageID,
      purchaseDate: sellForm.purchaseDate || undefined,
      totalPaid: sellForm.totalPaid !== "" ? Number(sellForm.totalPaid) : undefined,
      notes: sellForm.notes || undefined,
    });
    if (result.success) {
      setCustomerPackages((prev) => [result.data, ...prev]);
      setShowSellForm(false);
      setSellForm({ packageID: "", purchaseDate: "", totalPaid: "", notes: "" });
    } else {
      setSellError(result.error || "Failed to sell package.");
    }
    setIsSelling(false);
  }

  useEffect(() => {
    if (activeTab !== "payments") return;
    async function load() {
      setLoadingPayments(true);
      const result = await api.get(`/api/calendar/customer/${customerId}`);
      if (result.success && Array.isArray(result.data)) {
        const sorted = [...result.data].sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));
        setCollectedPayments(sorted.filter((e) => e.payment?.collected));
        setServiceCharges(sorted.filter((e) => e.chargeApplied));
      }
      setLoadingPayments(false);
    }
    load();
  }, [activeTab, customerId]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    async function load() {
      setLoadingSmsHistory(true);
      const result = await api.get(`/api/smsHistory?leadID=${customerId}&limit=100`);
      if (result.success && Array.isArray(result.data)) {
        const sorted = [...result.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setSmsHistory(sorted);
      }
      setLoadingSmsHistory(false);
    }
    load();
  }, [activeTab, customerId]);

  async function handleSendMessage() {
    setMsgError(null);
    setMsgSuccess(null);
    if (!customer) return;
    if (msgMode === "sms") {
      if (!smsText.trim()) { setMsgError("Message is required."); return; }
      if (!customer.phoneNumber) { setMsgError("This student has no phone number on file."); return; }
      setIsSendingMsg(true);
      const result = await api.post("/api/sms/send-one", {
        lead: { phoneNumber: customer.phoneNumber, email: customer.email, name: customer.name },
        message: smsText.trim(),
        scheduleNow: true,
      });
      if (result.success) {
        const optimistic = { _id: Date.now(), from: "you", to: customer.phoneNumber, message: smsText.trim(), status: "queued", createdAt: new Date().toISOString() };
        setSmsHistory((prev) => [...prev, optimistic]);
        setSmsText("");
      } else {
        setMsgError(result.error || "Failed to send SMS.");
      }
    } else {
      if (!emailSubject.trim() || !emailBody.trim()) { setMsgError("Subject and body are required."); return; }
      if (!customer.email) { setMsgError("This student has no email on file."); return; }
      setIsSendingMsg(true);
      const result = await api.post("/api/email/send-one", {
        lead: { email: customer.email, name: customer.name },
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        scheduleNow: true,
      });
      if (result.success) { setMsgSuccess("Email sent."); setEmailSubject(""); setEmailBody(""); }
      else setMsgError(result.error || "Failed to send email.");
    }
    setIsSendingMsg(false);
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
                      {lesson.duration && (
                        <p className="text-[11px] text-muted-foreground">{lesson.duration} min</p>
                      )}
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

            {/* ── PACKAGES ── */}
            {activeTab === "packages" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setShowSellForm((v) => !v); setSellError(null); }}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  <Plus className="h-3 w-3" />
                  Sell Package
                </button>

                {showSellForm && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">Sell a Package</p>
                    <div className="relative">
                      <select
                        value={sellForm.packageID}
                        onChange={(e) => setSellForm((f) => ({ ...f, packageID: e.target.value }))}
                        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Select package…</option>
                        {catalogPackages.map((p) => (
                          <option key={p._id} value={p._id}>{p.packageName}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="date"
                      value={sellForm.purchaseDate}
                      onChange={(e) => setSellForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                      placeholder="Purchase date (optional)"
                    />
                    <input
                      type="number"
                      value={sellForm.totalPaid}
                      onChange={(e) => setSellForm((f) => ({ ...f, totalPaid: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                      placeholder="Amount paid (optional)"
                      min="0"
                      step="0.01"
                    />
                    <textarea
                      rows={2}
                      value={sellForm.notes}
                      onChange={(e) => setSellForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Notes (optional)"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                    {sellError && <p className="text-[11px] text-destructive">{sellError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowSellForm(false); setSellError(null); }}
                        className="flex-1 h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSellPackage}
                        disabled={isSelling}
                        className="flex-1 h-8 rounded-lg bg-brand text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
                      >
                        {isSelling ? "Selling…" : "Confirm Sale"}
                      </button>
                    </div>
                  </div>
                )}

                {loadingPkgs ? (
                  <p className="text-[12px] text-muted-foreground animate-pulse">Loading…</p>
                ) : !customerPackages.length ? (
                  <p className="text-[12px] text-muted-foreground">No packages purchased yet.</p>
                ) : (
                  customerPackages.map((cp) => {
                    const statusColor =
                      cp.status === "active" ? "bg-green-500/10 text-green-500" :
                      cp.status === "exhausted" ? "bg-orange-500/10 text-orange-500" :
                      cp.status === "expired" ? "bg-red-500/10 text-red-400" :
                      "bg-muted text-muted-foreground";
                    return (
                      <div key={cp._id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-semibold text-foreground">
                            {cp.packageID?.packageName || "Package"}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor}`}>
                            {cp.status}
                          </span>
                        </div>
                        {cp.expiryDate && (
                          <p className="text-[10px] text-muted-foreground">
                            Expires {new Date(cp.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                        {cp.services?.length > 0 && (
                          <div className="space-y-1">
                            {cp.services.map((svc, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-[11px] text-foreground truncate">{svc.serviceName}</span>
                                <span className="text-[11px] font-semibold text-foreground shrink-0 ml-2">
                                  {svc.sessionsRemaining}/{svc.sessionsTotal}
                                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">left</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Purchased {new Date(cp.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {cp.totalPaid != null && ` · $${Number(cp.totalPaid).toFixed(2)}`}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── MESSAGES ── */}
            {activeTab === "messages" && (
              <div className="space-y-3">
                {/* SMS / Email toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => { setMsgMode("sms"); setMsgError(null); setMsgSuccess(null); }}
                    className={`flex-1 py-2 transition-colors ${msgMode === "sms" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMsgMode("email"); setMsgError(null); setMsgSuccess(null); }}
                    className={`flex-1 py-2 transition-colors ${msgMode === "email" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                  >
                    Email
                  </button>
                </div>

                {msgMode === "sms" ? (
                  <div className="space-y-2">
                    {/* Conversation thread */}
                    <div className="h-48 overflow-y-auto flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
                      {loadingSmsHistory ? (
                        <p className="text-[10px] text-muted-foreground text-center pt-4">Loading…</p>
                      ) : smsHistory.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center pt-4">No messages yet.</p>
                      ) : (
                        smsHistory.map((msg) => {
                          const isInbound = msg.status === "received";
                          return (
                            <div key={msg._id} className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}>
                              <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-snug ${isInbound ? "bg-card border border-border text-foreground" : "bg-brand text-brand-foreground"}`}>
                                {msg.message}
                              </div>
                              <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                                {isInbound ? (msg.leadID?.name || "Customer") : "You"} · {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Composer */}
                    <p className="text-[10px] text-muted-foreground">
                      To: {customer?.phoneNumber || <span className="text-destructive">No phone number</span>}
                    </p>
                    <textarea
                      rows={3}
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      placeholder="Type your message…"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{smsText.length} chars</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">
                      To: {customer?.email || <span className="text-destructive">No email</span>}
                    </p>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subject"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Message body…"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                  </div>
                )}

                {msgError && <p className="text-[11px] text-destructive">{msgError}</p>}
                {msgSuccess && <p className="text-[11px] text-emerald-500">{msgSuccess}</p>}

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSendingMsg}
                  className="w-full h-9 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSendingMsg ? "Sending…" : `Send ${msgMode === "sms" ? "SMS" : "Email"}`}
                </button>
              </div>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === "payments" && (
              <div className="space-y-3">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] text-muted-foreground mb-0.5 leading-tight">Auto Charged</p>
                    <p className="text-[15px] font-bold text-violet-500">
                      ${serviceCharges.reduce((sum, e) => sum + (e.calendarServiceID?.price ?? 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] text-muted-foreground mb-0.5 leading-tight">Collected</p>
                    <p className="text-[15px] font-bold text-emerald-500">
                      ${collectedPayments.reduce((sum, e) => sum + (e.payment?.amount ?? 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] text-muted-foreground mb-0.5 leading-tight">Credits</p>
                    <p className="text-[15px] font-bold text-foreground">${customer.credits ?? 0}</p>
                  </div>
                </div>

                {loadingPayments ? (
                  <p className="text-[12px] text-muted-foreground animate-pulse">Loading…</p>
                ) : (
                  <>
                    {/* Service charges section */}
                    {serviceCharges.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                          Auto-charged from bookings
                        </p>
                        {serviceCharges.map((evt) => {
                          const METHOD_LABEL = {
                            package: { text: "Package", cls: "bg-violet-500/10 text-violet-600" },
                            credits: { text: "Credits", cls: "bg-blue-500/10 text-blue-600" },
                            mixed:   { text: "Mixed",   cls: "bg-orange-500/10 text-orange-600" },
                          };
                          const m = METHOD_LABEL[evt.chargeMethod] ?? { text: "Charged", cls: "bg-muted text-muted-foreground" };
                          return (
                            <div key={evt._id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-semibold text-foreground truncate">{evt.title}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {evt.calendarServiceID?.price > 0 && (
                                    <span className="text-[12px] font-bold text-violet-500">
                                      ${Number(evt.calendarServiceID.price).toFixed(2)}
                                    </span>
                                  )}
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.cls}`}>
                                    {m.text}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(evt.startDateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                {" · "}
                                {new Date(evt.startDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </p>
                              {evt.calendarServiceID?.serviceName && (
                                <p className="text-[10px] text-muted-foreground">{evt.calendarServiceID.serviceName}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Collected payments section */}
                    {collectedPayments.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                          Collected payments (cash / card)
                        </p>
                        {collectedPayments.map((evt) => {
                          const METHOD_LABELS = { cash: "Cash", card: "Card", online: "Online", cheque: "Cheque", other: "Other" };
                          return (
                            <div key={evt._id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-semibold text-foreground truncate">{evt.title}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[12px] font-bold text-emerald-500">
                                    ${(evt.payment?.amount ?? 0).toFixed(2)}
                                  </span>
                                  {evt.payment?.method && (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                                      {METHOD_LABELS[evt.payment.method] ?? evt.payment.method}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(evt.startDateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                {" · "}
                                {new Date(evt.startDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {serviceCharges.length === 0 && collectedPayments.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">No payments recorded yet.</p>
                    )}
                  </>
                )}
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
