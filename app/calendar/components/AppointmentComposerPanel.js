"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock,
  Plus,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import NewEnrollmentPackageInline from "@/app/calendar/components/NewEnrollmentPackageInline";

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

function ordinalLabel(n) {
  return ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "Appointment", label: "Appointment", icon: User },
  { key: "Group Class", label: "Group Class", icon: Users },
  { key: "To Do", label: "To Do", icon: CalendarDays },
];

const TAB_TYPE_MAP = {
  Appointment: "private",
  "Group Class": "lesson",
  "To Do": "event",
};

const TAB_SAVE_LABEL = {
  Appointment: "Book Appointment",
  "Group Class": "Add to Class",
  "To Do": "Save To Do",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EMPTY_FORM = {
  lesson_id: "",
  service_id: "",
  instructor_id: "",
  customer_id: "",
  customer_ids: [],
  enrollment_id: "",
  date: "",
  start_time: "",
  end_time: "",
  selected_time_slots: [],
  public_note: "",
  internal_note: "",
  title: "",
  recurrence_enabled: false,
  recurrence_frequency: "weekly",
  recurrence_end_date: "",
  event_color: "",
  payment_collected: false,
  payment_amount: "",
  payment_method: "",
  group_sell_package: false,
  group_package_id: "",
};

// ─── Primitive UI ─────────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label className="block mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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

function StyledSelect({
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function SearchableSelect({ value, onChange, options = [], placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground/50"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange?.(opt.value); setOpen(false); }}
                  className={[
                    "w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/50 transition-colors",
                    opt.value === value ? "bg-brand/10 text-brand font-medium" : "text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({ values = [], onChange, options = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = new Set(values);
  const available = options.filter((o) => !selected.has(o.value));
  const selectedOptions = options.filter((o) => selected.has(o.value));
  const filtered = query.trim()
    ? available.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : available;

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative rounded-lg border border-border bg-background focus-within:border-primary transition-colors">
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-full flex items-center justify-between px-3 pr-8 text-[12px] outline-none relative"
      >
        <span className="text-muted-foreground/50">
          {available.length === 0 ? "All selected" : placeholder}
        </span>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {available.length === 0 ? "All selected" : "No results"}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange?.([...values, opt.value]); setQuery(""); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-foreground hover:bg-muted/50 transition-colors"
                >
                  {opt.label}
                </button>
              ))
            )}
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
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    const result = await onCreate({
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phone.trim() || undefined,
    });
    if (!result) setError("Failed to create student.");
    setIsCreating(false);
  }

  return (
    <div className="mt-2 rounded-xl border border-brand/30 bg-brand/5 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-brand">New Student</p>
      <StyledInput placeholder="Full name *" value={name} onChange={setName} />
      <StyledInput
        placeholder="Email address *"
        value={email}
        onChange={setEmail}
        type="email"
      />
      <StyledInput
        placeholder="Phone (optional)"
        value={phone}
        onChange={setPhone}
        type="tel"
      />
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

// ─── Enrollment → Package → Service selector ──────────────────────────────────

function EnrollmentServiceSelector({
  customerId,
  enrollments,
  selectedEnrollmentId,
  onEnrollmentSelect,
  onServiceSelect,
  selectedServiceId,
  allServices,
  onOpenEnrollmentWizard,
}) {
  if (!customerId) return null;

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  if (enrollments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
        <p className="text-[11px] text-muted-foreground">
          No enrollments found for this student.
        </p>
        <button
          type="button"
          onClick={() => onOpenEnrollmentWizard?.(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline mx-auto"
        >
          <Plus className="h-3 w-3" /> Add enrollment
        </button>
      </div>
    );
  }

  if (activeEnrollments.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-900/10 p-3 text-center">
        <p className="text-[11px] text-amber-600">
          No active enrollments with a package. Add a package to an enrollment
          first.
        </p>
        <button
          type="button"
          onClick={() => onOpenEnrollmentWizard?.(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline mx-auto"
        >
          <Plus className="h-3 w-3" /> Add enrollment
        </button>
      </div>
    );
  }

  const selectedEnrollment = activeEnrollments.find(
    (e) => String(e._id) === selectedEnrollmentId,
  );
  const cp = selectedEnrollment?.package ?? null; // embedded package
  const enrollmentServices =
    cp?.services?.filter((s) => s.sessionsRemaining > 0) ?? [];

  return (
    <div className="space-y-2">
      <div>
        <FieldLabel>Enrollment</FieldLabel>
        <StyledSelect
          value={selectedEnrollmentId}
          onChange={(v) => {
            onEnrollmentSelect(v);
          }}
          options={activeEnrollments.map((e) => ({
            value: String(e._id),
            label: `${ordinalLabel(e.enrollmentNumber)} Enrollment${e.label ? ` — ${e.label}` : ""}${e.package ? "" : " (no package)"}`,
          }))}
          placeholder="Select enrollment…"
        />
        <button
          type="button"
          onClick={() => onOpenEnrollmentWizard?.(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <Plus className="h-3 w-3" /> Add enrollment
        </button>
      </div>

      {selectedEnrollment && cp && (
        <>
          {/* Package summary pill */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
            {cp.packageRef?.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: cp.packageRef.color }}
              />
            )}
            <span className="text-[11px] text-foreground font-medium truncate flex-1">
              {cp.packageName || cp.packageRef?.packageName || "Package"}
            </span>
            <span
              className={[
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0",
                cp.paymentStatus === "paid"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : cp.paymentStatus === "partial"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-rose-500/10 text-rose-600",
              ].join(" ")}
            >
              {cp.paymentStatus || "unpaid"}
            </span>
          </div>

          {/* Services */}
          {enrollmentServices.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-0.5">
              No sessions remaining in this package.
            </p>
          ) : (
            <div className="space-y-1">
              <FieldLabel>Service</FieldLabel>
              <div className="space-y-1.5">
                {enrollmentServices.map((svc, idx) => {
                  const serviceInfo = allServices.find(
                    (s) => s.serviceCode === svc.serviceCode,
                  );
                  const serviceColor = svc.color || serviceInfo?.color;
                  const isSelected =
                    selectedServiceId === String(serviceInfo?._id);
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        serviceInfo &&
                        onServiceSelect(String(serviceInfo._id), serviceColor)
                      }
                      className={[
                        "flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer border transition-colors",
                        isSelected
                          ? "border-brand bg-brand/10"
                          : "border-border bg-background hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {serviceColor && (
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: serviceColor }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium truncate">
                            {serviceInfo?.serviceName ||
                              svc.serviceName ||
                              svc.serviceCode}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {svc.sessionsRemaining} / {svc.sessionsTotal}{" "}
                            sessions left
                          </p>
                        </div>
                      </div>
                      {serviceInfo?.price > 0 && (
                        <span className="text-[11px] font-semibold text-foreground ml-2 shrink-0">
                          ${serviceInfo.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── WHO section ──────────────────────────────────────────────────────────────

function WhoSection({
  form,
  setField,
  instructorOptions,
  customerOptions,
  onNewCustomer,
  onOpenEnrollmentWizard,
  enrollments,
  allServices,
}) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3">
      <SectionDivider label="Who" />

      <div>
        <FieldLabel>Instructor</FieldLabel>
        <SearchableSelect
          value={form.instructor_id}
          onChange={(v) => setField("instructor_id", v)}
          options={instructorOptions}
          placeholder="Select instructor…"
        />
      </div>

      <div>
        <FieldLabel>Student</FieldLabel>
        <SearchableSelect
          value={form.customer_id}
          onChange={(v) => {
            setField("customer_id", v);
            onOpenEnrollmentWizard?.(false);
            setField("enrollment_id", "");
            setField("service_id", "");
            setField("event_color", "");
          }}
          options={customerOptions}
          placeholder="Select student…"
        />
        {showNew ? (
          <NewStudentInlineForm
            onCreate={async (data) => {
              const id = await onNewCustomer(data);
              if (id) {
                setField("customer_id", id);
                setShowNew(false);
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
            <Plus className="h-3 w-3" /> Add new student
          </button>
        )}
      </div>

      {form.customer_id && (
        <EnrollmentServiceSelector
          customerId={form.customer_id}
          enrollments={enrollments[form.customer_id] || []}
          selectedEnrollmentId={form.enrollment_id}
          onEnrollmentSelect={(v) => {
            setField("enrollment_id", v);
            setField("service_id", "");
          }}
          onServiceSelect={(serviceId, color) => {
            setField("service_id", serviceId);
            if (color) setField("event_color", color);
          }}
          selectedServiceId={form.service_id}
          allServices={allServices}
          onOpenEnrollmentWizard={onOpenEnrollmentWizard}
        />
      )}
    </div>
  );
}

// ─── WHO section (group — multi-student) ──────────────────────────────────────

function GroupWhoSection({
  form,
  setField,
  instructorOptions,
  customerOptions,
  packageOptions,
  onNewCustomer,
}) {
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-3">
      <SectionDivider label="Who" />
      <div>
        <FieldLabel>Instructor</FieldLabel>
        <SearchableSelect
          value={form.instructor_id}
          onChange={(v) => setField("instructor_id", v)}
          options={instructorOptions}
          placeholder="Select instructor…"
        />
      </div>
      <div>
        <FieldLabel>Students</FieldLabel>
        <MultiSelect
          values={form.customer_ids}
          onChange={(v) => setField("customer_ids", v)}
          options={customerOptions}
          placeholder="Select students…"
        />
        {showNew ? (
          <NewStudentInlineForm
            onCreate={async (data) => {
              const id = await onNewCustomer(data);
              if (id) {
                setField("customer_ids", [...form.customer_ids, id]);
                setShowNew(false);
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
            <Plus className="h-3 w-3" /> Add new student
          </button>
        )}
      </div>
      {form.customer_ids.length > 0 && (
        <div
          className={[
            "rounded-xl border px-3 py-2.5 transition-colors",
            form.group_sell_package
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border bg-muted/20",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-[12px] font-semibold ${form.group_sell_package ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
              >
                {form.group_sell_package
                  ? "Selling package at booking"
                  : "Sell package at booking"}
              </p>
              {!form.group_sell_package && (
                <p className="text-[10px] text-muted-foreground">
                  Sell to all {form.customer_ids.length} selected student
                  {form.customer_ids.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Toggle
              checked={form.group_sell_package}
              onChange={(v) => setField("group_sell_package", v)}
            />
          </div>
          {form.group_sell_package && (
            <div className="mt-2.5">
              <FieldLabel>Package to Sell</FieldLabel>
              <StyledSelect
                value={form.group_package_id}
                onChange={(v) => setField("group_package_id", v)}
                options={packageOptions}
                placeholder="Select package to sell…"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scheduling block (for Group Class) ───────────────────────────────────────

function SchedulingBlock({ form, setField, schedulingCodeOptions }) {
  return (
    <div className="space-y-3">
      <SectionDivider label="Details" />
      <div>
        <FieldLabel>Service</FieldLabel>
        <StyledSelect
          value={form.service_id}
          onChange={(v) => setField("service_id", v)}
          options={schedulingCodeOptions}
          placeholder="Select service…"
        />
      </div>
    </div>
  );
}

// ─── Group Class details block ─────────────────────────────────────────────────

function GroupDetailsBlock({
  form,
  setField,
  lessonOptions,
  lessonMap,
  allServices,
  schedulingCodeOptions,
}) {
  function handleLessonChange(id) {
    const lesson = lessonMap[id];
    setField("lesson_id", id);
    if (lesson?.calendarServiceID) {
      const svcId =
        typeof lesson.calendarServiceID === "object"
          ? String(lesson.calendarServiceID._id)
          : String(lesson.calendarServiceID);
      setField("service_id", svcId);
    }
    if (lesson?.name) setField("title", lesson.name);
    if (lesson?.color) setField("event_color", lesson.color);
    if (lesson?.duration && form.start_time)
      setField("end_time", addMinutes(form.start_time, lesson.duration));
  }

  const selectedLesson = form.lesson_id ? lessonMap[form.lesson_id] : null;

  return (
    <div className="space-y-3">
      <SectionDivider label="Class" />
      <div>
        <FieldLabel>Program</FieldLabel>
        <StyledSelect
          value={form.lesson_id}
          onChange={handleLessonChange}
          options={lessonOptions}
          placeholder="Select class / program…"
        />
        {selectedLesson && (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
            {selectedLesson.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: selectedLesson.color }}
              />
            )}
            <span className="text-[11px] text-foreground font-medium truncate">
              {selectedLesson.name}
            </span>
            {selectedLesson.duration && (
              <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                {selectedLesson.duration} min
              </span>
            )}
          </div>
        )}
      </div>
      <div>
        <FieldLabel>Billing Service</FieldLabel>
        <StyledSelect
          value={form.service_id}
          onChange={(v) => setField("service_id", v)}
          options={schedulingCodeOptions}
          placeholder="Select service…"
        />
      </div>
    </div>
  );
}

// ─── Teacher availability picker ──────────────────────────────────────────────

function formatTime12h(time24) {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function AvailabilityPicker({
  instructorId,
  date,
  duration,
  selectedSlots,
  onToggleSlot,
}) {
  const [busySlots, setBusySlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!instructorId || !date) {
      setBusySlots([]);
      return;
    }
    setLoading(true);
    api
      .get(`/api/calendar?teacherID=${instructorId}&date=${date}&limit=200`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBusySlots(
            res.data
              .map((ev) => ({
                start: ev.startDateTime ? new Date(ev.startDateTime) : null,
                end: ev.endDateTime ? new Date(ev.endDateTime) : null,
              }))
              .filter((s) => s.start && s.end),
          );
        } else {
          setBusySlots([]);
        }
      })
      .catch(() => setBusySlots([]))
      .finally(() => setLoading(false));
  }, [instructorId, date]);

  const { availableSlots, bookedCount } = useMemo(() => {
    const dur = Math.max(15, Number(duration) || 50);
    const DAY_START = 7 * 60;
    const DAY_END = 21 * 60;
    const busy = busySlots.map((s) => ({
      start: s.start.getHours() * 60 + s.start.getMinutes(),
      end: s.end.getHours() * 60 + s.end.getMinutes(),
    }));
    const slots = [];
    for (let t = DAY_START; t + dur <= DAY_END; t += dur) {
      const slotEnd = t + dur;
      if (busy.some((b) => t < b.end && slotEnd > b.start)) continue;
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      const eh = String(Math.floor(slotEnd / 60)).padStart(2, "0");
      const em = String(slotEnd % 60).padStart(2, "0");
      slots.push({ start: `${hh}:${mm}`, end: `${eh}:${em}` });
    }
    return { availableSlots: slots, bookedCount: busySlots.length };
  }, [busySlots, duration]);

  if (!instructorId || !date) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Availability · {duration ? `${duration} min` : "50 min"}
          {selectedSlots?.length > 1 && (
            <span className="ml-1.5 text-brand">
              ({selectedSlots.length} selected)
            </span>
          )}
        </span>
        {!loading && (
          <span className="text-[10px] text-muted-foreground">
            {availableSlots.length} free · {bookedCount} booked
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1">
          <svg
            className="h-3.5 w-3.5 animate-spin text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span className="text-[11px] text-muted-foreground">
            Checking teacher's schedule…
          </span>
        </div>
      ) : availableSlots.length === 0 ? (
        <p className="text-[11px] text-destructive font-medium py-0.5">
          No available slots on this date.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlots?.some((s) => s.start === slot.start);
            const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
            const sStart = toMin(slot.start);
            const sEnd = toMin(slot.end);
            const isBlocked = !isSelected && selectedSlots?.some((s) => {
              const selStart = toMin(s.start);
              const selEnd = toMin(s.end);
              return sStart < selEnd && sEnd > selStart;
            });
            return (
              <button
                key={slot.start}
                type="button"
                disabled={isBlocked}
                onClick={() => !isBlocked && onToggleSlot(slot)}
                className={[
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors shrink-0",
                  isSelected
                    ? "border-brand bg-brand text-brand-foreground"
                    : isBlocked
                    ? "border-border bg-muted/20 text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-border bg-background text-foreground hover:bg-muted/50 hover:border-brand/40",
                ].join(" ")}
              >
                {formatTime12h(slot.start)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DateTime row ─────────────────────────────────────────────────────────────

function DateTimeRow({ form, setField, lessonDuration }) {
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
            onChange={(e) => {
              const newStart = e.target.value;
              setField("start_time", newStart);
              if (newStart && lessonDuration)
                setField("end_time", addMinutes(newStart, lessonDuration));
            }}
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
          <RefreshCw className="h-3 w-3" /> Repeat
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

// ─── When section ─────────────────────────────────────────────────────────────

function WhenSection({
  form,
  setField,
  withRecurrence = false,
  lessonDuration,
}) {
  function handleToggleSlot(slot) {
    const current = form.selected_time_slots || [];
    const exists = current.some((s) => s.start === slot.start);
    const next = exists
      ? current.filter((s) => s.start !== slot.start)
      : [...current, slot].sort((a, b) => a.start.localeCompare(b.start));
    setField("selected_time_slots", next);
    const first = next[0];
    if (first) {
      setField("start_time", first.start);
      setField("end_time", first.end);
    }
  }

  return (
    <div className="space-y-3">
      <SectionDivider label="When" />
      <DateTimeRow
        form={form}
        setField={setField}
        lessonDuration={lessonDuration}
      />
      {withRecurrence && <RecurrenceBlock form={form} setField={setField} />}
      <AvailabilityPicker
        instructorId={form.instructor_id}
        date={form.date}
        duration={lessonDuration}
        selectedSlots={form.selected_time_slots}
        onToggleSlot={handleToggleSlot}
      />
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
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
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

function PaymentBlock({ form, setField, suggestedAmount }) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2.5 transition-colors",
        form.payment_collected
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-muted/20",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-[12px] font-semibold ${form.payment_collected ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
          >
            {form.payment_collected ? "Payment recorded" : "Record payment"}
          </p>
          {!form.payment_collected && (
            <p className="text-[10px] text-muted-foreground">
              Toggle to capture payment at booking
            </p>
          )}
        </div>
        <Toggle
          checked={form.payment_collected}
          onChange={(v) => setField("payment_collected", v)}
        />
      </div>
      {form.payment_collected && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Amount ($)</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.payment_amount}
                onChange={(e) => setField("payment_amount", e.target.value)}
                placeholder={suggestedAmount ? String(suggestedAmount) : "0.00"}
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
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
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

// ─── Tab form components ──────────────────────────────────────────────────────

function AppointmentFields({
  form,
  setField,
  instructorOptions,
  customerOptions,
  lessonDuration,
  suggestedAmount,
  onNewCustomer,
  onOpenEnrollmentWizard,
  enrollments,
  allServices,
}) {
  return (
    <div className="space-y-4">
      <WhoSection
        form={form}
        setField={setField}
        instructorOptions={instructorOptions}
        customerOptions={customerOptions}
        onNewCustomer={onNewCustomer}
        onOpenEnrollmentWizard={onOpenEnrollmentWizard}
        enrollments={enrollments}
        allServices={allServices}
      />
      <WhenSection
        form={form}
        setField={setField}
        withRecurrence
        lessonDuration={lessonDuration}
      />
      <div className="space-y-3">
        <SectionDivider label="Notes & Payment" />
        <NotesBlock form={form} setField={setField} />
        <PaymentBlock
          form={form}
          setField={setField}
          suggestedAmount={suggestedAmount}
        />
      </div>
    </div>
  );
}

function GroupClassFields({
  form,
  setField,
  instructorOptions,
  groupCustomerOptions,
  lessonOptions,
  lessonMap,
  allServices,
  schedulingCodeOptions,
  lessonDuration,
  packageOptions,
  suggestedAmount,
  onNewCustomer,
}) {
  return (
    <div className="space-y-4">
      <GroupWhoSection
        form={form}
        setField={setField}
        instructorOptions={instructorOptions}
        customerOptions={groupCustomerOptions}
        packageOptions={packageOptions}
        onNewCustomer={onNewCustomer}
      />
      <GroupDetailsBlock
        form={form}
        setField={setField}
        lessonOptions={lessonOptions}
        lessonMap={lessonMap}
        allServices={allServices}
        schedulingCodeOptions={schedulingCodeOptions}
      />
      <WhenSection
        form={form}
        setField={setField}
        withRecurrence
        lessonDuration={lessonDuration}
      />
      <div className="space-y-3">
        <SectionDivider label="Notes & Payment" />
        <NotesBlock form={form} setField={setField} />
        <PaymentBlock form={form} setField={setField} suggestedAmount={suggestedAmount} />
      </div>
    </div>
  );
}

function ToDoFields({
  form,
  setField,
  instructorOptions,
  lessonOptions,
  lessonMap,
  lessonDuration,
}) {
  function handleLessonChange(id) {
    setField("lesson_id", id);
    const lesson = lessonMap[id];
    if (lesson?.name) setField("title", lesson.name);
    if (lesson?.color) setField("event_color", lesson.color);
    if (lesson?.duration && form.start_time)
      setField("end_time", addMinutes(form.start_time, lesson.duration));
  }
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionDivider label="Task" />
        <div>
          <FieldLabel>Scheduling Code</FieldLabel>
          <StyledSelect
            value={form.lesson_id}
            onChange={handleLessonChange}
            options={lessonOptions}
            placeholder="Select scheduling code…"
          />
        </div>
        <div>
          <FieldLabel>Title</FieldLabel>
          <StyledInput
            value={form.title}
            onChange={(v) => setField("title", v)}
            placeholder="Task title…"
          />
        </div>
        <div>
          <FieldLabel>Assigned To</FieldLabel>
          <SearchableSelect
            value={form.instructor_id}
            onChange={(v) => setField("instructor_id", v)}
            options={instructorOptions}
            placeholder="Select instructor…"
          />
        </div>
      </div>
      <WhenSection
        form={form}
        setField={setField}
        withRecurrence
        lessonDuration={lessonDuration}
      />
      <div className="space-y-3">
        <SectionDivider label="Notes" />
        <NotesBlock form={form} setField={setField} />
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AppointmentComposerPanel({
  open,
  onClose,
  onCreated,
  initialDate,
  initialTime,
  initialDuration,
}) {
  const [activeTab, setActiveTab] = useState("Appointment");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [instructorOptions, setInstructorOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [lessonOptions, setLessonOptions] = useState([]);
  const [lessonMap, setLessonMap] = useState({});
  const [lessonByName, setLessonByName] = useState({});
  const [allServices, setAllServices] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);
  const [packageTemplates, setPackageTemplates] = useState([]);
  const [allEnrollmentsForGroupFilter, setAllEnrollmentsForGroupFilter] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [showEnrollmentWizard, setShowEnrollmentWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab("Appointment");
    setShowEnrollmentWizard(false);
    setError(null);
    setForm({
      ...EMPTY_FORM,
      date: initialDate || "",
      start_time: initialTime || "",
      end_time: initialTime
        ? initialDuration
          ? addMinutes(initialTime, initialDuration)
          : bumpHour(initialTime)
        : "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleTabChange = (key) => {
    setActiveTab(key);
  setShowEnrollmentWizard(false);
    setForm((prev) => ({
      ...prev,
      customer_id: "",
      customer_ids: [],
      instructor_id: "",
      service_id: "",
      lesson_id: "",
      enrollment_id: "",
      event_color: "",
    }));
    setError(null);
  };

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, customersRes, lessonsRes, packagesRes, servicesRes, customerPkgRes] =
          await Promise.all([
            api.get("/api/teacher?limit=200&status=active"),
            api.get("/api/customer?limit=200"),
            api.get("/api/lesson?limit=200"),
            api.get("/api/package?limit=200"),
            api.get("/api/calendar-service?limit=200"),
            api.get("/api/customer-package?limit=500"),
          ]);

        if (usersRes.success && Array.isArray(usersRes.data))
          setInstructorOptions(
            usersRes.data.map((t) => ({
              value: String(t._id ?? t.id),
              label: t.name || t.email || String(t._id),
            })),
          );

        if (customersRes.success && Array.isArray(customersRes.data))
          setCustomerOptions(
            customersRes.data.map((c) => ({
              value: String(c._id ?? c.id),
              label: c.name || c.email || String(c._id),
            })),
          );

        // Store raw enrollments for later cross-referencing once calendarServices are loaded
        if (customerPkgRes.success && Array.isArray(customerPkgRes.data)) {
          setAllEnrollmentsForGroupFilter(customerPkgRes.data);
        }

        if (lessonsRes.success && Array.isArray(lessonsRes.data)) {
          const map = {};
          const byName = {};
          lessonsRes.data.forEach((l) => {
            map[String(l._id)] = l;
            if (l.name) byName[l.name.toLowerCase()] = l;
          });
          setLessonMap(map);
          setLessonByName(byName);
          setLessonOptions(
            lessonsRes.data.map((l) => ({
              value: String(l._id),
              label: l.name,
            })),
          );
        }

        if (servicesRes.success && Array.isArray(servicesRes.data)) {
          setAllServices(servicesRes.data);
        }

        if (packagesRes.success && Array.isArray(packagesRes.data)) {
          setPackageTemplates(packagesRes.data);
          setPackageOptions(
            packagesRes.data.map((p) => ({
              value: String(p._id),
              label: p.packageName || String(p._id),
            })),
          );
        }
      } catch {
        setError("Failed to load form options. Please close and reopen.");
      }
    }
    load();
  }, []);

  // Load enrollments when customer is selected (Appointment tab)
  useEffect(() => {
    if (!form.customer_id) return;
    api
      .get(`/api/enrollment?customerID=${form.customer_id}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setEnrollments((prev) => ({ ...prev, [form.customer_id]: res.data }));
        }
      })
      .catch(() => {});
  }, [form.customer_id]);

  const SERVICE_TYPE_MAP = {
    Appointment: "private",
    "Group Class": "group",
    "To Do": "todo",
  };

  const schedulingCodeOptions = useMemo(() => {
    const typeFilter = SERVICE_TYPE_MAP[activeTab];
    return allServices
      .filter((s) => !typeFilter || s.type === typeFilter)
      .map((s) => ({
        value: String(s._id),
        label: s.serviceCode || s.serviceName,
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allServices, activeTab]);

  const suggestedAmount = useMemo(() => {
    if (!form.service_id) return null;
    const svc = allServices.find((s) => String(s._id) === form.service_id);
    return svc?.price > 0 ? svc.price : null;
  }, [form.service_id, allServices]);

  const lessonDuration = useMemo(() => {
    if (form.lesson_id) {
      const lesson = lessonMap[form.lesson_id];
      if (lesson?.duration) return Number(lesson.duration);
    }
    if (form.service_id) {
      const svc = allServices.find((s) => String(s._id) === form.service_id);
      const lesson = svc?.serviceName
        ? lessonByName[svc.serviceName.toLowerCase()]
        : null;
      if (lesson?.duration) return Number(lesson.duration);
    }
    return initialDuration || 60;
  }, [
    form.lesson_id,
    form.service_id,
    allServices,
    lessonByName,
    lessonMap,
    initialDuration,
  ]);

  const handleNewCustomer = async ({ name, email, phoneNumber }) => {
    const result = await api.post("/api/customer", {
      name,
      email,
      phoneNumber,
    });
    if (result.success && result.data) {
      const c = result.data;
      const newId = String(c._id);
      setCustomerOptions((prev) => [
        ...prev,
        { value: newId, label: c.name || c.email || newId },
      ]);
      return newId;
    }
    return null;
  };

  const handleNewEnrollment = async (customerID, payload = {}) => {
    if (!customerID) return null;
    const enrRes = await api.post("/api/enrollment", {
      customerID,
      label: payload.label?.trim() || undefined,
      teacherID: payload.teacherID || undefined,
    });
    if (!enrRes.success) return null;

    const enrollment =
      enrRes?.data?.enrollment && typeof enrRes.data.enrollment === "object"
        ? enrRes.data.enrollment
        : enrRes.data;
    const enrollmentID = String(
      enrollment?._id || enrollment?.enrollmentID || "",
    );
    if (!enrollmentID) return null;

    const addRes = await api.post("/api/customer-package/add", {
      customerID,
      packageID: payload.packageID,
      enrollmentID,
      discountType: payload.discountType,
      discountAmount: Number(payload.discountAmount || 0),
      services: (payload.services || []).map((s) => ({
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        color: s.color,
        numberOfSessions: Number(s.numberOfSessions || 0),
        pricePerSession: Number(s.pricePerSession || 0),
        finalAmount: Number(s.finalAmount || 0),
      })),
      billingType: payload.billingType,
      billing:
        payload.billingType === "one_time"
          ? { method: payload.billing?.method || "cash" }
          : payload.billingType === "payment_plan"
            ? {
                numberOfInstallments: Number(
                  payload.billing?.numberOfInstallments || 0,
                ),
                frequency: payload.billing?.frequency,
                startDate: payload.billing?.startDate,
              }
            : {},
      ...(payload.purchaseDate ? { purchaseDate: payload.purchaseDate } : {}),
    });
    if (!addRes.success) return null;

    const listRes = await api.get(`/api/enrollment?customerID=${customerID}`);
    if (listRes.success && Array.isArray(listRes.data)) {
      setEnrollments((prev) => ({ ...prev, [customerID]: listRes.data }));
    }
    return enrollmentID;
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    // Derive Package template ID from selected enrollment's CustomerPackage
    let packageTemplateId;
    if (form.enrollment_id && form.customer_id) {
      const customerEnrollments = enrollments[form.customer_id] || [];
      const selectedEnr = customerEnrollments.find(
        (e) => String(e._id) === form.enrollment_id,
      );
      const cp = selectedEnr?.packageID;
      packageTemplateId = cp?.packageID?._id || cp?.packageID || undefined;
    }

    const basePayload = {
      title:
        form.title ||
        TABS.find((t) => t.key === activeTab)?.label ||
        "Appointment",
      type: TAB_TYPE_MAP[activeTab],
      teacherID: form.instructor_id || undefined,
      customerIDs:
        activeTab === "Group Class"
          ? form.customer_ids.length
            ? form.customer_ids
            : undefined
          : form.customer_id
            ? [form.customer_id]
            : undefined,
      lessonID: form.lesson_id || undefined,
      calendarServiceID: form.service_id || undefined,
      enrollmentID: activeTab === "Group Class" ? undefined : form.enrollment_id || undefined,
      packageID: packageTemplateId || undefined,
      color: form.event_color || undefined,
      notes:
        [form.public_note, form.internal_note].filter(Boolean).join("\n") ||
        undefined,
      recurrence:
        form.recurrence_enabled &&
        form.recurrence_frequency &&
        form.recurrence_end_date
          ? {
              enabled: true,
              frequency: form.recurrence_frequency,
              endDate: form.recurrence_end_date,
            }
          : { enabled: false },
      payment: form.payment_collected
        ? {
            amount:
              form.payment_amount !== ""
                ? Number(form.payment_amount)
                : undefined,
            method: form.payment_method || undefined,
            collected: true,
          }
        : undefined,
    };

    const slots =
      form.selected_time_slots?.length > 0
        ? form.selected_time_slots
        : form.start_time
          ? [{ start: form.start_time, end: form.end_time }]
          : [];

    if (slots.length === 0) {
      setError("Please select a time slot or enter a start time.");
      setIsSaving(false);
      return;
    }

    const payloads = slots.map((slot) => ({
      ...basePayload,
      startDateTime:
        form.date && slot.start
          ? new Date(`${form.date}T${slot.start}`).toISOString()
          : undefined,
      endDateTime:
        form.date && slot.end
          ? new Date(`${form.date}T${slot.end}`).toISOString()
          : undefined,
    }));

    const results = await Promise.all(
      payloads.map((p) => api.post("/api/calendar", p)),
    );
    const firstFailure = results.find((r) => !r.success);

    if (!firstFailure) {
      if (
        activeTab === "Group Class" &&
        form.group_sell_package &&
        form.group_package_id &&
        form.customer_ids.length
      ) {
        await Promise.all(
          form.customer_ids.map((cid) =>
            api.post("/api/customer-package", {
              customerID: cid,
              packageID: form.group_package_id,
            }),
          ),
        );
      }
      onCreated?.();
      onClose();
    } else {
      setError(firstFailure.error || "Failed to save. Please try again.");
    }
    setIsSaving(false);
  };

  const privateServices = useMemo(
    () => allServices.filter((s) => s.type === "private"),
    [allServices],
  );

  // Build a set of serviceCodes that have type=group in the catalog
  const groupServiceCodes = useMemo(
    () => new Set(allServices.filter((s) => s.type === "group").map((s) => s.serviceCode)),
    [allServices],
  );

  // Customers who have at least one active enrollment containing a group service
  const groupCustomerOptions = useMemo(() => {
    if (!groupServiceCodes.size || !allEnrollmentsForGroupFilter.length) return customerOptions;
    const ids = new Set();
    allEnrollmentsForGroupFilter.forEach((enrollment) => {
      const services = enrollment.package?.services ?? [];
      if (services.some((s) => groupServiceCodes.has(s.serviceCode))) {
        const cid = enrollment.customerID?._id ?? enrollment.customerID;
        if (cid) ids.add(String(cid));
      }
    });
    return customerOptions.filter((c) => ids.has(c.value));
  }, [allEnrollmentsForGroupFilter, groupServiceCodes, customerOptions]);

  const sharedProps = {
    form,
    setField,
    instructorOptions,
    customerOptions,
    lessonOptions,
    lessonMap,
    allServices: activeTab === "Appointment" ? privateServices : allServices,
    schedulingCodeOptions,
    lessonDuration,
    suggestedAmount,
    packageOptions,
    packageTemplates,
    enrollments,
    onNewCustomer: handleNewCustomer,
    onOpenEnrollmentWizard: (open = true) => setShowEnrollmentWizard(Boolean(open)),
  };

  const tabContent = useMemo(() => {
    if (showEnrollmentWizard) {
      return (
        <NewEnrollmentPackageInline
          teacherOptions={instructorOptions}
          packageTemplates={packageTemplates}
          onCancel={() => setShowEnrollmentWizard(false)}
          onSubmit={async (payload) => {
            const createdId = await handleNewEnrollment(form.customer_id, payload);
            if (createdId) {
              setField("enrollment_id", String(createdId));
              setField("service_id", "");
              setShowEnrollmentWizard(false);
              return true;
            }
            return false;
          }}
        />
      );
    }
    if (activeTab === "Appointment")
      return <AppointmentFields {...sharedProps} />;
    if (activeTab === "Group Class")
      return <GroupClassFields {...sharedProps} groupCustomerOptions={groupCustomerOptions} />;
    if (activeTab === "To Do")
      return (
        <ToDoFields
          form={form}
          setField={setField}
          instructorOptions={instructorOptions}
          lessonOptions={lessonOptions}
          lessonMap={lessonMap}
          lessonDuration={lessonDuration}
        />
      );
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    showEnrollmentWizard,
    form,
    instructorOptions,
    customerOptions,
    lessonOptions,
    schedulingCodeOptions,
    lessonMap,
    lessonDuration,
    packageOptions,
    packageTemplates,
    allServices,
    enrollments,
  ]);

  const slotCount = form.selected_time_slots?.length ?? 0;
  const saveLabel = isSaving
    ? slotCount > 1
      ? `Creating ${slotCount} events…`
      : "Saving…"
    : slotCount > 1
      ? `Book ${slotCount} Appointments`
      : TAB_SAVE_LABEL[activeTab] || "Save";

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetContent
        onClose={showEnrollmentWizard ? undefined : onClose}
        className="flex flex-col overflow-hidden p-0"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-muted/30">
          <div className={`flex items-center justify-between px-5 ${showEnrollmentWizard ? "pt-5 pb-2" : "pt-4 pb-0"}`}>
            {showEnrollmentWizard ? (
              <button
                type="button"
                onClick={() => setShowEnrollmentWizard(false)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground hover:text-brand"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Booking
              </button>
            ) : (
              <p className="text-[14px] font-bold text-foreground">New Booking</p>
            )}
          </div>
          {!showEnrollmentWizard && (
            <div className="flex overflow-x-auto scrollbar-hide px-4 pb-0 gap-0.5 mt-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
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
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{tabContent}</div>

        {/* Error */}
        {error && (
          <div className="shrink-0 mx-5 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        )}

        {/* Footer */}
        {!showEnrollmentWizard && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-5 py-3 flex items-center gap-3">
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
        )}
      </SheetContent>
    </Sheet>
  );
}
