# Filter Changes: Leads & Dynamic List Pages

Comparing `origin/dynamic-filter` → `origin/dynamic-filter-1`.

## 1. New filter catalog

A completely new filter catalog (`lib/dynamic-list-filter-catalog.js`, new file) replaces the old fixed set of fields. It's organized into **9 filterable groups**, each field now has its own allowed operator set:

- **Lead Profile** — stage, upload type, reason, booking status, escalated, assigned AI/human agent, name, email, phone, location, form, and free-form **metadata key filtering**
- **UTM / Attribution** — source, medium, campaign, term, content, keyword, device, browser, OS, network, match type, placement, id
- **Timing** — created/updated at, plus new **day-of-week** and **hour-of-day** filters
- **SMS Activity**, **Email Activity**, **AI Call Activity**, **Human Call Activity**, **Campaign Activity** — new cross-collection filters (e.g. "has delivered SMS", "AI call ended reason", "in active campaign", "has failed step")
- **Conversion** — converted-customer / is-converted

## 2. New/expanded operators

The old model was basically equals-only; now every field can declare from a shared operator vocabulary:

`Equals, Exclude, In, Not in, Contains, Starts with, Exists, Not exists, Is true, Is false, Greater than, Greater or equal, Less than, Less or equal, Between, Within days, Older than days`

## 3. New value-input types to match

Via the new `CatalogConditionValueInput.js` component:

- Multi-select (`in` / `not_in`)
- A `{ from, to }` range for `between`
- Valueless toggles for `exists` / `is_true` etc.
- A key/value pair input specifically for metadata filters

## 4. UI rework

- `LeadAdvancedFilterFields` was replaced by a new **`GroupedLeadFilterFields`** component (410 new lines) in both `LeadsFilterPanel.js` and `DynamicListMembersFilterPanel.js` — rendering fields grouped by the 9 categories above instead of a flat list.
- `FilterLogicToggle` (the AND/OR switch) got a redesign — larger buttons, contextual help text explaining what AND/OR means, and a compact-size variant.
- "Reset" now preserves the search box/operator instead of wiping it too.
- Apply now runs conditions through `getValidConditions` to strip out incomplete filter rows before applying.
