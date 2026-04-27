"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Pencil, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import MiniStudentPanel from "./MiniStudentPanel";

const STATUS_OPTIONS = [
  { value: "scheduled",           label: "Scheduled" },
  { value: "completed",           label: "Completed" },
  { value: "cancelled_no_charge", label: "Cancelled – No Charge" },
  { value: "cancelled_charged",   label: "Cancelled – Charged" },
  { value: "no_show_no_charge",   label: "No Show – No Charge" },
  { value: "no_show_charged",     label: "No Show – Charged" },
];

const TYPE_OPTIONS = [
  { value: "lesson", label: "Lesson" },
  { value: "trial", label: "Trial" },
  { value: "private", label: "Private" },
  { value: "event", label: "Event" },
];

function Label({ children }) {
  return (
    <label className="block mb-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadValue({ children }) {
  return (
    <p className="text-[13px] font-medium text-foreground truncate">
      {children || <span className="text-muted-foreground">—</span>}
    </p>
  );
}

function Input({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  );
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary"
      >
        <option value="">Select…</option>
        {options.map((opt, i) => (
          <option key={opt.value ?? i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

const STATUS_META = {
  scheduled:           { cls: "bg-blue-500/10 text-blue-400",    label: "Scheduled" },
  completed:           { cls: "bg-emerald-500/10 text-emerald-400", label: "Completed" },
  cancelled_no_charge: { cls: "bg-zinc-500/10 text-zinc-400",    label: "Cancelled" },
  cancelled_charged:   { cls: "bg-red-500/10 text-red-400",      label: "Cancelled – Charged" },
  no_show_no_charge:   { cls: "bg-orange-500/10 text-orange-400",label: "No Show" },
  no_show_charged:     { cls: "bg-orange-500/10 text-orange-500",label: "No Show – Charged" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta?.cls || "bg-muted text-muted-foreground"}`}>
      {meta?.label || status}
    </span>
  );
}

function formatDisplayDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDisplayTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateInputValue(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function toTimeInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EventDetailPanel({
  event,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateScope, setUpdateScope] = useState("this"); // 'this' | 'all'
  const [deleteScope, setDeleteScope] = useState("this"); // 'this' | 'all'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const isRecurring = Boolean(event.recurrenceGroupID);

  const [teacherOptions, setTeacherOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerDetails, setCustomerDetails] = useState([]);
  const [teacherDetail, setTeacherDetail] = useState(null);

  const [form, setForm] = useState({
    title: event.title || "",
    date: toDateInputValue(event.startDateTime),
    start_time: toTimeInputValue(event.startDateTime),
    end_time: toTimeInputValue(event.endDateTime),
    teacherID: String(event.teacherID?._id ?? event.teacherID ?? ""),
    customerID: String(
      event.customerIDs?.[0]?._id ?? event.customerIDs?.[0] ?? "",
    ),
    // Use effectiveStatus (auto-completed for past events) if no explicit terminal status
    status: event.effectiveStatus || event.status || "scheduled",
    type: event.type || "",
    notes: event.notes || "",
    payment_collected: event.payment?.collected || false,
    payment_amount: event.payment?.amount != null ? String(event.payment.amount) : "",
    payment_method: event.payment?.method || "",
  });

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    async function loadOptions() {
      const [teachersRes, customersRes] = await Promise.all([
        api.get("/api/teacher?limit=200&status=active"),
        api.get("/api/customer?limit=200"),
      ]);
      if (teachersRes.success && Array.isArray(teachersRes.data)) {
        setTeacherOptions(
          teachersRes.data.map((t) => ({
            value: String(t._id ?? t.id),
            label: t.name || t.email || String(t._id),
          })),
        );
      }
      if (customersRes.success && Array.isArray(customersRes.data)) {
        setCustomerOptions(
          customersRes.data.map((c) => ({
            value: String(c._id ?? c.id),
            label: c.name || c.email || String(c._id),
          })),
        );
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      const customerIds = (event.customerIDs || [])
        .map((c) => (typeof c === "object" ? c._id : c))
        .filter(Boolean);
      const teacherId = event.teacherID?._id ?? event.teacherID ?? null;

      const [customerResults, teacherRes] = await Promise.all([
        Promise.all(customerIds.map((id) => api.get(`/api/customer/${id}`))),
        teacherId
          ? api.get(`/api/teacher/${teacherId}`)
          : Promise.resolve(null),
      ]);

      setCustomerDetails(
        customerResults.filter((r) => r.success).map((r) => r.data),
      );
      setTeacherDetail(teacherRes?.success ? teacherRes.data : null);
    }
    loadDetails();
  }, [event._id]);

  const handleUpdate = async () => {
    setError(null);
    setIsSaving(true);
    const startDateTime =
      form.date && form.start_time
        ? new Date(`${form.date}T${form.start_time}`).toISOString()
        : undefined;
    const endDateTime =
      form.date && form.end_time
        ? new Date(`${form.date}T${form.end_time}`).toISOString()
        : undefined;

    const payload = {
      title: form.title,
      startDateTime,
      endDateTime,
      teacherID: form.teacherID || undefined,
      customerIDs: form.customerID ? [form.customerID] : undefined,
      status: form.status,
      type: form.type || undefined,
      notes: form.notes || undefined,
      payment: form.payment_collected
        ? {
            amount: form.payment_amount !== "" ? Number(form.payment_amount) : undefined,
            method: form.payment_method || undefined,
            collected: true,
          }
        : { collected: false },
    };

    const url =
      isRecurring && updateScope === "all"
        ? `/api/calendar/${event._id}?updateAll=true`
        : `/api/calendar/${event._id}`;
    const result = await api.put(url, payload);
    if (result.success) {
      setIsEditing(false);
      onUpdated?.();
    } else {
      setError(result.error || "Failed to update event.");
    }
    setIsSaving(false);
  };

  const handleQuickStatus = async (newStatus) => {
    setError(null);
    setIsSaving(true);
    const result = await api.put(`/api/calendar/${event._id}`, { status: newStatus });
    if (result.success) {
      onUpdated?.();
      onClose();
    } else {
      setError(result.error || "Failed to update status.");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    const params = new URLSearchParams({ hard: "true" });
    if (isRecurring && deleteScope === "all") params.set("deleteAll", "true");
    const result = await api.delete(`/api/calendar/${event._id}?${params}`);
    if (result.success) {
      onDeleted?.();
      onClose();
    } else {
      setError(result.error || "Failed to delete event.");
    }
    setIsDeleting(false);
  };

  if (selectedStudentId) {
    return (
      <MiniStudentPanel
        customerId={selectedStudentId}
        customerName={selectedStudentName}
        onBack={() => { setSelectedStudentId(null); setSelectedStudentName(""); }}
      />
    );
  }

  return (
    <aside className="h-full w-[380px] shrink-0 rounded-xl border border-border bg-card shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {event.title}
          </span>
          <StatusBadge status={event.effectiveStatus || event.status} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit event"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEditing ? (
          <>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(v) => setField("title", v)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(v) => setField("status", v)}
                  options={STATUS_OPTIONS}
                />
              </Field>
              <Field label="Type">
                <Select
                  value={form.type}
                  onChange={(v) => setField("type", v)}
                  options={TYPE_OPTIONS}
                />
              </Field>
            </div>
            <Field label="Date">
              <DateInput
                value={form.date}
                onChange={(v) => setField("date", v)}
              />
            </Field>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Field label="Start time">
                <TimeInput
                  value={form.start_time}
                  onChange={(v) => setField("start_time", v)}
                />
              </Field>
              <span className="pb-1 text-[12px] text-muted-foreground">to</span>
              <Field label="End time">
                <TimeInput
                  value={form.end_time}
                  onChange={(v) => setField("end_time", v)}
                />
              </Field>
            </div>
            <Field label="Instructor">
              <Select
                value={form.teacherID}
                onChange={(v) => setField("teacherID", v)}
                options={teacherOptions}
              />
            </Field>
            <Field label="Customer">
              <Select
                value={form.customerID}
                onChange={(v) => setField("customerID", v)}
                options={customerOptions}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
              />
            </Field>

            {/* Payment */}
            <div className={[
              "rounded-xl border px-3 py-2.5 transition-colors",
              form.payment_collected ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20",
            ].join(" ")}>
              <div className="flex items-center justify-between">
                <p className={`text-[12px] font-semibold ${form.payment_collected ? "text-emerald-600" : "text-foreground"}`}>
                  {form.payment_collected ? "Payment recorded" : "Record payment"}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.payment_collected}
                  onClick={() => setField("payment_collected", !form.payment_collected)}
                  className={[
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    form.payment_collected ? "bg-emerald-500" : "bg-muted",
                  ].join(" ")}
                >
                  <span className={[
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                    form.payment_collected ? "translate-x-4" : "translate-x-0",
                  ].join(" ")} />
                </button>
              </div>
              {form.payment_collected && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-[10px] font-medium text-muted-foreground">Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.payment_amount}
                        onChange={(e) => setField("payment_amount", e.target.value)}
                        placeholder="0.00"
                        className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-3 text-[12px] text-foreground outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-[10px] font-medium text-muted-foreground">Method</label>
                    <div className="relative">
                      <select
                        value={form.payment_method}
                        onChange={(e) => setField("payment_method", e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-emerald-500"
                      >
                        <option value="">Select…</option>
                        {["cash","card","online","cheque","other"].map((m) => (
                          <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Date">
                <ReadValue>{formatDisplayDate(event.startDateTime)}</ReadValue>
              </Field>
              <Field label="Type">
                <ReadValue>
                  {event.type
                    ? event.type.charAt(0).toUpperCase() + event.type.slice(1)
                    : "—"}
                </ReadValue>
              </Field>
              <Field label="Start">
                <ReadValue>{formatDisplayTime(event.startDateTime)}</ReadValue>
              </Field>
              <Field label="End">
                <ReadValue>{formatDisplayTime(event.endDateTime)}</ReadValue>
              </Field>
            </div>

            {/* Service info */}
            {event.calendarServiceID && (
              <div>
                <Label>Service</Label>
                <div className="mt-1 rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {event.calendarServiceID.serviceName}
                    </p>
                    {event.calendarServiceID.serviceCode && (
                      <p className="text-[10px] text-muted-foreground">{event.calendarServiceID.serviceCode}</p>
                    )}
                  </div>
                  {event.calendarServiceID.isChargeable && event.calendarServiceID.price > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                      ${Number(event.calendarServiceID.price).toFixed(2)} / session
                    </span>
                  )}
                </div>
                {/* Billing status */}
                {event.calendarServiceID.isChargeable && (
                  <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
                    {event.chargeApplied ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] text-emerald-600 font-medium">
                          {event.chargeMethod === "package" && "Session deducted from package"}
                          {event.chargeMethod === "credits" && `$${Number(event.calendarServiceID.price).toFixed(2)} deducted from credits`}
                          {event.chargeMethod === "mixed" && "Charged via package + credits"}
                          {event.chargeMethod === "none" && "Charged"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Not charged (refunded or waived)</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Instructor details */}
            <div>
              <Label>Instructor</Label>
              {!teacherDetail ? (
                <p className="text-[13px] text-muted-foreground">—</p>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(teacherDetail.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {teacherDetail.name}
                      </p>
                      {teacherDetail.specialties?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {teacherDetail.specialties.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  {teacherDetail.email && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {teacherDetail.email}
                    </p>
                  )}
                  {teacherDetail.phoneNumber && (
                    <p className="text-[11px] text-muted-foreground">
                      {teacherDetail.phoneNumber}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Customer details */}
            <div>
              <Label>Customer{customerDetails.length !== 1 ? "s" : ""}</Label>
              {customerDetails.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">—</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {customerDetails.map((c) => (
                    <div
                      key={c._id}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-2 min-w-0 cursor-pointer group"
                          onClick={() => { setSelectedStudentId(String(c._id)); setSelectedStudentName(c.name || "Student"); }}
                        >
                          <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(c.name || "?").charAt(0).toUpperCase()}
                          </span>
                          <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary group-hover:underline">
                            {c.name || "—"}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          ${c.credits ?? 0}
                        </span>
                      </div>
                      {c.email && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.email}
                        </p>
                      )}
                      {c.phoneNumber && (
                        <p className="text-[11px] text-muted-foreground">
                          {c.phoneNumber}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {event.notes && (
              <Field label="Notes">
                <p className="text-[12px] text-foreground whitespace-pre-wrap">
                  {event.notes}
                </p>
              </Field>
            )}

            {event.payment?.collected && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-600">Payment Collected</p>
                  {event.payment.method && (
                    <p className="text-[10px] text-muted-foreground capitalize">{event.payment.method}</p>
                  )}
                </div>
                {event.payment.amount != null && (
                  <span className="text-[14px] font-bold text-emerald-600">
                    ${Number(event.payment.amount).toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            {isRecurring && (
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setUpdateScope("this")}
                  className={`flex-1 py-1.5 transition-colors ${updateScope === "this" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                >
                  This event only
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateScope("all")}
                  className={`flex-1 py-1.5 transition-colors ${updateScope === "all" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                >
                  All in series
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                className="h-9 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted/40"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isSaving}
                className="h-9 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick record-payment button — only shown when no payment is on file */}
            {!event.payment?.collected && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full h-9 rounded-lg border border-emerald-500/40 text-[12px] font-semibold text-emerald-600 hover:bg-emerald-500/8 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="text-emerald-500 font-bold text-[14px] leading-none">$</span>
                Record Payment
              </button>
            )}

            {/* Quick status actions — only shown when event is still scheduled */}
            {event.effectiveStatus === "scheduled" || event.status === "scheduled" ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mark as</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickStatus("cancelled_no_charge")}
                    disabled={isSaving}
                    className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-background text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    Cancel – No Charge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus("cancelled_charged")}
                    disabled={isSaving}
                    className="h-9 rounded-lg border border-red-300 dark:border-red-800 bg-background text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
                  >
                    Cancel – Charged
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus("no_show_no_charge")}
                    disabled={isSaving}
                    className="h-9 rounded-lg border border-orange-300 dark:border-orange-800 bg-background text-[11px] font-semibold text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 disabled:opacity-50 transition-colors"
                  >
                    No Show – No Charge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus("no_show_charged")}
                    disabled={isSaving}
                    className="h-9 rounded-lg border border-orange-400 dark:border-orange-700 bg-background text-[11px] font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 disabled:opacity-50 transition-colors"
                  >
                    No Show – Charged
                  </button>
                </div>
              </div>
            ) : null}

            {/* Delete */}
            {confirmDelete ? (
              <div className="space-y-2">
                {isRecurring && (
                  <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setDeleteScope("this")}
                      className={`flex-1 py-1.5 transition-colors ${deleteScope === "this" ? "bg-destructive text-white" : "text-muted-foreground hover:bg-muted/40"}`}
                    >
                      This event only
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteScope("all")}
                      className={`flex-1 py-1.5 transition-colors ${deleteScope === "all" ? "bg-destructive text-white" : "text-muted-foreground hover:bg-muted/40"}`}
                    >
                      All in series
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 h-9 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted/40"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 h-9 rounded-lg bg-destructive text-[12px] font-semibold text-white hover:bg-destructive/90 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full h-9 rounded-lg border border-destructive/40 text-[12px] font-semibold text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Permanently
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
