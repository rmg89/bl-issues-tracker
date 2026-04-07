// pages/api/notifications/new-issue.js
// Fires after a new issue is created.
// Emails global admins + managers at the issue's location (no SMS — awareness only).

import { UsersTable, UserLocationRolesTable, formatUser, formatUserLocationRole } from '../../../lib/airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { issueTitle, issueDescription, locationId, locationName, urgency, submittedByName } = req.body
  if (!issueTitle) return res.status(400).json({ error: 'issueTitle required' })

  const brevoKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.NOTIFY_FROM_EMAIL
  if (!brevoKey || !fromEmail) return res.status(500).json({ error: 'Email not configured' })

  try {
    const [userRecords, roleRecords] = await Promise.all([
      UsersTable.select().all(),
      UserLocationRolesTable.select().all(),
    ])
    const users = userRecords.map(formatUser)
    const roles = roleRecords.map(formatUserLocationRole)

    const recipients = users.filter(u => {
      if (!u.email) return false
      if (u.isGlobalAdmin) return true
      return roles.some(r => r.userId === u.id && r.locationId === locationId && r.role === 'manager')
    })

    if (recipients.length === 0) {
      return res.status(200).json({ success: true, skipped: 'No recipients found' })
    }

    const locationParts = (locationName || '').split(' — ')
    const gymLocation = locationParts[0] || ''
    const area = locationParts[1] || ''
    const locationDisplay = [gymLocation, area].filter(Boolean).join(' — ')
    const urgencyLabel = { high: 'High 🔴', medium: 'Medium 🟡', low: 'Low 🟢' }[urgency] || urgency
    const subject = `[${gymLocation || 'Issues Tracker'}] New issue: ${issueTitle}`

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
        <div style="background: #E85D26; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <span style="color: white; font-weight: 700; font-size: 16px;">BL Issues Tracker</span>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #888;">Submitted by ${submittedByName || 'a staff member'}</p>
          <h2 style="margin: 0 0 12px; font-size: 20px;">${issueTitle}</h2>
          ${issueDescription ? `<p style="margin: 0 0 20px; color: #444; font-size: 14px; line-height: 1.6;">${issueDescription}</p>` : ''}
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            ${locationDisplay ? `<tr><td style="padding: 6px 0; color: #888; width: 120px;">Location</td><td style="font-weight: 500;">${locationDisplay}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; color: #888;">Urgency</td><td style="font-weight: 500;">${urgencyLabel}</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Status</td><td style="font-weight: 500;">Submitted — awaiting review</td></tr>
          </table>
          <p style="margin: 0; font-size: 12px; color: #aaa;">Log in to the Issues Tracker to review and take action.</p>
        </div>
      </div>
    `

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: fromEmail, name: 'BL Issues Tracker' },
        to: recipients.map(r => ({ email: r.email, name: r.name })),
        subject,
        htmlContent: html,
      }),
    })

    if (!brevoRes.ok) {
      const detail = await brevoRes.text()
      console.error('Brevo new-issue error:', detail)
      return res.status(500).json({ error: 'Brevo error', detail })
    }

    return res.status(200).json({ success: true, sent: recipients.length })
  } catch (err) {
    console.error('new-issue notification error:', err)
    return res.status(500).json({ error: err.message })
  }
}