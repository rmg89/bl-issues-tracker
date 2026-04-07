// pages/api/cron/weekly-digest.js
// Weekly snapshot emails for admins and location managers.
//
// How to trigger:
//   - Manually: POST /api/cron/weekly-digest with header Authorization: Bearer <CRON_SECRET>
//   - Automated (free): set up cron-job.org to hit your deployed URL on a Monday morning schedule
//
// Required env vars: BREVO_API_KEY, NOTIFY_FROM_EMAIL, CRON_SECRET

import { UsersTable, IssuesTable, LocationsTable, UserLocationRolesTable, formatUser, formatIssue, formatLocation, formatUserLocationRole } from '../../../lib/airtable'

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const brevoKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.NOTIFY_FROM_EMAIL
  if (!brevoKey || !fromEmail) return res.status(500).json({ error: 'Email not configured' })

  try {
    const [userRecords, issueRecords, locationRecords, roleRecords] = await Promise.all([
      UsersTable.select().all(),
      IssuesTable.select({ filterByFormula: `{Status} != 'archived'` }).all(),
      LocationsTable.select().all(),
      UserLocationRolesTable.select().all(),
    ])

    const users = userRecords.map(formatUser)
    const issues = issueRecords.map(formatIssue)
    const locations = locationRecords.map(formatLocation)
    const roles = roleRecords.map(formatUserLocationRole)

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const newThisWeek = issues.filter(i => new Date(i.createdAt) > weekAgo)
    const solvedThisWeek = issues.filter(i => {
      const log = (i.statusLog || []).find(l => l.status === 'solved')
      return log && new Date(log.ts) > weekAgo
    })

    function statsForLocation(locationId) {
      const loc = issues.filter(i => !locationId || i.locationId === locationId)
      return {
        total: loc.length,
        submitted: loc.filter(i => i.status === 'submitted').length,
        identified: loc.filter(i => i.status === 'identified').length,
        assigned: loc.filter(i => i.status === 'assigned').length,
        solved: loc.filter(i => i.status === 'solved').length,
        newThisWeek: (locationId ? newThisWeek.filter(i => i.locationId === locationId) : newThisWeek).length,
        solvedThisWeek: (locationId ? solvedThisWeek.filter(i => i.locationId === locationId) : solvedThisWeek).length,
        highUrgency: loc.filter(i => i.urgency === 'high').length,
      }
    }

    async function aiNarrate(locationName, stats) {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 120,
            system: 'You write 2-sentence weekly status notes for gym facility managers. Plain English, no bullet points, no preamble.',
            messages: [{
              role: 'user',
              content: `Write a brief weekly status note for ${locationName || 'all locations'}. Stats: ${stats.total} open issues (${stats.submitted} submitted, ${stats.identified} identified, ${stats.assigned} assigned, ${stats.solved} solved). ${stats.newThisWeek} new this week, ${stats.solvedThisWeek} resolved this week. ${stats.highUrgency} high urgency open.`,
            }],
          }),
        })
        const data = await claudeRes.json()
        return data?.content?.find(b => b.type === 'text')?.text?.trim() || ''
      } catch { return '' }
    }

    function row(label, count, highlight) {
      if (count === 0) return ''
      return `<tr>
        <td style="padding: 5px 0; color: #888; font-size: 13px; width: 140px;">${label}</td>
        <td style="font-weight: ${highlight ? '700' : '500'}; font-size: 13px; color: ${highlight ? '#C62828' : '#222'};">${count}</td>
      </tr>`
    }

    async function buildLocationBlock(locationName, locationId) {
      const stats = statsForLocation(locationId)
      if (stats.total === 0 && stats.newThisWeek === 0) return ''
      const narrative = await aiNarrate(locationName, stats)
      return `
        <div style="margin-bottom: 28px;">
          <div style="font-size: 15px; font-weight: 700; color: #E85D26; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f0e8e4;">
            📍 ${locationName}
          </div>
          ${narrative ? `<p style="margin: 0 0 12px; color: #444; font-size: 14px; line-height: 1.6;">${narrative}</p>` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            ${row('Open issues', stats.total)}
            ${row('High urgency', stats.highUrgency, stats.highUrgency > 0)}
            ${row('Submitted', stats.submitted)}
            ${row('In progress', stats.identified + stats.assigned)}
            ${row('Solved', stats.solved)}
            ${row('New this week', stats.newThisWeek)}
            ${row('Resolved this week', stats.solvedThisWeek)}
          </table>
        </div>
      `
    }

    function wrap(inner, weekLabel) {
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
          <div style="background: #E85D26; padding: 16px 24px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
            <span style="color: white; font-weight: 700; font-size: 16px;">BL Issues Tracker</span>
            <span style="color: rgba(255,255,255,0.8); font-size: 12px;">Weekly Snapshot · ${weekLabel}</span>
          </div>
          <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            ${inner}
            <p style="margin: 24px 0 0; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0; padding-top: 12px;">
              Log in to the Issues Tracker to review and take action.
            </p>
          </div>
        </div>
      `
    }

    const weekLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const results = []

    async function sendEmail(to, subject, html) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: fromEmail, name: 'BL Issues Tracker' },
          to,
          subject,
          htmlContent: html,
        }),
      })
      if (!r.ok) console.error('Brevo digest error:', await r.text())
      return r.ok
    }

    // ── Global admins: all locations + rollup ───────────────────────────
    const globalAdmins = users.filter(u => u.isGlobalAdmin && u.email)
    if (globalAdmins.length > 0) {
      const allStats = statsForLocation(null)
      let inner = `<p style="margin: 0 0 20px; font-size: 13px; color: #888;">All locations · Week ending ${weekLabel}</p>`

      // Rollup block (only if multiple locations)
      if (locations.length > 1) {
        inner += `
          <div style="margin-bottom: 28px; padding: 14px 16px; background: #fafafa; border-radius: 6px; border: 1px solid #eee;">
            <div style="font-size: 13px; font-weight: 700; color: #555; margin-bottom: 8px;">All Locations Combined</div>
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Total open', allStats.total)}
              ${row('High urgency', allStats.highUrgency, allStats.highUrgency > 0)}
              ${row('New this week', allStats.newThisWeek)}
              ${row('Resolved this week', allStats.solvedThisWeek)}
            </table>
          </div>
        `
      }

      for (const loc of locations) {
        inner += await buildLocationBlock(loc.name, loc.id)
      }

      const ok = await sendEmail(
        globalAdmins.map(u => ({ email: u.email, name: u.name })),
        `Weekly Snapshot — All Locations · ${weekLabel}`,
        wrap(inner, weekLabel)
      )
      if (ok) results.push(`Global admins (${globalAdmins.length}): sent`)
    }

    // ── Location managers: their location(s) only ───────────────────────
    const locationManagers = users.filter(u => !u.isGlobalAdmin && u.email)
    for (const user of locationManagers) {
      const userRoles = roles.filter(r => r.userId === user.id && r.role === 'manager')
      if (userRoles.length === 0) continue

      let inner = `<p style="margin: 0 0 20px; font-size: 13px; color: #888;">Your location(s) · Week ending ${weekLabel}</p>`
      const locationNames = []
      for (const role of userRoles) {
        const loc = locations.find(l => l.id === role.locationId)
        if (!loc) continue
        locationNames.push(loc.name)
        inner += await buildLocationBlock(loc.name, loc.id)
      }

      if (locationNames.length === 0) continue

      const ok = await sendEmail(
        [{ email: user.email, name: user.name }],
        `Weekly Snapshot — ${locationNames.join(', ')} · ${weekLabel}`,
        wrap(inner, weekLabel)
      )
      if (ok) results.push(`${user.name} (${locationNames.join(', ')}): sent`)
    }

    return res.status(200).json({ success: true, results })
  } catch (err) {
    console.error('Weekly digest error:', err)
    return res.status(500).json({ error: err.message })
  }
}