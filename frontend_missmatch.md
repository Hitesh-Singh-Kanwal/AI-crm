# Frontend Filter Catalog vs. Backend Schema — Mismatch Reference

Scope: `frontend/lib/dynamic-list-filter-catalog.js` (`FILTER_GROUPS`) vs. the real Mongoose
models in `backend/src/models/`. All line numbers below are from the files as read on
2026-07-09.

- Frontend catalog: `C:\Users\Sarat\Downloads\CRM\CRM-frontend\lib\dynamic-list-filter-catalog.js`
- Backend models: `leads.model.js`, `smsHistory.model.js`, `emailHistory.model.js`,
  `aiCallDetail.model.js`, `humanCallHistory.model.js`, `campaign.model.js`,
  `campaign_steps.model.js` (all under `C:\Users\Sarat\Downloads\CRM\CRM-backend\src\models\`)
- Backend query builder: `C:\Users\Sarat\Downloads\CRM\CRM-backend\src\helper\leadConditions.helper.js`

## Implementation status (read from `leadConditions.helper.js`)

`leadConditions.helper.js` is the single source of truth that turns a `{ field, operator,
value }` condition into a Mongo query / in-memory predicate. Its `FIELD_TYPES` map (lines
23–58) is the authoritative list of what the backend currently understands, and its own header
comment (lines 10–13) states the scope explicitly:

> "Phase 1 scope: Lead Profile, UTM / Attribution, and Timing field groups. Cross-collection
> activity fields (`sms.*`, `email.*`, `aiCall.*`, `humanCall.*`, `campaign.*`) and the
> Conversion group are not supported yet."

As of this read, `FIELD_TYPES` contains **only** Lead Profile, UTM, and Timing keys — no
`sms.*`, `email.*`, `aiCall.*`, `humanCall.*`, `campaign.*`, `convertedCustomerID`, or
`isConverted` keys exist. `resolveField()` (line 70) returns `null` for any of those, so any
saved dynamic-list condition using them is silently dropped from the Mongo query today (it
does not error — `buildMongoQueryFromConditions` filters out falsy clauses at line 206).

| Group | Status |
|---|---|
| Lead Profile | Implemented (`FIELD_TYPES` lines 24–37) |
| UTM / Attribution | Implemented (`FIELD_TYPES` lines 39–52) |
| Timing | Implemented (`FIELD_TYPES` lines 54–57) |
| SMS Activity | **Not implemented** — no `sms.*` keys in `FIELD_TYPES` |
| Email Activity | **Not implemented** — no `email.*` keys |
| AI Call Activity | **Not implemented** — no `aiCall.*` keys |
| Human Call Activity | **Not implemented** — no `humanCall.*` keys |
| Campaign Activity | **Not implemented** — no `campaign.*` keys |
| Conversion | **Not implemented** — no `convertedCustomerID` / `isConverted` keys |

This document catalogs the mismatches in the six unimplemented groups regardless of
implementation status, so they can be fixed as each group is built out.

## Two (really three) categories of problem

1. **Field name / path mismatch** — the data genuinely exists in MongoDB, but the frontend's
   `value` string doesn't match where it actually lives: it may be nested one or more levels
   deep (e.g. inside a sub-object), live in a different collection under a different field
   name, or live inside an array that must be unwound/aggregated rather than read as a scalar.
   Fixing these is a matter of correcting the path/aggregation, not inventing new data.

2. **Derived/computed field that doesn't exist as stored data** — no field, at any path,
   holds this value directly. It can only be produced by counting, existence-checking, or
   aggregating over documents in another collection (e.g. "has any SMS", "SMS total count").
   These require new aggregation logic in the backend, not just a corrected path.

3. **Impossible/nonexistent enum value** — the field exists and the path may even be correct,
   but the frontend's `staticOptions` list includes values that the real Mongoose schema's
   `enum` (or the values ever actually written by application code) does not — and can not —
   produce. Filtering on one of these values will always return zero results. This is called
   out separately because it's a functional bug (a filter UI element that can never match
   anything), not just a cosmetic path issue.

---

## Confirmed mismatch #1: AI Call success evaluation (nesting)

- Frontend: `dynamic-list-filter-catalog.js` line 383, `value: 'aiCall.successEvaluation'`
  (field defined lines 382–388), implies a flat/top-level field on the AI call record.
- Backend: `aiCallDetail.model.js` lines 39–42:
  ```js
  analysis: {
      summary: String,
      successEvaluation: String,
  },
  ```
  The real path is `analysis.successEvaluation`, nested inside the `analysis` sub-object —
  confirmed by `helpers/aiCallDetailSync.helper.js` lines 19 and 55, which always read/write it
  as `callDetails?.analysis?.successEvaluation`.
- **Additional issue found**: `successEvaluation` has **no enum** in the schema (plain
  `String`), and `aiCallDetailSync.helper.js` writes it straight from Vapi's webhook payload
  (`callDetails?.analysis?.successEvaluation ?? null`) with no validation. The frontend's
  `staticOptions: ['success', 'partial', 'failure']` (line 386) is an unverified guess at
  Vapi's actual values — Vapi's own successEvaluation can be a boolean-like string or a custom
  rubric result depending on the assistant's configured evaluation plan, so this list may not
  match what's ever actually stored. This is both a **path mismatch** and a **possible-enum
  mismatch**.

## Confirmed mismatch #2: Campaign step type/status (array, not scalar)

- Frontend: `dynamic-list-filter-catalog.js` line 443, `value: 'campaign.stepType'` (field
  lines 442–448) and line 450, `value: 'campaign.stepStatus'` (field lines 449–455) — both
  imply one scalar value per campaign document.
- Backend: `campaign.model.js` lines 54–58:
  ```js
  steps: [
      {
          type: [campaignStepSchema],
      },
  ],
  ```
  `steps` is an embedded array; each element is a `campaignStepSchema` (defined in
  `campaign_steps.model.js`) with its own independent `type` (lines 8–12: `enum: ['email',
  'aiCall', 'sms', 'humanCall']`) and `status` (lines 26–30: `enum: ['active', 'inactive',
  'completed', 'skipped', 'failed', 'scheduled']`). There is no single `stepType`/`stepStatus`
  field on the `Campaign` document — any filter must check/aggregate across the array (e.g.
  "does any step have type X", "does any step have status Y").
- **Additional issue found for `stepStatus`**: the frontend's `staticOptions` (line 453:
  `['scheduled', 'completed', 'failed', 'skipped']`) is missing two values that the real
  `campaignStepSchema.status` enum actually allows: `'active'` and `'inactive'`. This is an
  **incomplete enum list**, not just a nesting problem — a filter for a step in `'active'` or
  `'inactive'` status has no UI path to be expressed. (`stepType`'s options match the real enum
  set exactly, just reordered.)

---

## Field name/path mismatches (data exists, path/name differs)

### SMS Activity group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `sms.status` (line 328) | Yes | `SmsHistory.status` (`smsHistory.model.js` line 25) | Per-message field on a different collection (`SmsHistory`, keyed by `leadID`), not a per-lead scalar — needs an existence/lookup query, not a direct field read. `staticOptions` (line 331) exactly matches the real enum (`smsHistory.model.js` line 27: `["queued","sent","failed","delivered","undelivered","received"]`), just reordered. |
| `sms.lastSentAt` (line 338) | Partially | `SmsHistory.sentAt` (line 37) | Real field is `sentAt`, not `lastSentAt`; "last" implies `MAX(sentAt)` aggregated per lead across all their SMS documents — requires a `$group`/`$max`, not a plain field read. |

### Email Activity group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `email.status` (line 354) | Yes | `EmailHistory.status` (`emailHistory.model.js` line 27) | See enum discussion below — field exists but is free-typed, not select-worthy in the way `sms.status` is. |
| `email.lastSentAt` (line 356) | Partially | `EmailHistory.sentAt` (line 38) | Same "last = MAX aggregate" issue as `sms.lastSentAt`. |
| `email.subject` (line 361) | Yes | `EmailHistory.subject` (line 21) | Name matches; still a cross-collection lookup (per-message, not per-lead). |

### AI Call Activity group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `aiCall.status` (line 372) | Yes | `AiCallDetail.status` (`aiCallDetail.model.js` line 19) | Plain `String`, no enum — see enum section below. |
| `aiCall.endedReason` (line 374) | Yes | `AiCallDetail.endedReason` (line 20) | Plain `String`, no enum — see enum section below. |
| `aiCall.hasTranscript` (line 380) | Underlying field exists | `AiCallDetail.transcript` (line 23) | Frontend field itself is a derived boolean (see computed-fields section) but the field it derives from is real. |
| `aiCall.hasRecording` (line 381) | Underlying field exists | `AiCallDetail.recordingUrl` (line 24) | Same as above — derived from a real field. |
| `aiCall.successEvaluation` (line 383) | Yes, nested | `analysis.successEvaluation` (line 41) | Confirmed mismatch #1 above. |
| `aiCall.lastCallAt` (line 390) | Partially | `AiCallDetail.startedAt` / `endedAt` (lines 21–22) | No field literally named `lastCallAt`; would need `MAX(startedAt)` (or `endedAt`) aggregated per lead. |

### Human Call Activity group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `humanCall.status` (line 406) | Yes | `HumanCallHistory.status` (`humanCallHistory.model.js` line 18) | `staticOptions` (line 409: `['queued','initiated','failed']`) **matches the real enum exactly** (line 20: `["queued","initiated","failed"]`) — no naming or enum problem here. Worth flagging as a separate, non-naming observation: the schema itself has no `'completed'`/`'answered'`/`'no-answer'` state — this history table only ever records the Twilio call-initiation attempt, never the human-call outcome. So a lead can never be filtered on "human call was answered/completed" because that data isn't captured anywhere, not because of a naming bug. |
| `humanCall.lastCallAt` (line 413) | Partially | `HumanCallHistory.initiatedAt` (line 33) | No field named `lastCallAt`; would need `MAX(initiatedAt)` aggregated per lead. |

### Campaign Activity group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `campaign.isActive` (line 426) | Partially | `Campaign.status` enum (`campaign.model.js` line 27: `['active','inactive']`) | Frontend models this as a `boolean`; the real field is a two-value string enum, not a boolean — would need `status === 'active'` translation. |
| `campaign.status` (line 429) | Yes | `Campaign.status` (line 27) | `staticOptions` (line 432: `['active','inactive']`) matches the real enum exactly — no problem here. |
| `campaign.lastStartedAt` (line 437) | No | — | No `startedAt`/`lastStartedAt` field exists on `Campaign` at all (only `createdAt`/`updatedAt` via `{ timestamps: true }`, line 60). Closest proxy is `createdAt`, but that is document-creation time, not "started" time — there's no field that captures when a campaign was started as distinct from created. |
| `campaign.stepType` (line 443) | Yes, nested in array | `steps[].type` (`campaign_steps.model.js` lines 8–12) | Confirmed mismatch #2 above. |
| `campaign.stepStatus` (line 450) | Yes, nested in array | `steps[].status` (lines 26–30) | Confirmed mismatch #2 above; also missing `'active'`/`'inactive'` from its options (see enum section). |

### Conversion group

| Frontend field | Exists as real stored field? | Real backend path (if different/nested) | Notes |
|---|---|---|---|
| `convertedCustomerID` (line 465) | Yes | `Lead.convertedCustomerID` (`leads.model.js` lines 138–142) | Name and path match exactly. Modeled in the frontend as `inputType: 'boolean'` with only `exists`/`not_exists` operators (line 467–468) — reasonable as an existence check, but note it is an `ObjectId` ref field, not an actual boolean in the schema. Not currently wired into `leadConditions.helper.js`'s `FIELD_TYPES` (see status table above), so even though the underlying Lead field is real, this filter is inert today. |

---

## Derived/computed fields that don't exist as stored data

None of these correspond to any single field, at any path, in any collection. Each requires
new aggregation logic (count/exists/max over a joined collection) to implement.

| Group | Frontend field(s) | What it would require |
|---|---|---|
| SMS | `sms.hasAny` (325), `sms.totalCount` (326), `sms.hasDelivered` (334), `sms.hasFailed` (335), `sms.hasIncoming` (336), `sms.countInDays` (343) | Existence/count aggregation over `SmsHistory` filtered by `leadID` (+ `status`, for the "has X" variants). `sms.hasIncoming` additionally has no direction/incoming flag in `smsHistory.model.js` at all — there's no `direction` field distinguishing inbound vs. outbound; only a `status: "received"` value implies inbound, so this filter's semantics are not even well-defined from the schema alone. |
| Email | `email.hasAny` (351), `email.totalCount` (352), `email.hasBounced` (353), `email.countInDays` (362) | Same pattern over `EmailHistory` filtered by `leadID`. `email.hasBounced` can be derived from `bounceReason != null` (real field, `emailHistory.model.js` line 41) or `status === 'bounced'`. |
| AI Call | `aiCall.hasAny` (370), `aiCall.totalCount` (371), `aiCall.hasTranscript` (380, derivable from `transcript != null`), `aiCall.hasRecording` (381, derivable from `recordingUrl != null`), `aiCall.countInDays` (395) | Existence/count aggregation over `AiCallDetail` filtered by `leadID`. |
| Human Call | `humanCall.hasAny` (403), `humanCall.totalCount` (404), `humanCall.countInDays` (418) | Existence/count aggregation over `HumanCallHistory` filtered by `leadID`. |
| Campaign | `campaign.totalCount` (427), `campaign.hasCompleted` (435), `campaign.hasFailedStep` (456) | Count of `Campaign` docs per `leadID`; `hasCompleted`/`hasFailedStep` require unwinding the `steps[]` array and checking for any element with `status === 'completed'` / `'failed'` — there is no campaign-level "completed" status (`Campaign.status` enum only has `'active'`/`'inactive'`, line 27), so "has completed" can only mean "has a completed step," not "the campaign itself completed." |
| Conversion | `isConverted` (471) | Not backed by any field on `Lead` at all — presumably intended as `convertedCustomerID != null`, but no such derived field is stored or computed anywhere today. |

---

## Enum/staticOptions problems (field exists, but the option list doesn't match reality)

| Frontend field | Frontend `staticOptions` | Real enum / real observed values | Verdict |
|---|---|---|---|
| `sms.status` (line 331) | `queued, sent, delivered, failed, undelivered, received` | `smsHistory.model.js` line 27: `["queued","sent","failed","delivered","undelivered","received"]` | **Matches** (same set, different order). |
| `email.status` (line 354, `inputType: 'text'`, no `staticOptions`) | none listed | `emailHistory.model.js` line 27–30: `type: String, default: "processed"` — **no enum at all**. `services/email.service.js` (lines 207, 214, 262) writes `"sent"`/`"failed"`; `controllers/emailHistory/emailHistory.controller.js` line 96–98 additionally writes the **raw SendGrid webhook event name** as `status` (e.g. `delivered`, `open`, `click`, `dropped`, `deferred`, `spamreport`, ...), remapping only `"bounce"` → `"bounced"` (line 98). | Frontend correctly avoids `staticOptions` here (uses free `text` input), which is right — but worth flagging that any future UI that turns this into a `select` must account for the fact this is genuinely free-text passthrough from an external provider, not an app-defined enum. |
| `aiCall.status` (line 372, `inputType: 'text'`, no `staticOptions`) | none listed | `aiCallDetail.model.js` line 19: plain `String`, no enum. `helpers/aiCallDetailSync.helper.js` spreads Vapi's raw call fields (`...callFields`, line 46) directly onto the document — value is whatever Vapi's API sends (e.g. `queued`, `ringing`, `in-progress`, `forwarding`, `ended`). | Same as `email.status` — correctly modeled as free text, no mismatch, but no schema-level guarantee of value set. |
| `aiCall.endedReason` (line 374) | `customer-ended-call, voicemail, assistant-error, no-answer` | `aiCallDetail.model.js` line 20: plain `String`, no enum; value comes straight from Vapi's webhook payload (`aiCallDetailSync.helper.js` line 46, spread) | **Unverifiable/incomplete**: Vapi's actual `endedReason` value set is considerably larger than these 4 (e.g. `assistant-ended-call`, `exceeded-max-duration`, `silence-timed-out`, `pipeline-error-*`, etc., per Vapi's API). The 4 listed are plausible values but not an exhaustive or schema-enforced set — filtering on a value outside this list is simply not possible from the UI even though the value could be genuinely present in the data. |
| `aiCall.successEvaluation` (line 386) | `success, partial, failure` | `aiCallDetail.model.js` line 41: plain `String`, no enum; raw passthrough of Vapi's `analysis.successEvaluation` | Same class of problem as `endedReason` — unverified against actual Vapi output, which can vary by assistant's evaluation-rubric configuration. |
| `humanCall.status` (line 409) | `queued, initiated, failed` | `humanCallHistory.model.js` line 20: `["queued","initiated","failed"]` | **Matches exactly.** (Notable because this is the group where a mismatch was suspected — it turned out the frontend and schema agree. The real gap is semantic, not enum: see the "Notes" cell for `humanCall.status` in the path-mismatch table above — there is no status value representing a completed/answered call anywhere in this collection.) |
| `campaign.status` (line 432) | `active, inactive` | `campaign.model.js` line 29: `['active','inactive']` | **Matches exactly.** |
| `campaign.stepStatus` (line 453) | `scheduled, completed, failed, skipped` | `campaign_steps.model.js` line 28: `['active','inactive','completed','skipped','failed','scheduled']` | **Incomplete** — missing `'active'` and `'inactive'` from the real enum. |
| `campaign.stepType` (line 446) | `email, sms, aiCall, humanCall` | `campaign_steps.model.js` line 10: `['email','aiCall','sms','humanCall']` | **Matches** (same set, different order). |

---

## Summary

- Both mismatches specified in the task are confirmed with exact citations:
  `aiCall.successEvaluation` (catalog line 383) → real path `analysis.successEvaluation`
  (`aiCallDetail.model.js` line 41); `campaign.stepType`/`campaign.stepStatus` (catalog lines
  443, 450) → real paths `steps[].type`/`steps[].status` (`campaign_steps.model.js` lines
  10, 28), nested inside `Campaign.steps` (`campaign.model.js` lines 54–58).
- Lead Profile, UTM/Attribution, and Timing groups are backend-implemented today
  (`leadConditions.helper.js` `FIELD_TYPES`, lines 24–57) and were not in scope for mismatches
  (they map directly to real `Lead` schema fields).
- SMS, Email, AI Call, Human Call, Campaign, and Conversion groups are **all unimplemented**
  in `leadConditions.helper.js` as of this read (no `sms.*`/`email.*`/`aiCall.*`/
  `humanCall.*`/`campaign.*`/`convertedCustomerID`/`isConverted` keys in `FIELD_TYPES`), so
  every field discussed above is currently a no-op if used in a saved dynamic list filter.
- Beyond the two confirmed nesting mismatches, the most consequential additional finding is
  that `aiCall.status`, `aiCall.endedReason`, `aiCall.successEvaluation`, and `email.status`
  have **no schema-level enum** at all — their values are raw passthrough from external
  providers (Vapi, SendGrid), so any `staticOptions` list for them is inherently a guess, not
  a verified constraint. `campaign.stepStatus`'s option list is also incomplete (missing
  `active`/`inactive`). By contrast, `sms.status`, `humanCall.status`, `campaign.status`, and
  `campaign.stepType` all have real, matching enums.
