import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
)

export const UsersTable = base('Users')
export const IssuesTable = base('Issues')
export const LocationsTable = base('Locations')
export const UserLocationRolesTable = base('UserLocationRoles')

export function formatUser(record) {
  return {
    id: record.id,
    name: record.fields.Name || '',
    username: record.fields.Username || '',
    pin: record.fields.PIN || '',
    isGlobalAdmin: record.fields.IsGlobalAdmin || record.fields.IsAdmin || false,
    isAdmin: record.fields.IsGlobalAdmin || record.fields.IsAdmin || false,
    email: record.fields.Email || '',
    phone: record.fields.Phone || '',
  }
}

export function formatLocation(record) {
  return {
    id: record.id,
    name: record.fields.Name || '',
    slug: record.fields.Slug || '',
    address: record.fields.Address || '',
    active: record.fields.Active !== false,
  }
}

export function formatUserLocationRole(record) {
  return {
    id: record.id,
    userId: record.fields.UserId || '',
    locationId: record.fields.LocationId || '',
    locationName: record.fields.LocationName || '',
    role: record.fields.Role || 'staff',
  }
}

export function formatIssue(record) {
  let notes = []
  let statusLog = []
  try { if (record.fields.Notes) notes = JSON.parse(record.fields.Notes) } catch {}
  try { if (record.fields.StatusLog) statusLog = JSON.parse(record.fields.StatusLog) } catch {}

  // assignedTo stored as JSON array of usernames, with backwards compat for old plain string
  const parseAssignedTo = (raw) => {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [String(parsed)].filter(Boolean)
    } catch {
      return raw ? [raw] : []
    }
  }

  return {
    id: record.id,
    title: record.fields.Title || '',
    description: record.fields.Description || '',
    urgency: record.fields.Urgency || 'medium',
    locationId: record.fields.LocationId || '',
    locationName: record.fields.LocationName || record.fields.Location || '',
    status: record.fields.Status || 'submitted',
    submittedBy: record.fields.SubmittedBy || '',
    submittedByName: record.fields.SubmittedByName || '',
    investigating: record.fields.Investigating || '',
    investigatingName: record.fields.InvestigatingName || '',
    investigatingBy: record.fields.InvestigatingBy || '',
    investigatingAt: record.fields.InvestigatingAt || '',
    manager: record.fields.Manager || '',
    managerName: record.fields.ManagerName || '',
    assignedTo: parseAssignedTo(record.fields.AssignedTo),
    assignedBy: record.fields.AssignedBy || '',
    assignedAt: record.fields.AssignedAt || '',
    assignedEmail: record.fields.AssignedEmail || '',
    realIssue: record.fields.RealIssue || '',
    realIssueBy: record.fields.RealIssueBy || '',
    realIssueAt: record.fields.RealIssueAt || '',
    solution: record.fields.Solution || '',
    solutionBy: record.fields.SolutionBy || '',
    solutionAt: record.fields.SolutionAt || '',
    notes,
    statusLog,
    photos: record.fields.Photos || [],
    reportedVia: record.fields.ReportedVia || '',
    reportedByName: record.fields.ReportedByName || '',
    notificationSent: record.fields.NotificationSent || false,
    createdAt: record._rawJson?.createdTime || record.fields.CreatedAt || new Date().toISOString(),
  }
}