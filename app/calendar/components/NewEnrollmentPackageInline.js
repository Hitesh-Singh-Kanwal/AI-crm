"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

const PAYMENT_METHODS = ["cash", "card", "online", "cheque", "other"];

const BLANK_FORM = {
  teacherID: "",
  label: "",
  packageID: "",
  purchaseDate: "",
  services: [],
  discountType: "none",
  discountAmount: 0,
  billingType: "one_time",
  billing: { method: "cash", numberOfInstallments: 3, frequency: "monthly", startDate: "" },
};

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

  const selectedPkg = useMemo(
    () => packageTemplates.find((p) => String(p._id) === String(form.packageID)),
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
      discountType: pkg?.discountType || "none",
      discountAmount: pkg?.discountAmount || 0,
      billingType: pkg?.billingType || "one_time",
      services: filtered.map((s) => ({
        serviceCode: s.serviceCode || "",
        serviceName: s.serviceName || "",
        color: s.color || "",
        numberOfSessions: Number(s.numberOfSessions || 0),
        pricePerSession: Number(s.pricePerSession || 0),
        finalAmount: Number((Number(s.numberOfSessions || 0) * Number(s.pricePerSession || 0)).toFixed(2)),
      })),
    }));
  }

  function updateSvc(i, field, value) {
    setForm((prev) => {
      const services = prev.services.map((s, idx) => {
        if (idx !== i) return s;
        const next = { ...s, [field]: value };
        next.finalAmount = Number((Number(next.numberOfSessions || 0) * Number(next.pricePerSession || 0)).toFixed(2));
        return next;
      });
      return { ...prev, services };
    });
  }

  const subtotal = form.services.reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);
  const discount = form.discountType === "percentage"
    ? Math.min(subtotal, subtotal * (Number(form.discountAmount) || 0) / 100)
    : form.discountType === "fixed"
      ? Math.min(subtotal, Number(form.discountAmount) || 0)
      : 0;
  const total = Math.max(0, subtotal - discount);

  const installments = useMemo(() => {
    if (form.billingType !== "payment_plan") return [];
    const n = Number(form.billing.numberOfInstallments || 0);
    if (!n || !form.billing.startDate) return [];
    const baseAmt = Number((subtotal / n).toFixed(2));
    let d = new Date(form.billing.startDate);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const amount = isLast
        ? Math.max(0, Number((baseAmt - discount).toFixed(2)))
        : baseAmt;
      rows.push({
        index: i + 1,
        amount,
        isLast,
        date: d.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
      if (form.billing.frequency === "weekly") {
        d = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (form.billing.frequency === "biweekly") {
        d = new Date(d.getTime() + 14 * 24 * 60 * 60 * 1000);
      } else {
        d = new Date(d);
        d.setMonth(d.getMonth() + 1);
      }
    }
    return rows;
  }, [form.billingType, form.billing.numberOfInstallments, form.billing.frequency, form.billing.startDate, subtotal, discount]);

  async function handleSubmit() {
    if (!form.teacherID || !form.packageID) {
      setError("Teacher and package are required.");
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
    const ok = await onSubmit?.(form);
    setLoading(false);
    if (!ok) setError("Failed to create enrollment and package.");
  }

  return (
    <div className="mt-2 h-full min-h-0 rounded-xl border border-border bg-card p-3 flex flex-col">
      <div className="shrink-0">
        <p className="text-[12px] font-semibold text-foreground">New Enrollment & Package</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1 space-y-3">
        <div className="space-y-3 pb-1">
          <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground">Teacher</label>
          <div className="relative">
            <select value={form.teacherID} onChange={(e) => setForm((p) => ({ ...p, teacherID: e.target.value }))}
              className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px]">
              <option value="">Select teacher…</option>
              {teacherOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <label className="text-[11px] font-medium text-muted-foreground">Label (optional)</label>
          <input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            placeholder="e.g. Term 1 2026, Trial…" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px]" />

          <label className="text-[11px] font-medium text-muted-foreground">Package</label>
          <div className="relative">
            <select value={form.packageID} onChange={(e) => handlePkgChange(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px]">
              <option value="">Select package…</option>
              {packageTemplates.map((p) => <option key={p._id} value={p._id}>{p.packageName}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {selectedPkg && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-[12px] font-medium text-foreground">{selectedPkg.packageName}</p>
              {selectedPkg.description && (
                <p className="text-[11px] text-muted-foreground">{selectedPkg.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {(selectedPkg.services?.length ?? 0)} service
                {(selectedPkg.services?.length ?? 0) !== 1 ? "s" : ""}
                {" · "}
                {selectedPkg.totalDays > 0 ? `${selectedPkg.totalDays} days validity` : "No expiry"}
              </p>
            </div>
          )}
          <input type="date" value={form.purchaseDate} onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px]" />
          </div>

          <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[12px]">
              <thead><tr className="bg-muted/40 border-b border-border"><th className="px-2 py-1.5 text-left">Service</th><th className="px-2 py-1.5">Color</th><th className="px-2 py-1.5">Sessions</th><th className="px-2 py-1.5">Price</th><th className="px-2 py-1.5 text-right">Subtotal</th></tr></thead>
              <tbody>
                {form.services.map((s, i) => (
                  <tr key={`${s.serviceCode}-${i}`} className={i > 0 ? "border-t border-border" : ""}>
                    <td className="px-2 py-1.5">{s.serviceName}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="color"
                        value={s.color || "#6366f1"}
                        onChange={(e) => updateSvc(i, "color", e.target.value)}
                        className="h-7 w-9 rounded border border-border cursor-pointer p-0.5 bg-background"
                      />
                    </td>
                    <td className="px-2 py-1.5"><input type="number" min="0" value={s.numberOfSessions} onChange={(e) => updateSvc(i, "numberOfSessions", e.target.value)} className="h-7 w-16 rounded border border-border px-2" /></td>
                    <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={s.pricePerSession} onChange={(e) => updateSvc(i, "pricePerSession", e.target.value)} className="h-7 w-20 rounded border border-border px-2" /></td>
                    <td className="px-2 py-1.5 text-right font-semibold">${Number(s.finalAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={4} className="px-2 py-1.5 text-right text-[11px] text-muted-foreground">Subtotal</td>
                  <td className="px-2 py-1.5 text-right font-semibold">${subtotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Package Discount</p>
            <div className="flex items-center gap-2">
              <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value, discountAmount: 0 }))}
                className="h-8 rounded border border-border bg-background px-2 text-[12px]">
                <option value="none">No discount</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
              {form.discountType !== "none" && <input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => setForm((p) => ({ ...p, discountAmount: e.target.value }))} className="h-8 w-24 rounded border border-border bg-background px-2 text-[12px]" />}
              <span className="ml-auto text-[12px] font-medium text-amber-600">{discount > 0 ? `-$${discount.toFixed(2)}` : ""}</span>
            </div>
            <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Total</span><span className="font-bold">${total.toFixed(2)}</span></div>
          </div>
          </div>

          <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase">Billing Type</p>
          <div className="grid grid-cols-3 gap-2">
            {["one_time", "payment_plan", "flexible"].map((v) => (
              <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, billingType: v }))}
                className={`rounded-lg border p-2 text-[11px] ${form.billingType === v ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                {v === "one_time" ? "One-time" : v === "payment_plan" ? "Payment Plan" : "Flexible"}
              </button>
            ))}
          </div>
          {form.billingType === "one_time" && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between border-t border-border pt-2">
                <p className="text-[12px] text-muted-foreground">Payable Balance</p>
                <p className="text-[14px] font-bold text-foreground">${total.toFixed(2)}</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Payment Method</p>
              <div className="relative">
                <select value={form.billing.method} onChange={(e) => setForm((p) => ({ ...p, billing: { ...p.billing, method: e.target.value } }))}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] capitalize">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}
          {form.billingType === "payment_plan" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="2" value={form.billing.numberOfInstallments} onChange={(e) => setForm((p) => ({ ...p, billing: { ...p.billing, numberOfInstallments: e.target.value } }))} className="h-9 rounded-lg border border-border px-3 text-[12px]" />
                <select value={form.billing.frequency} onChange={(e) => setForm((p) => ({ ...p, billing: { ...p.billing, frequency: e.target.value } }))}
                  className="h-9 rounded-lg border border-border px-3 text-[12px]">
                  <option value="weekly">Weekly</option><option value="biweekly">Fortnightly</option><option value="monthly">Monthly</option>
                </select>
                <input type="date" value={form.billing.startDate} onChange={(e) => setForm((p) => ({ ...p, billing: { ...p.billing, startDate: e.target.value } }))} className="h-9 rounded-lg border border-border px-3 text-[12px]" />
              </div>
              {installments.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase">Schedule Preview</p>
                    {discount > 0 && <span className="text-[11px] text-amber-600">Discount on last payment</span>}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {installments.map((inst) => (
                      <div key={inst.index} className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0">
                        <span className="text-[11px] text-muted-foreground">
                          Payment {inst.index} · {inst.date}
                          {inst.isLast && discount > 0 ? ` (-$${discount.toFixed(2)})` : ""}
                        </span>
                        <span className="text-[11px] font-medium text-foreground">${inst.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground">Payable Balance</p>
                    <p className="text-[12px] font-bold text-foreground">${total.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {form.billingType === "flexible" && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">No schedule set. Payments can be recorded manually at any time.</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground">Payable Balance</p>
                <p className="text-[13px] font-bold text-foreground">${total.toFixed(2)}</p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive mt-2">{error}</p>}

      <div className="flex justify-between gap-2 pt-2 mt-auto border-t border-border/60">
        <button type="button" className="h-8 px-3 rounded-lg border border-border text-[11px]" onClick={onCancel}>Cancel</button>
        <button type="button" className="h-8 px-3 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold disabled:opacity-60" onClick={handleSubmit} disabled={loading || !form.teacherID || !form.packageID}>{loading ? "Creating…" : "Create Enrollment & Package"}</button>
      </div>
    </div>
  );
}

