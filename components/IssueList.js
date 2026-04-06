import { useState, useMemo } from 'react'
import styles from './IssueList.module.css'

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

function fmtDateTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_LABEL = {
  submitted: 'Submitted', identified: 'Identified',
  assigned: 'Assigned', solved: 'Solved', archived: 'Archived'
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 }
const STATUS_ORDER = { submitted: 0, identified: 1, assigned: 2, solved: 3, archived: 4 }

const GROUP_LABELS = {
  new: 'New — awaiting review',
  open: 'Open issues',
  resolved: 'Resolved',
  high: 'High urgency',
  medium: 'Medium urgency',
  low: 'Low urgency',
  submitted: 'Submitted', identified: 'Identified',
  assigned: 'Assigned', solved: 'Solved', archived: 'Archived'
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

function sortIssues(issues) {
  return [...issues].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export default function IssueList({ issues, locations, onSelect, isAdmin, initialSort, initialFilter, initialViewMode, currentUser, users }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(initialSort || 'newest')
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useState(initialViewMode || 'list')

  const archivedCount = issues.filter(i => i.status === 'archived').length

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

  const managerGroups = useMemo(() => {
    if (viewMode !== 'bymanager') return null
    const active = issues.filter(i => i.status !== 'archived')
    const hasManager = i => i.manager && String(i.manager).trim()

    const notYetIdentified = sortIssues(active.filter(i => !hasManager(i) && i.status === 'submitted'))
    const needsManager = sortIssues(active.filter(i => !hasManager(i) && i.status !== 'submitted' && i.status !== 'solved'))
    const solvedNoManager = active.filter(i => !hasManager(i) && i.status === 'solved')

    const groups = (users || []).map(u => ({
      label: u.name,
      username: u.username,
      issues: sortIssues(active.filter(i => i.manager === u.username)),
    })).filter(g => g.issues.length > 0)

    return { needsManager, notYetIdentified, solvedNoManager, managerGroups: groups }
  }, [issues, users, viewMode])

  function renderCard(issue) {
    const submitter = issue.submittedByName || issue.submittedBy
    const rawLocationName = issue.locationName || ''
    const knownLocationNames = (locations || []).map(l => l.name)
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
              {submitter && <><span className={styles.dot}>·</span><span>By {submitter}</span></>}
              {areaEquipment && <><span className={styles.dot}>·</span><span>{areaEquipment}</span></>}
              <span className={styles.metaBreak} />
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaDate}>{fmtDateTime(issue.createdAt)}</span>
            </div>
          </div>
          <div className={styles.statusCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <LocationPill name={gymLocation} />
              <span className={`status-badge s-${issue.status}`}>{STATUS_LABEL[issue.status]}</span>
            </div>
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

  function renderManagerGroup(group, isSpecial, icon) {
    return (
      <div key={group.username} className={styles.managerGroup}>
        <div className={styles.managerGroupHeader}>
          <div className={styles.managerGroupIdentity}>
            <div className={`${styles.managerAvatar} ${isSpecial ? styles.managerAvatarGray : ''}`}>
              {icon || initials(group.label)}
            </div>
            <span className={styles.managerGroupName}>{group.label}</span>
            <span className={styles.managerGroupCount}>{group.issues.length} issue{group.issues.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.list}>{group.issues.map(renderCard)}</div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.toolbar}>

        {/* Row 1: search + view toggle */}
        <input
          type="text"
          className={styles.search}
          placeholder={showArchived ? 'Search archived...' : 'Search issues...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!showArchived && (
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('list')}
            >List</button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'bymanager' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('bymanager')}
            >By manager</button>
          </div>
        )}

        {/* Row break on mobile — invisible full-width element */}
        <div className={styles.toolbarBreak} />

        {/* Row 2: sort + archived */}
        {!showArchived && viewMode === 'list' && (
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
            {showArchived ? '← Back' : `Archived (${archivedCount})`}
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
          <div className={styles.list}>{archivedIssues.map(renderCard)}</div>
        )
      ) : viewMode === 'bymanager' ? (
        <div>
          {managerGroups.needsManager.length > 0 && renderManagerGroup(
            { label: 'Unassigned', username: '__unassigned', issues: managerGroups.needsManager }, true, '–'
          )}
          {managerGroups.notYetIdentified.length > 0 && renderManagerGroup(
            { label: 'Not Yet Identified', username: '__not_identified', issues: managerGroups.notYetIdentified }, true, '?'
          )}
          {managerGroups.managerGroups.map(g => renderManagerGroup(g, false, null))}
          {managerGroups.solvedNoManager.length > 0 && (
            <div style={{ opacity: 0.6 }}>
              {renderManagerGroup(
                { label: 'Resolved without manager', username: '__solved', issues: managerGroups.solvedNoManager }, true, '✓'
              )}
            </div>
          )}
          {managerGroups.needsManager.length === 0 &&
           managerGroups.notYetIdentified.length === 0 &&
           managerGroups.managerGroups.length === 0 && (
            <div className={styles.empty}>No active issues.</div>
          )}
        </div>
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