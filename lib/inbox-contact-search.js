import api from '@/lib/api'

export const INBOX_CONTACT_PAGE_SIZE = 20

export function isPaidConvertedInboxContact(lead = {}) {
  const stage = String(lead?.stage || '').toLowerCase()
  // Unpaid funnel stays Leads even if convertedCustomerID was stamped for checkout.
  if (stage && stage !== 'converted') return false
  return Boolean(lead?.convertedCustomerID) || stage === 'converted'
}

function isConvertedLead(lead) {
  return isPaidConvertedInboxContact(lead)
}

export function normalizeInboxContact(raw, type) {
  if (!raw) return null
  return {
    _id: raw._id,
    name: raw.name || '',
    phoneNumber: raw.phoneNumber || '',
    email: raw.email || '',
    stage: raw.stage || '',
    locationID: raw.locationID || [],
    convertedCustomerID: raw.convertedCustomerID || null,
    type: type === 'Teachers' ? 'Teacher' : type === 'Customers' ? 'Customer' : 'Lead',
  }
}

function parseListPayload(result) {
  const data = result?.data
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.leads)
      ? data.leads
      : Array.isArray(data?.customers)
        ? data.customers
        : Array.isArray(data?.teachers)
          ? data.teachers
          : []
  const pagination = result?.pagination ?? data?.pagination ?? null
  const total = Number(pagination?.total ?? data?.total ?? list.length) || list.length
  return { list, total }
}

/**
 * Server-side search across the full location-scoped directory (not just the
 * first page). Pass `page` to paginate; search resets callers to page 1.
 */
export async function fetchInboxContacts({
  contactType = 'Leads',
  search = '',
  page = 1,
  limit = INBOX_CONTACT_PAGE_SIZE,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const q = String(search || '').trim()
  if (q) params.set('search', q)

  let result
  if (contactType === 'Teachers') {
    result = await api.get(`/api/teacher?${params.toString()}`)
  } else if (contactType === 'Customers') {
    result = await api.get(`/api/customer?${params.toString()}`)
  } else {
    // Exclude converted leads so they stay under Customers. Prefer stage filter
    // when not searching by free-text; always drop converted client-side too.
    result = await api.get(`/api/lead?${params.toString()}`)
  }

  if (!result?.success) {
    return {
      contacts: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      error: result?.error || 'Failed to load contacts',
    }
  }

  let { list, total } = parseListPayload(result)

  if (contactType === 'Leads') {
    const before = list.length
    list = list.filter((lead) => !isConvertedLead(lead))
    // If we filtered some out, approximate remaining pages from raw total.
    // Prefer loading another page over under-reporting hasMore.
    if (before > list.length && total <= page * limit) {
      // total was only for this page's unfiltered count — keep hasMore optimistic
      // when the API returned a full page before filtering.
      total = Math.max(total, page * limit + (before === limit ? 1 : 0))
    }
  }

  const contacts = list
    .map((row) => normalizeInboxContact(row, contactType))
    .filter(Boolean)

  const hasMore = page * limit < total

  return {
    contacts,
    total,
    page,
    limit,
    hasMore,
    error: null,
  }
}
