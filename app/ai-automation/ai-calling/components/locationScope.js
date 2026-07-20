import { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'

/** Prefill LocationSelector from an API entity with allLocations / locationID. */
export function initLocationID(entity) {
  if (entity?.allLocations) return ALL_BRANCHES_VALUE
  if (Array.isArray(entity?.locationID)) {
    return entity.locationID.map((l) => l?._id || l).filter(Boolean)
  }
  if (entity?.locationID?._id || entity?.locationID) {
    return [entity.locationID?._id || entity.locationID]
  }
  return []
}

export function hasLocationSelection(locationID) {
  if (locationID === ALL_BRANCHES_VALUE) return true
  if (Array.isArray(locationID) && locationID.length > 0) return true
  // Single-select mode may pass a bare location id string
  if (typeof locationID === 'string' && locationID && locationID !== ALL_BRANCHES_VALUE) return true
  return false
}

export function toLocationPayload(locationID) {
  const allLocations = locationID === ALL_BRANCHES_VALUE
  if (allLocations) return { allLocations: true, locationID: [] }
  if (Array.isArray(locationID)) return { allLocations: false, locationID }
  if (typeof locationID === 'string' && locationID) {
    return { allLocations: false, locationID: [locationID] }
  }
  return { allLocations: false, locationID: [] }
}

/** Append marketing location fields to multipart FormData. */
export function appendLocationFields(fd, locationID) {
  const payload = toLocationPayload(locationID)
  fd.append('allLocations', payload.allLocations ? 'true' : 'false')
  if (payload.allLocations) {
    fd.append('locationID', 'all')
  } else {
    payload.locationID.forEach((id) => fd.append('locationID', id))
  }
}

/** Short label for list-card badges; null if nothing to show. */
export function locationBadgeLabel(item) {
  if (!item) return null
  if (item.allLocations) return 'All branches'
  const locs = Array.isArray(item.locationID) ? item.locationID : item.locationID ? [item.locationID] : []
  const names = locs.map((l) => (typeof l === 'object' && l?.name ? l.name : null)).filter(Boolean)
  if (!names.length) return null
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

/** Query value for ?locationID= (single studio or "all"). */
export function workingLocationQueryParam(locationID) {
  if (locationID === ALL_BRANCHES_VALUE) return 'all'
  if (Array.isArray(locationID) && locationID.length >= 1) return String(locationID[0])
  if (typeof locationID === 'string' && locationID && locationID !== ALL_BRANCHES_VALUE) {
    return locationID
  }
  return null
}

/** Normalize LocationSelector onChange (single or all) into ALL | string[] for payloads. */
export function normalizeWorkingLocation(id) {
  if (id === ALL_BRANCHES_VALUE || id === 'all') return ALL_BRANCHES_VALUE
  if (Array.isArray(id)) return id.filter(Boolean).map(String)
  if (id) return [String(id)]
  return []
}
