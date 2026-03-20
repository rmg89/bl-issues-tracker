import { useState, useMemo } from 'react'
import styles from './IssueList.module.css'

function fmtDateTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(str) {
  if (!str) return 0
  return Math.floor((Date.now() - new Date(str).getTime()) / (1000 * 60 * 60 * 24))
}

function daysToResolve(createdAt, statusLog) {
  const resolved = (statusLog || []).find(l => l.status === 'solved' || l.status === 'archived')
  if (!resolved) return null
  return Math.max(0, Math.floor((new Date(resolved.ts) - new Date(createdAt)) / (1000 * 60 * 60 * 24)))
}

const STATUS_LABEL = {
  submitted: 'Submitted', identified: 'Identified',
  discussing: 'Discussing', solved: 'Solved', archived: 'Archived'
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 }
const STATUS_ORDER = { submitted: 0, identified: 1, discussing: 2, solved: 3, archived: 4 }

const GROUP_LABELS = {
  new: 'New — awaiting review',
  open: 'Open issues',
  resolved: 'Resolved',
  high: 'High urgency',
  medium: 'Medium urgency',
  low: 'Low urgency',
  submitted: 'Submitted', identified: 'Identified',
  discussing: 'Discussing', solved: 'Solved', archived: 'Archived'
}

function getGroupKey(issue, sortBy) {
  const isResolved = issue.status === 'solved'
  if (sortBy === 'newest' || sortBy === 'oldest') {
    if (issue.status === 'submitted') return 'new'
    return isResolved ? 'resolved' : 'open'
  }
  if (sortBy === 'urgency_high' || sortBy === 'urgency_low') return isResolved ? 'resolved' : issue.urgency
  if (sortBy === 'status_active' || sortBy === 'status_resolved') return issue.status
  return null
}

export default function IssueList({ issues, onSelect, isAdmin, initialSort, currentUser }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(initialSort || 'newest')
  const [showArchived, setShowArchived] = useState(false)

  const archivedCount = issues.filter(i => i.status === 'archived').length

  // Archived-only view — sorted by archived date desc, searchable
  const archivedIssues = useMemo(() => {
    let list = issues.filter(i => i.status === 'archived')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      const aTs = a.statusLog?.find(l => l.status === 'archived')?.ts || a.createdAt
      const bTs = b.statusLog?.find(l => l.status === 'archived')?.ts || b.createdAt
      return new Date(bTs) - new Date(aTs)
    })
  }, [issues, search])

  const filtered = useMemo(() => {
    if (showArchived) return []
    let list = issues.filter(i => i.status !== 'archived')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q))
    }

    const rank = s => s === 'submitted' ? 0 : s === 'solved' ? 2 : 1
    const resolvedLast = (a, b) => {
      const ar = a.status === 'solved' ? 1 : 0
      const br = b.status === 'solved' ? 1 : 0
      return ar - br
    }

    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => rank(a.status) - rank(b.status) || new Date(b.createdAt) - new Date(a.createdAt)); break
      case 'oldest':
        list.sort((a, b) => rank(a.status) - rank(b.status) || new Date(a.createdAt) - new Date(b.createdAt)); break
      case 'urgency_high':
        list.sort((a, b) => resolvedLast(a, b) || URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]); break
      case 'urgency_low':
        list.sort((a, b) => resolvedLast(a, b) || URGENCY_ORDER[b.urgency] - URGENCY_ORDER[a.urgency]); break
      case 'status_active':
        list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]); break
      case 'status_resolved':
        list.sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status]); break
    }
    return list
  }, [issues, search, sortBy, showArchived])

  function renderCard(issue) {
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
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaDate}>{fmtDateTime(issue.createdAt)}</span>
            </div>
          </div>
          <div className={styles.statusCol}>
            <span className={`status-badge s-${issue.status}`}>
              {STATUS_LABEL[issue.status]}
            </span>
            {issue.status === 'solved' ? (
              <span className={styles.daysResolved}>
                Resolved in {daysToResolve(issue.createdAt, issue.statusLog) ?? daysSince(issue.createdAt)}d
              </span>
            ) : issue.status !== 'archived' ? (
              <span className={styles.daysUnresolved}>
                {daysSince(issue.createdAt)}d unresolved
              </span>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder={showArchived ? 'Search archived...' : 'Search issues...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!showArchived && (
          <select className={styles.sort} value={sortBy} onChange={e => setSortBy(e.target.value)}>
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
        )}
        {archivedCount > 0 && (
          <button
            className={`${styles.archiveToggle} ${showArchived ? styles.archiveToggleOn : ''}`}
            onClick={() => { setShowArchived(s => !s); setSearch('') }}
          >
            {showArchived ? '← Back to issues' : `See archived (${archivedCount})`}
          </button>
        )}
      </div>

      {showArchived && (
        <div className={styles.archivedBanner}>
          Archived issues · {archivedIssues.length} total
        </div>
      )}

      {showArchived ? (
        !archivedIssues.length ? (
          <div className={styles.empty}>
            {search ? `No archived issues matching "${search}"` : 'No archived issues.'}
          </div>
        ) : (
          <div className={styles.list}>
            {archivedIssues.map(renderCard)}
          </div>
        )
      ) : (
        !filtered.length ? (
          <div className={styles.empty}>
            {search ? `No issues matching "${search}"` : 'No issues yet.'}
          </div>
        ) : (
          <div className={styles.list}>
            {(() => {
              let lastGroup = null
              return filtered.map(issue => {
                const groupKey = getGroupKey(issue, sortBy)
                const showHeader = groupKey !== null && groupKey !== lastGroup
                if (showHeader) lastGroup = groupKey
                const groupCount = groupKey
                  ? filtered.filter(i => getGroupKey(i, sortBy) === groupKey).length
                  : null

                return (
                  <div key={issue.id}>
                    {showHeader && (
                      <div className={styles.groupHeader}>
                        <span>{GROUP_LABELS[groupKey] || groupKey}</span>
                        <span className={styles.groupHeaderCount}>{groupCount}</span>
                      </div>
                    )}
                    {renderCard(issue)}
                  </div>
                )
              })
            })()}
          </div>
        )
      )}
    </div>
  )
}