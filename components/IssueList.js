import { useState, useMemo } from 'react'
import styles from './IssueList.module.css'

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(str) {
  const diff = Date.now() - new Date(str).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function daysToResolve(createdAt, statusLog) {
  const resolved = statusLog?.find(l => l.status === 'solved' || l.status === 'archived')
  if (!resolved) return null
  const diff = new Date(resolved.ts).getTime() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const STATUS_LABEL = {
  submitted: 'Submitted', identified: 'Identified',
  discussing: 'Discussing', solved: 'Solved', archived: 'Archived'
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 }
const STATUS_ORDER = { submitted: 0, identified: 1, discussing: 2, solved: 3, archived: 4 }

export default function IssueList({ issues, onSelect, isAdmin }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    let list = [...issues]
    if (!showArchived) list = list.filter(i => i.status !== 'archived')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q))
    }
    switch (sortBy) {
      case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break
      case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break
      case 'urgency_high': list.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]); break
      case 'urgency_low': list.sort((a, b) => URGENCY_ORDER[b.urgency] - URGENCY_ORDER[a.urgency]); break
      case 'status_active': list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]); break
      case 'status_resolved': list.sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status]); break
    }
    return list
  }, [issues, search, sortBy, showArchived])

  const archivedCount = issues.filter(i => i.status === 'archived').length

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder="Search issues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.sort}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <optgroup label="Date">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </optgroup>
          <optgroup label="Urgency">
            <option value="urgency_high">Highest urgency first</option>
            <option value="urgency_low">Lowest urgency first</option>
          </optgroup>
          <optgroup label="Status">
            <option value="status_active">Active first</option>
            <option value="status_resolved">Resolved first</option>
          </optgroup>
        </select>
        {archivedCount > 0 && (
          <button
            className={`${styles.archiveToggle} ${showArchived ? styles.archiveToggleOn : ''}`}
            onClick={() => setShowArchived(s => !s)}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        )}
      </div>

      {!filtered.length ? (
        <div className={styles.empty}>
          {search ? `No issues matching "${search}"` : 'No issues yet.'}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(issue => {
            const submitter = issue.submittedByName || issue.submittedBy
            return (
              <div
                key={issue.id}
                className={`${styles.card} ${isAdmin ? styles.clickable : ''} ${issue.status === 'archived' ? styles.archived : ''}`}
                onClick={() => isAdmin && onSelect(issue.id)}
              >
                <div className={styles.header}>
                  <div className={styles.left}>
                    <div className={styles.title}>{issue.title}</div>
                    <div className={styles.meta}>
                      <span className={`${styles.urgencyTag} ${styles['u_' + issue.urgency]}`}>
                        {issue.urgency}
                      </span>
                      {issue.location && <><span className={styles.dot}>·</span><span>{issue.location}</span></>}
                      {submitter && <><span className={styles.dot}>·</span><span>By {submitter}</span></>}
                      <span className={styles.metaBreak} />
                      <span className={styles.metaDate}>{fmtDate(issue.createdAt)}</span>
                    </div>
                  </div>
                  <div className={styles.statusCol}>
                    <span className={`status-badge s-${issue.status}`}>
                      {STATUS_LABEL[issue.status]}
                    </span>
                    {(issue.status === 'solved' || issue.status === 'archived') ? (
                      <span className={styles.daysResolved}>
                        Resolved in {daysToResolve(issue.createdAt, issue.statusLog) ?? daysSince(issue.createdAt)}d
                      </span>
                    ) : (
                      <span className={styles.daysUnresolved}>
                        {daysSince(issue.createdAt)}d unresolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}