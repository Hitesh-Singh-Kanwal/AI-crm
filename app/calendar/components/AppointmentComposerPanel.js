"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock, Plus, RefreshCw, User, Users, X } from "lucide-react";
import api from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bumpHour(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function addMinutes(timeStr, minutesToAdd) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const total = h * 60 + m + (Number(minutesToAdd) || 0);
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "Appointment",   label: "Appointment",  icon: User },
  { key: "Intro Lesson",  label: "Intro",        icon: User },
  { key: "Group Class",   label: "Group Class",  icon: Users },
  { key: "To Do",         label: "To Do",        icon: CalendarDays },
  { key: "Record Only",   label: "Record",       icon: Clock },
];

const TAB_TYPE_MAP = {
  Appointment:    "private",
  "Intro Lesson": "trial",
  "Group Class":  "lesson",
  "To Do":        "event",
  "Record Only":  "record",
};

const TAB_SAVE_LABEL = {
  Appointment:    "Book Appointment",
  "Intro Lesson": "Book Intro Lesson",
  "Group Class":  "Add to Class",
  "To Do":        "Save To Do",
  "Record Only":  "Record",
};

const PAYMENT_METHODS = [
  { value: "cash",   label: "Cash" },
  { value: "card",   label: "Card" },
  { value: "online", label: "Online" },
  { value: "cheque", label: "Cheque" },
  { value: "other",  label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EMPTY_FORM = {
  lesson_id:           "",
  service_id:          "",
  instructor_id:       "",
  customer_id:         "",
  customer_ids:        [],
  date:                "",
  start_time:          "",
  end_time:            "",
  public_note:         "",
  internal_note:       "",
  title:               "",
  package_id:          "",
  recurrence_enabled:  false,
  recurrence_frequency:"weekly",
  recurrence_end_date: "",
  event_color:         "",
  payment_collected:   false,
  payment_amount:      "",
  payment_method:      "",
  group_sell_package:  false,
  group_package_id:    "",
};

// ─── Primitive UI components ──────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label className="block mb-1 text-[11px] font-semibold text-muted-foreground">
      {children}
    </label>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
    />
  );
}

function StyledSelect({ value, onChange, options = [], placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, i) => (
          <option key={opt.value != null ? opt.value : i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function StyledTextArea({ value, onChange, placeholder, rows = 2 }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
    />
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-brand" : "bg-muted",
      ].join(" ")}
    >
      <span className={[
        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0",
      ].join(" ")} />
    </button>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({ values = [], onChange, options = [], placeholder }) {
  const selected = new Set(values);
  const available = options.filter((o) => !selected.has(o.value));
  const selectedOptions = options.filter((o) => selected.has(o.value));

  return (
    <div className="rounded-lg border border-border bg-background focus-within:border-primary transition-colors">
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2.5 pt-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => onChange?.(values.filter((v) => v !== opt.value))}
                className="ml-0.5 leading-none hover:text-brand/70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !selected.has(v)) onChange?.([...values, v]);
          }}
          className="h-9 w-full appearance-none bg-transparent px-3 pr-8 text-[12px] text-foreground outline-none"
        >
          <option value="">{available.length === 0 ? "All selected" : placeholder}</option>
          {available.map((opt, i) => (
            <option key={opt.value != null ? opt.value : i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Service summary card ─────────────────────────────────────────────────────

function ServiceCard({ service }) {
  if (!service?.isChargeable || !(service.price > 0)) return null;
  return (
    <div className="mt-1.5 flex items-center justify-between rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2">
      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
        {service.serviceName}
      </span>
      <span className="shrink-0 ml-2 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
        ${Number(service.price).toFixed(2)}<span className="text-[10px] font-normal text-emerald-500"> / session</span>
      </span>
    </div>
  );
}

// ─── DateTime row ─────────────────────────────────────────────────────────────

function DateTimeRow({ form, setField }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-2">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setField("date", e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
        />
      </div>
      <div>
        <FieldLabel>Time</FieldLabel>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setField("start_time", e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary transition-colors"
          />
          <span className="text-[10px] text-muted-foreground">–</span>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setField("end_time", e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Recurrence block ─────────────────────────────────────────────────────────

function RecurrenceBlock({ form, setField }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Repeat
        </div>
        <Toggle
          checked={form.recurrence_enabled}
          onChange={(v) => setField("recurrence_enabled", v)}
        />
      </div>
      {form.recurrence_enabled && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <FieldLabel>Frequency</FieldLabel>
            <StyledSelect
              value={form.recurrence_frequency}
              onChange={(v) => setField("recurrence_frequency", v)}
              options={FREQUENCY_OPTIONS}
              placeholder="Select"
            />
          </div>
          <div>
            <FieldLabel>Until</FieldLabel>
            <input
              type="date"
              value={form.recurrence_end_date}
              onChange={(e) => setField("recurrence_end_date", e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notes block ─────────────────────────────────────────────────────────────

function NotesBlock({ form, setField }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = form.public_note || form.internal_note;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Notes{hasContent ? " ·" : ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {(expanded || hasContent) && (
        <div className="mt-2 space-y-2">
          <div>
            <FieldLabel>Public Note</FieldLabel>
            <StyledTextArea
              value={form.public_note}
              onChange={(v) => setField("public_note", v)}
              placeholder="Visible to the student…"
            />
          </div>
          <div>
            <FieldLabel>Internal Note</FieldLabel>
            <StyledTextArea
              value={form.internal_note}
              onChange={(v) => setField("internal_note", v)}
              placeholder="Staff only…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment block ────────────────────────────────────────────────────────────

function PaymentBlock({ form, setField, serviceMap }) {
  const svc = form.service_id ? serviceMap[form.service_id] : null;
  const suggested = svc?.isChargeable && svc?.price > 0 ? Number(svc.price).toFixed(2) : "";

  return (
    <div className={[
      "rounded-xl border px-3 py-2.5 transition-colors",
      form.payment_collected
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border bg-muted/20",
    ].join(" ")}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[12px] font-semibold ${form.payment_collected ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
            {form.payment_collected ? "Payment recorded" : "Record payment"}
          </p>
          {!form.payment_collected && (
            <p className="text-[10px] text-muted-foreground">Toggle to capture payment at booking</p>
          )}
        </div>
        <Toggle
          checked={form.payment_collected}
          onChange={(v) => {
            setField("payment_collected", v);
            if (v && suggested && !form.payment_amount) setField("payment_amount", suggested);
          }}
        />
      </div>
      {form.payment_collected && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Amount ($)</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.payment_amount}
                onChange={(e) => setField("payment_amount", e.target.value)}
                placeholder={suggested || "0.00"}
                className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-3 text-[12px] text-foreground outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Method</FieldLabel>
            <div className="relative">
              <select
                value={form.payment_method}
                onChange={(e) => setField("payment_method", e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">Select…</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New student inline form ──────────────────────────────────────────────────

function NewStudentInlineForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setIsCreating(true);
    setError(null);
    const result = await onCreate({ name: name.trim(), email: email.trim(), phoneNumber: phone.trim() || undefined });
    if (!result) setError("Failed to create student.");
    setIsCreating(false);
  }

  return (
    <div className="mt-2 rounded-xl border border-brand/30 bg-brand/5 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-brand">New Student</p>
      <StyledInput placeholder="Full name *" value={name} onChange={setName} />
      <StyledInput placeholder="Email address *" value={email} onChange={setEmail} type="email" />
      <StyledInput placeholder="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="flex-1 h-8 rounded-lg bg-brand text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60 transition-colors"
        >
          {isCreating ? "Creating…" : "Create & Select"}
        </button>
      </div>
    </div>
  );
}

// ─── Student picker (single) ──────────────────────────────────────────────────

function StudentPicker({ value, onChange, options, onNewCustomer, lessonOptions = [], onEnrollStudent }) {
  const [showNew, setShowNew] = useState(false);
  const [newStudentId, setNewStudentId] = useState(null);
  const [enrollLessonId, setEnrollLessonId] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollDone, setEnrollDone] = useState(false);

  async function handleEnroll() {
    if (!enrollLessonId || !newStudentId) return;
    setIsEnrolling(true);
    await onEnrollStudent?.(newStudentId, enrollLessonId);
    setEnrollDone(true);
    setIsEnrolling(false);
  }

  return (
    <div>
      <StyledSelect value={value} onChange={onChange} options={options} placeholder="Select student…" />
      {showNew ? (
        <NewStudentInlineForm
          onCreate={async (data) => {
            const id = await onNewCustomer(data);
            if (id) {
              onChange(id);
              setShowNew(false);
              setNewStudentId(id);
              setEnrollDone(false);
              setEnrollLessonId("");
            }
            return id;
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add new student
        </button>
      )}

      {/* Enrollment prompt shown after a new student is created */}
      {newStudentId && !showNew && lessonOptions.length > 0 && (
        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-primary">Add Enrollment</p>
          {enrollDone ? (
            <p className="text-[11px] text-emerald-600 font-medium">Enrolled successfully.</p>
          ) : (
            <>
              <StyledSelect
                value={enrollLessonId}
                onChange={setEnrollLessonId}
                options={lessonOptions}
                placeholder="Select program to enroll in…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewStudentId(null)}
                  className="flex-1 h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={!enrollLessonId || isEnrolling}
                  className="flex-1 h-8 rounded-lg bg-primary text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isEnrolling ? "Enrolling…" : "Add Enrollment"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Students picker (multi) ──────────────────────────────────────────────────

function StudentsPicker({ values, onChange, options, onNewCustomer }) {
  const [showNew, setShowNew] = useState(false);
  return (
    <div>
      <MultiSelect values={values} onChange={onChange} options={options} placeholder="Select students…" />
      {showNew ? (
        <NewStudentInlineForm
          onCreate={async (data) => {
            const id = await onNewCustomer(data);
            if (id) { onChange([...values, id]); setShowNew(false); }
            return id;
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add new student
        </button>
      )}
    </div>
  );
}

// ─── Scheduling + Service block (shared across tabs) ─────────────────────────

function SchedulingBlock({ form, setField, lessonOptions, lessonMap, serviceOptions, serviceMap, showService = true }) {
  const selectedService = form.service_id ? serviceMap[form.service_id] : null;

  function handleLessonChange(id) {
    setField("lesson_id", id);
    const lesson = lessonMap[id];
    if (lesson?.name) setField("title", lesson.name);
    if (lesson?.color) setField("event_color", lesson.color);
    if (lesson?.duration && form.start_time) setField("end_time", addMinutes(form.start_time, lesson.duration));
  }

  return (
    <div className="space-y-3">
      <SectionDivider label="Scheduling" />
      <div>
        <FieldLabel>Scheduling Code</FieldLabel>
        <StyledSelect
          value={form.lesson_id}
          onChange={handleLessonChange}
          options={lessonOptions}
          placeholder="Select scheduling code…"
        />
      </div>
      {showService && (
        <div>
          <FieldLabel>Service</FieldLabel>
          <StyledSelect
            value={form.service_id}
            onChange={(v) => {
              setField("service_id", v);
              const svc = serviceMap[v];
              if (svc?.color) setField("event_color", svc.color);
            }}
            options={serviceOptions}
            placeholder="Select service…"
          />
          <ServiceCard service={selectedService} />
        </div>
      )}
    </div>
  );
}

// ─── Tab form components ──────────────────────────────────────────────────────

function AppointmentFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions, onNewCustomer, onEnrollStudent }) {
  return (
    <div className="space-y-4">
      <SchedulingBlock form={form} setField={setField} lessonOptions={lessonOptions} lessonMap={lessonMap} serviceOptions={serviceOptions} serviceMap={serviceMap} />

      <div className="space-y-3">
        <SectionDivider label="Who" />
        <div>
          <FieldLabel>Instructor</FieldLabel>
          <StyledSelect value={form.instructor_id} onChange={(v) => setField("instructor_id", v)} options={instructorOptions} placeholder="Select instructor…" />
        </div>
        <div>
          <FieldLabel>Student</FieldLabel>
          <StudentPicker value={form.customer_id} onChange={(v) => setField("customer_id", v)} options={customerOptions} onNewCustomer={onNewCustomer} lessonOptions={lessonOptions} onEnrollStudent={onEnrollStudent} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="When" />
        <DateTimeRow form={form} setField={setField} />
        <RecurrenceBlock form={form} setField={setField} />
      </div>

      <div className="space-y-3">
        <SectionDivider label="Notes & Payment" />
        <NotesBlock form={form} setField={setField} />
        <PaymentBlock form={form} setField={setField} serviceMap={serviceMap} />
      </div>
    </div>
  );
}

function IntroLessonFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions, onNewCustomer, onEnrollStudent }) {
  return (
    <div className="space-y-4">
      <SchedulingBlock form={form} setField={setField} lessonOptions={lessonOptions} lessonMap={lessonMap} serviceOptions={serviceOptions} serviceMap={serviceMap} />

      <div className="space-y-3">
        <SectionDivider label="Who" />
        <div>
          <FieldLabel>Instructor</FieldLabel>
          <StyledSelect value={form.instructor_id} onChange={(v) => setField("instructor_id", v)} options={instructorOptions} placeholder="Select instructor…" />
        </div>
        <div>
          <FieldLabel>Student</FieldLabel>
          <StudentPicker value={form.customer_id} onChange={(v) => setField("customer_id", v)} options={customerOptions} onNewCustomer={onNewCustomer} lessonOptions={lessonOptions} onEnrollStudent={onEnrollStudent} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="When" />
        <DateTimeRow form={form} setField={setField} />
      </div>

      <div className="space-y-3">
        <SectionDivider label="After Intro" />
        <div>
          <FieldLabel>Sell Package at Booking</FieldLabel>
          <StyledSelect value={form.package_id} onChange={(v) => setField("package_id", v)} options={packageOptions} placeholder="No package (skip)" />
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="Notes & Payment" />
        <NotesBlock form={form} setField={setField} />
        <PaymentBlock form={form} setField={setField} serviceMap={serviceMap} />
      </div>
    </div>
  );
}

function GroupClassFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions, onNewCustomer }) {
  return (
    <div className="space-y-4">
      <SchedulingBlock form={form} setField={setField} lessonOptions={lessonOptions} lessonMap={lessonMap} serviceOptions={serviceOptions} serviceMap={serviceMap} />

      <div className="space-y-3">
        <SectionDivider label="Who" />
        <div>
          <FieldLabel>Instructor</FieldLabel>
          <StyledSelect value={form.instructor_id} onChange={(v) => setField("instructor_id", v)} options={instructorOptions} placeholder="Select instructor…" />
        </div>
        <div>
          <FieldLabel>Students</FieldLabel>
          <StudentsPicker values={form.customer_ids} onChange={(v) => setField("customer_ids", v)} options={customerOptions} onNewCustomer={onNewCustomer} />
        </div>
      </div>

      {/* Sell package inline — shown once at least one student is selected */}
      {form.customer_ids.length > 0 && (
        <div className={[
          "rounded-xl border px-3 py-2.5 transition-colors",
          form.group_sell_package ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20",
        ].join(" ")}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[12px] font-semibold ${form.group_sell_package ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {form.group_sell_package ? "Selling package at booking" : "Sell package at booking"}
              </p>
              {!form.group_sell_package && (
                <p className="text-[10px] text-muted-foreground">
                  Sell to all {form.customer_ids.length} selected student{form.customer_ids.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Toggle checked={form.group_sell_package} onChange={(v) => setField("group_sell_package", v)} />
          </div>
          {form.group_sell_package && (
            <div className="mt-2.5">
              <FieldLabel>Package</FieldLabel>
              <StyledSelect
                value={form.group_package_id}
                onChange={(v) => setField("group_package_id", v)}
                options={packageOptions}
                placeholder="Select package to sell…"
              />
              {form.group_package_id && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Will be sold to {form.customer_ids.length} student{form.customer_ids.length !== 1 ? "s" : ""} on booking
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <SectionDivider label="When" />
        <DateTimeRow form={form} setField={setField} />
        <RecurrenceBlock form={form} setField={setField} />
      </div>

      <div className="space-y-3">
        <SectionDivider label="Notes" />
        <NotesBlock form={form} setField={setField} />
      </div>
    </div>
  );
}

function ToDoFields({ form, setField, instructorOptions, lessonOptions, lessonMap }) {
  function handleLessonChange(id) {
    setField("lesson_id", id);
    const lesson = lessonMap[id];
    if (lesson?.name) setField("title", lesson.name);
    if (lesson?.color) setField("event_color", lesson.color);
    if (lesson?.duration && form.start_time) setField("end_time", addMinutes(form.start_time, lesson.duration));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionDivider label="Task" />
        <div>
          <FieldLabel>Scheduling Code</FieldLabel>
          <StyledSelect value={form.lesson_id} onChange={handleLessonChange} options={lessonOptions} placeholder="Select scheduling code…" />
        </div>
        <div>
          <FieldLabel>Title</FieldLabel>
          <StyledInput value={form.title} onChange={(v) => setField("title", v)} placeholder="Task title…" />
        </div>
        <div>
          <FieldLabel>Assigned To</FieldLabel>
          <StyledSelect value={form.instructor_id} onChange={(v) => setField("instructor_id", v)} options={instructorOptions} placeholder="Select instructor…" />
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="When" />
        <DateTimeRow form={form} setField={setField} />
        <RecurrenceBlock form={form} setField={setField} />
      </div>

      <div className="space-y-3">
        <SectionDivider label="Notes" />
        <NotesBlock form={form} setField={setField} />
      </div>
    </div>
  );
}

function RecordOnlyFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions }) {
  function handleLessonChange(id) {
    setField("lesson_id", id);
    const lesson = lessonMap[id];
    if (lesson?.name) setField("title", lesson.name);
    if (lesson?.color) setField("event_color", lesson.color);
    if (lesson?.duration && form.start_time) setField("end_time", addMinutes(form.start_time, lesson.duration));
  }

  const selectedService = form.service_id ? serviceMap[form.service_id] : null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionDivider label="Details" />
        <div>
          <FieldLabel>Scheduling Code</FieldLabel>
          <StyledSelect value={form.lesson_id} onChange={handleLessonChange} options={lessonOptions} placeholder="Select scheduling code…" />
        </div>
        <div>
          <FieldLabel>Service</FieldLabel>
          <StyledSelect value={form.service_id} onChange={(v) => setField("service_id", v)} options={serviceOptions} placeholder="Select service…" />
          <ServiceCard service={selectedService} />
        </div>
        <div>
          <FieldLabel>Package</FieldLabel>
          <StyledSelect value={form.package_id} onChange={(v) => setField("package_id", v)} options={packageOptions} placeholder="Select package…" />
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="Who" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Instructor</FieldLabel>
            <StyledSelect value={form.instructor_id} onChange={(v) => setField("instructor_id", v)} options={instructorOptions} placeholder="Instructor…" />
          </div>
          <div>
            <FieldLabel>Student</FieldLabel>
            <StyledSelect value={form.customer_id} onChange={(v) => setField("customer_id", v)} options={customerOptions} placeholder="Student…" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionDivider label="When" />
        <DateTimeRow form={form} setField={setField} />
      </div>

      <div className="space-y-3">
        <SectionDivider label="Notes" />
        <div>
          <FieldLabel>Internal Note</FieldLabel>
          <StyledTextArea value={form.internal_note} onChange={(v) => setField("internal_note", v)} placeholder="Staff only…" />
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AppointmentComposerPanel({ onClose, onCreated, initialDate, initialTime, initialDuration }) {
  const [activeTab, setActiveTab] = useState("Appointment");
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    date: initialDate || "",
    start_time: initialTime || "",
    end_time: initialTime
      ? initialDuration ? addMinutes(initialTime, initialDuration) : bumpHour(initialTime)
      : "",
  }));

  const [instructorOptions, setInstructorOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [lessonOptions, setLessonOptions] = useState([]);
  const [lessonMap, setLessonMap] = useState({});
  const [serviceOptions, setServiceOptions] = useState([]);
  const [serviceMap, setServiceMap] = useState({});
  const [packageOptions, setPackageOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, customersRes, lessonsRes, packagesRes, servicesRes] = await Promise.all([
          api.get("/api/teacher?limit=200&status=active"),
          api.get("/api/customer?limit=200"),
          api.get("/api/lesson?limit=200"),
          api.get("/api/package?limit=200"),
          api.get("/api/calendar-service?limit=200"),
        ]);

        if (usersRes.success && Array.isArray(usersRes.data))
          setInstructorOptions(usersRes.data.map((t) => ({ value: String(t._id ?? t.id), label: t.name || t.email || String(t._id) })));

        if (customersRes.success && Array.isArray(customersRes.data))
          setCustomerOptions(customersRes.data.map((c) => ({ value: String(c._id ?? c.id), label: c.name || c.email || String(c._id) })));

        if (lessonsRes.success && Array.isArray(lessonsRes.data)) {
          const map = {};
          lessonsRes.data.forEach((l) => { map[String(l._id)] = l; });
          setLessonMap(map);
          setLessonOptions(lessonsRes.data.map((l) => ({ value: String(l._id), label: l.name })));
        }

        if (servicesRes.success && Array.isArray(servicesRes.data)) {
          const map = {};
          servicesRes.data.forEach((s) => { map[String(s._id)] = s; });
          setServiceMap(map);
          setServiceOptions(servicesRes.data.map((s) => ({
            value: String(s._id),
            label: s.isChargeable && s.price > 0 ? `${s.serviceName} ($${Number(s.price).toFixed(2)})` : s.serviceName,
          })));
        }

        if (packagesRes.success && Array.isArray(packagesRes.data))
          setPackageOptions(packagesRes.data.map((p) => ({ value: String(p._id), label: p.packageName || String(p._id) })));
      } catch {
        setError("Failed to load form options. Please close and reopen.");
      }
    }
    load();
  }, []);

  const handleNewCustomer = async ({ name, email, phoneNumber }) => {
    const result = await api.post("/api/customer", { name, email, phoneNumber });
    if (result.success && result.data) {
      const c = result.data;
      const newId = String(c._id);
      setCustomerOptions((prev) => [...prev, { value: newId, label: c.name || c.email || newId }]);
      return newId;
    }
    return null;
  };

  const handleEnrollStudent = async (customerId, lessonId) => {
    await api.post(`/api/customer/${customerId}/assign-lessons`, { lessonIds: [lessonId] });
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    const startDateTime = form.date && form.start_time ? new Date(`${form.date}T${form.start_time}`).toISOString() : undefined;
    const endDateTime   = form.date && form.end_time   ? new Date(`${form.date}T${form.end_time}`).toISOString()   : undefined;

    const payload = {
      title: form.title || TABS.find((t) => t.key === activeTab)?.label || "Appointment",
      type:  TAB_TYPE_MAP[activeTab],
      teacherID:   form.instructor_id || undefined,
      customerIDs: activeTab === "Group Class"
        ? (form.customer_ids.length ? form.customer_ids : undefined)
        : (form.customer_id ? [form.customer_id] : undefined),
      lessonID:         form.lesson_id    || undefined,
      calendarServiceID:form.service_id   || undefined,
      packageID:        form.package_id   || undefined,
      startDateTime,
      endDateTime,
      color: form.event_color || undefined,
      notes: [form.public_note, form.internal_note].filter(Boolean).join("\n") || undefined,
      recurrence: form.recurrence_enabled && form.recurrence_frequency && form.recurrence_end_date
        ? { enabled: true, frequency: form.recurrence_frequency, endDate: form.recurrence_end_date }
        : { enabled: false },
      payment: form.payment_collected
        ? { amount: form.payment_amount !== "" ? Number(form.payment_amount) : undefined, method: form.payment_method || undefined, collected: true }
        : undefined,
    };

    const result = await api.post("/api/calendar", payload);
    if (result.success) {
      // Sell package to each student if requested for group class
      if (activeTab === "Group Class" && form.group_sell_package && form.group_package_id && form.customer_ids.length) {
        await Promise.all(
          form.customer_ids.map((cid) =>
            api.post("/api/customer-package", { customerID: cid, packageID: form.group_package_id })
          )
        );
      }
      onCreated?.();
      onClose();
    } else {
      setError(result.error || "Failed to save. Please try again.");
    }
    setIsSaving(false);
  };

  const sharedProps = { form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions, onNewCustomer: handleNewCustomer, onEnrollStudent: handleEnrollStudent };

  const tabContent = useMemo(() => {
    if (activeTab === "Appointment")   return <AppointmentFields {...sharedProps} />;
    if (activeTab === "Intro Lesson")  return <IntroLessonFields {...sharedProps} />;
    if (activeTab === "Group Class")   return <GroupClassFields {...sharedProps} />;
    if (activeTab === "To Do")         return <ToDoFields {...sharedProps} />;
    return <RecordOnlyFields {...sharedProps} />;
  }, [activeTab, form, instructorOptions, customerOptions, lessonOptions, lessonMap, serviceOptions, serviceMap, packageOptions]);

  const saveLabel = isSaving ? "Saving…" : TAB_SAVE_LABEL[activeTab] || "Save";

  return (
    <aside className="h-full w-[460px] shrink-0 flex flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <p className="text-[13px] font-bold text-foreground">New Booking</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide px-2 pb-0 gap-0.5 mt-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                "flex items-center gap-1.5 shrink-0 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                activeTab === key
                  ? "text-brand border-brand bg-background"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40",
              ].join(" ")}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tabContent}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 mx-4 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 h-9 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saveLabel}
        </button>
      </div>
    </aside>
  );
}
