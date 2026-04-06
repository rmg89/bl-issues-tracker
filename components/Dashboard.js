import styles from './Dashboard.module.css'

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

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getLastAction(issue) {
  const events = []

  if (issue.statusLog?.length) {
    const last = [...issue.statusLog].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0]
    const labels = { submitted: 'Submitted', identified: 'Identified', assigned: 'Assigned', discussing: 'Discussing', solved: 'Solved', archived: 'Archived' }
    events.push({ ts: last.ts, by: last.by, what: `Marked as ${labels[last.status] || last.status}` })
  }

  if (issue.notes?.length) {
    const last = [...issue.notes].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0]
    events.push({ ts: last.ts, by: last.authorName, what: 'Note added' })
  }

  if (issue.assignedAt && issue.assignedBy) {
    const assignedNames = Array.isArray(issue.assignedTo)
      ? issue.assignedTo.join(', ')
      : String(issue.assignedTo || '')
    const manager = issue.managerName || issue.manager
    const what = manager
      ? `Manager: ${manager}${assignedNames ? ' · Assigned to: ' + assignedNames : ''}`
      : assignedNames ? `Assigned to: ${assignedNames}` : 'Assigned'
    events.push({ ts: issue.assignedAt, by: issue.assignedBy, what })
  }

  if (issue.realIssueAt && issue.realIssueBy) {
    events.push({ ts: issue.realIssueAt, by: issue.realIssueBy, what: 'Real issue updated' })
  }

  if (issue.solutionAt && issue.solutionBy) {
    events.push({ ts: issue.solutionAt, by: issue.solutionBy, what: 'Resolution updated' })
  }

  if (!events.length) return { ts: issue.createdAt, by: issue.submittedByName || issue.submittedBy, what: 'Submitted' }

  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts))[0]
}

const STATUS_LABEL = {
  submitted: 'Submitted', identified: 'Identified',
  assigned: 'Assigned', solved: 'Solved', archived: 'Archived'
}

export default function Dashboard({ issues, currentUser, activeLocation, onNavigate, onSelectIssue }) {
  const now = new Date()
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const active = issues.filter(i => i.status !== 'archived')
  const open = active.filter(i => i.status !== 'solved')
  const highUrgency = open.filter(i => i.urgency === 'high')

  // Unassigned: identified but no manager yet
  const unassigned = issues.filter(i =>
    i.status === 'identified' && (!i.manager || !String(i.manager).trim())
  )

  const getSolvedTs = (issue) => {
    const log = issue.statusLog?.find(l => l.status === 'solved')
    return log ? new Date(log.ts) : null
  }

  const resolvedThisWeek = issues.filter(i => {
    if (i.status !== 'solved') return false
    const ts = getSolvedTs(i)
    return ts && ts >= oneWeekAgo
  })

  const readyToArchive = issues.filter(i => {
    if (i.status !== 'solved') return false
    const ts = getSolvedTs(i)
    return ts && ts < oneWeekAgo
  })

  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000)
  const newIssues = issues.filter(i =>
    i.status === 'submitted' && new Date(i.createdAt) >= fortyEightHoursAgo
  )

  const recent = [...issues]
    .filter(i => i.status !== 'archived')
    .sort((a, b) => {
      const aLatest = a.statusLog?.length ? Math.max(...a.statusLog.map(l => new Date(l.ts))) : new Date(a.createdAt)
      const bLatest = b.statusLog?.length ? Math.max(...b.statusLog.map(l => new Date(l.ts))) : new Date(b.createdAt)
      return bLatest - aLatest
    })
    .slice(0, 10)

  return (
    <div className={styles.wrap}>
      <div className={styles.greeting}>
        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {currentUser.name}.
        {activeLocation
          ? <span className={styles.locationLabel}>{activeLocation.name}</span>
          : <span className={styles.locationLabel}>All locations</span>
        }
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.statOrange}`} onClick={() => onNavigate('issues', 'newest', null)}>
          <div className={styles.statNumber}>{open.length}</div>
          <div className={styles.statLabel}>Open issues</div>
        </div>
        <div className={`${styles.stat} ${styles.statRed}`} onClick={() => onNavigate('issues', 'urgency_high', null)}>
          <div className={styles.statNumber}>{highUrgency.length}</div>
          <div className={styles.statLabel}>High urgency</div>
        </div>
        <div className={`${styles.stat} ${styles.statAmber}`} onClick={() => onNavigate('issues', 'newest', null, 'bymanager')}>
          <div className={styles.statNumber}>{unassigned.length}</div>
          <div className={styles.statLabel}>Needs manager</div>
        </div>
        <div className={`${styles.stat} ${styles.statGreen}`} onClick={() => onNavigate('issues', 'status_resolved', null)}>
          <div className={styles.statNumber}>{resolvedThisWeek.length}</div>
          <div className={styles.statLabel}>Resolved this week</div>
        </div>
      </div>

      {newIssues.length > 0 && (
        <div className={styles.newPrompt} onClick={() => onNavigate('issues', 'newest', null)}>
          <span className={styles.archivePromptIcon}>★</span>
          <span>{newIssues.length} new issue{newIssues.length !== 1 ? 's' : ''} in the past 48 hours</span>
        </div>
      )}

      {readyToArchive.length > 0 && (
        <div className={styles.archivePrompt} onClick={() => onNavigate('issues', 'status_resolved', null)}>
          <span className={styles.archivePromptIcon}>→</span>
          <span>{readyToArchive.length} resolved issue{readyToArchive.length !== 1 ? 's' : ''} ready to archive</span>
        </div>
      )}

      <button className={`btn-primary ${styles.submitBtn}`} onClick={() => onNavigate('submit')}>
        + Submit new issue
      </button>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>Recent activity</div>
        {recent.length === 0 && (
          <div className={styles.empty}>No recent activity.</div>
        )}
        {recent.map(issue => {
          const action = getLastAction(issue)
          return (
            <div key={issue.id} className={styles.activityRow} onClick={() => onSelectIssue(issue.id)}>
              <div className={styles.activityLeft}>
                <div className={styles.activityTitle}>{issue.title}</div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityAction}>{action.what}</span> · {action.by} · {fmtDate(action.ts)} at {fmtTime(action.ts)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <LocationPill name={issue.locationName?.includes(' — ') ? issue.locationName.split(' — ')[0] : (issue.locationName || '')} />
                <span className={`status-badge s-${issue.status}`}>{STATUS_LABEL[issue.status]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}