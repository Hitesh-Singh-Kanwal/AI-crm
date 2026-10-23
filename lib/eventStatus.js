// The one rule for the status a lesson shows, used by the calendar and the customer
// Lessons tab so they never disagree.
//
// A stored "completed" only counts once the lesson has ended (staff who finish early
// shorten the end time on the server). A still-"scheduled" lesson past its end reads
// "completed" without writing to the backend. An unallocated lesson is held back from
// completion on the server too (calendarEvent.scheduler.js): showing a past one as
// "completed" would hide the thing staff must act on, a delivered lesson no package paid for.
export function deriveEffectiveStatus(appt) {
  const explicit = appt.status;
  const end = appt.endDateTime ? new Date(appt.endDateTime) : null;
  if (explicit === "completed" && end && end > new Date()) return "scheduled";
  if (explicit && explicit !== "scheduled") return explicit;
  if (appt.allocation?.status === "unallocated") return explicit || "scheduled";
  if (end && end < new Date()) return "completed";
  return explicit || "scheduled";
}
