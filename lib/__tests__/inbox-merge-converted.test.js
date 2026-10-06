import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collapseConvertedInboxDuplicates,
  linkedCustomerIdForConversation,
} from '../inbox-merge-converted.js'

function row({
  id,
  type = 'Lead',
  stage = '',
  convertedCustomerID = null,
  leadSourceID = null,
  timestamp = '2026-09-01T12:00:00.000Z',
  lastMessage = 'hi',
  email = 'a@example.com',
} = {}) {
  return {
    id: `lead-${id}`,
    contact: {
      id,
      name: 'Juana',
      type,
      stage,
      email,
      phoneNumber: '5551234567',
      convertedCustomerID,
      leadSourceID,
    },
    lastMessage,
    timestamp,
    unread: 0,
    channel: type === 'Customer' ? 'Email' : 'SMS',
  }
}

test('converted lead + customer pair collapses to one lead row', () => {
  const leadId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const customerId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const list = collapseConvertedInboxDuplicates([
    row({
      id: leadId,
      type: 'Customer',
      stage: 'converted',
      convertedCustomerID: customerId,
      timestamp: '2026-09-01T10:00:00.000Z',
      lastMessage: 'payment link',
    }),
    row({
      id: customerId,
      type: 'Customer',
      stage: 'converted',
      leadSourceID: leadId,
      convertedCustomerID: customerId,
      timestamp: '2026-09-02T10:00:00.000Z',
      lastMessage: 'class reminder',
    }),
  ])

  assert.equal(list.length, 1)
  assert.equal(list[0].contact.id, leadId)
  assert.equal(list[0].contact.linkedCustomerID, customerId)
  assert.equal(list[0].lastMessage, 'class reminder')
  assert.equal(list[0].timestamp, '2026-09-02T10:00:00.000Z')
  assert.equal(linkedCustomerIdForConversation(list[0]), customerId)
})

test('unrelated contacts that share an email stay as two rows', () => {
  const list = collapseConvertedInboxDuplicates([
    row({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', email: 'same@example.com' }),
    row({
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      type: 'Customer',
      stage: 'converted',
      convertedCustomerID: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      email: 'same@example.com',
    }),
  ])
  assert.equal(list.length, 2)
})

test('customer-only thread with no lead row stays visible', () => {
  const customerId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const list = collapseConvertedInboxDuplicates([
    row({
      id: customerId,
      type: 'Customer',
      stage: 'converted',
      leadSourceID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      convertedCustomerID: customerId,
      lastMessage: 'reminder only',
    }),
  ])
  assert.equal(list.length, 1)
  assert.equal(list[0].contact.id, customerId)
})

test('pending_payment provisional customer is not collapsed into the lead', () => {
  const leadId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const provisionalId = 'cccccccccccccccccccccccc'
  const list = collapseConvertedInboxDuplicates([
    row({
      id: leadId,
      type: 'Lead',
      stage: 'pending_payment',
      convertedCustomerID: provisionalId,
    }),
    row({
      id: provisionalId,
      type: 'Lead',
      stage: 'pending_payment',
      // even if a leadSourceID leaked through, unpaid must not collapse
      leadSourceID: leadId,
    }),
  ])
  assert.equal(list.length, 2)
})

test('collapse via leadSourceID when lead is already converted (even if convertedCustomerID missing on row)', () => {
  const leadId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const customerId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const list = collapseConvertedInboxDuplicates([
    row({ id: leadId, type: 'Customer', stage: 'converted' }),
    row({
      id: customerId,
      type: 'Customer',
      stage: 'converted',
      leadSourceID: leadId,
      convertedCustomerID: customerId,
    }),
  ])
  assert.equal(list.length, 1)
  assert.equal(list[0].contact.id, leadId)
  assert.equal(list[0].contact.linkedCustomerID, customerId)
  // Must not invent a convertedCustomerID that the lead row did not already have.
  assert.equal(list[0].contact.convertedCustomerID, null)
})

test('engaged lead is not collapsed with a customer just because leadSourceID matches', () => {
  const leadId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const customerId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const list = collapseConvertedInboxDuplicates([
    row({ id: leadId, type: 'Lead', stage: 'engaged' }),
    row({
      id: customerId,
      type: 'Customer',
      stage: 'converted',
      leadSourceID: leadId,
      convertedCustomerID: customerId,
    }),
  ])
  assert.equal(list.length, 2)
})
