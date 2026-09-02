/**
 * Validation for the calendar composer's "Repeat" block.
 *
 * Lives here rather than in the panel so it can be unit-tested: every rule
 * below covers a way an incomplete rule used to be accepted and then quietly
 * dropped. A missing end date made the panel post `{ enabled: false }`, so a
 * single event was created while staff believed they had booked a whole
 * series; an empty day/week selection fell through to the backend's plain
 * fixed-interval walk instead of the days that were actually wanted.
 */
export function validateRecurrence(form) {
  if (!form.recurrence_frequency) return "Choose how often this event repeats.";
  if (!form.recurrence_end_date)
    return "Choose the date the repeating event should stop on.";
  if (form.date && form.recurrence_end_date < form.date)
    return "The repeat end date is before the event date. Pick a later end date.";
  if (
    form.recurrence_frequency === "weekly" &&
    (form.recurrence_days_of_week?.length ?? 0) === 0
  )
    return "Pick at least one day of the week to repeat on.";
  if (form.recurrence_frequency === "monthly") {
    if (form.recurrence_monthly_weekday == null)
      return "Pick the weekday this event repeats on each month.";
    if ((form.recurrence_monthly_weeks?.length ?? 0) === 0)
      return "Pick at least one week of the month to repeat on.";
  }
  return null;
}
