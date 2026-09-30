/**
 * Collapse a converted customer's inbox row into the original lead thread.
 * Message history stays on whichever id it was stored under; this only merges
 * the list so the same person does not appear twice after conversion.
 */

function contactId(conv) {
  if (!conv) return ''
  if (conv.contact?.id != null) return String(conv.contact.id)
  if (conv.leadID != null) return String(conv.leadID)
  const id = String(conv.id || '')
  if (id.startsWith('lead-')) return id.slice(5)
  return id
}

function asId(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

function stageOf(conv) {
  return String(conv?.contact?.stage || conv?.stage || '').toLowerCase()
}

function typeOf(conv) {
  return String(conv?.contact?.type || conv?.type || '').toLowerCase()
}

/** Paid converted lead/customer — not unpaid checkout, not teachers. */
function isPaidConvertedRow(conv) {
  const stage = stageOf(conv)
  if (stage === 'pending_payment') return false
  const type = typeOf(conv)
  if (type.startsWith('teacher')) return false
  return stage === 'converted' || type.startsWith('customer')
}

function convertedCustomerIdOf(conv) {
  return asId(conv?.contact?.convertedCustomerID || conv?.convertedCustomerID)
}

function leadSourceIdOf(conv) {
  return asId(conv?.contact?.leadSourceID || conv?.leadSourceID)
}

function newerTimestamp(a, b) {
  const ta = new Date(a || 0).getTime()
  const tb = new Date(b || 0).getTime()
  return ta >= tb ? a : b
}

/**
 * Prefer the lead-side row (SMS/calls live there). Drop the customer-id twin.
 * Only merges when the lead side is already paid/converted — never collapses
 * provisional checkout (pending_payment) pairs, and never invents conversion
 * fields on an unpaid lead.
 *
 * @param {Array} conversations inbox list rows (`id`, `contact`, `timestamp`, …)
 * @returns {Array}
 */
export function collapseConvertedInboxDuplicates(conversations = []) {
  if (!Array.isArray(conversations) || conversations.length < 2) {
    return Array.isArray(conversations) ? [...conversations] : []
  }

  const byId = new Map()
  for (const conv of conversations) {
    const id = contactId(conv)
    if (id) byId.set(id, conv)
  }

  const dropIds = new Set()

  for (const conv of conversations) {
    const id = contactId(conv)
    if (!id || dropIds.has(id)) continue

    // Lead → customer: only when this row is the paid converted lead.
    if (isPaidConvertedRow(conv)) {
      const customerId = convertedCustomerIdOf(conv)
      if (customerId && customerId !== id && byId.has(customerId)) {
        const customerRow = byId.get(customerId)
        if (stageOf(customerRow) !== 'pending_payment') {
          dropIds.add(customerId)
        }
      }
    }

    // Customer → lead: drop paid customer when its source lead is also present
    // and that lead is already converted (same person, two ids).
    if (isPaidConvertedRow(conv)) {
      const sourceLeadId = leadSourceIdOf(conv)
      if (sourceLeadId && sourceLeadId !== id && byId.has(sourceLeadId)) {
        const leadRow = byId.get(sourceLeadId)
        if (isPaidConvertedRow(leadRow)) {
          dropIds.add(id)
        }
      }
    }
  }

  if (!dropIds.size) return [...conversations]

  const kept = []
  const absorbedByKeepId = new Map()

  for (const conv of conversations) {
    const id = contactId(conv)
    if (!id || !dropIds.has(id)) {
      kept.push(conv)
      continue
    }

    let keepId = null
    for (const other of conversations) {
      const otherId = contactId(other)
      if (!otherId || dropIds.has(otherId)) continue
      if (convertedCustomerIdOf(other) === id || leadSourceIdOf(conv) === otherId) {
        keepId = otherId
        break
      }
    }
    if (keepId) absorbedByKeepId.set(keepId, conv)
  }

  return kept
    .map((conv) => {
      const id = contactId(conv)
      const absorbed = absorbedByKeepId.get(id)
      if (!absorbed) return conv

      // History loader key only — do NOT invent convertedCustomerID on the lead.
      const linkedCustomerId =
        convertedCustomerIdOf(conv) ||
        (isPaidConvertedRow(absorbed) ? contactId(absorbed) : '') ||
        ''

      const nextTimestamp = newerTimestamp(conv.timestamp, absorbed.timestamp)
      const useAbsorbedPreview =
        new Date(absorbed.timestamp || 0).getTime() >
        new Date(conv.timestamp || 0).getTime()

      const existingConverted = convertedCustomerIdOf(conv)

      return {
        ...conv,
        timestamp: nextTimestamp || conv.timestamp,
        lastMessage: useAbsorbedPreview
          ? absorbed.lastMessage || conv.lastMessage
          : conv.lastMessage,
        contact: {
          ...conv.contact,
          // Keep whatever the lead already had; never stamp a new conversion.
          convertedCustomerID: existingConverted || conv.contact?.convertedCustomerID || null,
          linkedCustomerID: linkedCustomerId || null,
        },
      }
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
}

/** Customer id linked to a kept lead conversation (for loading their history). */
export function linkedCustomerIdForConversation(conv) {
  if (!conv) return null
  const self = contactId(conv)
  const linked = asId(conv.contact?.linkedCustomerID)
  if (linked && linked !== self) return linked
  const converted = asId(conv.contact?.convertedCustomerID || conv.convertedCustomerID)
  // Customer rows set convertedCustomerID to themselves — that is not a link.
  if (converted && converted !== self) return converted
  return null
}
