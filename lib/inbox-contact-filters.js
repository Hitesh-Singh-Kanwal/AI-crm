import api from '@/lib/api'
import { linkedCustomerIdForConversation } from '@/lib/inbox-merge-converted'
import { buildLeadQueryParams } from '@/lib/lead-filter-fields'
import { buildCustomerQueryParams } from '@/lib/customer-filter-fields'
import { countAdvancedLeadFilters, sanitizeLeadFilters } from '@/lib/lead-page-filters'
import { countAdvancedCustomerFilters, sanitizeCustomerFilters } from '@/lib/customer-page-filters'

const OBJECT_ID_RE = /^[a-f\d]{24}$/i
const IDS_PER_REQUEST = 500
const BODY_PARAMS = ['conditions', 'conditionGroups', 'conditionLogic', 'groupLogic']

/** Inbox tab label → filterable entity. */
export function inboxFilterEntity(contactFilter) {
  if (contactFilter === 'Leads') return 'lead'
  if (contactFilter === 'Customers') return 'customer'
  return null
}

export function countInboxContactFilters(entity, filters) {
  if (entity === 'lead') return countAdvancedLeadFilters(filters) || 0
  if (entity === 'customer') return countAdvancedCustomerFilters(filters)
  return 0
}

/**
 * Record ids a conversation can match on. Customer threads may be keyed by the
 * customer itself or by the converted lead that links to it.
 */
export function conversationEntityIds(conv, entity) {
  const own = String(conv?.contact?.id || '')
  const ids = OBJECT_ID_RE.test(own) ? [own] : []
  if (entity === 'customer') {
    const linked = String(linkedCustomerIdForConversation(conv) || '')
    if (OBJECT_ID_RE.test(linked) && !ids.includes(linked)) ids.push(linked)
  }
  return ids
}

function buildSearchRequest(entity, filters, ids) {
  const params =
    entity === 'lead'
      ? buildLeadQueryParams({ page: 1, limit: ids.length, filters: sanitizeLeadFilters(filters) })
      : buildCustomerQueryParams({
          page: 1,
          limit: ids.length,
          filters: sanitizeCustomerFilters({ ...filters, search: '', teacherID: '' }),
        })

  const body = { ids }
  for (const key of BODY_PARAMS) {
    const raw = params.get(key)
    if (raw == null) continue
    params.delete(key)
    try {
      body[key] = key.startsWith('condition') && key !== 'conditionLogic' ? JSON.parse(raw) : raw
    } catch {
      body[key] = raw
    }
  }
  params.delete('sortBy')
  params.delete('sortOrder')
  return { path: `/api/${entity}/search?${params.toString()}`, body }
}

/** Ids (from `ids`) whose lead / customer record matches the filters. */
export async function fetchMatchingEntityIds(entity, filters, ids) {
  const unique = [...new Set(ids)]
  const matched = new Set()
  for (let i = 0; i < unique.length; i += IDS_PER_REQUEST) {
    const chunk = unique.slice(i, i + IDS_PER_REQUEST)
    const { path, body } = buildSearchRequest(entity, filters, chunk)
    const result = await api.post(path, body)
    if (!result?.success) throw new Error(result?.error || 'Could not apply filters')
    const rows = Array.isArray(result.data) ? result.data : result.data?.leads || []
    for (const row of rows) if (row?._id) matched.add(String(row._id))
  }
  return matched
}
