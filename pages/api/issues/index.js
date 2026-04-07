import { IssuesTable, formatIssue } from '../../../lib/airtable'
import formidable from 'formidable'
import fs from 'fs'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { locationId } = req.query
    try {
      let formula = ''
      if (locationId && locationId !== 'all') {
        formula = `{LocationId} = '${locationId}'`
      }
      const query = formula
        ? IssuesTable.select({ filterByFormula: formula })
        : IssuesTable.select()
      const records = await query.all()
      const issues = records.map(formatIssue)
      issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return res.status(200).json(issues)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const form = formidable({ multiples: true, keepExtensions: true })

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message })

      const get = (f) => Array.isArray(fields[f]) ? fields[f][0] : fields[f]
      const title = get('title')
      const description = get('description')
      const urgency = get('urgency')
      const locationId = get('locationId')
      const locationName = get('locationName')
      const submittedBy = get('submittedBy')
      const submittedByName = get('submittedByName')
      const reportedVia = get('reportedVia')
      const reportedByName = get('reportedByName')

      if (!title) return res.status(400).json({ error: 'Title is required' })

      try {
        const airtableFields = {
          Title: title,
          Status: 'submitted',
          SubmittedBy: submittedBy || '',
          SubmittedByName: submittedByName || '',
          Notes: '[]',
        }
        if (description) airtableFields.Description = description
        if (urgency) airtableFields.Urgency = urgency
        if (locationId) airtableFields.LocationId = locationId
        if (locationName) airtableFields.LocationName = locationName
        if (reportedVia) airtableFields.ReportedVia = reportedVia
        if (reportedByName) airtableFields.ReportedByName = reportedByName

        const record = await IssuesTable.create(airtableFields)
        const recordId = record.id

        const photoFiles = files.photos
          ? (Array.isArray(files.photos) ? files.photos : [files.photos])
          : []

        if (photoFiles.length > 0) {
          for (const photo of photoFiles) {
            const fileBuffer = fs.readFileSync(photo.filepath)
            const base64Content = fileBuffer.toString('base64')

            await fetch(`https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/Photos/uploadAttachment`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contentType: photo.mimetype,
                filename: photo.originalFilename,
                file: base64Content,
              }),
            })
          }
        }

        const updatedRecord = await IssuesTable.find(recordId)
        const issue = formatIssue(updatedRecord)

        // ── Fire new-issue notification (non-blocking) ──────────────────
        // Don't await — we don't want email failure to affect the response
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/new-issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueId: issue.id,
            issueTitle: issue.title,
            issueDescription: issue.description,
            locationId: issue.locationId,
            locationName: issue.locationName,
            urgency: issue.urgency,
            submittedByName: issue.submittedByName || issue.submittedBy,
          }),
        }).catch(e => console.error('New-issue notification fire failed:', e))

        return res.status(200).json(issue)
      } catch (err) {
        console.error('Error:', err)
        return res.status(500).json({ error: err.message })
      }
    })
    return
  }

  return res.status(405).json({ error: 'Method not allowed' })
}