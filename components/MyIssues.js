import styles from './MyIssues.module.css'

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_LABEL = {
  submitted: 'Submitted',
  identified: 'Identified',
  assigned: 'Assigned',
  solved: 'Solved',
  archived: 'Archived',
}

function getStatusContext(issue) {
  switch (issue.status) {
    case 'submitted':
      if (issue.investigatingName || issue.investigating) {
        return `Investigating: ${issue.investigatingName || issue.investigating}`
      }
      return null
    case 'identified':
      return issue.investigatingName ? `Identified by ${issue.investigatingName}` : null
    case 'assigned':
      const parts = []
      if (issue.managerName || issue.manager) parts.push(`Manager: ${issue.managerName || issue.manager}`)
      const assignedNames = issue.assignedToNames?.length ? issue.assignedToNames.join(', ') : issue.assignedTo?.join?.(', ') || ''
      if (assignedNames) parts.push(`Assigned to: ${assignedNames}`)
      return parts.length ? parts.join(' · ') : null
    case 'solved':
      return 'Solved ✓'
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
              {issue.location && (
                <><span className={styles.dot}> · </span><span className={styles.location}>{issue.location}</span></>
              )}
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