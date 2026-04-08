// pages/api/cron/weekly-digest.js
// Weekly digest: reads last 4 snapshots (quant + qual) for trend context,
// sends formatted 3-section emails, then writes this week's full snapshot.
//
// Trigger manually: POST with header Authorization: Bearer <CRON_SECRET>
// Automate free: cron-job.org → hit this URL every Monday 8am

import {
  UsersTable, IssuesTable, LocationsTable,
  UserLocationRolesTable, WeeklySnapshotsTable,
  formatUser, formatIssue, formatLocation,
  formatUserLocationRole, formatWeeklySnapshot,
} from '../../../lib/airtable'

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const brevoKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.NOTIFY_FROM_EMAIL
  if (!brevoKey || !fromEmail) return res.status(500).json({ error: 'Email not configured' })

  try {
    // ── Fetch all data ────────────────────────────────────────────────────
    const [userRecords, issueRecords, locationRecords, roleRecords, snapshotRecords] = await Promise.all([
      UsersTable.select().all(),
      IssuesTable.select({ filterByFormula: `{Status} != 'archived'` }).all(),
      LocationsTable.select().all(),
      UserLocationRolesTable.select().all(),
      WeeklySnapshotsTable.select({
        sort: [{ field: 'WeekOf', direction: 'desc' }],
        maxRecords: 40,
      }).all(),
    ])

    const users = userRecords.map(formatUser)
    const issues = issueRecords.map(formatIssue)
    const locations = locationRecords.map(formatLocation)
    const roles = roleRecords.map(formatUserLocationRole)
    const allSnapshots = snapshotRecords.map(formatWeeklySnapshot)

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const newThisWeek = issues.filter(i => new Date(i.createdAt) > weekAgo)
    const resolvedThisWeek = issues.filter(i => {
      const log = (i.statusLog || []).find(l => l.status === 'solved')
      return log && new Date(log.ts) > weekAgo
    })

    // ── Current stats ─────────────────────────────────────────────────────
    function currentStats(locationId) {
      const loc = issues.filter(i => !locationId || i.locationId === locationId)
      return {
        total: loc.length,
        submitted: loc.filter(i => i.status === 'submitted').length,
        identified: loc.filter(i => i.status === 'identified').length,
        assigned: loc.filter(i => i.status === 'assigned').length,
        solved: loc.filter(i => i.status === 'solved').length,
        newThisWeek: (locationId ? newThisWeek.filter(i => i.locationId === locationId) : newThisWeek).length,
        resolvedThisWeek: (locationId ? resolvedThisWeek.filter(i => i.locationId === locationId) : resolvedThisWeek).length,
        highUrgency: loc.filter(i => i.urgency === 'high').length,
      }
    }

    // ── Past snapshots for a location (last 4) ────────────────────────────
    function getPastSnapshots(locationId) {
      return allSnapshots
        .filter(s => s.locationId === (locationId || 'all'))
        .slice(0, 4)
    }

    // ── Claude helper ─────────────────────────────────────────────────────
    async function callClaude(system, userPrompt, maxTokens = 200) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        })
        const data = await r.json()
        return data?.content?.find(b => b.type === 'text')?.text?.trim() || ''
      } catch (e) {
        console.error('Claude call failed:', e)
        return ''
      }
    }

    // ── Section 1: New issues ─────────────────────────────────────────────
    async function buildNewSection(locationId) {
      const newIssues = locationId
        ? newThisWeek.filter(i => i.locationId === locationId)
        : newThisWeek

      if (newIssues.length === 0) {
        return {
          html: `
            <div style="margin-bottom: 28px;">
              <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">🆕 New This Week</div>
              <p style="margin: 0; color: #888; font-size: 13px; font-style: italic;">Nothing new this week — all quiet. 🟢</p>
            </div>
          `,
          text: 'Nothing new this week.',
        }
      }

      const issueRows = await Promise.all(newIssues.map(async issue => {
        const daysSince = Math.floor((now - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24))
        const statusLabel = {
          submitted: 'Submitted · not yet identified',
          identified: 'Identified · not yet assigned',
          assigned: `Assigned to ${issue.managerName || 'manager'}`,
          solved: 'Solved',
        }[issue.status] || issue.status
        const urgencyDot = { high: '🔴', medium: '🟡', low: '🟢' }[issue.urgency] || ''

        const description = await callClaude(
          `Write one sentence describing a gym facility issue for a manager's weekly digest.
Focus on what the problem actually is, not just restating the title.
Be plain and specific. No preamble.`,
          `Title: ${issue.title}\nDescription: ${issue.description || ''}\nRoot cause: ${issue.realIssue || ''}`,
          80
        )

        return `
          <div style="margin-bottom: 14px; padding: 12px 14px; background: #fafafa; border-radius: 6px; border-left: 3px solid #E85D26;">
            <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 4px;">${urgencyDot} ${issue.title}</div>
            ${description ? `<div style="font-size: 13px; color: #555; margin-bottom: 6px; line-height: 1.5;">${description}</div>` : ''}
            <div style="font-size: 11px; color: #999;">${statusLabel} · open ${daysSince === 0 ? 'today' : `${daysSince}d`}${issue.locationName && !locationId ? ` · ${issue.locationName}` : ''}</div>
          </div>
        `
      }))

      return {
        html: `
          <div style="margin-bottom: 28px;">
            <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">🆕 New This Week (${newIssues.length})</div>
            ${issueRows.join('')}
          </div>
        `,
        text: `${newIssues.length} new issue(s): ${newIssues.map(i => i.title).join(', ')}`,
      }
    }

    // ── Section 2: Needs attention ────────────────────────────────────────
    async function buildAttentionSection(locationId) {
      const relevant = issues.filter(i => {
        if (locationId && i.locationId !== locationId) return false
        if (i.status === 'solved') return false
        return true
      })

      if (relevant.length === 0) {
        return { html: '', text: 'No open issues to flag.' }
      }

      const issueData = relevant.map(i => {
        const daysSince = Math.floor((now - new Date(i.createdAt)) / (1000 * 60 * 60 * 24))
        const lastMove = (i.statusLog || []).slice(-1)[0]
        const daysSinceMove = lastMove
          ? Math.floor((now - new Date(lastMove.ts)) / (1000 * 60 * 60 * 24))
          : daysSince
        return `- "${i.title}" | ${i.urgency} urgency | status: ${i.status} | open ${daysSince}d | last moved ${daysSinceMove}d ago`
      }).join('\n')

      const analysis = await callClaude(
        `You are reviewing open facility issues at a gym for a manager's weekly digest.
Identify items that need attention: high urgency items, issues that appear stalled or slipping, anything concerning.
Format as a short bulleted list — one line per item max, lead with the issue name.
If nothing is genuinely concerning, write one short sentence saying so.
Be direct. No preamble.`,
        `Open issues:\n${issueData}`,
        300
      )

      if (!analysis) return { html: '', text: '' }

      return {
        html: `
          <div style="margin-bottom: 28px;">
            <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">⚠️ Needs Attention</div>
            <div style="font-size: 13px; color: #444; line-height: 1.8; white-space: pre-line;">${analysis}</div>
          </div>
        `,
        text: analysis,
      }
    }

    // ── Section 3: Pulse check ────────────────────────────────────────────
    async function buildPulseSection(locationId, locationName, stats, pastSnapshots) {
      // Build quantitative history
      const quantHistory = pastSnapshots.length > 0
        ? pastSnapshots.map((s, i) =>
            `Week ${i + 1} ago: ${s.totalOpen} open, ${s.newThisWeek} new, ${s.resolvedThisWeek} resolved, ${s.highUrgency} high urgency`
          ).join('\n')
        : 'No historical data yet.'

      // Build qualitative history — this is the compounding memory
      const qualHistory = pastSnapshots
        .filter(s => s.pulseSummary || s.attentionFlags || s.trendSignal)
        .map((s, i) => {
          const parts = []
          if (s.trendSignal) parts.push(`Signal: ${s.trendSignal}`)
          if (s.pulseSummary) parts.push(`Pulse: ${s.pulseSummary}`)
          if (s.attentionFlags) parts.push(`Flags: ${s.attentionFlags}`)
          return `Week ${i + 1} ago —\n${parts.join('\n')}`
        }).join('\n\n')

      const currentSummary = `This week: ${stats.total} open, ${stats.newThisWeek} new, ${stats.resolvedThisWeek} resolved, ${stats.highUrgency} high urgency`

      const prompt = [
        `Location: ${locationName}`,
        `\nCurrent:\n${currentSummary}`,
        `\nPast 4 weeks (quantitative):\n${quantHistory}`,
        qualHistory ? `\nPast observations from previous digests:\n${qualHistory}` : '',
      ].filter(Boolean).join('\n')

      // Get pulse summary
      const pulse = await callClaude(
        `You are writing a weekly health summary for gym facility managers at Brace Life Studios.
Compare this week's numbers to the past weeks and your previous observations.
Is the team keeping up, falling behind, or making progress? Are patterns repeating?
Flag any concerning trends or improvements plainly.
Write 3-4 sentences max. Be direct — this is a quick read, not a report. No preamble.`,
        prompt,
        220
      )

      // Get trend signal — single word for trajectory tracking
      const trendSignal = await callClaude(
        `Based on the issue workflow data, respond with exactly one word describing the current trend: improving, stable, slipping, or critical. Nothing else.`,
        prompt,
        10
      )

      const statRows = [
        ['Submitted', stats.submitted],
        ['Identified', stats.identified],
        ['Assigned', stats.assigned],
        ['Solved', stats.solved],
      ].filter(([, v]) => v > 0)

      const signalColor = {
        improving: '#2E7D32',
        stable: '#555',
        slipping: '#E85D26',
        critical: '#C62828',
      }[trendSignal?.toLowerCase()] || '#555'

      return {
        html: `
          <div style="margin-bottom: 28px;">
            <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
              📊 Pulse Check
              ${trendSignal ? `<span style="margin-left: 10px; font-size: 11px; font-weight: 600; color: ${signalColor}; text-transform: capitalize; letter-spacing: 0.03em;">● ${trendSignal}</span>` : ''}
            </div>
            ${pulse ? `<p style="margin: 0 0 14px; font-size: 13px; color: #444; line-height: 1.7;">${pulse}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px 0; color: #888; width: 140px;">Total open</td>
                <td style="font-weight: 600;">${stats.total}</td>
              </tr>
              ${statRows.map(([label, count]) => `
                <tr style="border-bottom: 1px solid #f5f5f5;">
                  <td style="padding: 5px 0; color: #888; padding-left: 12px;">↳ ${label}</td>
                  <td style="color: #555;">${count}</td>
                </tr>
              `).join('')}
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px 0; color: #888;">New this week</td>
                <td style="font-weight: ${stats.newThisWeek > 0 ? '600' : '400'};">${stats.newThisWeek}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #888;">Resolved this week</td>
                <td style="font-weight: ${stats.resolvedThisWeek > 0 ? '600' : '400'}; color: ${stats.resolvedThisWeek > 0 ? '#2E7D32' : '#888'};">${stats.resolvedThisWeek}</td>
              </tr>
            </table>
          </div>
        `,
        pulseSummary: pulse,
        attentionFlags: '',  // filled in by caller after attention section runs
        trendSignal: trendSignal?.toLowerCase() || 'stable',
      }
    }

    // ── Save snapshot with all fields ─────────────────────────────────────
    async function saveSnapshot(locationId, locationName, stats, pulseSummary, attentionFlags, trendSignal) {
      try {
        await WeeklySnapshotsTable.create({
          WeekOf: now.toISOString().split('T')[0],
          LocationId: locationId || 'all',
          LocationName: locationName,
          TotalOpen: stats.total,
          Submitted: stats.submitted,
          Identified: stats.identified,
          Assigned: stats.assigned,
          Solved: stats.solved,
          NewThisWeek: stats.newThisWeek,
          ResolvedThisWeek: stats.resolvedThisWeek,
          HighUrgency: stats.highUrgency,
          PulseSummary: pulseSummary || '',
          AttentionFlags: attentionFlags || '',
          TrendSignal: trendSignal || 'stable',
        })
      } catch (e) {
        console.error(`Failed to save snapshot for ${locationName}:`, e)
      }
    }

    // ── Build full section set for one location ───────────────────────────
    async function buildSections(locationId, locationName) {
      const stats = currentStats(locationId)
      const pastSnapshots = getPastSnapshots(locationId)

      const [newResult, attentionResult, pulseResult] = await Promise.all([
        buildNewSection(locationId),
        buildAttentionSection(locationId),
        buildPulseSection(locationId, locationName, stats, pastSnapshots),
      ])

      // Save snapshot with qualitative data
      await saveSnapshot(
        locationId,
        locationName,
        stats,
        pulseResult.pulseSummary,
        attentionResult.text,
        pulseResult.trendSignal
      )

      return {
        html: newResult.html + attentionResult.html + pulseResult.html,
        stats,
      }
    }

    // ── Email wrapper ─────────────────────────────────────────────────────
    const weekLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    function emailShell(inner) {
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
          <div style="background: #E85D26; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <span style="color: white; font-weight: 700; font-size: 16px;">BL Issues Tracker</span>
            <span style="color: rgba(255,255,255,0.8); font-size: 12px; float: right;">Weekly Snapshot · ${weekLabel}</span>
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

    const results = []

    // ── Global admins: all locations ──────────────────────────────────────
    const globalAdmins = users.filter(u => u.isGlobalAdmin && u.email)
    if (globalAdmins.length > 0) {
      let inner = `<p style="margin: 0 0 24px; font-size: 13px; color: #888;">All locations · Week ending ${weekLabel}</p>`

      for (const loc of locations) {
        const { html } = await buildSections(loc.id, loc.name)
        inner += `
          <div style="margin-bottom: 36px; padding-bottom: 36px; border-bottom: 2px solid #f0e8e4;">
            <div style="font-size: 16px; font-weight: 700; color: #E85D26; margin-bottom: 20px;">📍 ${loc.name}</div>
            ${html}
          </div>
        `
      }

      const ok = await sendEmail(
        globalAdmins.map(u => ({ email: u.email, name: u.name })),
        `Weekly Snapshot — All Locations · ${weekLabel}`,
        emailShell(inner)
      )
      if (ok) results.push(`Global admins (${globalAdmins.length}): sent`)
    }

    // ── Location managers: their location(s) ─────────────────────────────
    const locationManagers = users.filter(u => !u.isGlobalAdmin && u.email)
    for (const user of locationManagers) {
      const userRoles = roles.filter(r => r.userId === user.id && r.role === 'manager')
      if (userRoles.length === 0) continue

      const locationNames = []
      let inner = `<p style="margin: 0 0 24px; font-size: 13px; color: #888;">Your location(s) · Week ending ${weekLabel}</p>`

      for (const role of userRoles) {
        const loc = locations.find(l => l.id === role.locationId)
        if (!loc) continue
        locationNames.push(loc.name)

        const { html } = await buildSections(loc.id, loc.name)

        if (userRoles.length > 1) {
          inner += `<div style="font-size: 15px; font-weight: 700; color: #E85D26; margin-bottom: 16px;">📍 ${loc.name}</div>`
        }
        inner += html
        if (userRoles.length > 1) {
          inner += `<div style="border-bottom: 2px solid #f0e8e4; margin-bottom: 28px;"></div>`
        }
      }

      if (locationNames.length === 0) continue

      const ok = await sendEmail(
        [{ email: user.email, name: user.name }],
        `Weekly Snapshot — ${locationNames.join(', ')} · ${weekLabel}`,
        emailShell(inner)
      )
      if (ok) results.push(`${user.name} (${locationNames.join(', ')}): sent`)
    }

    return res.status(200).json({ success: true, results })
  } catch (err) {
    console.error('Weekly digest error:', err)
    return res.status(500).json({ error: err.message })
  }
}