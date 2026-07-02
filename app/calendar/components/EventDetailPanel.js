"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import MiniStudentPanel from "./MiniStudentPanel";
import CreateEnrollmentSheet from "@/components/enrollment/CreateEnrollmentSheet";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled_no_charge", label: "Cancelled – No Charge" },
  { value: "cancelled_charged", label: "Cancelled – Charged" },
  { value: "no_show_no_charge", label: "No Show – No Charge" },
  { value: "no_show_charged", label: "No Show – Charged" },
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
  scheduled: { cls: "bg-blue-500/10 text-blue-400", label: "Scheduled" },
  completed: { cls: "bg-emerald-500/10 text-emerald-400", label: "Completed" },
  cancelled_no_charge: {
    cls: "bg-zinc-500/10 text-zinc-400",
    label: "Cancelled",
  },
  cancelled_charged: {
    cls: "bg-red-500/10 text-red-400",
    label: "Cancelled – Charged",
  },
  no_show_no_charge: {
    cls: "bg-orange-500/10 text-orange-400",
    label: "No Show",
  },
  no_show_charged: {
    cls: "bg-orange-500/10 text-orange-500",
    label: "No Show – Charged",
  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta?.cls || "bg-muted text-muted-foreground"}`}
    >
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

// ─── New customer form for group class ───────────────────────────────────────

function NewGroupCustomerForm({ onSuccess, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await api.post("/api/customer", {
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phone.trim() || undefined,
    });
    if (!res.success || !res.data) {
      setError("Failed to create customer.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSuccess(res.data);
  }

  const inputCls =
    "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary transition-colors";

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="text-[15px] font-semibold text-foreground">
          New Customer
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Create a customer then sell them a package
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Full Name *
          </p>
          <input
            className={inputCls}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Email *
          </p>
          <input
            className={inputCls}
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Phone
          </p>
          <input
            className={inputCls}
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-[12px] text-rose-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="flex-1 h-9 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Creating…" : "Next: Sell Package"}
        </button>
      </div>
    </div>
  );
}

// ─── Group student roster (add / remove customers with group packages) ────────

function getFundingOptionId(opt) {
  return opt.customerMembershipID || opt.enrollmentID || opt.customerPackageID;
}

function GroupStudentRoster({
  eventId,
  serviceCode,
  servicePrice,
  onRosterChanged,
  onSelectStudent,
}) {
  // Fetch everything from scratch so we always have the live server state
  const [enrolled, setEnrolled] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [groupCustomerIds, setGroupCustomerIds] = useState(new Set());
  const [membershipCustomerIds, setMembershipCustomerIds] = useState(new Set());
  const [groupServiceCodes, setGroupServiceCodes] = useState(new Set());
  const [sessionMap, setSessionMap] = useState({}); // customerID -> { sessionsRemaining, packageName }
  const [chargedIds, setChargedIds] = useState(new Set()); // customerIDs that have a charge record
  const [noShowIds, setNoShowIds] = useState(new Set()); // customerIDs marked as no-show
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [sellQuery, setSellQuery] = useState("");
  const [sellCustomer, setSellCustomer] = useState(null); // customer being sold a group package
  const sellDropRef = useRef(null);
  const pendingSellRef = useRef(null);
  const [newCustomerSheetOpen, setNewCustomerSheetOpen] = useState(false);
  const [saving, setSaving] = useState(null);
  const [payingId, setPayingId] = useState(null); // student currently showing the pay form
  const [payForm, setPayForm] = useState({ amount: "", method: "cash" });
  const [pendingAdd, setPendingAdd] = useState(null); // { customer, memberIds: [], absent } - waiting for member selection
  const [editingMembersId, setEditingMembersId] = useState(null); // customerId currently editing attending members
  const [editingMemberIds, setEditingMemberIds] = useState([]); // draft member selection while editing
  const [editingAbsent, setEditingAbsent] = useState(false); // draft "customer not attending" flag while editing
  const [enrolledMemberMap, setEnrolledMemberMap] = useState({}); // customerId -> [memberId, ...]
  const [eventMemberIds, setEventMemberIds] = useState([]); // flat list of persisted member subdoc ids
  const [absentCustomerIds, setAbsentCustomerIds] = useState(new Set()); // customerIDs whose member attends in their place
  const [fundingChoicePrompt, setFundingChoicePrompt] = useState(null); // { context: 'add' | 'edit', options }

  const dropRef = useRef(null);

  // Fetch the event's current customerIDs then resolve each to a full customer object
  const fetchEnrolled = async () => {
    const evRes = await api.get(`/api/calendar/${eventId}`);
    if (!evRes.success) return;
    const customerIds = (evRes.data?.customerIDs || [])
      .map((c) => (typeof c === "object" ? String(c._id) : String(c)))
      .filter(Boolean);
    const persistedMemberIds = (evRes.data?.memberIDs || []).map((m) =>
      String(m?._id ?? m),
    );
    setEventMemberIds(persistedMemberIds);
    const charges = evRes.data?.charges || [];
    const charged = new Set(charges.map((ch) => String(ch.customerID)));
    setChargedIds(charged);
    // Prefer the package/membership this event actually charged against — the
    // roster's fallback (scanning all active enrollments) can pick a different,
    // unrelated package when a customer holds more than one.
    const chargeSMap = {};
    charges.forEach((ch) => {
      const cid = String(ch.customerID?._id ?? ch.customerID ?? "");
      if (!cid) return;
      const code = ch.serviceCode || serviceCode;
      let svc = null;
      let packageName = "";
      if (ch.method === "package") {
        const services =
          ch.customerPackageID?.services || ch.enrollmentID?.package?.services;
        svc = services?.find((s) => s.serviceCode === code)
          ?? services?.find((s) => (s.pricePerSession ?? 0) > 0);
        packageName = ch.enrollmentID?.package?.packageName || svc?.serviceName || "";
      } else if (ch.method === "membership") {
        svc = ch.customerMembershipID?.services?.find((s) => s.serviceCode === code);
      }
      if (svc) {
        chargeSMap[cid] = {
          sessionsRemaining: svc.sessionsRemaining,
          packageName,
        };
      }
    });
    setSessionMap((prev) => ({ ...prev, ...chargeSMap }));
    const noShows = new Set(
      (evRes.data?.noShowIDs || []).map((id) => String(id?._id ?? id)),
    );
    setNoShowIds(noShows);
    setAbsentCustomerIds(
      new Set(
        (evRes.data?.absentCustomerIDs || []).map((id) =>
          String(id?._id ?? id),
        ),
      ),
    );
    if (customerIds.length === 0) {
      setEnrolled([]);
      setEnrolledMemberMap({});
      return;
    }
    const results = await Promise.all(
      customerIds.map((id) => api.get(`/api/customer/${id}`)),
    );
    const customers = results.filter((r) => r.success).map((r) => r.data);
    setEnrolled(customers);
    // Seed the per-customer member map from persisted memberIDs so existing
    // attendance shows in the roster when the panel reopens.
    const memberSet = new Set(persistedMemberIds);
    const map = {};
    customers.forEach((c) => {
      const mine = (c.members || [])
        .filter((m) => memberSet.has(String(m._id)))
        .map((m) => String(m._id));
      if (mine.length > 0) map[String(c._id)] = mine;
    });
    setEnrolledMemberMap(map);
  };

  const loadRosterData = async () => {
    const [customersRes, pkgRes, servicesRes, membershipRes] =
      await Promise.all([
        api.get("/api/customer?limit=500"),
        api.get("/api/customer-package?limit=500"),
        api.get("/api/calendar-service?limit=200"),
        api.get("/api/customer-membership?status=active&limit=500"),
      ]);
    const groupCodes = new Set(
      (servicesRes.success ? servicesRes.data : [])
        .filter((s) => s.type === "group")
        .map((s) => s.serviceCode),
    );
    const ids = new Set();
    const sMap = {};
    (pkgRes.success ? pkgRes.data : []).forEach((enrollment) => {
      const pkgServices = enrollment.package?.services ?? [];
      const isActive =
        enrollment.status === "active" && enrollment.package?.status === "active";
      if (
        isActive &&
        pkgServices.some(
          (s) => groupCodes.has(s.serviceCode) && (s.sessionsRemaining ?? 0) > 0,
        )
      ) {
        const cid = String(
          enrollment.customerID?._id ?? enrollment.customerID ?? "",
        );
        if (cid) ids.add(cid);
      }
      // Build sessions-remaining map for this event's service
      if (
        serviceCode &&
        enrollment.status === "active" &&
        enrollment.package?.status === "active"
      ) {
        const cid = String(
          enrollment.customerID?._id ?? enrollment.customerID ?? "",
        );
        const svc = (enrollment.package?.services ?? []).find(
          (s) => s.serviceCode === serviceCode,
        );
        if (cid && svc != null) {
          const heldSince = new Date(
            enrollment.purchaseDate ?? enrollment.createdAt ?? 0,
          ).getTime();
          const prev = sMap[cid];
          if (prev == null || heldSince < prev.heldSince) {
            sMap[cid] = {
              heldSince,
              sessionsRemaining: svc.sessionsRemaining,
              packageName:
                enrollment.package?.packageName || svc.serviceName || "",
            };
          }
        }
      }
    });
    setGroupServiceCodes(groupCodes);
    setGroupCustomerIds(ids);
    setSessionMap(sMap);

    // Membership customers — those with an active membership covering this event's serviceCode
    const membershipIds = new Set();
    (membershipRes.success ? membershipRes.data : []).forEach((m) => {
      if (m.status !== "active") return;
      const covers = (m.services || []).some(
        (s) => !serviceCode || s.serviceCode === serviceCode,
      );
      if (covers) {
        const cid = String(m.customerID?._id ?? m.customerID ?? "");
        if (cid) membershipIds.add(cid);
      }
    });
    setMembershipCustomerIds(membershipIds);

    if (customersRes.success) setAllCustomers(customersRes.data);
  };

  useEffect(() => {
    async function load() {
      setLoadingRoster(true);
      await loadRosterData();
      await fetchEnrolled();
      setLoadingRoster(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!addOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setAddOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addOpen]);

  useEffect(() => {
    if (!sellOpen) return;
    const handler = (e) => {
      if (sellDropRef.current && !sellDropRef.current.contains(e.target)) {
        setSellOpen(false);
        setSellQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sellOpen]);

  const currentIds = new Set(enrolled.map((c) => String(c._id)));

  const eligibleToAdd = allCustomers.filter((c) => {
    const cid = String(c._id);
    return (
      (groupCustomerIds.has(cid) || membershipCustomerIds.has(cid)) &&
      !currentIds.has(cid)
    );
  });

  const filtered = query.trim()
    ? eligibleToAdd.filter((c) =>
        (c.name || c.email || "").toLowerCase().includes(query.toLowerCase()),
      )
    : eligibleToAdd;

  const sellCandidates = allCustomers.filter(
    (c) => !currentIds.has(String(c._id)),
  );
  const sellFiltered = sellQuery.trim()
    ? sellCandidates.filter((c) =>
        (c.name || c.email || "")
          .toLowerCase()
          .includes(sellQuery.toLowerCase()),
      )
    : sellCandidates;

  const handleSellSuccess = async () => {
    const customer = pendingSellRef.current;
    pendingSellRef.current = null;
    if (customer && !currentIds.has(String(customer._id))) {
      await confirmAdd(customer, []);
    }
    await loadRosterData();
  };

  const handleAdd = (customer) => {
    setFundingChoicePrompt(null);
    if ((customer.members || []).length > 0) {
      setPendingAdd({ customer, memberIds: [], absent: false });
      setAddOpen(false);
      setQuery("");
      return;
    }
    confirmAdd(customer, [], false);
  };

  const confirmAdd = async (
    customer,
    memberIds,
    absent = false,
    fundingChoice = null,
  ) => {
    const cid = String(customer._id);
    setSaving(cid);
    const newIds = [...currentIds, cid];
    // memberIDs is a flat list across all customers on the event — merge with the
    // existing ones so we never clobber another student's attending members.
    const mergedMemberIds = Array.from(
      new Set([...eventMemberIds.map(String), ...memberIds.map(String)]),
    );
    const mergedAbsentIds = Array.from(
      new Set([...[...absentCustomerIds].map(String), ...(absent ? [cid] : [])]),
    );
    const body = {
      customerIDs: newIds,
      memberIDs: mergedMemberIds,
      absentCustomerIDs: mergedAbsentIds,
      ...(fundingChoice ? { fundingChoice } : {}),
    };
    const res = await api.put(`/api/calendar/${eventId}`, body);
    if (res.success) {
      const charged = new Set(
        (res.data?.charges || []).map((ch) => String(ch.customerID)),
      );
      setChargedIds(charged);
      setEnrolled((prev) => [...prev, customer]);
      setEventMemberIds(mergedMemberIds);
      if (memberIds.length > 0) {
        setEnrolledMemberMap((prev) => ({
          ...prev,
          [cid]: memberIds.map(String),
        }));
      }
      if (absent) {
        setAbsentCustomerIds(
          (prev) => new Set([...prev, cid]),
        );
      }
      const memberNames = (customer.members || [])
        .filter((m) => memberIds.map(String).includes(String(m._id)))
        .map((m) => m.name)
        .filter(Boolean);
      onRosterChanged?.(
        memberNames.length > 0
          ? { eventId, customerId: cid, memberNames }
          : null,
      );
      setFundingChoicePrompt(null);
      setPendingAdd(null);
    } else if (res.errorData?.needsFundingChoice) {
      // The funding-choice prompt lives inside the pending-add panel, so a
      // members-less customer (added via the direct confirmAdd path) needs that
      // panel opened here or the prompt has nowhere to render and the click
      // appears to do nothing.
      setPendingAdd((prev) => prev || { customer, memberIds, absent });
      setAddOpen(false);
      setQuery("");
      setFundingChoicePrompt({
        context: "add",
        options: res.errorData.options || [],
      });
    } else {
      setPendingAdd(null);
    }
    setSaving(null);
  };

  const handleRemove = async (customerId) => {
    setSaving(customerId);
    const newIds = [...currentIds].filter((id) => id !== customerId);
    // Drop the removed student's members from the event-wide memberIDs list.
    const removed = enrolled.find((c) => String(c._id) === String(customerId));
    const removedMemberIds = new Set(
      (removed?.members || []).map((m) => String(m._id)),
    );
    const newMemberIds = eventMemberIds.filter(
      (id) => !removedMemberIds.has(String(id)),
    );
    const newAbsentIds = [...absentCustomerIds].filter(
      (id) => id !== customerId,
    );
    const res = await api.put(`/api/calendar/${eventId}`, {
      customerIDs: newIds,
      memberIDs: newMemberIds,
      absentCustomerIDs: newAbsentIds,
    });
    if (res.success) {
      const charged = new Set(
        (res.data?.charges || []).map((ch) => String(ch.customerID)),
      );
      setChargedIds(charged);
      setEnrolled((prev) => prev.filter((c) => String(c._id) !== customerId));
      setEventMemberIds(newMemberIds);
      setAbsentCustomerIds(new Set(newAbsentIds));
      setEnrolledMemberMap((prev) => {
        const next = { ...prev };
        delete next[String(customerId)];
        return next;
      });
      onRosterChanged?.();
    }
    setSaving(null);
  };

  const startEditMembers = (customerId) => {
    setFundingChoicePrompt(null);
    setEditingMembersId(customerId);
    setEditingMemberIds(enrolledMemberMap[customerId] || []);
    setEditingAbsent(absentCustomerIds.has(customerId));
  };

  const confirmEditMembers = async (fundingChoice = null) => {
    if (editingAbsent && editingMemberIds.length === 0) return;
    const cid = editingMembersId;
    setSaving(cid);
    const otherMemberIds = eventMemberIds.filter((id) => {
      const owner = enrolled.find((c) =>
        (c.members || []).some((m) => String(m._id) === String(id)),
      );
      return owner && String(owner._id) !== String(cid);
    });
    const newMemberIds = Array.from(
      new Set([...otherMemberIds, ...editingMemberIds].map(String)),
    );
    const newAbsentIds = editingAbsent
      ? Array.from(new Set([...absentCustomerIds, cid]))
      : [...absentCustomerIds].filter((id) => id !== cid);
    const res = await api.put(`/api/calendar/${eventId}`, {
      memberIDs: newMemberIds,
      absentCustomerIDs: newAbsentIds,
      ...(fundingChoice ? { fundingChoice } : {}),
    });
    if (res.success) {
      setEventMemberIds(newMemberIds);
      setAbsentCustomerIds(new Set(newAbsentIds));
      setEnrolledMemberMap((prev) => {
        const next = { ...prev };
        if (editingMemberIds.length > 0) next[cid] = editingMemberIds;
        else delete next[cid];
        return next;
      });
      onRosterChanged?.();
      setFundingChoicePrompt(null);
      setEditingMembersId(null);
      setEditingMemberIds([]);
      setEditingAbsent(false);
    } else if (res.errorData?.needsFundingChoice) {
      setFundingChoicePrompt({
        context: "edit",
        options: res.errorData.options || [],
      });
    } else {
      setEditingMembersId(null);
      setEditingMemberIds([]);
      setEditingAbsent(false);
    }
    setSaving(null);
  };

  const handleNoShow = async (cid) => {
    setSaving(cid);
    const next = new Set(noShowIds);
    next.has(cid) ? next.delete(cid) : next.add(cid);
    const res = await api.put(`/api/calendar/${eventId}`, {
      noShowIDs: [...next],
    });
    if (res.success) {
      setNoShowIds(next);
      onRosterChanged?.();
    }
    setSaving(null);
  };

  const openPayForm = (cid) => {
    setPayingId(cid);
    setPayForm({
      amount: servicePrice != null ? String(servicePrice) : "",
      method: "cash",
    });
  };

  const handleDirectPay = async (cid) => {
    setSaving(cid);
    const res = await api.post(`/api/calendar/${eventId}/charge-student`, {
      customerID: cid,
      method: payForm.method,
      amount: payForm.amount !== "" ? Number(payForm.amount) : undefined,
    });
    if (res.success) {
      const charges = res.data?.charges || [];
      const charged = new Set(charges.map((ch) => String(ch.customerID)));
      setChargedIds(charged);
      setPayingId(null);
    } else {
      await fetchEnrolled();
    }
    // Always refresh the calendar so the event badge + tooltip update
    onRosterChanged?.();
    setSaving(null);
  };

  if (loadingRoster) {
    return (
      <div className="flex items-center gap-2 py-3 text-[12px] text-muted-foreground">
        <svg
          className="h-3.5 w-3.5 animate-spin"
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
        Loading students…
      </div>
    );
  }

  return (
    <div>
      {pendingAdd && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            Adding{" "}
            <span className="text-primary">{pendingAdd.customer.name}</span> —
            select attending members{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
            :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(pendingAdd.customer.members || []).map((m) => {
              const selected = pendingAdd.memberIds.includes(String(m._id));
              return (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => {
                    const set = new Set(pendingAdd.memberIds);
                    selected
                      ? set.delete(String(m._id))
                      : set.add(String(m._id));
                    setPendingAdd((p) => ({ ...p, memberIds: [...set] }));
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[8px] font-bold shrink-0">
                    {(m.name || "?").charAt(0).toUpperCase()}
                  </span>
                  {m.name}
                  {m.relationship && (
                    <span className="opacity-60 capitalize">
                      · {m.relationship}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {pendingAdd.memberIds.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={pendingAdd.absent}
                onChange={(e) =>
                  setPendingAdd((p) => ({ ...p, absent: e.target.checked }))
                }
              />
              {pendingAdd.customer.name} is not attending — member(s) attend
              alone
            </label>
          )}
          {fundingChoicePrompt?.context === "add" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 space-y-1.5">
              <p className="text-[11px] font-semibold text-amber-600">
                Multiple ways to pay — choose one:
              </p>
              <div className="flex flex-col gap-1">
                {fundingChoicePrompt.options.map((opt) => (
                  <button
                    key={getFundingOptionId(opt)}
                    type="button"
                    onClick={() =>
                      confirmAdd(
                        pendingAdd.customer,
                        pendingAdd.memberIds,
                        pendingAdd.absent,
                        { source: opt.source, id: getFundingOptionId(opt) },
                      )
                    }
                    className="h-7 px-2.5 rounded-md border border-border bg-background text-left text-[11px] font-medium text-foreground hover:bg-muted/50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={() =>
                confirmAdd(
                  pendingAdd.customer,
                  pendingAdd.memberIds,
                  pendingAdd.absent,
                )
              }
              disabled={saving === String(pendingAdd.customer._id)}
              className="h-7 px-3 rounded-md bg-primary text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {saving === String(pendingAdd.customer._id)
                ? "Adding…"
                : "Confirm & Add"}
            </button>
            <button
              type="button"
              onClick={() => confirmAdd(pendingAdd.customer, [], false)}
              disabled={saving === String(pendingAdd.customer._id)}
              className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              Add without member
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Students ({enrolled.length})
        </label>
        <div className="flex items-center gap-1.5">
          <div ref={sellDropRef} className="relative">
            <button
              type="button"
              onClick={() => setSellOpen((v) => !v)}
              className="flex items-center gap-1 h-6 px-2 rounded-md border border-primary/40 bg-primary/5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" /> Sell Group Class
            </button>
            {sellOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-60 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    type="text"
                    value={sellQuery}
                    onChange={(e) => setSellQuery(e.target.value)}
                    placeholder="Search students without a group package…"
                    className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {sellFiltered.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground">
                      {sellCandidates.length === 0
                        ? "All customers are already enrolled"
                        : "No results"}
                    </p>
                  ) : (
                    <>
                      {sellFiltered.map((c) => (
                        <button
                          key={String(c._id)}
                          type="button"
                          onClick={() => {
                            pendingSellRef.current = c;
                            setSellCustomer(c);
                            setSellOpen(false);
                            setSellQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted/40 transition-colors"
                        >
                          <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {(c.name || "?").charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{c.name || c.email}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSellOpen(false);
                          setSellQuery("");
                          setNewCustomerSheetOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-primary font-medium hover:bg-muted/40 transition-colors border-t border-border"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        New Customer
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={dropRef} className="relative">
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Student
            </button>
            {addOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-56 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students…"
                    className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground">
                      {eligibleToAdd.length === 0
                        ? "No eligible students (need group package)"
                        : "No results"}
                    </p>
                  ) : (
                    filtered.map((c) => {
                      const cid = String(c._id);
                      const isAdding = saving === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          disabled={isAdding}
                          onClick={() => handleAdd(c)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                        >
                          <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {isAdding ? (
                              <svg
                                className="h-3 w-3 animate-spin"
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
                            ) : (
                              (c.name || "?").charAt(0).toUpperCase()
                            )}
                          </span>
                          <span className="truncate flex items-center gap-1.5">
                            {c.name || c.email}
                            {(c.members || []).length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                & {c.members.map((m) => m.name).join(", ")}
                              </span>
                            )}
                            {membershipCustomerIds.has(String(c._id)) && (
                              <span className="text-[9px] font-medium bg-brand/10 text-brand px-1 py-0.5 rounded shrink-0">
                                membership
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {enrolled.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-4 text-center">
          <p className="text-[12px] text-muted-foreground">
            No students enrolled yet
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Add a group package, or sell one to a new student
          </p>
        </div>
      ) : (
        <div className="space-y-2 mt-1">
          {enrolled.map((c) => {
            const cid = String(c._id);
            const session = sessionMap[cid];
            const remaining = session?.sessionsRemaining;
            const isCharged = chargedIds.has(cid);
            const attendingMemberIds = enrolledMemberMap[cid] || [];
            const attendingMembers = (c.members || []).filter((m) =>
              attendingMemberIds.includes(String(m._id)),
            );
            const isAbsent = absentCustomerIds.has(cid);
            const memberNamesJoined = attendingMembers
              .map((m) => m.name)
              .join(", ");
            const displayName =
              attendingMembers.length > 0
                ? isAbsent
                  ? memberNamesJoined
                  : `${c.name || "—"} & ${memberNamesJoined}`
                : c.name || "—";
            return (
              <div key={cid}>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-center gap-2">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {(
                      (isAbsent && attendingMembers[0]?.name) ||
                      c.name ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectStudent?.(cid, c.name || "Student")}
                        className="text-[13px] font-semibold text-foreground truncate hover:text-primary hover:underline cursor-pointer"
                      >
                        {displayName}
                      </p>
                      {(c.members || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => startEditMembers(cid)}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          aria-label="Edit attending members"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {membershipCustomerIds.has(cid) ? (
                      <p className="text-[11px] text-brand truncate">
                        Membership
                      </p>
                    ) : (
                      session?.packageName && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {session.packageName}
                        </p>
                      )
                    )}
                    {c.email && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.email}
                      </p>
                    )}
                  </div>
                  {remaining != null && !(remaining === 0 && isCharged) && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${remaining <= 2 ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}
                    >
                      {remaining} left
                    </span>
                  )}
                  {!isCharged && !membershipCustomerIds.has(cid) && (
                    <button
                      type="button"
                      onClick={() =>
                        payingId === cid ? setPayingId(null) : openPayForm(cid)
                      }
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                    >
                      Unpaid
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving === cid}
                    onClick={() => handleNoShow(cid)}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      noShowIds.has(cid)
                        ? "bg-orange-500/15 text-orange-500 hover:bg-orange-500/25"
                        : "bg-muted text-muted-foreground hover:bg-orange-500/10 hover:text-orange-500"
                    }`}
                  >
                    {noShowIds.has(cid) ? "No Show" : "No Show?"}
                  </button>
                  <button
                    type="button"
                    disabled={saving === cid}
                    onClick={() => handleRemove(cid)}
                    className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                    aria-label="Remove student"
                  >
                    {saving === cid ? (
                      <svg
                        className="h-3 w-3 animate-spin"
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
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                </div>
                {/* end student row */}
                {editingMembersId === cid && (
                  <div className="mt-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-2">
                    <p className="text-[12px] font-semibold text-foreground">
                      Attending members{" "}
                      <span className="text-muted-foreground font-normal">
                        (select who is attending alongside {c.name})
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.members || []).map((m) => {
                        const selected = editingMemberIds.includes(
                          String(m._id),
                        );
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => {
                              const set = new Set(editingMemberIds);
                              selected
                                ? set.delete(String(m._id))
                                : set.add(String(m._id));
                              setEditingMemberIds([...set]);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[8px] font-bold shrink-0">
                              {(m.name || "?").charAt(0).toUpperCase()}
                            </span>
                            {m.name}
                            {m.relationship && (
                              <span className="opacity-60 capitalize">
                                · {m.relationship}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {editingMemberIds.length > 0 && (
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={editingAbsent}
                          onChange={(e) => setEditingAbsent(e.target.checked)}
                        />
                        {c.name} is not attending — member(s) attend alone
                      </label>
                    )}
                    {fundingChoicePrompt?.context === "edit" && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 space-y-1.5">
                        <p className="text-[11px] font-semibold text-amber-600">
                          Multiple ways to pay — choose one:
                        </p>
                        <div className="flex flex-col gap-1">
                          {fundingChoicePrompt.options.map((opt) => (
                            <button
                              key={getFundingOptionId(opt)}
                              type="button"
                              onClick={() =>
                                confirmEditMembers({
                                  source: opt.source,
                                  id: getFundingOptionId(opt),
                                })
                              }
                              className="h-7 px-2.5 rounded-md border border-border bg-background text-left text-[11px] font-medium text-foreground hover:bg-muted/50"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => confirmEditMembers()}
                        disabled={
                          saving === cid ||
                          (editingAbsent && editingMemberIds.length === 0)
                        }
                        className="h-7 px-3 rounded-md bg-primary text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        {saving === cid ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMembersId(null);
                          setEditingMemberIds([]);
                          setEditingAbsent(false);
                          setFundingChoicePrompt(null);
                        }}
                        disabled={saving === cid}
                        className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {payingId === cid && (
                  <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-2">
                    <p className="text-[11px] font-semibold text-amber-600">
                      Record session payment
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-[10px] font-medium text-muted-foreground">
                          Amount ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payForm.amount}
                            onChange={(e) =>
                              setPayForm((p) => ({
                                ...p,
                                amount: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="h-8 w-full rounded-md border border-border bg-background pl-5 pr-2 text-[11px] text-foreground outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] font-medium text-muted-foreground">
                          Method
                        </label>
                        <div className="relative">
                          <select
                            value={payForm.method}
                            onChange={(e) =>
                              setPayForm((p) => ({
                                ...p,
                                method: e.target.value,
                              }))
                            }
                            className="h-8 w-full appearance-none rounded-md border border-border bg-background px-2 pr-6 text-[11px] text-foreground outline-none focus:border-amber-500"
                          >
                            {["cash", "card", "online", "cheque", "other", "wallet"].map(
                              (m) => (
                                <option key={m} value={m}>
                                  {m.charAt(0).toUpperCase() + m.slice(1)}
                                </option>
                              ),
                            )}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPayingId(null)}
                        className="flex-1 h-7 rounded-md border border-border bg-background text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving === cid}
                        onClick={() => handleDirectPay(cid)}
                        className="flex-1 h-7 rounded-md bg-amber-500 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                      >
                        {saving === cid ? "Charging…" : "Charge"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateEnrollmentSheet
        open={!!sellCustomer}
        customerID={sellCustomer?._id}
        customerName={sellCustomer?.name}
        allowedServiceCodes={groupServiceCodes}
        onClose={() => setSellCustomer(null)}
        onSuccess={handleSellSuccess}
      />

      <Sheet open={newCustomerSheetOpen} onOpenChange={setNewCustomerSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <NewGroupCustomerForm
            onSuccess={(newCustomer) => {
              setNewCustomerSheetOpen(false);
              pendingSellRef.current = newCustomer;
              setSellCustomer(newCustomer);
            }}
            onCancel={() => setNewCustomerSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function EventDetailPanel({
  event,
  open,
  onClose,
  onUpdated,
  onDeleted,
  onRosterChanged,
  onPaymentSuccess,
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

  // Reset to the appointment view whenever the panel is closed so reopening a
  // booking always lands on the appointment details rather than a previously
  // opened student account.
  useEffect(() => {
    if (!open) {
      setSelectedStudentId(null);
      setSelectedStudentName("");
      setIsEditing(false);
    }
  }, [open]);

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
    payment_amount:
      event.payment?.amount != null ? String(event.payment.amount) : "",
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
            amount:
              form.payment_amount !== ""
                ? Number(form.payment_amount)
                : undefined,
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
    const result = await api.put(`/api/calendar/${event._id}`, {
      status: newStatus,
    });
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

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetContent onClose={onClose} className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          {selectedStudentId ? (
            <button
              type="button"
              onClick={() => {
                setSelectedStudentId(null);
                setSelectedStudentName("");
              }}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              {selectedStudentName}
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-[14px] font-semibold text-foreground">
                {event.title}
              </span>
              <StatusBadge status={event.effectiveStatus || event.status} />
            </div>
          )}
          {!selectedStudentId && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit event"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selectedStudentId ? (
            <MiniStudentPanel
              customerId={selectedStudentId}
              customerName={selectedStudentName}
              onBack={() => {
                setSelectedStudentId(null);
                setSelectedStudentName("");
              }}
              inline
              onPaymentSuccess={onPaymentSuccess}
            />
          ) : (
            <>
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
                    <span className="pb-1 text-[12px] text-muted-foreground">
                      to
                    </span>
                    <Field label="End time">
                      <TimeInput
                        value={form.end_time}
                        onChange={(v) => setField("end_time", v)}
                      />
                    </Field>
                  </div>
                  <Field label="Teacher">
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
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Date">
                      <ReadValue>
                        {formatDisplayDate(event.startDateTime)}
                      </ReadValue>
                    </Field>
                    <Field label="Type">
                      <ReadValue>
                        {event.type
                          ? event.type.charAt(0).toUpperCase() +
                            event.type.slice(1)
                          : "—"}
                      </ReadValue>
                    </Field>
                    <Field label="Start">
                      <ReadValue>
                        {formatDisplayTime(event.startDateTime)}
                      </ReadValue>
                    </Field>
                    <Field label="End">
                      <ReadValue>
                        {formatDisplayTime(event.endDateTime)}
                      </ReadValue>
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
                            <p className="text-[10px] text-muted-foreground">
                              {event.calendarServiceID.serviceCode}
                            </p>
                          )}
                        </div>
                        {event.calendarServiceID.isChargeable &&
                          event.calendarServiceID.price > 0 && (
                            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                              $
                              {Number(event.calendarServiceID.price).toFixed(2)}{" "}
                              / session
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
                                {event.chargeMethod === "package" &&
                                  event.packageBillingType !==
                                    "pay_per_session" &&
                                  "Paid · Package"}
                                {event.chargeMethod === "package" &&
                                  event.packageBillingType ===
                                    "pay_per_session" &&
                                  "Paid · Per session"}
                                {event.chargeMethod === "membership" &&
                                  "Covered · Membership"}
                                {event.chargeMethod === "credits" &&
                                  `$${Number(event.calendarServiceID.price).toFixed(2)} deducted from credits`}
                                {event.chargeMethod === "mixed" &&
                                  "Charged via package + credits"}
                                {event.chargeMethod === "none" && "Charged"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                              <span className="text-[11px] text-muted-foreground">
                                Not charged (refunded or waived)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teacher details */}
                  <div>
                    <Label>Teacher</Label>
                    {!teacherDetail ? (
                      <p className="text-[13px] text-muted-foreground">—</p>
                    ) : (
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(teacherDetail.name || "?")
                              .charAt(0)
                              .toUpperCase()}
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
                  {event.type === "lesson" ? (
                    <GroupStudentRoster
                      eventId={event._id}
                      serviceCode={event.calendarServiceID?.serviceCode}
                      servicePrice={event.calendarServiceID?.price}
                      onRosterChanged={onRosterChanged}
                      onSelectStudent={(id, name) => {
                        setSelectedStudentId(id);
                        setSelectedStudentName(name);
                      }}
                    />
                  ) : (
                    <div>
                      <Label>
                        Customer{customerDetails.length !== 1 ? "s" : ""}
                      </Label>
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
                                  onClick={() => {
                                    setSelectedStudentId(String(c._id));
                                    setSelectedStudentName(c.name || "Student");
                                  }}
                                >
                                  <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {(c.name || "?").charAt(0).toUpperCase()}
                                  </span>
                                  <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary group-hover:underline">
                                    {c.name || "—"}
                                  </span>
                                </div>
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  ${Number(c.credits ?? 0).toFixed(2)}
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
                  )}

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
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Payment Collected
                        </p>
                        {event.payment.method && (
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {event.payment.method}
                          </p>
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
            </>
          )}
        </div>

        {/* Footer — hidden when viewing mini student panel */}
        {!selectedStudentId && (
          <div className="border-t border-border p-5 space-y-2 shrink-0">
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
                {/* Quick record-payment button — hidden for pay_per_session (auto-charged at booking) */}

                {/* Quick status actions — only shown when event is still scheduled */}
                {event.effectiveStatus === "scheduled" ||
                event.status === "scheduled" ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Mark as
                    </p>
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
        )}
      </SheetContent>
    </Sheet>
  );
}
