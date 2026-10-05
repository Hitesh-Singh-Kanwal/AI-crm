import { describe, it, expect, beforeEach } from 'vitest'
import { readPersistedListState } from '@/lib/hooks/useListStatePersistence'
import { clearPersistedListState, LIST_STATE_PREFIX } from '@/lib/auth'

const signInAs = (id) =>
  localStorage.setItem('crm_user_session', JSON.stringify({ token: 't', user: { _id: id } }))
const save = (userId, key, value) =>
  sessionStorage.setItem(`${LIST_STATE_PREFIX}${userId}:${key}`, JSON.stringify(value))

describe('persisted list state', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("never shows one account another account's saved filters", () => {
    save('user-A', 'customers-list-state', { teacherFilter: 'teacher-from-org-A' })
    signInAs('user-B')
    expect(readPersistedListState('customers-list-state')).toBeNull()
    signInAs('user-A')
    expect(readPersistedListState('customers-list-state')).toEqual({ teacherFilter: 'teacher-from-org-A' })
  })

  it('ignores legacy unscoped keys written before the fix', () => {
    sessionStorage.setItem('customers-list-state', JSON.stringify({ teacherFilter: 'stale' }))
    signInAs('user-B')
    expect(readPersistedListState('customers-list-state')).toBeNull()
  })

  it('clearPersistedListState wipes every list but leaves unrelated session data', () => {
    save('user-A', 'customers-list-state', { a: 1 })
    save('user-A', 'leads-list-state', { b: 2 })
    sessionStorage.setItem('cadance-embed-preview-code', 'keep-me')
    clearPersistedListState()
    expect(Object.keys(sessionStorage)).toEqual(['cadance-embed-preview-code'])
  })
})
