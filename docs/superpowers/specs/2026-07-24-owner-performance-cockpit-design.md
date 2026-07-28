# Owner Performance Cockpit Design

Date: 2026-07-24  
Status: Approved design — pending specification review

## Purpose

Replace the Reports overview's generic, customizable widget board with a fixed,
owner-facing performance cockpit. It answers what changed, why it changed, and where
the owner should investigate next while preserving the existing detailed report tabs.

The dashboard is studio-wide by default and continues to honor the active branch
context. It supports 7D, 30D, 90D, 12M, and custom date ranges, with comparisons to
the immediately preceding period of equal length.

## Layout

1. **Context bar** — date-range presets, active studio/branch context, comparison
   label, and CSV export for the currently displayed data.
2. **KPI row** — New Sales, Cash Collected, New Leads, Conversion Rate, and Active
   Students. Every card shows the current value and its change from the prior period.
3. **Financial story** — a primary time-series chart showing Sales, Cash Collected,
   and Refunds by time bucket. This intentionally distinguishes sales created from
   money received.
4. **Acquisition story** — a lead-stage funnel next to a lead-source table/chart
   with lead count, converted count, and conversion rate per source.
5. **Operations story** — lesson health (completed, scheduled, cancelled, no-show)
   next to weekly communication activity (calls, SMS, email).
6. **Attention queue** — a paginated compact table of overdue payment plans,
   inactive students, failed payments, and early-stage leads with no recent activity.
   Each entry links to its corresponding CRM record or report drill-down.

The visual design is an operational dashboard, not a draggable wall: high-value
metrics are always in the same place, cards are compact and comparable, and charts
use the existing studio gradient only as an accent rather than as the primary means
of encoding data.

## Data and calculations

Existing data sources:

- `Payment`: new purchase types, completed collection methods, refunds, status and
  timestamps.
- `Lead`: stage, creation date, converted customer, source (`uploadType`), and
  engagement timestamps.
- `Customer`: organisation and studio/branch context.
- `CalendarEvent`: lesson/trial type, status, scheduled/completed dates, teacher,
  customer, and branch context.
- SMS, email, human-call, and AI-call histories: communication activity.
- `PaymentPlan`: status, next due date, installments, and customer.

Definitions:

- **New Sales:** sum of `package_purchase`, `membership_purchase`,
  `membership_renewal`, and `session_payment` amounts created during the period.
- **Cash Collected:** completed non-wallet payments received during the period, less
  refund amounts. Failed and future scheduled payments are excluded.
- **Conversion Rate:** leads created in the period that have a
  `convertedCustomerID`, divided by leads created in the period.
- **Active Student:** a customer with a completed private/lesson event in the
  configurable window (default 30 days) or a future private/lesson event.
- **Inactive Student:** a customer with prior completed lessons, but none in the
  active window and no future private/lesson event.
- **Lesson health:** only `completed` contributes to completed lessons;
  `cancelled_*` and `no_show_*` are displayed separately.

Teacher revenue allocation, program progression, and reason-for-dancing metrics are
not shown on this overview because the current schema does not provide a reliable,
shared calculation for them.

## API changes

`GET /api/reports/overview` remains the single overview endpoint and gains:

```json
{
  "salesAndCashTrend": [{ "label": "Jul 1", "sales": 0, "cashCollected": 0, "refunds": 0 }],
  "leadSourcePerformance": [{ "source": "Website Form", "leads": 0, "converted": 0, "conversionRate": 0 }],
  "lessonHealth": { "completed": 0, "scheduled": 0, "cancelled": 0, "noShow": 0 },
  "studentHealth": { "active": 0, "inactive": 0, "atRisk": 0 },
  "attentionItems": [{ "id": "", "type": "", "title": "", "detail": "", "severity": "", "href": "" }]
}
```

`GET /api/reports/overview/details` will return filtered, paginated rows for a
selected KPI, chart series, or attention category. Both endpoints apply the existing
authenticated organisation scope and `x-location-id` branch context.

## Frontend changes

- `app/reports/page.js` becomes the fixed overview composition and retains the
  report-picker navigation.
- New focused report components own a single visual concern: KPI row, financial
  trend, acquisition panel, operations panel, and attention queue.
- Existing date-range and SWR query behavior is reused; prior data remains visible
  while a new range is loading.
- Empty states distinguish no matching records from a request failure. Error states
  preserve previous data and offer a retry action.
- The existing detailed reports remain accessible through their tabs and are not
  redesigned in this phase.

## Testing

- Backend controller tests cover date/branch scoping and every calculation above,
  including refunds, failed-payment exclusion, active/inactive classification, and
  lesson status totals.
- Frontend tests cover populated, empty, loading, and error states for each new
  overview section.
- A request-contract test verifies that frontend consumers receive zero-safe arrays
  and objects for every new overview field.

## Out of scope

- Saved views, PDF export, and configurable dashboard layouts.
- Teacher-specific dashboards and permissions changes.
- New entities or data-entry flows for program progression, attendance, reason for
  dancing, or revenue allocation.
