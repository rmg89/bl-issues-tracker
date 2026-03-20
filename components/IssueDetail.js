import { useState } from 'react'
import styles from './IssueDetail.module.css'

const STEPS = ['submitted', 'identified', 'discussing', 'solved', 'archived']
const STEP_LABELS = ['Submitted', 'Identified', 'Discussing', 'Solved', 'Archived']

function fmtDateTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function IssueDetail({ issue, users, currentUser, onBack, onUpdate, onToast }) {
  const [realIssue, setRealIssue] = useState(issue.realIssue)
  const [solution, setSolution] = useState(issue.solution)
  const [assignedTo, setAssignedTo] = useState(issue.assignedTo)
  const [assignedChanged, setAssignedChanged] = useState(false)
  const [urgency, setUrgency] = useState(issue.urgency)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const si = STEPS.indexOf(issue.status)
  const rawLog = issue.statusLog || []
  // Auto-populate submitted entry from createdAt if not already in log
  const statusLog = rawLog.find(l => l.status === 'submitted')
    ? rawLog
    : [{ status: 'submitted', ts: issue.createdAt, by: issue.submittedByName || issue.submittedBy }, ...rawLog]

  // Only show admins in the assign dropdown
  const adminUsers = users.filter(u => u.isAdmin)

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

  async function advanceStatus(s) {
    const newLog = statusLog.filter(l => l.status !== s)
    newLog.push({ status: s, ts: new Date().toISOString(), by: currentUser.name })
    await patch({ status: s, statusLog: newLog })
    onToast('Status updated')
  }

  function getLogEntry(s) {
    return statusLog.find(l => l.status === s)
  }

  async function saveEdits() {
    setSaving(true)
    const fields = {
      realIssue,
      solution,
      urgency,
      realIssueBy: realIssue !== issue.realIssue ? currentUser.name : issue.realIssueBy,
      realIssueAt: realIssue !== issue.realIssue ? new Date().toISOString() : issue.realIssueAt,
      solutionBy: solution !== issue.solution ? currentUser.name : issue.solutionBy,
      solutionAt: solution !== issue.solution ? new Date().toISOString() : issue.solutionAt,
    }

    if (assignedChanged) {
      const assignedUser = users.find(u => u.username === assignedTo)
      fields.assignedTo = assignedTo
      fields.assignedBy = currentUser.name
      fields.assignedAt = new Date().toISOString()
      fields.assignedEmail = assignedUser?.email || ''
    } else {
      fields.assignedTo = assignedTo
    }

    await patch(fields)
    setSaving(false)
    onToast('Changes saved')
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
    onToast('Issue archived')
    onBack()
  }

  return (
    <div>
      <div className="card">
        <div className={styles.topRow}>
          <h2 className={styles.title}>{issue.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span className={`status-badge s-${issue.status}`}>{STEP_LABELS[si]}</span>
          </div>
        </div>

        {issue.description && <p className={styles.desc}>{issue.description}</p>}

        <div className={styles.chips}>
          {issue.location && <span className={styles.chip}>{issue.location}</span>}
          <span className={styles.chip}>By {issue.submittedByName || issue.submittedBy} · {fmtDate(issue.createdAt)}</span>
          <span className={`${styles.urgencyTag} ${styles['u_' + urgency]}`}>{urgency} urgency</span>
          <span className={styles.changeUrgency}>
            change
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: '140px', height: '100%', top: 0, left: 0, cursor: 'pointer' }}
            >
              <option value="low">Low urgency</option>
              <option value="medium">Medium urgency</option>
              <option value="high">High urgency</option>
            </select>
          </span>
        </div>

        {issue.photos && issue.photos.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: '1.25rem' }}>Photos</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {issue.photos.map((photo, i) => (
                <a key={i} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.filename || `Photo ${i + 1}`}
                    style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--border)', cursor: 'pointer' }}
                  />
                </a>
              ))}
            </div>
          </>
        )}

        <div className="section-label" style={{ marginTop: '1.25rem' }}>Issue progress</div>
        <div className={styles.track}>
          {STEPS.map((s, i) => {
            const log = getLogEntry(s)
            return (
              <button
                key={s}
                className={`${styles.step} ${i < si ? styles.done : ''} ${i === si ? styles.active : ''}`}
                onClick={() => advanceStatus(s)}
              >
                <span className={styles.stepLabel}>{STEP_LABELS[i]}</span>
                {log && (
                  <span className={styles.stepTs}>
                    {fmtDate(log.ts)}<br />{fmtTime(log.ts)}<br />by {log.by}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="section-label" style={{ marginTop: '1.25rem' }}>Assign owner</div>
        <div className={styles.assignRow}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Owned by:</span>
          <select value={assignedTo} onChange={e => { setAssignedTo(e.target.value); setAssignedChanged(true) }} style={{ flex: 1, marginBottom: 0 }}>
            <option value="">Unassigned</option>
            {adminUsers.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
          </select>
        </div>
        {issue.assignedBy && (
          <div className={styles.fieldMeta}>
            Assigned by {issue.assignedBy} · {fmtDateTime(issue.assignedAt)}
          </div>
        )}

        <div className="section-label" style={{ marginTop: '0.75rem' }}>Identify — real issue</div>
        <textarea
          placeholder="What is the actual root issue beneath the surface problem?"
          value={realIssue}
          onChange={e => setRealIssue(e.target.value)}
          style={{ marginBottom: '4px' }}
        />
        {issue.realIssueBy && (
          <div className={styles.fieldMeta}>
            Last edited by {issue.realIssueBy} · {fmtDateTime(issue.realIssueAt)}
          </div>
        )}
        <div className="section-label" style={{ marginTop: '1rem' }}>Discuss — notes</div>
        <div className={styles.notes}>
          {issue.notes.length ? issue.notes.map((n, i) => (
            <div key={i} className={styles.note}>
              <div className={styles.noteText}>{n.text}</div>
              <div className={styles.noteMeta}>{n.authorName} · {fmtDateTime(n.ts)}</div>
            </div>
          )) : (
            <div className={styles.noNotes}>No discussion yet.</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            placeholder="Add a note or discussion point..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            style={{ flex: 1, minHeight: 64 }}
          />
          <button onClick={addNote} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>Add</button>
        </div>

        <div className="section-label" style={{ marginTop: '0.5rem' }}>Solve — resolution</div>
        <textarea
          placeholder="What is the agreed solution? Who will action it and by when?"
          value={solution}
          onChange={e => setSolution(e.target.value)}
          style={{ marginBottom: '4px' }}
        />
        {issue.solutionBy && (
          <div className={styles.fieldMeta}>
            Last edited by {issue.solutionBy} · {fmtDateTime(issue.solutionAt)}
          </div>
        )}

      </div>

      <div className={styles.floatBar}>
        <button onClick={onBack}>← Back</button>
        <button className={`btn-primary ${styles.saveBtn}`} onClick={saveEdits} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}