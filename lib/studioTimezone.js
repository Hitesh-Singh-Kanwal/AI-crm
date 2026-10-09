/**
 * The active studio's IANA timezone, read by the shared date helpers (formatDate,
 * todayDateInput, dateInputToISO, …) so every date reads as the studio's calendar
 * rather than the viewer's — staff in India working a US studio must see the US date.
 *
 * Resolved before any page mounts by StudioTimezoneGate (see useStudioTimezone). Null
 * until then, or when it can't be resolved; the helpers then fall back to the browser's zone.
 */
let studioTimezone = null

export function getStudioTimezone() {
  return studioTimezone
}

export function setStudioTimezone(tz) {
  studioTimezone = tz || null
}
