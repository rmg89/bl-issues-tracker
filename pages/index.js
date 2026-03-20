import { useState, useEffect, useCallback } from 'react'
import Login from '../components/Login'
import IssueList from '../components/IssueList'
import IssueDetail from '../components/IssueDetail'
import SubmitIssue from '../components/SubmitIssue'
import ManageTeam from '../components/ManageTeam'
import ByOwner from '../components/ByOwner'
import Dashboard from '../components/Dashboard'
import styles from './index.module.css'

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [issues, setIssues] = useState([])
  const [tab, setTab] = useState('home')
  const [selectedIssueId, setSelectedIssueId] = useState(null)
  const [issueListSort, setIssueListSort] = useState('newest')
  const [issueListFilter, setIssueListFilter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [u, i] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/issues').then(r => r.json()),
      ])
      setUsers(Array.isArray(u) ? u : [])
      setIssues(Array.isArray(i) ? i : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser, loadData])

  function handleLogin(user) {
    setCurrentUser(user)
    setTab(user.isAdmin ? 'home' : 'submit')
  }

  function handleLogout() {
    setCurrentUser(null)
    setUsers([])
    setIssues([])
    setSelectedIssueId(null)
    setTab('home')
  }

  function handleIssueUpdate(updated) {
    setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function switchTab(t) {
    setTab(t)
    setSelectedIssueId(null)
  }

  function switchTabSorted(t, sort, filter) {
    setTab(t)
    setSelectedIssueId(null)
    if (sort) setIssueListSort(sort)
    if (filter !== undefined) setIssueListFilter(filter)
  }

  if (!currentUser) return <Login onLogin={handleLogin} />

  const myIssues = issues.filter(i => i.submittedBy === currentUser.username)
  const selectedIssue = issues.find(i => i.id === selectedIssueId)

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.navLogo}><span>BL</span></div>
          <span className={styles.navTitle}>Issues Tracker</span>
        </div>
        <div className={styles.navRight}>
          <span className={styles.navUser}>{currentUser.name}</span>
          {currentUser.isAdmin && <span className="admin-tag">admin</span>}
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '5px 12px' }}>Sign out</button>
        </div>
      </nav>

      <div className={styles.body}>
        <div className={styles.tabs}>
          {currentUser.isAdmin ? (
            <>
              <button className={`${styles.tab} ${tab === 'home' ? styles.tabActive : ''}`} onClick={() => switchTab('home')}>Home</button>
              <button className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`} onClick={() => switchTab('submit')}>Submit issue</button>
              <button className={`${styles.tab} ${tab === 'issues' ? styles.tabActive : ''}`} onClick={() => switchTab('issues')}>
                All issues
                {issues.filter(i => i.status !== 'archived').length > 0 && (
                  <span className={styles.count}>{issues.filter(i => i.status !== 'archived').length}</span>
                )}
              </button>
              <button className={`${styles.tab} ${tab === 'owner' ? styles.tabActive : ''}`} onClick={() => switchTab('owner')}>By owner</button>
              <button className={`${styles.tab} ${tab === 'team' ? styles.tabActive : ''}`} onClick={() => switchTab('team')}>Manage team</button>
            </>
          ) : (
            <>
              <button className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`} onClick={() => switchTab('submit')}>Submit issue</button>
              <button className={`${styles.tab} ${tab === 'my' ? styles.tabActive : ''}`} onClick={() => switchTab('my')}>
                My issues
                {myIssues.length > 0 && <span className={styles.count}>{myIssues.length}</span>}
              </button>
            </>
          )}
        </div>

        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading...</div>}

          {!loading && tab === 'home' && currentUser.isAdmin && (
            <Dashboard
              issues={issues}
              currentUser={currentUser}
              onNavigate={switchTabSorted}
              onSelectIssue={(id) => { setSelectedIssueId(id); setTab('issues') }}
            />
          )}

          {!loading && tab === 'submit' && (
            <SubmitIssue currentUser={currentUser} onToast={showToast} onSubmitted={loadData} />
          )}

          {!loading && tab === 'issues' && currentUser.isAdmin && (
            selectedIssue ? (
              <IssueDetail
                issue={selectedIssue}
                users={users}
                currentUser={currentUser}
                onBack={() => setSelectedIssueId(null)}
                onUpdate={handleIssueUpdate}
                onToast={showToast}
              />
            ) : (
              <IssueList issues={issues} onSelect={setSelectedIssueId} isAdmin={true} initialSort={issueListSort} initialFilter={issueListFilter} />
            )
          )}

          {!loading && tab === 'my' && !currentUser.isAdmin && (
            <IssueList issues={myIssues} onSelect={() => {}} isAdmin={false} />
          )}

          {!loading && tab === 'owner' && currentUser.isAdmin && (
            selectedIssue ? (
              <IssueDetail
                issue={selectedIssue}
                users={users}
                currentUser={currentUser}
                onBack={() => setSelectedIssueId(null)}
                onUpdate={handleIssueUpdate}
                onToast={showToast}
              />
            ) : (
              <ByOwner issues={issues} users={users} onSelect={setSelectedIssueId} />
            )
          )}

          {!loading && tab === 'team' && currentUser.isAdmin && (
            <ManageTeam
              users={users}
              currentUser={currentUser}
              onUsersChange={setUsers}
              onToast={showToast}
            />
          )}
        </div>
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}