import styles from './MyIssues.module.css'

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_LABEL = {
  submitted: 'Submitted',
  identified: 'Identified',
  assigned: 'In progress',
  solved: 'Solved',
  archived: 'Archived',
}

function getStatusContext(issue) {
  switch (issue.status) {
    case 'submitted':
      return 'Received — someone will look into it soon'
    case 'identified':
      return issue.investigatingName
        ? `Looked into by ${issue.investigatingName} · Under review`
        : 'Under review'
    case 'assigned': {
      const manager = issue.managerName || issue.manager
      const since = issue.assignedAt ? ` · In progress since ${fmtDate(issue.assignedAt)}` : ' · In progress'
      return manager
        ? `Manager: ${manager}${since}`
        : `In progress${issue.assignedAt ? ' since ' + fmtDate(issue.assignedAt) : ''}`
    }
    case 'solved': {
      const manager = issue.managerName || issue.manager
      const solvedEntry = (issue.statusLog || []).find(l => l.status === 'solved')
      const when = issue.solutionAt
        ? ` · ${fmtDate(issue.solutionAt)}`
        : solvedEntry ? ` · ${fmtDate(solvedEntry.ts)}` : ''
      return manager ? `Resolved by ${manager}${when}` : `Resolved${when}`
    }
    case 'archived':
      return 'Archived'
    default:
      return null
  }
}

export default function MyIssues({ issues }) {
  if (issues.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14, padding: '3rem 0' }}>
        You haven't submitted any issues yet.
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {issues.map(issue => {
        const context = getStatusContext(issue)
        return (
          <div key={issue.id} className={styles.card}>
            <div className={styles.top}>
              <div className={styles.title}>{issue.title}</div>
              <span className={`status-badge s-${issue.status}`}>
                {STATUS_LABEL[issue.status] || issue.status}
              </span>
            </div>
            <div className={styles.meta}>
              <span className={styles.date}>Submitted {fmtDate(issue.createdAt)}</span>
              {(() => {
                const rawLN = issue.locationName || ''
                const gym = rawLN.includes(' — ') ? rawLN.split(' — ')[0] : rawLN
                const area = rawLN.includes(' — ') ? rawLN.split(' — ')[1] : ''
                const display = [gym, area].filter(Boolean).join(' · ')
                return display ? <><span className={styles.dot}> · </span><span className={styles.location}>{display}</span></> : null
              })()}
            </div>
            {context && (
              <div className={styles.context}>{context}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}