"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Pin, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

const TABS = [
  { key: "appointments", label: "Appointments" },
  { key: "enrollments", label: "Enrollments" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
  { key: "messages", label: "Messages" },
];

const BLANK_NEW_ENR = { label: "", teacherID: "", packageID: "", purchaseDate: "", services: [] };

function statusColor(status) {
  if (status === "completed") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  if (status === "no_show") return "bg-orange-500/10 text-orange-400";
  return "bg-blue-500/10 text-blue-400";
}

export default function MiniStudentPanel({ customerId, customerName, onBack, inline = false }) {
  const [activeTab, setActiveTab] = useState("appointments");
  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [catalogPackages, setCatalogPackages] = useState([]);
  const [catalogTeachers, setCatalogTeachers] = useState([]);
  const [sellTargetEnrollmentId, setSellTargetEnrollmentId] = useState(null);
  const [sellForm, setSellForm] = useState({ packageID: "", purchaseDate: "", notes: "" });
  const [sellServices, setSellServices] = useState([]);
  const [isSelling, setIsSelling] = useState(false);
  const [sellError, setSellError] = useState(null);

  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const [showNewEnrForm, setShowNewEnrForm] = useState(false);
  const [newEnrForm, setNewEnrForm] = useState(BLANK_NEW_ENR);
  const [isCreatingEnroll, setIsCreatingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState(null);

  const [collectedPayments, setCollectedPayments] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [flexEnrollments, setFlexEnrollments] = useState([]);
  const [allFlexEnrollments, setAllFlexEnrollments] = useState([]);
  const [totalSessionsRemaining, setTotalSessionsRemaining] = useState(null);
  const [flexPayForms, setFlexPayForms] = useState({});
  const [upcomingPayments, setUpcomingPayments] = useState([]); // unified sorted list
  const [planPayForms, setPlanPayForms] = useState({}); // planId_installmentIdx → { method, saving, error }

  const [msgMode, setMsgMode] = useState("sms"); // "sms" | "email"
  const [smsText, setSmsText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(null);
  const [msgError, setMsgError] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loadingSmsHistory, setLoadingSmsHistory] = useState(false);
  const [leadId, setLeadId] = useState(null);

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
      if (result.success && Array.isArray(result.data))
        setAppointments(result.data);
      setLoadingAppts(false);
    }
    load();
  }, [activeTab, customerId]);

  async function handleAddNote() {
    if (!newNoteText.trim()) return;
    setIsSavingNote(true);
    const result = await api.post(`/api/customer/${customerId}/notes`, {
      text: newNoteText.trim(),
    });
    if (result.success) {
      setCustomer((prev) => ({ ...prev, notes: result.data }));
      setNewNoteText("");
    }
    setIsSavingNote(false);
  }

  async function handleTogglePin(noteId) {
    const result = await api.patch(
      `/api/customer/${customerId}/notes/${noteId}`,
    );
    if (result.success)
      setCustomer((prev) => ({ ...prev, notes: result.data }));
  }

  async function handleDeleteNote(noteId) {
    const result = await api.delete(
      `/api/customer/${customerId}/notes/${noteId}`,
    );
    if (result.success)
      setCustomer((prev) => ({ ...prev, notes: result.data }));
  }


  useEffect(() => {
    if (activeTab !== "enrollments") return;
    async function load() {
      setLoadingEnrollments(true);
      const [enrResult, catalogResult, teachersResult] = await Promise.all([
        api.get(`/api/enrollment?customerID=${customerId}&limit=50`),
        api.get("/api/package?limit=200&isActive=true"),
        api.get("/api/teacher?limit=200&status=active"),
      ]);
      if (enrResult.success && Array.isArray(enrResult.data)) setEnrollments(enrResult.data);
      if (catalogResult.success && Array.isArray(catalogResult.data)) setCatalogPackages(catalogResult.data);
      if (teachersResult.success && Array.isArray(teachersResult.data)) setCatalogTeachers(teachersResult.data);
      setLoadingEnrollments(false);
    }
    load();
  }, [activeTab, customerId]);

  function setNewEnrField(field, val) {
    setNewEnrForm((f) => ({ ...f, [field]: val }));
  }

  function onNewEnrPkgChange(pkgId) {
    const pkg = catalogPackages.find((p) => String(p._id) === pkgId);
    setNewEnrForm((f) => ({
      ...f,
      packageID: pkgId,
      services: (pkg?.services || []).map((s) => ({
        serviceCode: s.serviceCode || "",
        serviceName: s.serviceName || "",
        color: s.color || "",
        numberOfSessions: s.numberOfSessions || 0,
        pricePerSession: s.pricePerSession || 0,
        finalAmount: (s.numberOfSessions || 0) * (s.pricePerSession || 0),
      })),
    }));
  }

  function updateNewEnrSvc(i, field, val) {
    setNewEnrForm((f) => {
      const services = f.services.map((s, idx) => {
        if (idx !== i) return s;
        const updated = { ...s, [field]: val };
        updated.finalAmount = parseFloat(
          ((Number(updated.pricePerSession) || 0) * (Number(updated.numberOfSessions) || 0)).toFixed(2)
        );
        return updated;
      });
      return { ...f, services };
    });
  }

  function addNewEnrSvcRow() {
    setNewEnrForm((f) => ({
      ...f,
      services: [...f.services, { serviceCode: "", serviceName: "", color: "", numberOfSessions: 0, pricePerSession: 0, finalAmount: 0 }],
    }));
  }

  function removeNewEnrSvcRow(i) {
    setNewEnrForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  }

  async function handleCreateEnrollment() {
    setIsCreatingEnroll(true);
    setEnrollError(null);

    const enrRes = await api.post("/api/enrollment", {
      customerID: customerId,
      label: newEnrForm.label.trim() || undefined,
      teacherID: newEnrForm.teacherID || undefined,
    });
    if (!enrRes.success) {
      setEnrollError(enrRes.error || "Failed to create enrollment.");
      setIsCreatingEnroll(false);
      return;
    }
    const created = enrRes.data?.enrollment ?? enrRes.data;
    const enrollmentID = String(created?._id || "");

    if (newEnrForm.packageID && enrollmentID) {
      const pkgRes = await api.post("/api/customer-package/add", {
        customerID: customerId,
        enrollmentID,
        packageID: newEnrForm.packageID,
        purchaseDate: newEnrForm.purchaseDate || undefined,
        services: newEnrForm.services.map((s) => ({
          serviceCode: s.serviceCode,
          serviceName: s.serviceName,
          color: s.color,
          numberOfSessions: Number(s.numberOfSessions),
          pricePerSession: Number(s.pricePerSession),
          finalAmount: Number(s.finalAmount),
        })),
        billingType: "flexible",
        billing: {},
      });
      if (!pkgRes.success) {
        setEnrollError(pkgRes.error || "Enrollment created but failed to add package.");
        setIsCreatingEnroll(false);
        // still reload so the enrollment shows
        const enrListRes = await api.get(`/api/enrollment?customerID=${customerId}&limit=50`);
        if (enrListRes.success) setEnrollments(enrListRes.data);
        return;
      }
    }

    const enrListRes = await api.get(`/api/enrollment?customerID=${customerId}&limit=50`);
    if (enrListRes.success) setEnrollments(enrListRes.data);
    setShowNewEnrForm(false);
    setNewEnrForm(BLANK_NEW_ENR);
    setIsCreatingEnroll(false);
  }

  function handlePkgSelect(pkgId) {
    const pkg = catalogPackages.find((p) => p._id === pkgId);
    setSellForm((f) => ({ ...f, packageID: pkgId }));
    setSellServices(
      (pkg?.services || []).map((s) => {
        const isChargeable = s.isChargeable ?? true;
        return {
          serviceCode: s.serviceCode || "",
          serviceName: s.serviceName || "",
          numberOfSessions: s.numberOfSessions || 0,
          pricePerSession: isChargeable ? (s.pricePerSession || 0) : 0,
          discountType: isChargeable ? (s.discountType || "none") : "none",
          discountAmount: isChargeable ? (s.discountAmount || 0) : 0,
          finalAmount: isChargeable ? (s.finalAmount || 0) : 0,
          isChargeable,
        };
      }),
    );
  }

  function updateSellSvc(i, field, val) {
    setSellServices((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        const updated = { ...s, [field]: val };
        const price = Number(updated.pricePerSession) || 0;
        const sessions = Number(updated.numberOfSessions) || 0;
        let fa = price * sessions;
        if (updated.discountType === "percentage")
          fa -= fa * ((Number(updated.discountAmount) || 0) / 100);
        if (updated.discountType === "fixed")
          fa -= Number(updated.discountAmount) || 0;
        updated.finalAmount = Math.max(0, parseFloat(fa.toFixed(2)));
        return updated;
      }),
    );
  }

  async function handleSellPackage() {
    if (!sellForm.packageID || !sellTargetEnrollmentId) {
      setSellError("Please select a package.");
      return;
    }
    setIsSelling(true);
    setSellError(null);
    const result = await api.post("/api/customer-package/add", {
      customerID: customerId,
      enrollmentID: sellTargetEnrollmentId,
      packageID: sellForm.packageID,
      purchaseDate: sellForm.purchaseDate || undefined,
      services: sellServices.map((s) => ({
        ...s,
        numberOfSessions: Number(s.numberOfSessions),
        pricePerSession: Number(s.pricePerSession),
        discountAmount: Number(s.discountAmount),
        finalAmount: Number(s.finalAmount),
      })),
      billingType: "one_time",
      billing: { method: "cash" },
      notes: sellForm.notes || undefined,
    });

    if (result.success) {
      const updatedEnrollment = result.data.enrollment ?? result.data;
      setEnrollments((prev) =>
        prev.map((e) =>
          String(e._id) === String(sellTargetEnrollmentId) ? { ...e, package: updatedEnrollment.package } : e,
        ),
      );
      setSellTargetEnrollmentId(null);
      setSellForm({ packageID: "", purchaseDate: "", notes: "" });
      setSellServices([]);
    } else {
      setSellError(result.error || "Failed to sell package.");
    }
    setIsSelling(false);
  }

  useEffect(() => {
    if (activeTab !== "payments") return;
    async function load() {
      setLoadingPayments(true);
      const [calResult, enrResult, planResult] = await Promise.all([
        api.get(`/api/calendar/customer/${customerId}`),
        api.get(`/api/enrollment?customerID=${customerId}`),
        api.get(`/api/payment-plan/customer/${customerId}`),
      ]);

      let calEvents = [];
      if (calResult.success && Array.isArray(calResult.data)) {
        calEvents = [...calResult.data].sort(
          (a, b) => new Date(b.startDateTime) - new Date(a.startDateTime),
        );
        setCollectedPayments(calEvents.filter((e) => e.payment?.collected));
        setServiceCharges(calEvents.filter((e) => e.chargeApplied));
      }

      let allEnr = [];
      if (enrResult.success) {
        allEnr = enrResult.data || [];
        const allFlex = allEnr.filter((e) => e.package?.billingType === "flexible");
        const due = allFlex.filter((e) => e.package?.paymentStatus !== "paid" && e.status === "active");
        setAllFlexEnrollments(allFlex);
        setFlexEnrollments(due);
        const totalRemaining = allEnr
          .filter((e) => e.status === "active" && e.package?.status === "active")
          .reduce((sum, e) => {
            const bt = e.package?.billingType;
            if (bt === "flexible" || bt === "payment_plan") {
              const collected = e.package?.amountCollected ?? 0;
              const svc = (e.package?.services ?? []).find((s) => s.pricePerSession > 0);
              const pps = svc?.pricePerSession ?? 0;
              return sum + (pps > 0 ? collected / pps : 0);
            }
            return sum + (e.package?.services ?? []).reduce((s2, s) => s2 + (s.sessionsRemaining ?? 0), 0);
          }, 0);
        setTotalSessionsRemaining(totalRemaining);
        const forms = {};
        due.forEach((e) => {
          const outstanding = Math.max(0, (e.package.dueAmount ?? e.package.totalPaid) - (e.package.amountCollected ?? 0));
          forms[String(e._id)] = {
            mode: null,
            amount: outstanding.toFixed(2),
            method: "cash",
            dueDate: e.package.dueDate ? new Date(e.package.dueDate).toISOString().slice(0, 10) : "",
            saving: false,
            error: null,
          };
        });
        setFlexPayForms(forms);
      }

      // Build unified upcoming payments list
      const upcoming = [];
      const now = new Date();

      // Flexible — unpaid due amounts
      allEnr
        .filter((e) => e.package?.billingType === "flexible" && e.package?.paymentStatus !== "paid" && e.status === "active")
        .forEach((e) => {
          const outstanding = Math.max(0, (e.package.dueAmount ?? e.package.totalPaid) - (e.package.amountCollected ?? 0));
          const chargeableService = (e.package.services ?? []).find((s) => s.pricePerSession > 0);
          upcoming.push({
            type: "flexible",
            sortDate: e.package.dueDate ? new Date(e.package.dueDate) : new Date(8640000000000000),
            enrollmentId: String(e._id),
            packageName: e.package.packageName,
            amount: outstanding,
            dueDate: e.package.dueDate,
            isOverdue: e.package.dueDate && new Date(e.package.dueDate) < now,
            pricePerSession: chargeableService?.pricePerSession ?? 0,
            sessionsRemaining: chargeableService?.sessionsRemaining ?? 0,
          });
        });

      // Payment plan — pending installments
      if (planResult.success) {
        const plans = planResult.data || [];
        const planForms = {};
        plans.filter((p) => p.status === "active").forEach((plan) => {
          (plan.installments || []).forEach((inst, idx) => {
            if (inst.status !== "pending") return;
            const dueDate = new Date(inst.dueDate);
            upcoming.push({
              type: "plan",
              sortDate: dueDate,
              planId: String(plan._id),
              installmentIdx: idx,
              plan,
              packageName: plan.enrollmentID?.package?.packageName ?? "Package",
              amount: inst.amount,
              dueDate: inst.dueDate,
              installmentNumber: idx + 1,
              totalInstallments: plan.numberOfInstallments,
              isOverdue: dueDate < now,
            });
            planForms[`${plan._id}_${idx}`] = { method: "cash", saving: false, error: null };
          });
        });
        setPlanPayForms(planForms);
      }

      // Pay per session — upcoming scheduled sessions
      calEvents
        .filter((e) => {
          const isUpcoming = new Date(e.startDateTime) >= now;
          const isPps = e.chargeApplied && e.chargeMethod === "package";
          return isUpcoming && isPps;
        })
        .forEach((e) => {
          upcoming.push({
            type: "session",
            sortDate: new Date(e.startDateTime),
            eventId: String(e._id),
            title: e.title,
            serviceName: e.calendarServiceID?.serviceName,
            amount: e.calendarServiceID?.price ?? 0,
            startDateTime: e.startDateTime,
            isOverdue: false,
          });
        });

      upcoming.sort((a, b) => a.sortDate - b.sortDate);
      setUpcomingPayments(upcoming);
      setLoadingPayments(false);
    }
    load();
  }, [activeTab, customerId]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    async function load() {
      setLoadingSmsHistory(true);
      try {
        // First, find the lead by email or phone number
        const leadResult = await api.get(
          `/api/lead/find-by-contact?email=${encodeURIComponent(customer?.email || "")}&phoneNumber=${encodeURIComponent(customer?.phoneNumber || "")}`,
        );
        if (leadResult.success && leadResult.data) {
          setLeadId(leadResult.data._id);
          // Then fetch SMS history using the lead ID
          const smsResult = await api.get(
            `/api/smsHistory?leadID=${leadResult.data._id}&limit=100`,
          );
          if (smsResult.success && Array.isArray(smsResult.data)) {
            const sorted = [...smsResult.data].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );
            setSmsHistory(sorted);
          }
        } else {
          setSmsHistory([]);
        }
      } catch (error) {
        console.error("Failed to load SMS history:", error);
        setSmsHistory([]);
      }
      setLoadingSmsHistory(false);
    }
    load();
  }, [activeTab, customerId, customer]);

  async function handleSendMessage() {
    setMsgError(null);
    setMsgSuccess(null);
    if (!customer) return;
    if (msgMode === "sms") {
      if (!smsText.trim()) {
        setMsgError("Message is required.");
        return;
      }
      if (!customer.phoneNumber) {
        setMsgError("This student has no phone number on file.");
        return;
      }
      setIsSendingMsg(true);
      const result = await api.post("/api/sms/send-one", {
        lead: {
          _id: leadId,
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          name: customer.name,
        },
        message: smsText.trim(),
        scheduleNow: true,
      });
      if (result.success) {
        const optimistic = {
          _id: Date.now(),
          from: "you",
          to: customer.phoneNumber,
          message: smsText.trim(),
          status: "queued",
          createdAt: new Date().toISOString(),
        };
        setSmsHistory((prev) => [...prev, optimistic]);
        setSmsText("");
      } else {
        setMsgError(result.error || "Failed to send SMS.");
      }
    } else {
      if (!emailSubject.trim() || !emailBody.trim()) {
        setMsgError("Subject and body are required.");
        return;
      }
      if (!customer.email) {
        setMsgError("This student has no email on file.");
        return;
      }
      setIsSendingMsg(true);
      const result = await api.post("/api/email/send-one", {
        lead: { _id: leadId, email: customer.email, name: customer.name },
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        scheduleNow: true,
      });
      if (result.success) {
        setMsgSuccess("Email sent.");
        setEmailSubject("");
        setEmailBody("");
      } else setMsgError(result.error || "Failed to send email.");
    }
    setIsSendingMsg(false);
  }

  const now = new Date();
  const privateAppts = appointments.filter(
    (a) => a.type === "private" || a.type === "trial",
  );
  const groupAppts = appointments.filter((a) => a.type === "lesson");
  const visiblePrivate = showPast
    ? privateAppts
    : privateAppts.filter((a) => new Date(a.startDateTime) >= now);
  const visibleAppts = showGroups
    ? [...visiblePrivate, ...groupAppts]
    : visiblePrivate;

  const sortedNotes = [...(customer?.notes || [])].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const tabs = (
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
  );

  const body = (
    <div className="flex-1 overflow-y-auto p-4">
        {loadingCustomer ? (
          <p className="text-center pt-10 text-[12px] text-muted-foreground animate-pulse">
            Loading…
          </p>
        ) : !customer ? (
          <p className="text-center pt-10 text-[12px] text-destructive">
            Failed to load student.
          </p>
        ) : (
          <>
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
                  <p className="text-[12px] text-muted-foreground animate-pulse">
                    Loading…
                  </p>
                ) : !visibleAppts.length ? (
                  <p className="text-[12px] text-muted-foreground">
                    No appointments found.
                  </p>
                ) : (
                  visibleAppts
                    .sort(
                      (a, b) =>
                        new Date(b.startDateTime) - new Date(a.startDateTime),
                    )
                    .map((appt) => (
                      <div
                        key={appt._id}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-foreground truncate">
                            {appt.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor(appt.status)}`}
                          >
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(appt.startDateTime).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                          {" · "}
                          {new Date(appt.startDateTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )}
                        </p>
                        {appt.teacherID?.name && (
                          <p className="text-[10px] text-muted-foreground">
                            {appt.teacherID.name}
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── ENROLLMENTS ── */}
            {activeTab === "enrollments" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setShowNewEnrForm((v) => !v); setEnrollError(null); setNewEnrForm(BLANK_NEW_ENR); }}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  <Plus className="h-3 w-3" />
                  New Enrollment
                </button>

                {showNewEnrForm && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                    <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">New Enrollment</p>

                    {/* Teacher */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Teacher</p>
                      <select
                        value={newEnrForm.teacherID}
                        onChange={(e) => setNewEnrField("teacherID", e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Select teacher…</option>
                        {catalogTeachers.map((t) => (
                          <option key={t._id} value={t._id}>{t.name || t.email}</option>
                        ))}
                      </select>
                    </div>

                    {/* Label */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Label <span className="font-normal">(optional)</span></p>
                      <input
                        type="text"
                        value={newEnrForm.label}
                        onChange={(e) => setNewEnrField("label", e.target.value)}
                        placeholder="e.g. Term 1, Trial…"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    {/* Package */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Package <span className="font-normal">(optional)</span></p>
                      <select
                        value={newEnrForm.packageID}
                        onChange={(e) => onNewEnrPkgChange(e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Select package…</option>
                        {catalogPackages.map((p) => (
                          <option key={p._id} value={p._id}>{p.packageName}</option>
                        ))}
                      </select>
                    </div>

                    {/* Services table — shown when package selected or services added */}
                    {(newEnrForm.packageID || newEnrForm.services.length > 0) && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Services</p>
                        <div className="rounded-lg border border-border overflow-hidden">
                          {/* Header */}
                          <div className="grid grid-cols-[1fr_56px_64px_60px_20px] gap-1 bg-muted/40 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Service</span>
                            <span className="text-center">Sess.</span>
                            <span className="text-center">$/Sess</span>
                            <span className="text-right">Total</span>
                            <span />
                          </div>
                          {newEnrForm.services.map((svc, i) => (
                            <div key={i} className="grid grid-cols-[1fr_56px_64px_60px_20px] gap-1 items-center px-2 py-1.5 border-t border-border">
                              <input
                                type="text"
                                value={svc.serviceName}
                                onChange={(e) => updateNewEnrSvc(i, "serviceName", e.target.value)}
                                placeholder="Name"
                                className="h-6 w-full rounded border border-border bg-background px-1.5 text-[10px] text-foreground outline-none focus:border-primary"
                              />
                              <input
                                type="number" min="0" value={svc.numberOfSessions}
                                onChange={(e) => updateNewEnrSvc(i, "numberOfSessions", e.target.value)}
                                className="h-6 w-full text-center rounded border border-border bg-background text-[10px] outline-none focus:border-primary"
                              />
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">$</span>
                                <input
                                  type="number" min="0" step="0.01" value={svc.pricePerSession}
                                  onChange={(e) => updateNewEnrSvc(i, "pricePerSession", e.target.value)}
                                  className="h-6 w-full pl-3.5 pr-1 rounded border border-border bg-background text-[10px] outline-none focus:border-primary"
                                />
                              </div>
                              <p className="text-right text-[10px] font-semibold text-foreground">${Number(svc.finalAmount).toFixed(2)}</p>
                              <button type="button" onClick={() => removeNewEnrSvcRow(i)} className="text-muted-foreground hover:text-destructive text-[12px] leading-none">×</button>
                            </div>
                          ))}
                          {/* Total row */}
                          {newEnrForm.services.length > 0 && (
                            <div className="flex justify-between px-2 py-1 border-t border-border bg-muted/30">
                              <span className="text-[9px] font-semibold text-muted-foreground uppercase">Total</span>
                              <span className="text-[11px] font-bold text-foreground">
                                ${newEnrForm.services.reduce((s, x) => s + (Number(x.finalAmount) || 0), 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={addNewEnrSvcRow}
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add service
                        </button>
                      </div>
                    )}

                    {/* Purchase date */}
                    {newEnrForm.packageID && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Purchase date <span className="font-normal">(optional)</span></p>
                        <input
                          type="date" value={newEnrForm.purchaseDate}
                          onChange={(e) => setNewEnrField("purchaseDate", e.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    {enrollError && <p className="text-[11px] text-destructive">{enrollError}</p>}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowNewEnrForm(false); setEnrollError(null); }}
                        className="flex-1 h-8 rounded-lg border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateEnrollment}
                        disabled={isCreatingEnroll}
                        className="flex-1 h-8 rounded-lg bg-brand text-[11px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
                      >
                        {isCreatingEnroll ? "Creating…" : newEnrForm.packageID ? "Create & Add Package" : "Create Enrollment"}
                      </button>
                    </div>
                  </div>
                )}

                {loadingEnrollments ? (
                  <p className="text-[12px] text-muted-foreground animate-pulse">Loading…</p>
                ) : !enrollments.length ? (
                  <p className="text-[12px] text-muted-foreground">No enrollments yet.</p>
                ) : (
                  enrollments.map((enr) => {
                    const enrStatusCls =
                      enr.status === "active" ? "bg-green-500/10 text-green-500" :
                      enr.status === "completed" ? "bg-blue-500/10 text-blue-400" :
                      "bg-muted text-muted-foreground";
                    const cp = enr.package ?? null; // embedded package (or null)
                    const pkgStatusCls =
                      cp?.status === "active" ? "bg-green-500/10 text-green-500" :
                      cp?.status === "exhausted" ? "bg-orange-500/10 text-orange-500" :
                      cp?.status === "expired" ? "bg-red-500/10 text-red-400" :
                      "bg-muted text-muted-foreground";
                    const isSellOpen = sellTargetEnrollmentId === String(enr._id);

                    return (
                      <div key={enr._id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
                        {/* Enrollment header */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-foreground truncate">
                            {enr.label || `Enrollment #${enr.enrollmentNumber}`}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${enrStatusCls}`}>
                            {enr.status}
                          </span>
                        </div>
                        {enr.teacherID?.name && (
                          <p className="text-[10px] text-muted-foreground">Teacher: {enr.teacherID.name}</p>
                        )}
                        {enr.notes && (
                          <p className="text-[10px] text-muted-foreground italic">{enr.notes}</p>
                        )}

                        {/* Package section */}
                        {cp ? (
                          <div className="rounded-md border border-border bg-background px-3 py-2.5 space-y-2.5">
                            {/* Package header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-foreground truncate">
                                  {cp.packageName || cp.packageRef?.packageName || "Package"}
                                </p>
                                {cp.purchaseDate && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Purchased {new Date(cp.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </p>
                                )}
                              </div>
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${pkgStatusCls}`}>
                                {cp.status}
                              </span>
                            </div>

                            {/* Expiry + payment */}
                            <div className="grid grid-cols-2 gap-2">
                              {cp.expiryDate && (
                                <div className="rounded bg-muted/40 px-2 py-1.5">
                                  <p className="text-[9px] text-muted-foreground mb-0.5">Expires</p>
                                  <p className="text-[10px] font-semibold text-foreground">
                                    {new Date(cp.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </p>
                                </div>
                              )}
                              {cp.totalPaid != null && (
                                <div className="rounded bg-muted/40 px-2 py-1.5">
                                  <p className="text-[9px] text-muted-foreground mb-0.5">Total Paid</p>
                                  <p className="text-[10px] font-semibold text-foreground">
                                    ${Number(cp.totalPaid).toFixed(2)}
                                    {cp.paymentStatus && (
                                      <span className={`ml-1.5 text-[9px] font-bold uppercase ${
                                        cp.paymentStatus === "paid" ? "text-green-500" :
                                        cp.paymentStatus === "partial" ? "text-amber-500" :
                                        "text-red-400"
                                      }`}>{cp.paymentStatus}</span>
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Services */}
                            {cp.services?.length > 0 && (
                              <div className="space-y-2 border-t border-border pt-2">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Services</p>
                                {cp.services.map((svc, i) => {
                                  const pct = svc.sessionsTotal > 0
                                    ? Math.round(((svc.sessionsTotal - svc.sessionsRemaining) / svc.sessionsTotal) * 100)
                                    : 0;
                                  return (
                                    <div key={i} className="space-y-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-semibold text-foreground truncate">{svc.serviceName}</p>
                                          {svc.serviceCode && (
                                            <p className="text-[9px] text-muted-foreground">{svc.serviceCode}</p>
                                          )}
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-[11px] font-bold text-foreground">
                                            {svc.sessionsRemaining}
                                            <span className="text-muted-foreground font-normal">/{svc.sessionsTotal}</span>
                                          </p>
                                          <p className="text-[9px] text-muted-foreground">sessions left</p>
                                        </div>
                                      </div>
                                      {/* Progress bar */}
                                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${svc.sessionsRemaining === 0 ? "bg-red-400" : "bg-primary"}`}
                                          style={{ width: `${100 - pct}%` }}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                        <span>{svc.sessionsUsed} used</span>
                                        <span>
                                          ${Number(svc.pricePerSession).toFixed(2)}/session
                                          {svc.discountType !== "none" && svc.discountAmount > 0 && (
                                            <span className="ml-1 text-emerald-500">
                                              -{svc.discountType === "percentage" ? `${svc.discountAmount}%` : `$${svc.discountAmount}`}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {cp.notes && (
                              <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">{cp.notes}</p>
                            )}
                          </div>
                        ) : enr.status === "active" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSellTargetEnrollmentId(isSellOpen ? null : String(enr._id));
                                setSellForm({ packageID: "", purchaseDate: "", notes: "" });
                                setSellServices([]);
                                setSellError(null);
                              }}
                              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                            >
                              <Plus className="h-3 w-3" /> Add Package
                            </button>

                            {isSellOpen && (
                              <div className="rounded-md border border-border bg-background p-2.5 space-y-2">
                                <select
                                  value={sellForm.packageID}
                                  onChange={(e) => handlePkgSelect(e.target.value)}
                                  className="h-9 w-full appearance-none rounded-lg border border-border bg-muted/20 px-3 text-[11px] text-foreground outline-none focus:border-primary"
                                >
                                  <option value="">Select package…</option>
                                  {catalogPackages.map((p) => (
                                    <option key={p._id} value={p._id}>{p.packageName}</option>
                                  ))}
                                </select>

                                {sellServices.length > 0 && (
                                  <div className="rounded-lg border border-border bg-muted/10 overflow-hidden">
                                    <div className="grid grid-cols-[1fr_auto_auto_auto] text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 px-2 py-1.5">
                                      <span>Service</span>
                                      <span className="w-12 text-center">Sess.</span>
                                      <span className="w-14 text-center">Price</span>
                                      <span className="w-14 text-right">Total</span>
                                    </div>
                                    {sellServices.map((svc, i) => (
                                      <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center px-2 py-1.5 border-t border-border">
                                        <p className="text-[10px] font-medium text-foreground truncate pr-1">{svc.serviceName}</p>
                                        <input
                                          type="number" min="0" value={svc.numberOfSessions}
                                          onChange={(e) => updateSellSvc(i, "numberOfSessions", e.target.value)}
                                          className="w-12 h-6 text-center rounded border border-border bg-muted/20 text-[10px] outline-none focus:border-primary"
                                        />
                                        <div className="relative w-14 ml-1">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">$</span>
                                          <input
                                            type="number" min="0" step="0.01"
                                            value={svc.isChargeable === false ? 0 : svc.pricePerSession}
                                            disabled={svc.isChargeable === false}
                                            onChange={(e) => updateSellSvc(i, "pricePerSession", e.target.value)}
                                            className={`w-full h-6 pl-3.5 pr-1 rounded border text-[10px] outline-none ${svc.isChargeable === false ? "border-border bg-muted/40 text-muted-foreground cursor-not-allowed" : "border-border bg-muted/20 focus:border-primary"}`}
                                          />
                                        </div>
                                        <p className="w-14 text-right text-[10px] font-semibold text-foreground">${Number(svc.finalAmount).toFixed(2)}</p>
                                      </div>
                                    ))}
                                    <div className="flex justify-between px-2 py-1 border-t border-border bg-muted/20">
                                      <span className="text-[9px] font-semibold text-muted-foreground uppercase">Total</span>
                                      <span className="text-[11px] font-bold text-foreground">
                                        ${sellServices.reduce((s, x) => s + (Number(x.finalAmount) || 0), 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <input
                                  type="date" value={sellForm.purchaseDate}
                                  onChange={(e) => setSellForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                                  className="h-8 w-full rounded-lg border border-border bg-muted/20 px-3 text-[11px] text-foreground outline-none focus:border-primary"
                                />
                                {sellError && <p className="text-[10px] text-destructive">{sellError}</p>}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setSellTargetEnrollmentId(null); setSellError(null); }}
                                    className="flex-1 h-7 rounded-lg border border-border bg-background text-[10px] font-semibold text-foreground hover:bg-muted/40"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSellPackage}
                                    disabled={isSelling}
                                    className="flex-1 h-7 rounded-lg bg-brand text-[10px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
                                  >
                                    {isSelling ? "Adding…" : "Confirm"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : null}

                        <p className="text-[10px] text-muted-foreground">
                          {new Date(enr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                    onClick={() => {
                      setMsgMode("sms");
                      setMsgError(null);
                      setMsgSuccess(null);
                    }}
                    className={`flex-1 py-2 transition-colors ${msgMode === "sms" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMsgMode("email");
                      setMsgError(null);
                      setMsgSuccess(null);
                    }}
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
                        <p className="text-[10px] text-muted-foreground text-center pt-4">
                          Loading…
                        </p>
                      ) : smsHistory.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center pt-4">
                          No messages yet.
                        </p>
                      ) : (
                        smsHistory.map((msg) => {
                          const isInbound = msg.status === "received";
                          return (
                            <div
                              key={msg._id}
                              className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                            >
                              <div
                                className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-snug ${isInbound ? "bg-card border border-border text-foreground" : "bg-brand text-brand-foreground"}`}
                              >
                                {msg.message}
                              </div>
                              <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                                {isInbound
                                  ? msg.leadID?.name ||
                                    customer?.name ||
                                    "Customer"
                                  : "You"}{" "}
                                ·{" "}
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  "en-US",
                                  { hour: "numeric", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Composer */}
                    <p className="text-[10px] text-muted-foreground">
                      To:{" "}
                      {customer?.phoneNumber || (
                        <span className="text-destructive">
                          No phone number
                        </span>
                      )}
                    </p>
                    <textarea
                      rows={3}
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      placeholder="Type your message…"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                      {smsText.length} chars
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">
                      To:{" "}
                      {customer?.email || (
                        <span className="text-destructive">No email</span>
                      )}
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

                {msgError && (
                  <p className="text-[11px] text-destructive">{msgError}</p>
                )}
                {msgSuccess && (
                  <p className="text-[11px] text-emerald-500">{msgSuccess}</p>
                )}

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSendingMsg}
                  className="w-full h-9 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSendingMsg
                    ? "Sending…"
                    : `Send ${msgMode === "sms" ? "SMS" : "Email"}`}
                </button>
              </div>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === "payments" && (
              <div className="space-y-3">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] text-muted-foreground mb-0.5 leading-tight">
                      Auto Charged
                    </p>
                    <p className="text-[15px] font-bold text-violet-500">
                      $
                      {allFlexEnrollments.length > 0
                        ? "0.00"
                        : serviceCharges
                            .reduce(
                              (sum, e) =>
                                sum +
                                (e.charges ?? [])
                                  .filter((c) => String(c.customerID) === String(customerId))
                                  .reduce((s, c) => s + (c.amount ?? 0), 0),
                              0,
                            )
                            .toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] text-muted-foreground mb-0.5 leading-tight">
                      Collected
                    </p>
                    <p className="text-[15px] font-bold text-emerald-500">
                      $
                      {(
                        collectedPayments.reduce((sum, e) => sum + (e.payment?.amount ?? 0), 0) +
                        allFlexEnrollments.reduce((sum, e) => sum + (e.package?.amountCollected ?? 0), 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 leading-tight">
                      Credit Balance
                    </p>
                    <p className="text-[15px] font-bold text-emerald-500">
                      {totalSessionsRemaining != null
                        ? Number.isInteger(totalSessionsRemaining)
                          ? totalSessionsRemaining
                          : totalSessionsRemaining.toFixed(2).replace(/\.?0+$/, "")
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Upcoming payments — flexible, payment plan, pay-per-session */}
                {!loadingPayments && upcomingPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Upcoming Payments
                    </p>
                    {upcomingPayments.map((item) => {
                      if (item.type === "flexible") {
                        const f = flexPayForms[item.enrollmentId] ?? { mode: null, payType: "full", sessions: 1, amount: item.amount.toFixed(2), sessionAmount: "", method: "cash", dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "", saving: false, error: null };
                        const updateFlex = (patch) => setFlexPayForms((prev) => ({ ...prev, [item.enrollmentId]: { ...prev[item.enrollmentId], ...patch } }));
                        const reloadAll = async () => {
                          const [enrRes, planRes] = await Promise.all([api.get(`/api/enrollment?customerID=${customerId}`), api.get(`/api/payment-plan/customer/${customerId}`)]);
                          const allEnr2 = enrRes.success ? enrRes.data || [] : [];
                          const allFlex2 = allEnr2.filter((e2) => e2.package?.billingType === "flexible");
                          const due2 = allFlex2.filter((e2) => e2.package?.paymentStatus !== "paid" && e2.status === "active");
                          setAllFlexEnrollments(allFlex2);
                          setFlexEnrollments(due2);
                          setTotalSessionsRemaining(allEnr2.filter((e2) => e2.status === "active" && e2.package?.status === "active").reduce((sum, e2) => { const bt = e2.package?.billingType; if (bt === "flexible" || bt === "payment_plan") { const col = e2.package?.amountCollected ?? 0; const sv = (e2.package?.services ?? []).find((s) => s.pricePerSession > 0); return sum + (sv?.pricePerSession > 0 ? col / sv.pricePerSession : 0); } return sum + (e2.package?.services ?? []).reduce((s2, s) => s2 + (s.sessionsRemaining ?? 0), 0); }, 0));
                          const newForms = {};
                          due2.forEach((e2) => {
                            const os = Math.max(0, (e2.package.dueAmount ?? e2.package.totalPaid) - (e2.package.amountCollected ?? 0));
                            newForms[String(e2._id)] = { mode: null, amount: os.toFixed(2), method: "cash", dueDate: e2.package.dueDate ? new Date(e2.package.dueDate).toISOString().slice(0, 10) : "", saving: false, error: null };
                          });
                          setFlexPayForms(newForms);
                          const now2 = new Date();
                          const upcoming2 = [];
                          due2.forEach((e2) => {
                            const os = Math.max(0, (e2.package.dueAmount ?? e2.package.totalPaid) - (e2.package.amountCollected ?? 0));
                            const cs2 = (e2.package.services ?? []).find((s) => s.pricePerSession > 0);
                            upcoming2.push({ type: "flexible", sortDate: e2.package.dueDate ? new Date(e2.package.dueDate) : new Date(8640000000000000), enrollmentId: String(e2._id), packageName: e2.package.packageName, amount: os, dueDate: e2.package.dueDate, isOverdue: e2.package.dueDate && new Date(e2.package.dueDate) < now2, pricePerSession: cs2?.pricePerSession ?? 0, sessionsRemaining: cs2?.sessionsRemaining ?? 0 });
                          });
                          if (planRes.success) {
                            const plans2 = planRes.data || [];
                            const pf2 = {};
                            plans2.filter((p) => p.status === "active").forEach((plan) => {
                              (plan.installments || []).forEach((inst, idx) => {
                                if (inst.status !== "pending") return;
                                const dd = new Date(inst.dueDate);
                                upcoming2.push({ type: "plan", sortDate: dd, planId: String(plan._id), installmentIdx: idx, plan, packageName: plan.enrollmentID?.package?.packageName ?? "Package", amount: inst.amount, dueDate: inst.dueDate, installmentNumber: idx + 1, totalInstallments: plan.numberOfInstallments, isOverdue: dd < now2 });
                                pf2[`${plan._id}_${idx}`] = { method: "cash", saving: false, error: null, open: false };
                              });
                            });
                            setPlanPayForms(pf2);
                          }
                          upcoming2.sort((a, b) => a.sortDate - b.sortDate);
                          setUpcomingPayments(upcoming2);
                        };
                        return (
                          <div key={`flex-${item.enrollmentId}`} className={`rounded-lg border ${item.isOverdue ? "border-rose-300 bg-rose-50/30 dark:bg-rose-900/10" : "border-amber-200 bg-amber-50/30 dark:bg-amber-900/10"} px-3 py-2.5 space-y-2`}>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[12px] font-semibold text-foreground truncate">{item.packageName}</p>
                                  <span className="text-[9px] bg-violet-500/10 text-violet-600 rounded-full px-1.5 py-0.5 font-medium">Flexible</span>
                                  {item.isOverdue && <span className="text-[9px] font-bold text-rose-600 bg-rose-500/10 rounded-full px-1.5 py-0.5">Overdue</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[11px] font-bold text-rose-600">${item.amount.toFixed(2)} due</span>
                                  {item.dueDate && <span className={`text-[10px] ${item.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>{new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                                </div>
                              </div>
                              {f.mode === null && (
                                <div className="flex flex-col gap-1 shrink-0">
                                  <button type="button" onClick={() => updateFlex({ mode: "pay" })} className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-1">Pay Now</button>
                                  <button type="button" onClick={() => updateFlex({ mode: "change-date" })} className="rounded-md border border-border bg-background hover:bg-muted text-[10px] font-medium px-2 py-1 text-foreground">Change Date</button>
                                </div>
                              )}
                            </div>
                            {f.error && <p className="text-[10px] text-rose-500">{f.error}</p>}
                            {f.mode === "pay" && (() => {
                              const pps = item.pricePerSession ?? 0;
                              const suggestedSessionAmt = pps > 0 ? pps * Math.max(1, Number(f.sessions) || 1) : null;
                              const payAmt = f.payType === "sessions"
                                ? (f.sessionAmount !== "" ? parseFloat(f.sessionAmount) : (suggestedSessionAmt ?? 0))
                                : parseFloat(f.amount);
                              const remainingAfter = item.amount - (isNaN(payAmt) ? 0 : payAmt);
                              return (
                                <form onSubmit={async (e) => { e.preventDefault(); const num = payAmt; if (isNaN(num) || num <= 0) return; updateFlex({ saving: true, error: null }); const sessionCount = f.payType === "sessions" ? Math.max(1, Number(f.sessions) || 1) : 0;
                                  const res = await api.post("/api/payment", { customerID: customerId, enrollmentID: item.enrollmentId, type: "package_purchase", amount: num, method: f.method, ...(sessionCount > 0 && { sessions: sessionCount }) }); if (res.success) { await reloadAll(); } else { updateFlex({ saving: false, error: res.error || "Payment failed." }); } }} className="space-y-2 pt-1.5 border-t border-border/40">
                                  {/* Payment type selector */}
                                  {pps > 0 && (
                                    <div className="flex rounded-md border border-border overflow-hidden">
                                      {[{ v: "full", label: "Full Balance" }, { v: "sessions", label: "By Sessions" }].map(({ v, label }) => (
                                        <button key={v} type="button" onClick={() => updateFlex({ payType: v, sessions: 1, sessionAmount: "" })}
                                          className={`flex-1 h-7 text-[10px] font-medium transition-colors ${f.payType === v ? "bg-brand text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {f.payType === "sessions" && pps > 0 ? (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <label className="block text-[9px] text-muted-foreground mb-0.5">Sessions</label>
                                          <input type="number" min="1" max={item.sessionsRemaining || 999} step="1" value={f.sessions}
                                            onChange={(e) => { const s = e.target.value; updateFlex({ sessions: s, sessionAmount: (pps * Math.max(1, Number(s) || 1)).toFixed(2) }); }}
                                            className="h-7 w-full rounded-md border border-border bg-background px-2 text-[11px] outline-none focus:border-primary" />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-[9px] text-muted-foreground mb-0.5">Amount</label>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                                            <input type="number" min="0.01" step="0.01"
                                              value={f.sessionAmount !== "" ? f.sessionAmount : (suggestedSessionAmt != null ? suggestedSessionAmt.toFixed(2) : "")}
                                              onChange={(e) => updateFlex({ sessionAmount: e.target.value })}
                                              className="h-7 w-full rounded-md border border-border bg-background pl-5 pr-2 text-[11px] font-semibold text-foreground outline-none focus:border-primary" />
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-[9px] text-muted-foreground">${pps.toFixed(2)}/session · {item.sessionsRemaining} remaining</p>
                                      <p className="text-[9px] font-medium text-muted-foreground">Remaining after payment: <span className={remainingAfter < 0 ? "text-rose-500" : "text-emerald-600"}>${Math.max(0, remainingAfter).toFixed(2)}</span></p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div className="flex gap-1.5">
                                        <div className="relative flex-1"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span><input type="number" min="0.01" step="0.01" value={f.amount} onChange={(e) => updateFlex({ amount: e.target.value })} className="h-7 w-full rounded-md border border-border bg-background pl-5 pr-2 text-[11px] outline-none focus:border-primary" /></div>
                                      </div>
                                      <p className="text-[9px] font-medium text-muted-foreground">Remaining after payment: <span className={remainingAfter < 0 ? "text-rose-500" : "text-emerald-600"}>${Math.max(0, remainingAfter).toFixed(2)}</span></p>
                                    </div>
                                  )}
                                  <div className="flex gap-1.5">
                                    <select value={f.method} onChange={(e) => updateFlex({ method: e.target.value })} className="flex-1 h-7 rounded-md border border-border bg-background px-2 text-[11px] outline-none capitalize">{["cash","card","online","cheque","other"].map((m) => <option key={m} value={m}>{m}</option>)}</select>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button type="button" onClick={() => updateFlex({ mode: null })} className="flex-1 h-7 rounded-md border border-border bg-background text-[10px] text-muted-foreground hover:bg-muted">Cancel</button>
                                    <button type="submit" disabled={f.saving} className="flex-1 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold disabled:opacity-50">{f.saving ? "Saving…" : `Confirm $${isNaN(payAmt) ? "0.00" : payAmt.toFixed(2)}`}</button>
                                  </div>
                                </form>
                              );
                            })()}
                            {f.mode === "change-date" && (
                              <form onSubmit={async (e) => { e.preventDefault(); if (!f.dueDate) return; updateFlex({ saving: true, error: null }); const res = await api.patch(`/api/customer-package/${item.enrollmentId}/flexible-due`, { dueDate: f.dueDate }); if (res.success) { await reloadAll(); } else { updateFlex({ saving: false, error: res.error || "Failed to update." }); } }} className="space-y-1.5 pt-1.5 border-t border-border/40">
                                <input type="date" value={f.dueDate} onChange={(e) => updateFlex({ dueDate: e.target.value })} className="h-7 w-full rounded-md border border-border bg-background px-2.5 text-[11px] outline-none focus:border-primary" />
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updateFlex({ mode: null })} className="flex-1 h-7 rounded-md border border-border bg-background text-[10px] text-muted-foreground hover:bg-muted">Cancel</button>
                                  <button type="submit" disabled={f.saving || !f.dueDate} className="flex-1 h-7 rounded-md bg-brand hover:opacity-90 text-white text-[10px] font-semibold disabled:opacity-50">{f.saving ? "Saving…" : "Update"}</button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      }

                      if (item.type === "plan") {
                        const fkey = `${item.planId}_${item.installmentIdx}`;
                        const pf = planPayForms[fkey] ?? { method: "cash", saving: false, error: null, open: false };
                        const updatePlan = (patch) => setPlanPayForms((prev) => ({ ...prev, [fkey]: { ...prev[fkey], ...patch } }));
                        return (
                          <div key={fkey} className={`rounded-lg border ${item.isOverdue ? "border-rose-300 bg-rose-50/30 dark:bg-rose-900/10" : "border-border bg-muted/20"} px-3 py-2.5 space-y-2`}>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[12px] font-semibold text-foreground truncate">{item.packageName}</p>
                                  <span className="text-[9px] bg-blue-500/10 text-blue-600 rounded-full px-1.5 py-0.5 font-medium">Payment {item.installmentNumber}/{item.totalInstallments}</span>
                                  {item.isOverdue && <span className="text-[9px] font-bold text-rose-600 bg-rose-500/10 rounded-full px-1.5 py-0.5">Overdue</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[11px] font-bold text-foreground">${Number(item.amount).toFixed(2)}</span>
                                  <span className={`text-[10px] ${item.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>{new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </div>
                              </div>
                              {!pf.open && <button type="button" onClick={() => updatePlan({ open: true })} className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-1 shrink-0">Pay Now</button>}
                            </div>
                            {pf.error && <p className="text-[10px] text-rose-500">{pf.error}</p>}
                            {pf.open && (
                              <form onSubmit={async (e) => { e.preventDefault(); updatePlan({ saving: true, error: null }); const res = await api.post(`/api/payment-plan/${item.planId}/pay-installment`, { installmentIndex: item.installmentIdx, method: pf.method }); if (res.success) {
                                  const [enrRes2, planRes2] = await Promise.all([api.get(`/api/enrollment?customerID=${customerId}`), api.get(`/api/payment-plan/customer/${customerId}`)]);
                                  const allEnr3 = enrRes2.success ? enrRes2.data || [] : [];
                                  const allFlex3 = allEnr3.filter((e3) => e3.package?.billingType === "flexible");
                                  setAllFlexEnrollments(allFlex3);
                                  setFlexEnrollments(allFlex3.filter((e3) => e3.package?.paymentStatus !== "paid" && e3.status === "active"));
                                  setTotalSessionsRemaining(allEnr3.filter((e3) => e3.status === "active" && e3.package?.status === "active").reduce((sum, e3) => { const bt = e3.package?.billingType; if (bt === "flexible" || bt === "payment_plan") { const col = e3.package?.amountCollected ?? 0; const sv = (e3.package?.services ?? []).find((s) => s.pricePerSession > 0); return sum + (sv?.pricePerSession > 0 ? col / sv.pricePerSession : 0); } return sum + (e3.package?.services ?? []).reduce((s2, s) => s2 + (s.sessionsRemaining ?? 0), 0); }, 0));
                                  const now3 = new Date();
                                  const upcoming3 = [];
                                  allFlex3.filter((e3) => e3.package?.paymentStatus !== "paid" && e3.status === "active").forEach((e3) => {
                                    const os3 = Math.max(0, (e3.package.dueAmount ?? e3.package.totalPaid) - (e3.package.amountCollected ?? 0));
                                    const cs3 = (e3.package.services ?? []).find((s) => s.pricePerSession > 0);
                                    upcoming3.push({ type: "flexible", sortDate: e3.package.dueDate ? new Date(e3.package.dueDate) : new Date(8640000000000000), enrollmentId: String(e3._id), packageName: e3.package.packageName, amount: os3, dueDate: e3.package.dueDate, isOverdue: e3.package.dueDate && new Date(e3.package.dueDate) < now3, pricePerSession: cs3?.pricePerSession ?? 0, sessionsRemaining: cs3?.sessionsRemaining ?? 0 });
                                  });
                                  const pf3 = {};
                                  if (planRes2.success) {
                                    (planRes2.data || []).filter((p3) => p3.status === "active").forEach((plan3) => {
                                      (plan3.installments || []).forEach((inst3, idx3) => {
                                        if (inst3.status !== "pending") return;
                                        const dd3 = new Date(inst3.dueDate);
                                        upcoming3.push({ type: "plan", sortDate: dd3, planId: String(plan3._id), installmentIdx: idx3, plan: plan3, packageName: plan3.enrollmentID?.package?.packageName ?? "Package", amount: inst3.amount, dueDate: inst3.dueDate, installmentNumber: idx3 + 1, totalInstallments: plan3.numberOfInstallments, isOverdue: dd3 < now3 });
                                        pf3[`${plan3._id}_${idx3}`] = { method: "cash", saving: false, error: null, open: false };
                                      });
                                    });
                                  }
                                  setPlanPayForms(pf3);
                                  upcoming3.sort((a, b) => a.sortDate - b.sortDate);
                                  setUpcomingPayments(upcoming3);
                                } else { updatePlan({ saving: false, error: res.error || "Payment failed." }); } }} className="space-y-1.5 pt-1.5 border-t border-border/40">
                                <select value={pf.method} onChange={(e) => updatePlan({ method: e.target.value })} className="h-7 w-full rounded-md border border-border bg-background px-2 text-[11px] outline-none capitalize">{["cash","card","online","cheque","other"].map((m) => <option key={m} value={m}>{m}</option>)}</select>
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => updatePlan({ open: false })} className="flex-1 h-7 rounded-md border border-border bg-background text-[10px] text-muted-foreground hover:bg-muted">Cancel</button>
                                  <button type="submit" disabled={pf.saving} className="flex-1 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold disabled:opacity-50">{pf.saving ? "Saving…" : `Pay $${Number(item.amount).toFixed(2)}`}</button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      }

                      if (item.type === "session") {
                        return (
                          <div key={`session-${item.eventId}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[12px] font-semibold text-foreground truncate">{item.title || item.serviceName || "Session"}</p>
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 rounded-full px-1.5 py-0.5 font-medium">Upcoming</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {item.amount > 0 && <span className="text-[11px] font-bold text-foreground">${Number(item.amount).toFixed(2)}</span>}
                                  <span className="text-[10px] text-muted-foreground">{new Date(item.startDateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {new Date(item.startDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {loadingPayments ? (
                  <p className="text-[12px] text-muted-foreground animate-pulse">
                    Loading…
                  </p>
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
                            package: {
                              text: "Package",
                              cls: "bg-violet-500/10 text-violet-600",
                            },
                            credits: {
                              text: "Credits",
                              cls: "bg-blue-500/10 text-blue-600",
                            },
                            mixed: {
                              text: "Mixed",
                              cls: "bg-orange-500/10 text-orange-600",
                            },
                          };
                          const m = METHOD_LABEL[evt.chargeMethod] ?? {
                            text: "Charged",
                            cls: "bg-muted text-muted-foreground",
                          };
                          return (
                            <div
                              key={evt._id}
                              className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-semibold text-foreground truncate">
                                  {evt.title}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {evt.calendarServiceID?.price > 0 && allFlexEnrollments.length === 0 && (
                                    <span className="text-[12px] font-bold text-violet-500">
                                      $
                                      {Number(
                                        evt.calendarServiceID.price,
                                      ).toFixed(2)}
                                    </span>
                                  )}
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${m.cls}`}
                                  >
                                    {m.text}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(evt.startDateTime).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                                {" · "}
                                {new Date(evt.startDateTime).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </p>
                              {evt.calendarServiceID?.serviceName && (
                                <p className="text-[10px] text-muted-foreground">
                                  {evt.calendarServiceID.serviceName}
                                </p>
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
                          const METHOD_LABELS = {
                            cash: "Cash",
                            card: "Card",
                            online: "Online",
                            cheque: "Cheque",
                            other: "Other",
                          };
                          return (
                            <div
                              key={evt._id}
                              className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-semibold text-foreground truncate">
                                  {evt.title}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[12px] font-bold text-emerald-500">
                                    ${(evt.payment?.amount ?? 0).toFixed(2)}
                                  </span>
                                  {evt.payment?.method && (
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                                      {METHOD_LABELS[evt.payment.method] ??
                                        evt.payment.method}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(evt.startDateTime).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                                {" · "}
                                {new Date(evt.startDateTime).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {serviceCharges.length === 0 &&
                      collectedPayments.length === 0 && (
                        <p className="text-[12px] text-muted-foreground">
                          No payments recorded yet.
                        </p>
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
                  <p className="text-[12px] text-muted-foreground">
                    No notes yet.
                  </p>
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
                      <p className="text-[12px] text-foreground whitespace-pre-wrap">
                        {note.text}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
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
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full">
        {customer && (
          <div className="flex items-center justify-between pb-3 px-1">
            <p className="text-[11px] text-muted-foreground">Student Account</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              ${Number(customer.credits ?? 0).toFixed(2)} credits
            </span>
          </div>
        )}
        {tabs}
        {body}
      </div>
    );
  }

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
            ${Number(customer.credits ?? 0).toFixed(2)} credits
          </span>
        )}
      </div>
      {tabs}
      {body}
    </aside>
  );
}
