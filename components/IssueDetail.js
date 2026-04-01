import { useState } from 'react'
import styles from './IssueDetail.module.css'

const LOCATION_COLORS = [
  { bg: '#E8EDF5', color: '#3D5A8A', border: '#C5D0E6' },
  { bg: '#EAF2EA', color: '#2E6B3E', border: '#C0DBC5' },
  { bg: '#F5ECE8', color: '#8A4A2F', border: '#E6CFC5' },
  { bg: '#F5F0E8', color: '#7A5C1E', border: '#E6D9C0' },
  { bg: '#E8F2F2', color: '#2A6B6B', border: '#C0DBDB' },
  { bg: '#F0EAF5', color: '#5A3D8A', border: '#D5C5E6' },
]
function getLocationColor(name) {
  if (!name) return LOCATION_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return LOCATION_COLORS[Math.abs(hash) % LOCATION_COLORS.length]
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
  function toggle(username) {
    onChange(value.includes(username) ? value.filter(u => u !== username) : [...value, username])
  }
  return (
    <div style={{ position: 'relative' }}>
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

  const managerUsers = users.filter(u => u.isAdmin || (u.locationRoles || []).some(r => r.role === 'manager'))
  const isSolvedOrArchived = issue.status === 'solved' || issue.status === 'archived'

  async function patch(fields) {
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const updated = await res.json()
    onUpdate(updated)
    return updated
  }

  function getLogEntry(s) { return statusLog.find(l => l.status === s) }

  async function advanceStatus(s) {
    const newLog = statusLog.filter(l => l.status !== s)
    newLog.push({ status: s, ts: new Date().toISOString(), by: currentUser.name })
    await patch({ status: s, statusLog: newLog })
    onToast('Status updated')
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

  async function markStatus(status) {
    const newLog = statusLog.filter(l => l.status !== status)
    newLog.push({ status, ts: new Date().toISOString(), by: currentUser.name })
    await patch({ ...coreFields(), status, statusLog: newLog })
    onToast(`Marked as ${STEP_LABELS[STEPS.indexOf(status)]}`)
  }

  async function saveInvestigating(val) {
    setInvestigating(val)
    const u = users.find(u => u.username === val)
    await patch({ investigating: val, investigatingName: u?.name || '', investigatingBy: currentUser.name, investigatingAt: new Date().toISOString() })
    onToast('Saved')
  }

  async function saveManager(val) {
    setManager(val)
    const u = users.find(u => u.username === val)
    await patch({ manager: val, managerName: u?.name || '' })
    onToast('Saved')
  }

  async function saveAssignedTo(val) {
    setAssignedTo(val)
    await patch({
      assignedTo: val,
      assignedBy: currentUser.name,
      assignedAt: new Date().toISOString(),
      assignedEmail: val.map(u => users.find(x => x.username === u)?.email || '').filter(Boolean).join(','),
    })
    onToast('Saved')
  }

  async function addNote() {
    if (!newNote.trim()) return
    const note = { text: newNote.trim(), authorName: currentUser.name, ts: new Date().toISOString() }
    await patch({ notes: [...issue.notes, note] })
    setNewNote('')
    onToast('Note added')
  }

  async function archiveIssue() {
    const newLog = statusLog.filter(l => l.status !== 'archived')
    newLog.push({ status: 'archived', ts: new Date().toISOString(), by: currentUser.name })
    await patch({ status: 'archived', statusLog: newLog })
    onToast('Archived')
    onBack()
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
          <LocationPill name={issue.locationName} />
          <span className={styles.chip}>By {issue.submittedByName || issue.submittedBy}{issue.location ? ` · ${issue.location}` : ''} · {fmtDate(issue.createdAt)} at {fmtTime(issue.createdAt)}</span>
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
        {issue.reportedVia && (
          <div style={{ marginTop: 6 }}>
            <span className={styles.chip}>
              Reported by {issue.reportedVia}{issue.reportedByName ? `: ${issue.reportedByName}` : ''}
            </span>
          </div>
        )}

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
        <div className="section-label" style={{ marginTop: '1rem' }}>Issue progress</div>
        <div className={styles.track}>
          {STEPS.map((s, i) => {
            const log = getLogEntry(s)
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

        {divider}

        {/* ── 1. Who's looking into this ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 0, whiteSpace: 'nowrap' }}>Who&apos;s looking into this?</div>
          <select value={investigating} onChange={e => saveInvestigating(e.target.value)} style={{ marginBottom: 0, width: 'auto', minWidth: 140, maxWidth: 200 }}>
            <option value="">Unassigned</option>
            {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
          </select>
        </div>
        {issue.investigatingBy && (
          <div className={styles.fieldMeta} style={{ marginBottom: 12 }}>Set by {issue.investigatingBy} · {fmtDateTime(issue.investigatingAt)}</div>
        )}

        {/* ── 2. Identify the real issue ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Identify the real issue</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={async () => { await patch({ realIssue, realIssueBy: currentUser.name, realIssueAt: new Date().toISOString() }); onToast('Real issue saved') }}>Save</button>
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
          placeholder="What is the actual root issue beneath the surface problem?"
          value={realIssue}
          onChange={e => setRealIssue(e.target.value)}
          style={{ marginBottom: 4 }}
        />
        {issue.realIssueBy && (
          <div className={styles.fieldMeta}>{`Last edited by ${issue.realIssueBy} · ${fmtDateTime(issue.realIssueAt)}`}</div>
        )}

        {divider}

        {/* ── 3. Discuss ── */}
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

        {divider}

        {/* ── 4. Solution ── */}
        <div className="section-label" style={{ marginTop: 0 }}>Solution</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            placeholder="What is the fix? Who is actioning it and by when?"
            value={solution}
            onChange={e => setSolution(e.target.value)}
            style={{ flex: 1, minHeight: 80, marginBottom: 0 }}
          />
          <button onClick={async () => { await patch({ solution, solutionBy: currentUser.name, solutionAt: new Date().toISOString() }); onToast('Solution saved') }}
            style={{ alignSelf: 'flex-end', flexShrink: 0 }}>Save</button>
        </div>
        {issue.solutionBy && (
          <div className={styles.fieldMeta} style={{ marginTop: 4 }}>Last edited by {issue.solutionBy} · {fmtDateTime(issue.solutionAt)}</div>
        )}

        {divider}

        {/* ── 5. Assign ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Assign</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isSolvedOrArchived && (
              <button
                className="btn-primary"
                onClick={() => markStatus('assigned')}
                disabled={assignedTo.length === 0}
                title={assignedTo.length === 0 ? 'Assign someone first' : ''}
              >Mark assigned →</button>
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
              <option value="">Unassigned</option>
              {managerUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Assigned to (staff)</div>
            <MultiSelectUsers value={assignedTo} onChange={saveAssignedTo} users={users} />
          </div>
        </div>
        {issue.assignedAt && (
          <div className={styles.fieldMeta} style={{ marginTop: 6 }}>Last updated by {issue.assignedBy} · {fmtDateTime(issue.assignedAt)}</div>
        )}

      </div>

      {/* ── Float bar ── */}
      <div className={styles.floatBar}>
        <button onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isSolvedOrArchived && (
            confirmSolve ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>Fix done in real world?</span>
                <button style={{ background: '#2E7D32', borderColor: '#1B5E20', color: 'white' }}
                  onClick={() => { setConfirmSolve(false); markStatus('solved') }}>
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
            <button onClick={archiveIssue}>Archive →</button>
          )}
          <button className={`btn-primary ${styles.saveBtn}`} onClick={saveAll} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}