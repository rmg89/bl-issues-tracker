import React, { useState, useRef, useEffect } from 'react'
import styles from './IssueDetail.module.css'

const LOCATION_COLORS = [
  { bg: '#E8EDF5', color: '#2C4F8A', border: '#B8C8E8' },
  { bg: '#EDE8F5', color: '#5A3D8A', border: '#C8B8E8' },
  { bg: '#E8F2F5', color: '#1E6B7A', border: '#B8D8E0' },
  { bg: '#F5E8F0', color: '#8A2C6B', border: '#E8B8D8' },
  { bg: '#E8EEF5', color: '#2C5F7A', border: '#B8D0E8' },
  { bg: '#F0E8F5', color: '#6B2C8A', border: '#D8B8E8' },
  { bg: '#E8F5F2', color: '#1E7A6B', border: '#B8E0D8' },
  { bg: '#F5EBE8', color: '#8A4A2C', border: '#E8C8B8' },
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

export default function IssueDetail({ issue, users, currentUser, locations, permissions, onBack, onUpdate, onToast }) {
  const [title, setTitle] = useState(issue.title || '')
  const [editingTitle, setEditingTitle] = useState(false)
  const titleInputRef = useRef(null)

  const [realIssue, setRealIssue] = useState(issue.realIssue || '')
  const [solution, setSolution] = useState(issue.solution || '')
  const [urgency, setUrgency] = useState(issue.urgency || 'medium')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmSolve, setConfirmSolve] = useState(false)
  const [confirmSolveTrack, setConfirmSolveTrack] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(null)
  const [assignError, setAssignError] = useState('')
  const [assigning, setAssigning] = useState(false)
  const assignSectionRef = useRef(null)
  const realIssueRef = useRef(null)
  const [highlightRealIssue, setHighlightRealIssue] = useState(false)
  const [investigating, setInvestigating] = useState(issue.investigating || '')
  const [manager, setManager] = useState(issue.manager || '')
  const [assignedTo, setAssignedTo] = useState(
    Array.isArray(issue.assignedTo) ? issue.assignedTo : issue.assignedTo ? [issue.assignedTo] : []
  )
  const [pendingAssignment, setPendingAssignment] = useState(false)

  const si = STEPS.indexOf(issue.status)
  const rawLog = issue.statusLog || []
  const statusLog = rawLog.find(l => l.status === 'submitted')
    ? rawLog
    : [{ status: 'submitted', ts: issue.createdAt, by: issue.submittedByName || issue.submittedBy }, ...rawLog]

  const isAlreadyAssigned = ['assigned', 'solved', 'archived'].includes(issue.status)

  useEffect(() => {
    setTitle(issue.title || '')
    setRealIssue(issue.realIssue || '')
    setSolution(issue.solution || '')
    setUrgency(issue.urgency || 'medium')
    setInvestigating(issue.investigating || '')
    setManager(issue.manager || '')
    setAssignedTo(Array.isArray(issue.assignedTo) ? issue.assignedTo : issue.assignedTo ? [issue.assignedTo] : [])
    setPendingAssignment(false)
  }, [issue.id, issue.status, issue.statusLog])

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus()
  }, [editingTitle])

  const managerUsers = users.filter(u => u.isAdmin || (u.locationRoles || []).some(r => r.role === 'manager'))
  const isSolvedOrArchived = issue.status === 'solved' || issue.status === 'archived'

  async function patch(fields) {
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const updated = await res.json()
    if (!res.ok) return updated
    onUpdate(updated)
    return updated
  }

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(issue.title); setEditingTitle(false); return }
    if (trimmed === issue.title) { setEditingTitle(false); return }
    await patch({ title: trimmed })
    setEditingTitle(false)
    onToast('Title updated')
  }

  function getLogEntry(s) { return statusLog.find(l => l.status === s) }

  async function doAdvance(s) {
    const si_target = STEPS.indexOf(s)
    const si_current = STEPS.indexOf(issue.status)
    if (si_target <= si_current) return
    const newLog = [...statusLog]
    for (let i = si_current + 1; i <= si_target; i++) {
      const step = STEPS[i]
      if (!newLog.find(l => l.status === step))
        newLog.push({ status: step, ts: new Date().toISOString(), by: currentUser.name })
    }
    await patch({ status: s, statusLog: newLog })
    onToast(`Marked as ${STEP_LABELS[STEPS.indexOf(s)]}`)
  }

  async function doRewind(s) {
    const si_target = STEPS.indexOf(s)
    const newLog = statusLog.filter(l => STEPS.indexOf(l.status) <= si_target)
    await patch({ status: s, statusLog: newLog })
    onToast(`Moved back to ${STEP_LABELS[si_target]}`)
  }

  function clearConfirms() {
    setConfirmSolveTrack(false); setConfirmArchive(false); setConfirmReopen(null)
  }

  async function advanceStatus(s) {
    const si_target = STEPS.indexOf(s)
    const si_current = STEPS.indexOf(issue.status)
    if (si_target < si_current) {
      if (issue.status === 'archived') { clearConfirms(); setConfirmReopen(s); return }
      await doRewind(s); return
    }
    if (si_target === si_current) return
    if (s === 'identified') {
      if (!realIssue.trim()) {
        realIssueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        realIssueRef.current?.focus()
        setHighlightRealIssue(true)
        setTimeout(() => setHighlightRealIssue(false), 2000)
        return
      }
      await patch({ realIssue, realIssueBy: currentUser.name, realIssueAt: new Date().toISOString() })
      await doAdvance(s); return
    }
    if (s === 'assigned') {
      if (!manager || assignedTo.length === 0) {
        setAssignError(!manager ? 'Please select a manager responsible.' : 'Please assign at least one staff member.')
        assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return
      }
      await assignAndNotify(); return
    }
    if (s === 'solved') { clearConfirms(); setConfirmSolveTrack(true); return }
    if (s === 'archived') {
      if (issue.status !== 'solved') { clearConfirms(); setConfirmArchive(true); return }
      await doAdvance(s); return
    }
    await doAdvance(s)
  }

  async function markStatus(status) { await advanceStatus(status) }

  function coreFields() {
    const investigatingUser = users.find(u => u.username === investigating)
    const managerUser = users.find(u => u.username === manager)
    return {
      urgency, investigating, investigatingName: investigatingUser?.name || '',
      manager, managerName: managerUser?.name || '',
      assignedTo, assignedBy: currentUser.name, assignedAt: new Date().toISOString(),
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
    setSaving(true); await patch(coreFields()); setSaving(false); onToast('Changes saved')
  }

  async function saveInvestigating(val) {
    setInvestigating(val)
    const u = users.find(u => u.username === val)
    await patch({ investigating: val, investigatingName: u?.name || '', investigatingBy: currentUser.name, investigatingAt: new Date().toISOString() })
    onToast('Saved')
  }

  function saveManager(val) {
    setManager(val)
    if (isAlreadyAssigned) setPendingAssignment(true)
  }

  function saveAssignedTo(val) {
    setAssignedTo(val)
    if (isAlreadyAssigned) setPendingAssignment(true)
  }

  async function addNote() {
    if (!newNote.trim()) return
    const note = { text: newNote.trim(), authorName: currentUser.name, ts: new Date().toISOString() }
    await patch({ notes: [...issue.notes, note] })
    setNewNote(''); onToast('Note added')
  }

  function buildRecipients() {
    const managerUser = users.find(u => u.username === manager)
    const staffUsers = assignedTo.map(u => users.find(x => x.username === u)).filter(Boolean)
    const seen = new Set()
    const recipients = []
    for (const u of [managerUser, ...staffUsers]) {
      if (!u || seen.has(u.id)) continue
      seen.add(u.id)
      recipients.push({ name: u.name, email: u.email || '', phone: u.phone || '' })
    }
    return recipients
  }

  async function assignAndNotify() {
    if (!manager) { setAssignError('Please select a manager responsible.'); return }
    if (assignedTo.length === 0) { setAssignError('Please assign at least one staff member.'); return }
    setAssignError(''); setAssigning(true)
    try {
      const managerUser = users.find(u => u.username === manager)
      const si_current = STEPS.indexOf(issue.status)
      const si_assigned = STEPS.indexOf('assigned')
      const newLog = [...statusLog]
      for (let i = si_current + 1; i <= si_assigned; i++) {
        const step = STEPS[i]
        if (!newLog.find(l => l.status === step))
          newLog.push({ status: step, ts: new Date().toISOString(), by: currentUser.name })
      }
      await patch({
        status: 'assigned', statusLog: newLog,
        manager, managerName: managerUser?.name || '',
        assignedTo, assignedBy: currentUser.name, assignedAt: new Date().toISOString(),
        assignedEmail: buildRecipients().map(r => r.email).filter(Boolean).join(','),
        solution,
        solutionBy: solution !== issue.solution ? currentUser.name : issue.solutionBy,
        solutionAt: solution !== issue.solution ? new Date().toISOString() : issue.solutionAt,
      })
      try {
        await fetch('/api/issues/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueId: issue.id,
            issueTitle: title,
            issueDescription: issue.description,
            realIssue: issue.realIssue || realIssue,
            solution: issue.solution || solution,
            notes: issue.notes || [],
            locationName: issue.locationName,
            urgency: issue.urgency,
            assignedBy: currentUser.name,
            recipients: buildRecipients(),
          }),
        })
        setPendingAssignment(false)
        onToast('Assigned & notifications sent')
      } catch { onToast('Assigned — notifications failed') }
    } catch (e) { console.error('assignAndNotify error:', e); onToast('Assignment failed — check console') }
    setAssigning(false)
  }

  async function archiveIssue() {
    const newLog = statusLog.filter(l => l.status !== 'archived')
    newLog.push({ status: 'archived', ts: new Date().toISOString(), by: currentUser.name })
    await patch({ status: 'archived', statusLog: newLog })
    onToast('Archived'); onBack()
  }

  const knownLocationNames = (locations || []).map(l => l.name)
  const rawLocationName = issue.locationName || ''
  let gymLocation = '', areaEquipment = ''
  if (rawLocationName.includes(' — ')) {
    const parts = rawLocationName.split(' — ')
    gymLocation = parts[0] || ''; areaEquipment = parts[1] || ''
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
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setTitle(issue.title); setEditingTitle(false) }
              }}
              style={{
                flex: 1, fontSize: 'inherit', fontWeight: 700, fontFamily: 'inherit',
                border: '0.5px solid var(--bl-orange)', borderRadius: 'var(--radius)',
                padding: '2px 6px', background: 'var(--surface)', color: 'var(--text)',
                outline: 'none', marginRight: 8,
              }}
            />
          ) : (
            <h2
              className={styles.title}
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
              style={{ cursor: 'text' }}
            >
              {title}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8, verticalAlign: 'middle' }}>✎</span>
            </h2>
          )}
          <span className={`status-badge s-${issue.status}`}>{STEP_LABELS[si] || issue.status}</span>
        </div>
        {issue.description && <p className={styles.desc}>{issue.description}</p>}

        {/* Row 1: "By..." + location pill */}
        <div className={styles.chipsRow}>
          <span className={styles.chip}>
            By {issue.submittedByName || issue.submittedBy}{areaEquipment ? ` · ${areaEquipment}` : ''} · {fmtDate(issue.createdAt)} at {fmtTime(issue.createdAt)}
          </span>
          {locations && locations.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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

        {/* Row 2: "Reported by..." + urgency */}
        <div className={styles.chipsRow} style={{ marginBottom: '1rem' }}>
          {issue.reportedVia ? (
            <span className={styles.chip}>
              Reported by {issue.reportedVia}{issue.reportedByName ? `: ${issue.reportedByName}` : ''}
            </span>
          ) : <span />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
              <span style={{ fontSize: 11, fontWeight: 600, color: '#7A4F00', background: '#FFF3CD', border: '0.5px solid #F0C040', borderRadius: 20, padding: '2px 10px', marginBottom: 4 }}>
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

            if (isConfirmingSolve) return (
              <div key={s} className={`${styles.step} ${styles.active}`}
                style={{ flexDirection: 'column', gap: 5, padding: '8px 6px', minHeight: 56 }}>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.95 }}>All fixed?</span>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                  <button className={styles.confirmBtn} onClick={() => { setConfirmSolveTrack(false); doAdvance('solved') }}
                    style={{ background: '#2E7D32', color: 'white', padding: '5px 10px', border: 'none' }}>Yes ✓</button>
                  <button className={styles.confirmBtn} onClick={() => setConfirmSolveTrack(false)}
                    style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '5px 10px', border: 'none' }}>Not yet</button>
                </div>
              </div>
            )
            if (isConfirmingArchive) return (
              <div key={s} className={`${styles.step}`}
                style={{ flexDirection: 'column', gap: 6, padding: '10px 6px', background: '#7A1010', color: 'white', borderRadius: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, textAlign: 'center' }}>Archive without solving first?</span>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                  <button onClick={() => { setConfirmArchive(false); doAdvance('archived') }}
                    style={{ background: '#333', color: 'white', padding: '5px 0', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 12, width: 44, textAlign: 'center', display: 'block' }}>Yes</button>
                  <button onClick={() => setConfirmArchive(false)}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '5px 0', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 12, width: 44, textAlign: 'center', display: 'block' }}>No</button>
                </div>
              </div>
            )
            if (isConfirmingReopen) return (
              <div key={s} className={`${styles.step}`}
                style={{ flexDirection: 'column', gap: 6, padding: '10px 8px', background: '#1A3A5C', color: 'white', borderRadius: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.3, textAlign: 'center' }}>Reopen this issue?</span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button className={styles.confirmBtn} onClick={async () => {
                    const target = confirmReopen; setConfirmReopen(null)
                    await doRewind(target); onToast('Issue reopened')
                  }} style={{ background: '#E85D26', color: 'white' }}>Yes, reopen</button>
                  <button className={styles.confirmBtn} onClick={() => setConfirmReopen(null)}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>No</button>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0, whiteSpace: 'nowrap' }}>Who&apos;s looking into this?</div>
            <select value={investigating} onChange={e => saveInvestigating(e.target.value)} style={{ marginBottom: 0, width: 'auto', minWidth: 140, maxWidth: 200 }}>
              <option value="">Select manager...</option>
              {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
            </select>
            {issue.investigatingBy && (
              <span className={styles.fieldMeta} style={{ marginBottom: 0 }}>Set by {issue.investigatingBy} · {fmtDateTime(issue.investigatingAt)}</span>
            )}
          </div>

          <div className={styles.identifyHeader}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>What&apos;s the actual problem?</div>
          </div>
          <textarea
            ref={realIssueRef}
            placeholder="What is the actual root issue beneath the surface problem?"
            value={realIssue}
            onChange={e => setRealIssue(e.target.value)}
            style={{
              marginBottom: 4, transition: 'border-color 0.2s, box-shadow 0.2s',
              ...(highlightRealIssue ? { borderColor: '#C62828', boxShadow: '0 0 0 3px rgba(198,40,40,0.15)' } : {})
            }}
          />
          {issue.realIssueBy && (
            <div className={styles.fieldMeta} style={{ marginBottom: 8 }}>{`Last edited by ${issue.realIssueBy} · ${fmtDateTime(issue.realIssueAt)}`}</div>
          )}
          <div className={styles.identifyActions}>
            <button onClick={async () => { await patch({ realIssue, realIssueBy: currentUser.name, realIssueAt: new Date().toISOString() }); onToast('Saved') }}>Save</button>
            {issue.status === 'submitted' && (
              <button className="btn-primary" onClick={() => markStatus('identified')}
                disabled={!realIssue.trim()} title={!realIssue.trim() ? 'Fill in the real issue first' : ''}>
                Mark identified →
              </button>
            )}
          </div>
        </div>

        {/* ══ PHASE 2: DISCUSS · DEFINE · ASSIGN ══ */}
        <div className={styles.phaseBlock}>
          <div className={styles.phaseHeader}>
            <span className={styles.phaseNumber}>2</span>
            <span className={styles.phaseTitle}>Discuss · Define · Assign</span>
          </div>

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Define the fix</div>
            <button onClick={async () => { await patch({ solution, solutionBy: currentUser.name, solutionAt: new Date().toISOString() }); onToast('Saved') }}
              style={{ flexShrink: 0 }}>Save</button>
          </div>
          <textarea placeholder="What specifically are we doing, and by when?" value={solution}
            onChange={e => setSolution(e.target.value)} style={{ flex: 1, minHeight: 80, marginBottom: 0, width: '100%' }} />
          {issue.solutionBy && (
            <div className={styles.fieldMeta} style={{ marginTop: 4 }}>Last edited by {issue.solutionBy} · {fmtDateTime(issue.solutionAt)}</div>
          )}

          <div style={{ borderTop: '0.5px solid var(--border)', margin: '1rem 0' }} />

          {/* ── Assign section ── */}
          <div ref={assignSectionRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Assign</div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!isSolvedOrArchived && (
                <button
                  className="btn-primary"
                  onClick={assignAndNotify}
                  disabled={assigning}
                  style={pendingAssignment ? { outline: '2px solid #E85D26', outlineOffset: 2 } : {}}
                >
                  {assigning ? 'Assigning...' : 'Assign & notify →'}
                </button>
              )}
              {issue.status === 'solved' && <button onClick={archiveIssue}>Archive →</button>}
            </div>
          </div>

          {pendingAssignment && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FFF8F5', border: '0.5px solid #E85D26',
              borderRadius: 6, padding: '8px 12px', marginBottom: 10,
              fontSize: 13, color: '#7A2D00',
            }}>
              <span style={{ fontSize: 15 }}>⚠</span>
              <span>Assignment changed — hit <strong>Assign &amp; notify</strong> to save and notify the team.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Manager responsible</div>
              <select value={manager} onChange={e => saveManager(e.target.value)} style={{ marginBottom: 0 }}>
                <option value="">Unassigned</option>
                {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Assigned to (staff)</div>
              <MultiSelectUsers value={assignedTo} onChange={saveAssignedTo} users={users} />
            </div>
          </div>
          {assignError && <div style={{ color: '#C62828', fontSize: 13, marginTop: 8 }}>{assignError}</div>}
          {issue.assignedAt && (
            <div className={styles.fieldMeta} style={{ marginTop: 6 }}>Last assigned by {issue.assignedBy} · {fmtDateTime(issue.assignedAt)}</div>
          )}
        </div>

      </div>

      {/* ── Float bar ── */}
      <div className={styles.floatBar}>
        <div className={styles.floatBarInner}>
          <button onClick={onBack}>← Back</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isSolvedOrArchived && (
              confirmSolve ? (
                <>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>All fixed?</span>
                  <button style={{ background: '#2E7D32', borderColor: '#1B5E20', color: 'white' }}
                    onClick={() => { setConfirmSolve(false); doAdvance('solved') }}>Yes, solved ✓</button>
                  <button onClick={() => setConfirmSolve(false)}>Cancel</button>
                </>
              ) : (
                <button style={{ background: '#2E7D32', borderColor: '#1B5E20', color: 'white' }}
                  onClick={() => setConfirmSolve(true)}>Mark solved ✓</button>
              )
            )}
            {issue.status === 'solved' && (
              <button onClick={() => advanceStatus('archived')}>Archive →</button>
            )}
            {!confirmSolve && (
              <button
                className={`btn-primary ${styles.saveBtn}`}
                onClick={pendingAssignment ? () => {
                  assignSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                } : saveAll}
                disabled={saving}
                style={pendingAssignment ? { background: '#888', borderColor: '#666', cursor: 'default' } : {}}
                title={pendingAssignment ? 'Assignment changed — use Assign & notify instead' : ''}
              >
                {saving ? 'Saving...' : pendingAssignment ? 'Use Assign & notify ↑' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}