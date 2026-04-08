// pages/api/notify.js
// Triggered by "Assign & notify".
// Sends email + SMS immediately, Claude summary has a hard 2s timeout so it never blocks delivery.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    issueTitle,
    issueDescription,
    realIssue,
    solution,
    notes,
    locationName,
    urgency,
    assignedBy,
    recipients,
  } = req.body

  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' })
  }

  const brevoKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.NOTIFY_FROM_EMAIL
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM_NUMBER

  if (!brevoKey || !fromEmail) {
    return res.status(500).json({ error: 'Email not configured' })
  }

  const managerRecipient = recipients[0]
  const staffRecipients = recipients.slice(1)
  const assignedStaffNames = staffRecipients.map(r => r.name).filter(Boolean)

  // ── 1. Build fallback summary (used if Claude times out) ─────────────────
  const fallbackSummary = [issueDescription, realIssue].filter(Boolean).join(' — ') || issueTitle

  // ── 2. Try Claude with a hard 2s timeout ────────────────────────────────
  let aiSummary = fallbackSummary
  try {
    const notesText = (notes || []).length > 0
      ? notes.map(n => `- ${n.authorName}: ${n.text}`).join('\n')
      : null
    const contextParts = [
      `Title: ${issueTitle}`,
      issueDescription && `Description: ${issueDescription}`,
      realIssue && `Root cause: ${realIssue}`,
      solution && `Planned fix: ${solution}`,
      notesText && `Discussion:\n${notesText}`,
      `Urgency: ${urgency}`,
      `Manager: ${managerRecipient?.name || assignedBy}`,
      assignedStaffNames.length > 0 && `Staff: ${assignedStaffNames.join(', ')}`,
    ].filter(Boolean).join('\n\n')

    const claudePromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: `You write assignment notifications for gym facility staff at Brace Life Studios.
Write exactly 3 sentences:
1. What the problem is and what needs to happen to fix it.
2. Who they are working with and who they report to.
3. The urgency and any timing context.
Be direct and collegial. Use only the information provided.`,
        messages: [{ role: 'user', content: `Write the assignment notification:\n\n${contextParts}` }],
      }),
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude timeout')), 2000)
    )

    const claudeRes = await Promise.race([claudePromise, timeoutPromise])
    const claudeData = await claudeRes.json()
    const text = claudeData?.content?.find(b => b.type === 'text')?.text
    if (text) aiSummary = text.trim()
  } catch (e) {
    console.log('Claude skipped:', e.message)
  }

  // ── 3. Build email ───────────────────────────────────────────────────────
  const locationParts = (locationName || '').split(' — ')
  const gymLocation = locationParts[0] || ''
  const area = locationParts[1] || ''
  const locationDisplay = [gymLocation, area].filter(Boolean).join(' — ')
  const urgencyLabel = { high: 'High 🔴', medium: 'Medium 🟡', low: 'Low 🟢' }[urgency] || urgency
  const subject = `[${gymLocation || 'Issues Tracker'}] You've been assigned: ${issueTitle}`

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <div style="background: #E85D26; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: 700; font-size: 16px;">BL Issues Tracker</span>
      </div>
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #888;">Assigned by ${assignedBy}</p>
        <h2 style="margin: 0 0 12px; font-size: 20px;">${issueTitle}</h2>
        <p style="margin: 0 0 20px; color: #444; font-size: 14px; line-height: 1.7;">${aiSummary.replace(/\n/g, '<br/>')}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          ${locationDisplay ? `<tr><td style="padding: 6px 0; color: #888; width: 120px;">Location</td><td style="font-weight: 500;">${locationDisplay}</td></tr>` : ''}
          <tr><td style="padding: 6px 0; color: #888;">Urgency</td><td style="font-weight: 500;">${urgencyLabel}</td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Manager</td><td style="font-weight: 500;">${managerRecipient?.name || '—'}</td></tr>
          ${assignedStaffNames.length > 0 ? `<tr><td style="padding: 6px 0; color: #888;">Assigned to</td><td style="font-weight: 500;">${assignedStaffNames.join(', ')}</td></tr>` : ''}
        </table>
        <p style="margin: 0; font-size: 12px; color: #ccc;"><a href="https://issues.bracelifestudios.com" style="color: #ccc;">issues.bracelifestudios.com</a></p>
      </div>
    </div>
  `

  const errors = []

  // ── 4. Send via Brevo ────────────────────────────────────────────────────
  const emailRecipients = recipients.filter(r => r.email)
  if (emailRecipients.length > 0) {
    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: fromEmail, name: 'BL Issues Tracker' },
          to: emailRecipients.map(r => ({ email: r.email, name: r.name })),
          subject,
          htmlContent: html,
        }),
      })
      if (!brevoRes.ok) {
        const detail = await brevoRes.text()
        console.error('Brevo error:', detail)
        errors.push(`Email failed: ${detail}`)
      }
    } catch (e) {
      console.error('Brevo exception:', e)
      errors.push(`Email exception: ${e.message}`)
    }
  }

  // ── 5. Send SMS via Twilio ───────────────────────────────────────────────
  if (twilioSid && twilioToken && twilioFrom) {
    const smsBody = `[BL Issues Tracker] Assigned by ${assignedBy} at ${gymLocation || 'the gym'}: ${aiSummary}`
    const smsBodyTrimmed = smsBody.length > 1550 ? smsBody.slice(0, 1547) + '...' : smsBody

    for (const recipient of recipients.filter(r => r.phone)) {
      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: twilioFrom, To: recipient.phone, Body: smsBodyTrimmed }).toString(),
          }
        )
        if (!twilioRes.ok) {
          const detail = await twilioRes.text()
          console.error(`Twilio error for ${recipient.name}:`, detail)
          errors.push(`SMS failed for ${recipient.name}`)
        }
      } catch (e) {
        console.error(`Twilio exception for ${recipient.name}:`, e)
        errors.push(`SMS exception for ${recipient.name}: ${e.message}`)
      }
    }
  }

  return res.status(200).json({
    success: errors.length === 0,
    emailsSent: emailRecipients.length,
    smsSent: twilioSid ? recipients.filter(r => r.phone).length : 0,
    errors: errors.length > 0 ? errors : undefined,
  })
}