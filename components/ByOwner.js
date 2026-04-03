import styles from './ByOwner.module.css'

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const STATUS_LABEL = {
  submitted: 'Submitted', identified: 'Identified',
  assigned: 'Assigned', discussing: 'Discussing', solved: 'Solved', archived: 'Archived'
}

const STATUS_ORDER = { submitted: 0, identified: 1, discussing: 2, solved: 3, archived: 4 }

function daysSince(str) {
  if (!str) return 0
  return Math.floor((Date.now() - new Date(str).getTime()) / (1000 * 60 * 60 * 24))
}

function daysToResolve(createdAt, statusLog) {
  const resolved = (statusLog || []).find(l => l.status === 'solved' || l.status === 'archived')
  if (!resolved) return null
  return Math.max(0, Math.floor((new Date(resolved.ts) - new Date(createdAt)) / (1000 * 60 * 60 * 24)))
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function sortIssues(issues) {
  return [...issues].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export default function ByOwner({ issues, users, onSelect }) {
  const active = (issues || []).filter(i => i.status !== 'archived')

  const hasManager = (i) => i.manager && String(i.manager).trim()

  // Not yet identified: submitted status, no manager assigned (issue is still raw)
  const notYetIdentified = sortIssues(
    active.filter(i => !hasManager(i) && i.status === 'submitted')
  )

  // Unassigned: identified or beyond, but no manager has been given responsibility
  const needsManager = sortIssues(
    active.filter(i => !hasManager(i) && i.status !== 'submitted' && i.status !== 'solved')
  )

  // Solved with no manager
  const solvedNoManager = active.filter(i => !hasManager(i) && i.status === 'solved')

  // Group by manager
  const managerGroups = (users || []).map(u => ({
    label: u.name,
    username: u.username,
    issues: sortIssues(active.filter(i => i.manager === u.username)),
  })).filter(g => g.issues.length > 0)

  const allGroups = [
    ...(needsManager.length > 0
      ? [{ label: 'Unassigned', username: '__unassigned', issues: needsManager }]
      : []),
    ...(notYetIdentified.length > 0
      ? [{ label: 'Not Yet Identified', username: '__not_identified', issues: notYetIdentified }]
      : []),
    ...managerGroups,
  ]

  if (allGroups.length === 0 && solvedNoManager.length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: 14 }}>No active issues.</div>
  }

  const renderCard = (issue) => {
    const rawLN = issue.locationName || ''
    const area = rawLN.includes(' — ') ? rawLN.split(' — ')[1] : (!['Nolita', 'South Orange'].includes(rawLN) ? rawLN : '')
    return (
      <div key={issue.id} className={styles.card} onClick={() => onSelect(issue.id)}>
        <div className={styles.cardLeft}>
          <div className={styles.title}>{issue.title}</div>
          <div className={styles.meta}>
            <span className={`${styles.urgencyTag} ${styles['u_' + (issue.urgency || 'medium')]}`}>
              {issue.urgency || 'medium'}
            </span>
            {area && <><span className={styles.dot}>·</span><span>{area}</span></>}
            <span className={styles.metaBreak} />
            <span className={styles.dot}>·</span>
            <span>{fmtDateTime(issue.createdAt)}</span>
          </div>
        </div>
        <div className={styles.statusCol}>
          <span className={`status-badge s-${issue.status}`}>{STATUS_LABEL[issue.status] || issue.status}</span>
          {issue.status === 'solved'
            ? <span className={styles.daysResolved}>Resolved in {daysToResolve(issue.createdAt, issue.statusLog) ?? daysSince(issue.createdAt)}d</span>
            : <span className={styles.daysUnresolved}>{daysSince(issue.createdAt)}d unresolved</span>
          }
        </div>
      </div>
    )
  }

  const renderGroup = (group) => {
    const isNotIdentified = group.username === '__not_identified'
    const isUnassigned = group.username === '__unassigned'
    const isSpecial = isNotIdentified || isUnassigned

    return (
      <div key={group.username} id={'manager-' + group.username} className={styles.group}>
        <div className={styles.groupHeader}>
          <div className={styles.groupIdentity}>
            <div className={styles.avatar + (isSpecial ? ' ' + styles.avatarGray : '')}>
              {isNotIdentified ? '?' : isUnassigned ? '–' : initials(group.label)}
            </div>
            <span className={styles.groupName}>{group.label}</span>
            <span className={styles.groupCount}>{group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.list}>{group.issues.map(renderCard)}</div>
      </div>
    )
  }

  return (
    <div>
      {allGroups.length > 1 && (
        <div className={styles.jumpNav}>
          {allGroups.map(g => (
            <a key={g.username} href={'#manager-' + g.username} className={styles.jumpLink}
              onClick={e => {
                e.preventDefault()
                const el = document.getElementById('manager-' + g.username)
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 80
                  window.scrollTo({ top: y, behavior: 'smooth' })
                }
              }}
            >
              {g.label}
              <span className={styles.jumpCount}>{g.issues.length}</span>
            </a>
          ))}
        </div>
      )}

      {allGroups.map(renderGroup)}

      {solvedNoManager.length > 0 && (
        <div className={styles.group} style={{ marginTop: '1rem', opacity: 0.6 }}>
          <div className={styles.groupHeader}>
            <div className={styles.groupIdentity}>
              <div className={`${styles.avatar} ${styles.avatarGray}`}>✓</div>
              <span className={styles.groupName}>Resolved without manager</span>
              <span className={styles.groupCount}>{solvedNoManager.length} issue{solvedNoManager.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className={styles.list}>{solvedNoManager.map(renderCard)}</div>
        </div>
      )}
    </div>
  )
}