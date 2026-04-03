import { useState, useEffect, useCallback } from 'react'
import Login from '../components/Login'
import IssueList from '../components/IssueList'
import IssueDetail from '../components/IssueDetail'
import SubmitIssue from '../components/SubmitIssue'
import ManageTeam from '../components/ManageTeam'
import ByOwner from '../components/ByOwner'
import Dashboard from '../components/Dashboard'
import ManageLocations from '../components/ManageLocations'
import Settings from '../components/Settings'
import MyIssues from '../components/MyIssues'
import styles from './index.module.css'
import { getUserAccessibleLocationIds, getPermissionsForLocation } from '../lib/permissions'

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [issues, setIssues] = useState([])
  const [locations, setLocations] = useState([])
  const [activeLocationId, setActiveLocationId] = useState('all') // 'all' | locationId
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

  const loadData = useCallback(async (locId) => {
    setLoading(true)
    try {
      const locationParam = locId && locId !== 'all' ? `?locationId=${locId}` : ''
      const [u, i, l] = await Promise.all([
        fetch('/api/users?withRoles=1').then(r => r.json()),
        fetch(`/api/issues${locationParam}`).then(r => r.json()),
        fetch('/api/locations').then(r => r.json()),
      ])
      setUsers(Array.isArray(u) ? u : [])
      setIssues(Array.isArray(i) ? i : [])
      setLocations(Array.isArray(l) ? l : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (currentUser) loadData(activeLocationId)
  }, [currentUser, loadData])

  async function handleLogin(user) {
    // Fetch location roles for the logged-in user
    try {
      const rolesRes = await fetch(`/api/location-roles?userId=${user.id}`)
      const roles = await rolesRes.json()
      user = { ...user, locationRoles: Array.isArray(roles) ? roles : [] }
    } catch {
      user = { ...user, locationRoles: [] }
    }

    setCurrentUser(user)

    // Set default active location
    if (user.isAdmin || user.isGlobalAdmin) {
      setActiveLocationId('all')
      setTab('home')
    } else if (user.locationRoles?.length > 0) {
      setActiveLocationId(user.locationRoles[0].locationId)
      const firstRole = user.locationRoles[0].role
      setTab(firstRole === 'manager' ? 'home' : 'submit')
    } else {
      setActiveLocationId('all')
      setTab('submit')
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    setUsers([])
    setIssues([])
    setLocations([])
    setSelectedIssueId(null)
    setTab('home')
    setActiveLocationId('all')
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

  async function handleLocationChange(locId) {
    setActiveLocationId(locId)
    setSelectedIssueId(null)
    await loadData(locId)
  }

  if (!currentUser) return <Login onLogin={handleLogin} />

  // --- Compute permissions for the active location ---
  const isGlobalAdmin = currentUser.isAdmin || currentUser.isGlobalAdmin
  const activeLocation = locations.find(l => l.id === activeLocationId)
  const perms = getPermissionsForLocation(currentUser, activeLocationId)

  // Build list of locations this user can access
  const accessibleLocationIds = getUserAccessibleLocationIds(currentUser) // null = all
  const accessibleLocations = accessibleLocationIds === null
    ? locations
    : locations.filter(l => accessibleLocationIds.includes(l.id))

  // Can this user see the location switcher?
  const canSwitchLocations = isGlobalAdmin || accessibleLocations.length > 1

  // Determine if user has any manager/admin access (for showing manager-level tabs)
  const isManagerAnywhere = isGlobalAdmin || (currentUser.locationRoles || []).some(r => r.role === 'manager')
  const isManagerHere = isGlobalAdmin || perms.role === 'manager' || perms.role === 'admin'

  const mySubmittedIssues = issues.filter(i => i.submittedBy === currentUser.username)
  const selectedIssue = issues.find(i => i.id === selectedIssueId)

  const activeCount = issues.filter(i => i.status !== 'archived').length

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}><span>BL</span></div>
            <span className={styles.navTitle}>Issues Tracker</span>
          </div>
          <div className={styles.navRight}>
            {canSwitchLocations && (
              <select
                className={styles.locationSelect}
                value={activeLocationId}
                onChange={e => handleLocationChange(e.target.value)}
              >
                {isGlobalAdmin && (
                  <option value="all">ALL LOCATIONS</option>
                )}
                {accessibleLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            {!canSwitchLocations && activeLocation && (
              <span className={styles.locationBadge}>{activeLocation.name}</span>
            )}
            <span className={styles.navUser}>{currentUser.name}</span>
            {isGlobalAdmin && <span className="admin-tag">admin</span>}
            {!isGlobalAdmin && perms.role === 'manager' && <span className="admin-tag" style={{ background: 'var(--blue, #1565C0)' }}>manager</span>}
            <button onClick={handleLogout} style={{ fontSize: 13, padding: '5px 12px' }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className={styles.tabs}>
        <div className={styles.tabsInner}>
          {isManagerHere ? (
            <>
              <div className={styles.tabCol}>
                <button className={`${styles.tab} ${tab === 'home' ? styles.tabActive : ''}`} onClick={() => switchTab('home')}>
                  <span className={styles.tabLabelFull}>Dashboard</span>
                  <span className={styles.tabLabelShort}>Home</span>
                </button>
              </div>
              <div className={styles.tabCol}>
                <button className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`} onClick={() => switchTab('submit')}>
                  <span className={styles.tabLabelFull}>Submit issue</span>
                  <span className={styles.tabLabelShort}>Submit</span>
                </button>
              </div>
              <div className={styles.tabCenter}>
                <button className={`${styles.tab} ${tab === 'issues' ? styles.tabActive : ''}`} onClick={() => switchTab('issues')}>
                  <span className={styles.tabLabelFull}>All issues</span>
                  <span className={styles.tabLabelShort}>Issues</span>
                  {activeCount > 0 && <span className={styles.count}>{activeCount}</span>}
                </button>
              </div>
              <div className={styles.tabCol} />
              <div className={styles.tabRight}>
                <button className={`${styles.tabSettings} ${tab === 'settings' ? styles.tabSettingsActive : ''}`} onClick={() => switchTab('settings')}>
                  <span className={styles.tabLabelFull}>⚙ Settings</span>
                  <span className={styles.tabLabelShort}>⚙</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`} onClick={() => switchTab('submit')}>Submit issue</button>
              <button className={`${styles.tab} ${tab === 'my' ? styles.tabActive : ''}`} onClick={() => switchTab('my')}>
                My issues
                {mySubmittedIssues.length > 0 && (
                  <span className={styles.count}>{mySubmittedIssues.length}</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading...</div>}

          {!loading && tab === 'home' && isManagerHere && (
            <Dashboard
              issues={issues}
              currentUser={currentUser}
              activeLocation={activeLocation}
              onNavigate={switchTabSorted}
              onSelectIssue={(id) => { setSelectedIssueId(id); setTab('issues') }}
            />
          )}

          {!loading && tab === 'submit' && (
            <SubmitIssue
              currentUser={currentUser}
              locations={accessibleLocations}
              activeLocationId={activeLocationId === 'all' ? null : activeLocationId}
              activeLocationName={activeLocation?.name || ''}
              onToast={showToast}
              onSubmitted={() => loadData(activeLocationId)}
            />
          )}

          {!loading && tab === 'issues' && isManagerHere && (
            selectedIssue ? (
              <IssueDetail
                issue={selectedIssue}
                users={users}
                currentUser={currentUser}
                locations={locations}
                permissions={perms}
                onBack={() => setSelectedIssueId(null)}
                onUpdate={handleIssueUpdate}
                onToast={showToast}
              />
            ) : (
              <IssueList
                issues={issues}
                locations={locations}
                onSelect={setSelectedIssueId}
                isAdmin={true}
                initialSort={issueListSort}
                initialFilter={issueListFilter}
                currentUser={currentUser}
                users={users}
              />
            )
          )}

          {!loading && tab === 'my' && !isManagerHere && (
            <MyIssues issues={mySubmittedIssues} />
          )}

          {!loading && tab === 'settings' && isManagerHere && (
            <Settings
              users={users}
              locations={locations}
              activeLocationId={activeLocationId}
              currentUser={currentUser}
              isGlobalAdmin={isGlobalAdmin}
              onUsersChange={setUsers}
              onLocationsChange={setLocations}
              onToast={showToast}
            />
          )}
        </div>
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}