/**
 * Pure permission helper functions — no Airtable imports, safe to use client-side.
 */

export function getPermissionsForLocation(user, locationId) {
  if (user?.isGlobalAdmin || user?.isAdmin) {
    return { canView: true, canEdit: true, canAssign: true, canManageTeam: true, role: 'admin' }
  }
  const entry = (user?.locationRoles || []).find(r => r.locationId === locationId)
  if (entry?.role === 'manager') {
    return { canView: true, canEdit: true, canAssign: true, canManageTeam: true, role: 'manager' }
  }
  if (entry?.role === 'staff') {
    return { canView: true, canEdit: false, canAssign: false, canManageTeam: false, role: 'staff' }
  }
  return { canView: false, canEdit: false, canAssign: false, canManageTeam: false, role: null }
}

export function isManagerAt(user, locationId) {
  if (user?.isGlobalAdmin || user?.isAdmin) return true
  return (user?.locationRoles || []).some(r => r.locationId === locationId && r.role === 'manager')
}

/** Returns null for global admins (meaning: all locations), or an array of locationIds */
export function getUserAccessibleLocationIds(user) {
  if (user?.isGlobalAdmin || user?.isAdmin) return null
  return (user?.locationRoles || []).map(r => r.locationId)
}