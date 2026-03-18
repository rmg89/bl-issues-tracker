import { useState } from 'react'
import styles from './ManageTeam.module.css'

export default function ManageTeam({ users, currentUser, onUsersChange, onToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [editingEmail, setEditingEmail] = useState(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function toggleAdmin(user) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: !user.isAdmin }),
    })
    const updated = await res.json()
    onUsersChange(users.map(u => u.id === user.id ? updated : u))
    onToast(updated.isAdmin ? 'Admin granted' : 'Admin removed')
  }

  function startEditEmail(user) {
    setEditingEmail(user.id)
    setEditEmailValue(user.email || '')
  }

  function cancelEditEmail() {
    setEditingEmail(null)
    setEditEmailValue('')
  }

  async function saveEmail(user) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editEmailValue }),
    })
    const updated = await res.json()
    onUsersChange(users.map(u => u.id === user.id ? updated : u))
    setEditingEmail(null)
    setEditEmailValue('')
    onToast('Email saved')
  }

  async function removeUser(user) {
    if (user.id === currentUser.id) return
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    onUsersChange(users.filter(u => u.id !== user.id))
    onToast('Member removed')
  }

  async function addUser() {
    if (!name || !username || !pin) { setError('All fields required.'); return }
    if (pin.length < 4) { setError('PIN must be 4–6 digits.'); return }
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      setError('Username already exists.'); return
    }
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username: username.toLowerCase(), pin, isAdmin, email }),
    })
    const created = await res.json()
    onUsersChange([...users, created])
    setName(''); setUsername(''); setPin(''); setIsAdmin(false); setEmail('')
    setShowAdd(false); setError('')
    setSaving(false)
    onToast('Member added')
  }

  return (
    <div>
      <div className={styles.header}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Team members</div>
        <button onClick={() => setShowAdd(s => !s)}>
          {showAdd ? 'Cancel' : '+ Add member'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 12 }}>New team member</div>
          <div className={styles.grid}>
            <div className="form-group">
              <label>Full name</label>
              <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="jane" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label>PIN (4–6 digits)</label>
              <input type="password" maxLength={6} placeholder="e.g. 1234" value={pin} onChange={e => setPin(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={isAdmin ? '1' : '0'} onChange={e => setIsAdmin(e.target.value === '1')}>
                <option value="0">Trainer</option>
                <option value="1">Admin</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Email (for notifications)</label>
              <input type="email" placeholder="jane@bracelifestudios.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          {error && <div style={{ color: '#C62828', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button className="btn-primary" onClick={addUser} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Adding...' : 'Add member'}
          </button>
        </div>
      )}

      <div className={styles.list}>
        {users.map(user => (
          <div key={user.id} className={styles.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.rowName}>
                {user.name}
                <span className={styles.rowUsername}>@{user.username}</span>
                {user.isAdmin && <span className="admin-tag">admin</span>}
              </div>

              {editingEmail === user.id ? (
                <div className={styles.emailEditRow}>
                  <input
                    type="email"
                    className={styles.emailInput}
                    placeholder="email@example.com"
                    value={editEmailValue}
                    onChange={e => setEditEmailValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEmail(user); if (e.key === 'Escape') cancelEditEmail() }}
                    autoFocus
                  />
                  <button className={styles.saveEmailBtn} onClick={() => saveEmail(user)}>Save</button>
                  <button className={styles.cancelEmailBtn} onClick={cancelEditEmail}>Cancel</button>
                </div>
              ) : (
                <div className={styles.emailRow}>
                  <span className={styles.emailDisplay}>
                    {user.email || <span style={{ color: 'var(--text-tertiary)' }}>No email set</span>}
                  </span>
                  <button className={styles.editEmailBtn} onClick={() => startEditEmail(user)}>
                    {user.email ? 'Edit email' : 'Add email'}
                  </button>
                </div>
              )}
            </div>
            <div className={styles.rowActions}>
              <button onClick={() => toggleAdmin(user)}>
                {user.isAdmin ? 'Remove admin' : 'Make admin'}
              </button>
              {user.id !== currentUser.id && (
                <button className="btn-danger" onClick={() => removeUser(user)}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}