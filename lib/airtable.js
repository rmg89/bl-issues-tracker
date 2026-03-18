import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
)

export const UsersTable = base('Users')
export const IssuesTable = base('Issues')

export function formatUser(record) {
  return {
    id: record.id,
    name: record.fields.Name || '',
    username: record.fields.Username || '',
    pin: record.fields.PIN || '',
    isAdmin: record.fields.IsAdmin || false,
    email: record.fields.Email || '',
  }
}

export function formatIssue(record) {
  let notes = []
  let statusLog = []
  try { if (record.fields.Notes) notes = JSON.parse(record.fields.Notes) } catch {}
  try { if (record.fields.StatusLog) statusLog = JSON.parse(record.fields.StatusLog) } catch {}

  return {
    id: record.id,
    title: record.fields.Title || '',
    description: record.fields.Description || '',
    urgency: record.fields.Urgency || 'medium',
    location: record.fields.Location || '',
    status: record.fields.Status || 'submitted',
    submittedBy: record.fields.SubmittedBy || '',
    submittedByName: record.fields.SubmittedByName || '',
    assignedTo: record.fields.AssignedTo || '',
    assignedBy: record.fields.AssignedBy || '',
    assignedAt: record.fields.AssignedAt || '',
    realIssue: record.fields.RealIssue || '',
    realIssueBy: record.fields.RealIssueBy || '',
    realIssueAt: record.fields.RealIssueAt || '',
    solution: record.fields.Solution || '',
    solutionBy: record.fields.SolutionBy || '',
    solutionAt: record.fields.SolutionAt || '',
    notes,
    statusLog,
    photos: record.fields.Photos || [],
    createdAt: record._rawJson?.createdTime || record.fields.CreatedAt || new Date().toISOString(),
  }
}