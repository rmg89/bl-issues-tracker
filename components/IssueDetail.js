import React, { useState, useRef, useEffect } from 'react'
import styles from './IssueDetail.module.css'

const LOCATION_COLORS = [
  { bg: '#E8EDF5', color: '#2C4F8A', border: '#B8C8E8' }, // blue
  { bg: '#EDE8F5', color: '#5A3D8A', border: '#C8B8E8' }, // purple
  { bg: '#E8F2F5', color: '#1E6B7A', border: '#B8D8E0' }, // teal
  { bg: '#F5E8F0', color: '#8A2C6B', border: '#E8B8D8' }, // rose
  { bg: '#E8EEF5', color: '#2C5F7A', border: '#B8D0E8' }, // slate blue
  { bg: '#F0E8F5', color: '#6B2C8A', border: '#D8B8E8' }, // violet
  { bg: '#E8F5F2', color: '#1E7A6B', border: '#B8E0D8' }, // cyan
  { bg: '#F5EBE8', color: '#8A4A2C', border: '#E8C8B8' }, // sienna
]
function getLocationColor(name) {
  if (!name) return LOCATION_COLORS[0]
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i)
  return LOCATION_COLORS[Math.abs(h) % LOCATION_COLORS.length]
}
function LocationPill({ name }) {
  if (!name) return null
  const c = getLocationColor(name)
  const display = name.length > 20 ? name.split(' ').slice(-1)[0] : name
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 3,
      border: `0.5px solid ${c.border}`, background: c.bg, color: c.color,
      whiteSpace: 'nowrap', flexShrink: 0,
    }} title={name}>{display}</span>
  )
}

function MultiSelectUsers({ value, onChange, users }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggle(username) {
    onChange(value.includes(username) ? value.filter(u => u !== username) : [...value, username])
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 38,
        padding: '5px 10px', border: '0.5px solid var(--border-strong)',
        borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer',
      }}>
        {value.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Select one or more…</span>}
        {value.map(username => {
          const u = users.find(u => u.username === username)
          return (
            <span key={username} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--bl-orange-light)', color: 'var(--bl-orange-dark)',
              border: '0.5px solid var(--bl-orange)', borderRadius: 20,
              fontSize: 12, fontWeight: 500, padding: '2px 8px',
            }}>
              {u?.name || username}
              <span onClick={e => { e.stopPropagation(); toggle(username) }}
                style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>×</span>
            </span>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', paddingLeft: 4 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '0.5px solid var(--border-strong)',
          borderRadius: 'var(--radius)', boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
          marginBottom: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {users.map(u => (
            <div key={u.id} onClick={() => toggle(u.username)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
              cursor: 'pointer', fontSize: 13,
              background: value.includes(u.username) ? 'var(--bl-orange-light)' : 'transparent',
              color: value.includes(u.username) ? 'var(--bl-orange-dark)' : 'var(--text)',
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${value.includes(u.username) ? 'var(--bl-orange)' : 'var(--border-strong)'}`,
                background: value.includes(u.username) ? 'var(--bl-orange)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 10, fontWeight: 700,
              }}>{value.includes(u.username) ? '✓' : ''}</span>
              {u.name}
              {(u.isAdmin || (u.locationRoles || []).some(r => r.role === 'manager')) && (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>manager</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const STEPS = ['submitted', 'identified', 'assigned', 'solved', 'archived']
const STEP_LABELS = ['Submitted', 'Identified', 'Assigned', 'Solved', 'Archived']

function fmtDateTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const divider = <div style={{ borderTop: '0.5px solid var(--border)', margin: '1rem 0' }} />

export default function IssueDetail({ issue, users, currentUser, locations, permissions, onBack, onUpdate, onToast }) {
  const [realIssue, setRealIssue] = useState(issue.realIssue || '')
  const [solution, setSolution] = useState(issue.solution || '')
  const [urgency, setUrgency] = useState(issue.urgency || 'medium')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmSolve, setConfirmSolve] = useState(false)
  const [confirmSolveTrack, setConfirmSolveTrack] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(null) // holds the target status
  const assignSectionRef = useRef(null)
  const realIssueRef = useRef(null)
  const [highlightRealIssue, setHighlightRealIssue] = useState(false)
  const [investigating, setInvestigating] = useState(issue.investigating || '')
  const [manager, setManager] = useState(issue.manager || '')
  const [assignedTo, setAssignedTo] = useState(
    Array.isArray(issue.assignedTo) ? issue.assignedTo : issue.assignedTo ? [issue.assignedTo] : []
  )

  const si = STEPS.indexOf(issue.status)
  const rawLog = issue.statusLog || []
  const statusLog = rawLog.find(l => l.status === 'submitted')
    ? rawLog
    : [{ status: 'submitted', ts: issue.createdAt, by: issue.submittedByName || issue.submittedBy }, ...rawLog]

  // Sync local state when issue prop updates (e.g. after patch)
  useEffect(() => {
    setRealIssue(issue.realIssue || '')
    setSolution(issue.solution || '')
    setUrgency(issue.urgency || 'medium')
    setInvestigating(issue.investigating || '')
    setManager(issue.manager || '')
    setAssignedTo(Array.isArray(issue.assignedTo) ? issue.assignedTo : issue.assignedTo ? [issue.assignedTo] : [])
  }, [issue.id, issue.status, issue.statusLog])

  const managerUsers = users.filter(u => u.isAdmin || (u.locationRoles || []).some(r => r.role === 'manager'))
  const isSolvedOrArchived = issue.status === 'solved' || issue.status === 'archived'

  async function patch(fields) {
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const updated = await res.json()
    if (!res.ok) return updated
    onUpdate(updated)
    return updated
  }

  function getLogEntry(s) { return statusLog.find(l => l.status === s) }

  async function doAdvance(s) {
    const si_target = STEPS.indexOf(s)
    const si_current = STEPS.indexOf(issue.status)
    if (si_target <= si_current) return
    const newLog = [...statusLog]
    for (let i = si_current + 1; i <= si_target; i++) {
      const step = STEPS[i]
      if (!newLog.find(l => l.status === step)) {
        newLog.push({ status: step, ts: new Date().toISOString(), by: currentUser.name })
      }
    }
    await patch({ status: s, statusLog: newLog })
    onToast(`Marked as ${STEP_LABELS[STEPS.indexOf(s)]}`)
  }

  async function advanceStatus(s) {
    const si_target = STEPS.indexOf(s)
    const si_current = STEPS.indexOf(issue.status)

    // Clicking backwards — only reopen from archived, block everything else
    if (si_target < si_current) {
      if (issue.status === 'archived') setConfirmReopen(s)
      return
    }
    // Same step — no-op
    if (si_target === si_current) return

    // Identified: requires real issue text, auto-saves it
    if (s === 'identified') {
      if (!realIssue.trim()) {
        realIssueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        realIssueRef.current?.focus()
        setHighlightRealIssue(true)
        setTimeout(() => setHighlightRealIssue(false), 2000)
        return
      }
      await patch({ realIssue, realIssueBy: currentUser.name, realIssueAt: new Date().toISOString() })
      await doAdvance(s)
      return
    }
    // Assigned: requires manager + at least one staff, scrolls to section if not
    if (s === 'assigned') {
      if (!manager || assignedTo.length === 0) {
        setAssignError(!manager ? 'Please select a manager responsible.' : 'Please assign at least one staff member.')
        assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      await assignAndNotify()
      return
    }
    // Solved: double confirm — track uses inline, bar button uses its own state
    if (s === 'solved') {
      setConfirmSolveTrack(true)
      return
    }
    // Archived: double confirm only if not already solved
    if (s === 'archived') {
      if (issue.status !== 'solved') { setConfirmArchive(true); return }
      await doAdvance(s)
      return
    }
    await doAdvance(s)
  }

  async function markStatus(status) {
    await advanceStatus(status)
  }

  function coreFields() {
    const investigatingUser = users.find(u => u.username === investigating)
    const managerUser = users.find(u => u.username === manager)
    return {
      urgency,
      investigating,
      investigatingName: investigatingUser?.name || '',
      manager,
      managerName: managerUser?.name || '',
      assignedTo,
      assignedBy: currentUser.name,
      assignedAt: new Date().toISOString(),
      assignedEmail: assignedTo.map(u => users.find(x => x.username === u)?.email || '').filter(Boolean).join(','),
      realIssue,
      realIssueBy: realIssue !== issue.realIssue ? currentUser.name : issue.realIssueBy,
      realIssueAt: realIssue !== issue.realIssue ? new Date().toISOString() : issue.realIssueAt,
      solution,
      solutionBy: solution !== issue.solution ? currentUser.name : issue.solutionBy,
      solutionAt: solution !== issue.solution ? new Date().toISOString() : issue.solutionAt,
    }
  }

  async function saveAll() {
    setSaving(true)
    await patch(coreFields())
    setSaving(false)
    onToast('Changes saved')
  }

  async function saveInvestigating(val) {
    setInvestigating(val)
    const u = users.find(u => u.username === val)
    await patch({ investigating: val, investigatingName: u?.name || '', investigatingBy: currentUser.name, investigatingAt: new Date().toISOString() })
    onToast('Saved')
  }

  async function saveManager(val) {
    setManager(val)
  }

  async function saveAssignedTo(val) {
    setAssignedTo(val)
  }

  async function addNote() {
    if (!newNote.trim()) return
    const note = { text: newNote.trim(), authorName: currentUser.name, ts: new Date().toISOString() }
    await patch({ notes: [...issue.notes, note] })
    setNewNote('')
    onToast('Note added')
  }

  const [assignError, setAssignError] = useState('')
  const [assigning, setAssigning] = useState(false)

  async function assignAndNotify() {
    if (!manager) { setAssignError('Please select a manager responsible.'); return }
    if (assignedTo.length === 0) { setAssignError('Please assign at least one staff member.'); return }
    setAssignError('')
    setAssigning(true)
    try {
      const managerUser = users.find(u => u.username === manager)
      const assignedEmails = [
        managerUser?.email,
        ...assignedTo.map(u => users.find(x => x.username === u)?.email)
      ].filter(Boolean)

      const si_current = STEPS.indexOf(issue.status)
      const si_assigned = STEPS.indexOf('assigned')
      const newLog = [...statusLog]
      for (let i = si_current + 1; i <= si_assigned; i++) {
        const step = STEPS[i]
        if (!newLog.find(l => l.status === step)) {
          newLog.push({ status: step, ts: new Date().toISOString(), by: currentUser.name })
        }
      }

      // Patch assignment + status together, auto-saving the define box
      await patch({
        status: 'assigned',
        statusLog: newLog,
        manager,
        managerName: managerUser?.name || '',
        assignedTo,
        assignedBy: currentUser.name,
        assignedAt: new Date().toISOString(),
        assignedEmail: assignedEmails.join(','),
        solution,
        solutionBy: solution !== issue.solution ? currentUser.name : issue.solutionBy,
        solutionAt: solution !== issue.solution ? new Date().toISOString() : issue.solutionAt,
      })

      // Notify separately — failure here doesn't undo the assignment
      try {
        await fetch('/api/issues/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueId: issue.id,
            issueTitle: issue.title,
            issueDescription: issue.description,
            locationName: issue.locationName,
            urgency: issue.urgency,
            assignedBy: currentUser.name,
            emails: assignedEmails,
            assignedNames: [
              managerUser?.name,
              ...assignedTo.map(u => users.find(x => x.username === u)?.name)
            ].filter(Boolean),
          }),
        })
        onToast('Assigned & notifications sent')
      } catch {
        onToast('Assigned — notifications failed')
      }
    } catch (e) {
      console.error('assignAndNotify error:', e)
      onToast('Assignment failed — check console')
    }
    setAssigning(false)
  }

  async function archiveIssue() {
    const newLog = statusLog.filter(l => l.status !== 'archived')
    newLog.push({ status: 'archived', ts: new Date().toISOString(), by: currentUser.name })
    await patch({ status: 'archived', statusLog: newLog })
    onToast('Archived')
    onBack()
  }

  const knownLocationNames = (locations || []).map(l => l.name)
  const rawLocationName = issue.locationName || ''
  let gymLocation = '', areaEquipment = ''
  if (rawLocationName.includes(' — ')) {
    const parts = rawLocationName.split(' — ')
    gymLocation = parts[0] || ''
    areaEquipment = parts[1] || ''
  } else if (knownLocationNames.includes(rawLocationName)) {
    gymLocation = rawLocationName
  } else {
    areaEquipment = rawLocationName
  }

  async function saveLocation(newLocationId) {
    const loc = (locations || []).find(l => l.id === newLocationId)
    if (!loc) return
    const newLocationName = areaEquipment ? `${loc.name} — ${areaEquipment}` : loc.name
    await patch({ locationId: newLocationId, locationName: newLocationName })
    onToast('Location updated')
  }

  return (
    <div>
      <div className="card">

        {/* ── Header ── */}
        <div className={styles.topRow}>
          <h2 className={styles.title}>{issue.title}</h2>
          <span className={`status-badge s-${issue.status}`}>{STEP_LABELS[si] || issue.status}</span>
        </div>
        {issue.description && <p className={styles.desc}>{issue.description}</p>}
        <div className={styles.chips}>
          <span className={styles.chip}>By {issue.submittedByName || issue.submittedBy}{areaEquipment ? ` · ${areaEquipment}` : ''} · {fmtDate(issue.createdAt)} at {fmtTime(issue.createdAt)}</span>
          {locations && locations.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LocationPill name={gymLocation} />
              <span className={styles.changeUrgency}>
                change
                <select value={issue.locationId || ''} onChange={e => saveLocation(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '200px', height: '100%', top: 0, left: 0, cursor: 'pointer' }}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </span>
            </span>
          )}
        </div>
        <div className={styles.chips} style={{ marginTop: 6 }}>
          {issue.reportedVia && (
            <span className={styles.chip}>
              Reported by {issue.reportedVia}{issue.reportedByName ? `: ${issue.reportedByName}` : ''}
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className={`${styles.urgencyTag} ${styles['u_' + urgency]}`}>{urgency} urgency</span>
            <span className={styles.changeUrgency}>
              change
              <select value={urgency} onChange={e => setUrgency(e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: '140px', height: '100%', top: 0, left: 0, cursor: 'pointer' }}>
                <option value="low">Low urgency</option>
                <option value="medium">Medium urgency</option>
                <option value="high">High urgency</option>
              </select>
            </span>
          </span>
        </div>

        {/* ── Photos ── */}
        {issue.photos?.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: '1rem' }}>Photos</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {issue.photos.map((photo, i) => (
                <a key={i} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <img src={photo.url} alt={photo.filename || `Photo ${i + 1}`}
                    style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--border)' }} />
                </a>
              ))}
            </div>
          </>
        )}

        {/* ── Status track ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', marginBottom: 0 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 4 }}>Issue progress</div>
          {(() => {
            const solvedLog = statusLog.find(l => l.status === 'solved')
            const solvedTs = solvedLog ? new Date(solvedLog.ts) : null
            const readyToArchive = issue.status === 'solved' && solvedTs && (Date.now() - solvedTs) > 7 * 24 * 60 * 60 * 1000
            return readyToArchive ? (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#7A4F00',
                background: '#FFF3CD', border: '0.5px solid #F0C040',
                borderRadius: 20, padding: '2px 10px', marginBottom: 4,
              }}>
                ✓ Solved 7+ days ago — time to archive
              </span>
            ) : null
          })()}
        </div>
        <div className={styles.track}>
          {STEPS.map((s, i) => {
            const log = getLogEntry(s)
            const isConfirmingSolve = confirmSolveTrack && s === 'solved'
            const isConfirmingArchive = confirmArchive && s === 'archived'
            const isConfirmingReopen = confirmReopen === s

            // Show archive nudge above the archived step if solved 7+ days ago
            const solvedLog = statusLog.find(l => l.status === 'solved')
            const solvedTs = solvedLog ? new Date(solvedLog.ts) : null
            const readyToArchive = issue.status === 'solved' && solvedTs && (Date.now() - solvedTs) > 7 * 24 * 60 * 60 * 1000
            const showArchiveNudge = s === 'archived' && readyToArchive && !isConfirmingArchive
            if (isConfirmingSolve) return (
              <div key={s} className={`${styles.step} ${styles.active}`}
                style={{ flexDirection: 'column', gap: 6, padding: '10px 6px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.95 }}>All fixed?</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => { setConfirmSolveTrack(false); doAdvance('solved') }}
                    style={{ fontSize: 12, padding: '5px 12px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700 }}>
                    Yes ✓
                  </button>
                  <button onClick={() => setConfirmSolveTrack(false)}
                    style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(255,255,255,0.25)', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                    Not yet
                  </button>
                </div>
              </div>
            )
            if (isConfirmingArchive) return (
              <div key={s} className={`${styles.step}`}
                style={{ flexDirection: 'column', gap: 6, padding: '10px 6px', background: '#7A1010', color: 'white', borderRadius: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, textAlign: 'center' }}>Archive without solving first?</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => { setConfirmArchive(false); doAdvance('archived') }}
                    style={{ fontSize: 12, padding: '5px 12px', background: '#333', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700 }}>
                    Yes
                  </button>
                  <button onClick={() => setConfirmArchive(false)}
                    style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                    No
                  </button>
                </div>
              </div>
            )
            if (isConfirmingReopen) return (
              <div key={s} className={`${styles.step}`}
                style={{ flexDirection: 'column', gap: 6, padding: '10px 8px', background: '#1A3A5C', color: 'white', borderRadius: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.3, textAlign: 'center' }}>Reopen this issue?</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={async () => {
                    setConfirmReopen(null)
                    const newLog = statusLog.filter(l => STEPS.indexOf(l.status) <= STEPS.indexOf(confirmReopen))
                    await patch({ status: confirmReopen, statusLog: newLog })
                    onToast('Issue reopened')
                  }}
                    style={{ fontSize: 11, padding: '4px 10px', background: '#E85D26', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                    Yes, reopen
                  </button>
                  <button onClick={() => setConfirmReopen(null)}
                    style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
                    No
                  </button>
                </div>
              </div>
            )
            return (
              <button key={s}
                className={`${styles.step} ${i < si ? styles.done : ''} ${i === si ? styles.active : ''}`}
                onClick={() => advanceStatus(s)}>
                <span className={styles.stepLabel}>{STEP_LABELS[i]}</span>
                {log && <span className={styles.stepTs}>{fmtDate(log.ts)}<br />{fmtTime(log.ts)}<br />by {log.by}</span>}
              </button>
            )
          })}
        </div>

        {/* ══ PHASE 1: IDENTIFY ══ */}
        <div className={styles.phaseBlock}>
          <div className={styles.phaseHeader}>
            <span className={styles.phaseNumber}>1</span>
            <span className={styles.phaseTitle}>Identify</span>
          </div>

          {/* Who's looking into this */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0, whiteSpace: 'nowrap' }}>Who&apos;s looking into this?</div>
            <select value={investigating} onChange={e => saveInvestigating(e.target.value)} style={{ marginBottom: 0, width: 'auto', minWidth: 140, maxWidth: 200 }}>
              <option value="">Unassigned</option>
              {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
            </select>
            {issue.investigatingBy && (
              <span className={styles.fieldMeta} style={{ marginBottom: 0 }}>Set by {issue.investigatingBy} · {fmtDateTime(issue.investigatingAt)}</span>
            )}
          </div>

          {/* Real issue */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>What&apos;s the actual problem?</div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={async () => { await patch({ realIssue, realIssueBy: currentUser.name, realIssueAt: new Date().toISOString() }); onToast('Saved') }}>Save</button>
              {issue.status === 'submitted' && (
                <button
                  className="btn-primary"
                  onClick={() => markStatus('identified')}
                  disabled={!realIssue.trim()}
                  title={!realIssue.trim() ? 'Fill in the real issue first' : ''}
                >Mark identified →</button>
              )}
            </div>
          </div>
          <textarea
            ref={realIssueRef}
            placeholder="What is the actual root issue beneath the surface problem?"
            value={realIssue}
            onChange={e => setRealIssue(e.target.value)}
            style={{
              marginBottom: 4,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              ...(highlightRealIssue ? {
                borderColor: '#C62828',
                boxShadow: '0 0 0 3px rgba(198,40,40,0.15)',
              } : {})
            }}
          />
          {issue.realIssueBy && (
            <div className={styles.fieldMeta}>{`Last edited by ${issue.realIssueBy} · ${fmtDateTime(issue.realIssueAt)}`}</div>
          )}
        </div>

        {/* ══ PHASE 2: DISCUSS · DEFINE · ASSIGN ══ */}
        <div className={styles.phaseBlock}>
          <div className={styles.phaseHeader}>
            <span className={styles.phaseNumber}>2</span>
            <span className={styles.phaseTitle}>Discuss · Define · Assign</span>
          </div>

          {/* Discuss */}
          <div className="section-label" style={{ marginTop: 0 }}>Discuss</div>
          <div className={styles.notes}>
            {issue.notes.length ? issue.notes.map((n, i) => (
              <div key={i} className={styles.note}>
                <div className={styles.noteText}>{n.text}</div>
                <div className={styles.noteMeta}>{n.authorName} · {fmtDateTime(n.ts)}</div>
              </div>
            )) : <div className={styles.noNotes}>No notes yet.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <textarea placeholder="Add a note or discussion point..." value={newNote}
              onChange={e => setNewNote(e.target.value)} style={{ flex: 1, minHeight: 64, marginBottom: 0 }} />
            <button onClick={addNote} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>Add</button>
          </div>

          <div style={{ borderTop: '0.5px solid var(--border)', margin: '1rem 0' }} />

          {/* Define */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Define the fix</div>
            <button onClick={async () => { await patch({ solution, solutionBy: currentUser.name, solutionAt: new Date().toISOString() }); onToast('Saved') }}
              style={{ flexShrink: 0 }}>Save</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              placeholder="What specifically are we doing, and by when?"
              value={solution}
              onChange={e => setSolution(e.target.value)}
              style={{ flex: 1, minHeight: 80, marginBottom: 0 }}
            />
          </div>
          {issue.solutionBy && (
            <div className={styles.fieldMeta} style={{ marginTop: 4 }}>Last edited by {issue.solutionBy} · {fmtDateTime(issue.solutionAt)}</div>
          )}

          <div style={{ borderTop: '0.5px solid var(--border)', margin: '1rem 0' }} />

          {/* Assign */}
          <div ref={assignSectionRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Assign</div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!isSolvedOrArchived && (
                <button
                  className="btn-primary"
                  onClick={assignAndNotify}
                  disabled={assigning}
                >{assigning ? 'Assigning...' : 'Assign & notify →'}</button>
              )}
              {issue.status === 'solved' && (
                <button onClick={archiveIssue}>Archive →</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Manager responsible</div>
              <select value={manager} onChange={e => saveManager(e.target.value)} style={{ marginBottom: 0 }}>
                <option value="">Select manager…</option>
                {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Assigned to (staff)</div>
              <MultiSelectUsers value={assignedTo} onChange={saveAssignedTo} users={users} />
            </div>
          </div>
          {assignError && (
            <div style={{ color: '#C62828', fontSize: 13, marginTop: 8 }}>{assignError}</div>
          )}
          {issue.assignedAt && (
            <div className={styles.fieldMeta} style={{ marginTop: 6 }}>Last assigned by {issue.assignedBy} · {fmtDateTime(issue.assignedAt)}</div>
          )}
        </div>

      </div>

      {/* ── Float bar ── */}
      <div className={styles.floatBar}>
        <button onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isSolvedOrArchived && (
            confirmSolve ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>All fixed?</span>
                <button style={{ background: '#2E7D32', borderColor: '#1B5E20', color: 'white' }}
                  onClick={() => { setConfirmSolve(false); doAdvance('solved') }}>
                  Yes, solved ✓
                </button>
                <button onClick={() => setConfirmSolve(false)}>Cancel</button>
              </>
            ) : (
              <button style={{ background: '#2E7D32', borderColor: '#1B5E20', color: 'white' }}
                onClick={() => setConfirmSolve(true)}>
                Mark solved ✓
              </button>
            )
          )}
          {issue.status === 'solved' && (
            <button onClick={() => advanceStatus('archived')}>Archive →</button>
          )}
          {!confirmSolve && (
            <button className={`btn-primary ${styles.saveBtn}`} onClick={saveAll} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}