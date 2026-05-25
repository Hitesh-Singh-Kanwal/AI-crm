"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

const PAYMENT_METHODS = ["cash", "card", "online", "cheque", "other"];

const BLANK_FORM = {
  teacherID: "",
  label: "",
  packageID: "",
  purchaseDate: "",
  services: [],
  billingType: "one_time",
  billing: {
    method: "cash",
    numberOfInstallments: 3,
    frequency: "monthly",
    startDate: "",
    installmentMode: "count",
    installmentAmount: "",
  },
  tip: {
    enabled: false,
    amount: "",
    method: "cash",
  },
};

function blankService() {
  return {
    _key: String(Date.now() + Math.random()),
    serviceCode: "",
    serviceName: "",
    color: "#6366f1",
    numberOfSessions: 0,
    pricePerSession: 0,
    discountType: "none",
    discountAmount: 0,
    finalAmount: 0,
  };
}

function calcFinalAmount(svc) {
  const gross =
    Number(svc.numberOfSessions || 0) * Number(svc.pricePerSession || 0);
  const amt = Number(svc.discountAmount || 0);
  if (svc.discountType === "percentage")
    return Math.max(0, gross - (gross * amt) / 100);
  if (svc.discountType === "fixed") return Math.max(0, gross - amt);
  return gross;
}

// ─── Service picker dropdown ───────────────────────────────────────────────────

function ServicePicker({ catalogServices, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query.trim()
    ? catalogServices.filter((s) =>
        (s.serviceName || s.serviceCode || "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : catalogServices;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-7 px-2 rounded border border-dashed border-border bg-background text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
      >
        <Plus className="h-3 w-3" /> Add Service
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-56 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog…"
              className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setQuery("");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:bg-muted/40 transition-colors italic"
            >
              + Blank service
            </button>
            {filtered.map((s) => (
              <button
                key={String(s._id)}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-muted/40 transition-colors"
              >
                {s.color && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                )}
                <span className="truncate">{s.serviceName}</span>
                {s.serviceCode && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {s.serviceCode}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                No results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function NewEnrollmentPackageInline({
  teacherOptions = [],
  packageTemplates = [],
  /** When set, only package lines whose `serviceCode` is in this set are included. */
  allowedServiceCodes,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(BLANK_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogServices, setCatalogServices] = useState([]);

  useEffect(() => {
    api.get("/api/calendar-service?limit=200").then((res) => {
      if (res.success && Array.isArray(res.data)) setCatalogServices(res.data);
    });
  }, []);

  const selectedPkg = useMemo(
    () =>
      packageTemplates.find((p) => String(p._id) === String(form.packageID)),
    [packageTemplates, form.packageID],
  );

  function handlePkgChange(pkgId) {
    const pkg = packageTemplates.find((p) => String(p._id) === String(pkgId));
    const raw = pkg?.services || [];
    const filtered =
      allowedServiceCodes == null
        ? raw
        : raw.filter((s) => allowedServiceCodes.has(s.serviceCode));
    setForm((prev) => ({
      ...prev,
      packageID: pkgId,
      billingType: pkg?.billingType || "one_time",
      services: filtered.map((s) => {
        const isChargeable = s.isChargeable ?? true;
        const svc = {
          _key: String(s._id || s.serviceCode || Math.random()),
          serviceCode: s.serviceCode || "",
          serviceName: s.serviceName || "",
          color: s.color || "#6366f1",
          numberOfSessions: Number(s.numberOfSessions || 0),
          pricePerSession: isChargeable ? Number(s.pricePerSession || 0) : 0,
          discountType: isChargeable ? (s.discountType || "none") : "none",
          discountAmount: isChargeable ? Number(s.discountAmount || 0) : 0,
          isChargeable,
        };
        return { ...svc, finalAmount: Number(calcFinalAmount(svc).toFixed(2)) };
      }),
    }));
  }

  function updateSvc(key, field, value) {
    setForm((prev) => {
      const services = prev.services.map((s) => {
        if (s._key !== key) return s;
        const next = { ...s, [field]: value };
        next.finalAmount = Number(calcFinalAmount(next).toFixed(2));
        return next;
      });
      return { ...prev, services };
    });
  }

  function addService(catalogSvc) {
    const svc = catalogSvc
      ? {
          _key: String(Date.now() + Math.random()),
          serviceCode: catalogSvc.serviceCode || "",
          serviceName: catalogSvc.serviceName || "",
          color: catalogSvc.color || "#6366f1",
          numberOfSessions: 0,
          pricePerSession: catalogSvc.isChargeable !== false ? Number(catalogSvc.price || 0) : 0,
          discountType: "none",
          discountAmount: 0,
          finalAmount: 0,
          isChargeable: catalogSvc.isChargeable ?? true,
        }
      : blankService();
    svc.finalAmount = Number(calcFinalAmount(svc).toFixed(2));
    setForm((prev) => ({ ...prev, services: [...prev.services, svc] }));
  }

  function removeService(key) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s._key !== key),
    }));
  }

  const total = form.services.reduce(
    (sum, s) => sum + (Number(s.finalAmount) || 0),
    0,
  );
  const totalDiscount = form.services.reduce((sum, s) => {
    const gross =
      Number(s.numberOfSessions || 0) * Number(s.pricePerSession || 0);
    return sum + Math.max(0, gross - (Number(s.finalAmount) || 0));
  }, 0);

  const chargeableServices = form.services.filter((s) => s.isChargeable !== false);
  const canPayPerSession = chargeableServices.length === 1;

  const installments = useMemo(() => {
    if (form.billingType !== "payment_plan") return [];
    const { installmentMode, numberOfInstallments, installmentAmount, frequency, startDate } = form.billing;
    if (!startDate) return [];

    let n, baseAmt;
    if (installmentMode === "amount") {
      const amt = Number(installmentAmount || 0);
      if (!amt || amt <= 0) return [];
      n = Math.ceil(total / amt);
      if (!n) return [];
      baseAmt = amt;
    } else {
      n = Number(numberOfInstallments || 0);
      if (!n) return [];
      baseAmt = Number((total / n).toFixed(2));
    }

    let d = new Date(startDate);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const amount = isLast ? Number((total - baseAmt * (n - 1)).toFixed(2)) : baseAmt;
      rows.push({
        index: i + 1,
        amount,
        isLast,
        date: d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
      });
      if (frequency === "weekly") d = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (frequency === "biweekly") d = new Date(d.getTime() + 14 * 24 * 60 * 60 * 1000);
      else { d = new Date(d); d.setMonth(d.getMonth() + 1); }
    }
    return rows;
  }, [
    form.billingType,
    form.billing.installmentMode,
    form.billing.numberOfInstallments,
    form.billing.installmentAmount,
    form.billing.frequency,
    form.billing.startDate,
    total,
  ]);

  async function handleSubmit() {
    if (!form.packageID) {
      setError("Please select a package.");
      return;
    }
    if (form.billingType === "payment_plan") {
      const { numberOfInstallments, frequency, startDate } = form.billing;
      if (!numberOfInstallments || !frequency || !startDate) {
        setError("Fill all payment plan fields.");
        return;
      }
    }
    setError("");
    setLoading(true);
    const payload = { ...form };
    if (form.tip.enabled && form.tip.amount && form.teacherID) {
      payload.tip = { teacherID: form.teacherID, amount: form.tip.amount, method: form.tip.method };
    } else {
      payload.tip = undefined;
    }
    const ok = await onSubmit?.(payload);
    setLoading(false);
    if (!ok) setError("Failed to create enrollment and package.");
  }

  return (
    <div className="mt-2 h-full min-h-0 rounded-xl border border-border bg-card p-3 flex flex-col">
      <div className="shrink-0">
        <p className="text-[12px] font-semibold text-foreground">
          New Enrollment & Package
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1 space-y-3">
        <div className="space-y-3 pb-1">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Teacher
            </label>
            <div className="relative">
              <select
                value={form.teacherID}
                onChange={(e) =>
                  setForm((p) => ({ ...p, teacherID: e.target.value }))
                }
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px]"
              >
                <option value="">Select teacher…</option>
                {teacherOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            <label className="text-[11px] font-medium text-muted-foreground">
              Label (optional)
            </label>
            <input
              value={form.label}
              onChange={(e) =>
                setForm((p) => ({ ...p, label: e.target.value }))
              }
              placeholder="e.g. Term 1 2026, Trial…"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
            />

            <label className="text-[11px] font-medium text-muted-foreground">
              Package
            </label>
            <div className="relative">
              <select
                value={form.packageID}
                onChange={(e) => handlePkgChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px]"
              >
                <option value="">Select package…</option>
                {packageTemplates.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.packageName}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            {selectedPkg && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-[12px] font-medium text-foreground">
                  {selectedPkg.packageName}
                </p>
                {selectedPkg.description && (
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPkg.description}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {selectedPkg.services?.length ?? 0} service
                  {(selectedPkg.services?.length ?? 0) !== 1 ? "s" : ""}
                  {" · "}
                  {selectedPkg.totalDays > 0
                    ? `${selectedPkg.totalDays} days validity`
                    : "No expiry"}
                </p>
              </div>
            )}
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, purchaseDate: e.target.value }))
              }
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
            />
          </div>

          {/* ── Services table ── */}
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-2 py-1.5 text-left">Service</th>
                    <th className="px-2 py-1.5">Color</th>
                    <th className="px-2 py-1.5">Sessions</th>
                    <th className="px-2 py-1.5">Price</th>
                    <th className="px-2 py-1.5">Discount</th>
                    <th className="px-2 py-1.5 text-right">Total</th>
                    <th className="px-2 py-1.5 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {form.services.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-3 text-center text-[11px] text-muted-foreground italic"
                      >
                        No services — add one below
                      </td>
                    </tr>
                  )}
                  {form.services.map((s) => (
                    <tr
                      key={s._key}
                      className="border-t border-border first:border-0"
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={s.serviceName}
                          onChange={(e) =>
                            updateSvc(s._key, "serviceName", e.target.value)
                          }
                          placeholder="Service name"
                          className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="color"
                          value={s.color || "#6366f1"}
                          onChange={(e) =>
                            updateSvc(s._key, "color", e.target.value)
                          }
                          className="h-7 w-9 rounded border border-border cursor-pointer p-0.5 bg-background"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          value={s.numberOfSessions}
                          onChange={(e) =>
                            updateSvc(
                              s._key,
                              "numberOfSessions",
                              e.target.value,
                            )
                          }
                          className="h-7 w-16 rounded border border-border px-2 outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.isChargeable === false ? 0 : s.pricePerSession}
                          disabled={s.isChargeable === false}
                          onChange={(e) =>
                            updateSvc(s._key, "pricePerSession", e.target.value)
                          }
                          className={`h-7 w-20 rounded border px-2 outline-none ${s.isChargeable === false ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed" : "border-border focus:border-primary"}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <select
                            value={s.discountType}
                            disabled={s.isChargeable === false}
                            onChange={(e) =>
                              updateSvc(s._key, "discountType", e.target.value)
                            }
                            className={`h-7 rounded border border-border px-1 text-[11px] outline-none ${s.isChargeable === false ? "bg-muted/30 text-muted-foreground cursor-not-allowed" : "bg-background focus:border-primary"}`}
                          >
                            <option value="none">—</option>
                            <option value="percentage">%</option>
                            <option value="fixed">$</option>
                          </select>
                          {s.discountType !== "none" && (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={s.discountAmount}
                              onChange={(e) =>
                                updateSvc(
                                  s._key,
                                  "discountAmount",
                                  e.target.value,
                                )
                              }
                              className="h-7 w-16 rounded border border-border bg-background px-2 text-[11px] outline-none focus:border-primary"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        ${Number(s.finalAmount).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeService(s._key)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove service"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {totalDiscount > 0 && (
                    <tr className="border-t border-border bg-muted/20">
                      <td
                        colSpan={5}
                        className="px-2 py-1 text-right text-[11px] text-muted-foreground"
                      >
                        Discount
                      </td>
                      <td className="px-2 py-1 text-right text-[11px] text-amber-600 font-medium">
                        -${totalDiscount.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  )}
                  <tr className="border-t border-border bg-muted/30">
                    <td
                      colSpan={5}
                      className="px-2 py-1.5 text-right text-[11px] text-muted-foreground"
                    >
                      Total
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold">
                      ${total.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add service button */}
            <ServicePicker
              catalogServices={catalogServices}
              onSelect={addService}
            />
          </div>

          {/* ── Billing type ── */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Billing Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "one_time", label: "One-time" },
                { v: "payment_plan", label: "Payment Plan" },
                { v: "flexible", label: "Flexible" },
                { v: "pay_per_session", label: "Pay Per Session", disabled: !canPayPerSession },
              ].map(({ v, label, disabled }) => (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setForm((p) => ({ ...p, billingType: v }))}
                  title={disabled && v === "pay_per_session" ? "Requires exactly one chargeable service in the package" : undefined}
                  className={`rounded-lg border p-2 text-[11px] transition-colors ${
                    form.billingType === v
                      ? "border-primary bg-primary/5 font-medium"
                      : disabled
                        ? "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50"
                        : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!canPayPerSession && form.services.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Pay Per Session requires exactly 1 chargeable service.{" "}
                {chargeableServices.length === 0 ? "No chargeable services in this package." : `This package has ${chargeableServices.length} chargeable services.`}
              </p>
            )}
            {form.billingType === "one_time" && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <p className="text-[12px] text-muted-foreground">
                    Payable Balance
                  </p>
                  <p className="text-[14px] font-bold text-foreground">
                    ${total.toFixed(2)}
                  </p>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  Payment Method
                </p>
                <div className="relative">
                  <select
                    value={form.billing.method}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        billing: { ...p.billing, method: e.target.value },
                      }))
                    }
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] capitalize"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="capitalize">
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}
            {form.billingType === "payment_plan" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.billing.installmentMode}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        billing: { ...p.billing, installmentMode: e.target.value },
                      }))
                    }
                    className="h-9 rounded-lg border border-border px-3 text-[12px]"
                  >
                    <option value="count">No. of Installments</option>
                    <option value="amount">Installment Amount</option>
                  </select>
                  {form.billing.installmentMode === "amount" ? (
                    <input
                      type="number"
                      min="1"
                      placeholder="Amount per installment"
                      value={form.billing.installmentAmount}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          billing: { ...p.billing, installmentAmount: e.target.value },
                        }))
                      }
                      className="h-9 rounded-lg border border-border px-3 text-[12px]"
                    />
                  ) : (
                    <input
                      type="number"
                      min="2"
                      placeholder="Number of installments"
                      value={form.billing.numberOfInstallments}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          billing: { ...p.billing, numberOfInstallments: e.target.value },
                        }))
                      }
                      className="h-9 rounded-lg border border-border px-3 text-[12px]"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.billing.frequency}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        billing: { ...p.billing, frequency: e.target.value },
                      }))
                    }
                    className="h-9 rounded-lg border border-border px-3 text-[12px]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input
                    type="date"
                    value={form.billing.startDate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        billing: { ...p.billing, startDate: e.target.value },
                      }))
                    }
                    className="h-9 rounded-lg border border-border px-3 text-[12px]"
                  />
                </div>
                {installments.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Schedule Preview
                      </p>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {installments.map((inst) => (
                        <div
                          key={inst.index}
                          className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0"
                        >
                          <span className="text-[11px] text-muted-foreground">
                            Payment {inst.index} · {inst.date}
                          </span>
                          <span className="text-[11px] font-medium text-foreground">
                            ${inst.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                        <p className="text-[11px] text-muted-foreground">Discount</p>
                        <p className="text-[11px] font-medium text-destructive">-${totalDiscount.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <p className="text-[11px] text-muted-foreground">
                        Payable Balance
                      </p>
                      <p className="text-[12px] font-bold text-foreground">
                        ${total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {form.billingType === "flexible" && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground">
                  No schedule set. Payments can be recorded manually at any
                  time.
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground">
                    Payable Balance
                  </p>
                  <p className="text-[13px] font-bold text-foreground">
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
            {form.billingType === "pay_per_session" && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  No upfront payment. A payment is recorded automatically each time a session is booked for the chargeable service.
                </p>
                {chargeableServices.map((s) => {
                  const sessions = Number(s.numberOfSessions || 0);
                  const pricePerSession = Number(s.pricePerSession || 0);
                  const finalAmount = Number(s.finalAmount || 0);
                  const hasDiscount = s.discountType !== "none" && Number(s.discountAmount || 0) > 0;

                  // Build per-session charge list, applying discount from the last session backwards
                  const charges = Array(sessions).fill(pricePerSession);
                  if (hasDiscount) {
                    let remaining = Math.max(0, pricePerSession * sessions - finalAmount);
                    for (let i = sessions - 1; i >= 0 && remaining > 0; i--) {
                      const reduction = Math.min(charges[i], remaining);
                      charges[i] = Math.round((charges[i] - reduction) * 100) / 100;
                      remaining = Math.round((remaining - reduction) * 100) / 100;
                    }
                  }

                  return (
                    <div key={s.serviceCode} className="pt-2 border-t border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-foreground">{s.serviceName || s.serviceCode}</p>
                        <p className="text-[10px] text-muted-foreground">{sessions} sessions · ${pricePerSession.toFixed(2)}/sess</p>
                      </div>
                      <div className="rounded-md border border-border overflow-hidden">
                        <div className="grid grid-cols-2 bg-muted/40 px-2.5 py-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Session</span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Charge</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {charges.map((amount, idx) => {
                            const isDiscounted = hasDiscount && amount < pricePerSession;
                            return (
                              <div key={idx} className={`grid grid-cols-2 px-2.5 py-1.5 ${idx > 0 ? 'border-t border-border' : ''}`}>
                                <span className="text-[11px] text-foreground">Session {idx + 1}</span>
                                <div className="text-right">
                                  {isDiscounted && (
                                    <span className="text-[10px] text-muted-foreground line-through mr-1">${pricePerSession.toFixed(2)}</span>
                                  )}
                                  <span className={`text-[11px] font-semibold ${isDiscounted ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                    ${amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground">Total (if all sessions booked)</p>
                  <p className="text-[13px] font-bold text-foreground">
                    ${chargeableServices.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Tip for teacher ── */}
      {form.teacherID && (
        <div className="shrink-0 mt-3 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">
              Add a tip for the teacher?
            </p>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  tip: { ...p.tip, enabled: !p.tip.enabled },
                }))
              }
              className={`relative h-5 w-9 rounded-full transition-colors ${
                form.tip.enabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  form.tip.enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {form.tip.enabled && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.tip.amount}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tip: { ...p.tip, amount: e.target.value },
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-3 text-[12px] outline-none focus:border-primary"
                />
              </div>
              <div className="relative w-32">
                <select
                  value={form.tip.method}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tip: { ...p.tip, method: e.target.value },
                    }))
                  }
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] capitalize"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-destructive mt-2">{error}</p>}

      <div className="flex justify-between gap-2 pt-2 mt-auto border-t border-border/60">
        <button
          type="button"
          className="h-8 px-3 rounded-lg border border-border text-[11px]"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="h-8 px-3 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold disabled:opacity-60"
          onClick={handleSubmit}
          disabled={loading || !form.packageID}
        >
          {loading ? "Creating…" : "Create Enrollment & Package"}
        </button>
      </div>
    </div>
  );
}
