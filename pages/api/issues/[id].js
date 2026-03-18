import { IssuesTable, formatIssue } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const {
      status, urgency,
      assignedTo, assignedBy, assignedAt, assignedEmail,
      realIssue, realIssueBy, realIssueAt,
      solution, solutionBy, solutionAt,
      notes, statusLog
    } = req.body
    try {
      const fields = {}
      if (status !== undefined) fields.Status = status
      if (urgency !== undefined) fields.Urgency = urgency
      if (assignedTo !== undefined) fields.AssignedTo = assignedTo
      if (assignedBy !== undefined) fields.AssignedBy = assignedBy
      if (assignedAt !== undefined) fields.AssignedAt = assignedAt
      if (assignedEmail !== undefined) fields.AssignedEmail = assignedEmail
      if (realIssue !== undefined) fields.RealIssue = realIssue
      if (realIssueBy !== undefined) fields.RealIssueBy = realIssueBy
      if (realIssueAt !== undefined) fields.RealIssueAt = realIssueAt
      if (solution !== undefined) fields.Solution = solution
      if (solutionBy !== undefined) fields.SolutionBy = solutionBy
      if (solutionAt !== undefined) fields.SolutionAt = solutionAt
      if (notes !== undefined) fields.Notes = JSON.stringify(notes)
      if (statusLog !== undefined) fields.StatusLog = JSON.stringify(statusLog)
      const record = await IssuesTable.update(id, fields)
      return res.status(200).json(formatIssue(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await IssuesTable.destroy(id)
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}