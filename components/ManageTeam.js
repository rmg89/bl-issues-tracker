import { useState } from 'react'
import styles from './ManageTeam.module.css'

const ROLE_LABELS = { manager: 'Manager', staff: 'Staff' }

// Format a raw phone string into display format: (555) 000-0000
function formatPhoneDisplay(raw) {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '').replace(/^1/, '') // strip country code
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

// Convert display input to E.164 for storage: +1XXXXXXXXXX
function toE164(raw) {
  const digits = raw.replace(/\D/g, '').replace(/^1/, '')
  if (digits.length !== 10) return null
  return `+1${digits}`
}

function PhoneInput({ value, onChange, onSave, onCancel, placeholder = '(555) 000-0000' }) {
  function handleChange(e) {
    // Only allow digits, strip everything else, re-format for display
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    onChange(raw)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' }}>
        <span style={{ padding: '0 6px 0 8px', fontSize: 13, color: 'var(--text-tertiary)', borderRight: '0.5px solid var(--border)', background: 'var(--surface-raised)', lineHeight: '34px' }}>+1</span>
        <input
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          value={formatPhoneDisplay(value)}
          onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          autoFocus
          style={{ border: 'none', outline: 'none', padding: '0 8px', fontSize: 13, width: 140, background: 'transparent', height: 34 }}
        />
      </div>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}

export default function ManageTeam({ users, locations, activeLocationId, currentUser, isGlobalAdmin, onUsersChange, onToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [isGAdmin, setIsGAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('') // stored as raw 10 digits during input
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingEmail, setEditingEmail] = useState(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [editingPhone, setEditingPhone] = useState(null)
  const [editPhoneValue, setEditPhoneValue] = useState('') // raw 10 digits during edit

  const [assigningUserId, setAssigningUserId] = useState(null)
  const [assignRole, setAssignRole] = useState('staff')
  const [assignLocationId, setAssignLocationId] = useState(activeLocationId !== 'all' ? activeLocationId : '')
  const [assignSaving, setAssignSaving] = useState(false)

  const displayUsers = isGlobalAdmin
    ? users
    : users.filter(u => {
        if (activeLocationId === 'all') return true
        return (u.locationRoles || []).some(r => r.locationId === activeLocationId)
      })

  async function toggleGlobalAdmin(user) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: !user.isAdmin }),
    })
    const updated = await res.json()
    onUsersChange(users.map(u => u.id === user.id ? { ...u, ...updated, locationRoles: u.locationRoles } : u))
    onToast(updated.isAdmin ? 'Global admin granted' : 'Global admin removed')
  }

  function startEditEmail(user) {
    setEditingEmail(user.id)
    setEditEmailValue(user.email || '')
  }

  async function saveEmail(user) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editEmailValue }),
    })
    const updated = await res.json()
    onUsersChange(users.map(u => u.id === user.id ? { ...u, ...updated, locationRoles: u.locationRoles } : u))
    setEditingEmail(null)
    onToast('Email saved')
  }

  function startEditPhone(user) {
    setEditingPhone(user.id)
    // Strip +1 and non-digits for editing
    const digits = (user.phone || '').replace(/\D/g, '').replace(/^1/, '')
    setEditPhoneValue(digits)
  }

  async function savePhone(user) {
    const e164 = toE164(editPhoneValue)
    if (editPhoneValue && !e164) {
      onToast('Please enter a valid 10-digit US number')
      return
    }
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164 || '' }),
    })
    const updated = await res.json()
    onUsersChange(users.map(u => u.id === user.id ? { ...u, ...updated, locationRoles: u.locationRoles } : u))
    setEditingPhone(null)
    onToast('Phone saved')
  }

  async function removeUser(user) {
    if (user.id === currentUser.id) return
    if (!confirm(`Remove ${user.name} from the team?`)) return
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    onUsersChange(users.filter(u => u.id !== user.id))
    onToast('Member removed')
  }

  async function addUser() {
    if (!name || !username || !pin) { setError('Name, username, and PIN are required.'); return }
    if (pin.length < 4) { setError('PIN must be 4–6 digits.'); return }
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      setError('Username already exists.'); return
    }
    const e164Phone = phone ? toE164(phone) : ''
    if (phone && !e164Phone) { setError('Please enter a valid 10-digit US phone number.'); return }

    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username: username.toLowerCase(), pin, isGlobalAdmin: isGAdmin, email, phone: e164Phone }),
    })
    const created = await res.json()
    if (created.error) { setError(created.error); setSaving(false); return }
    onUsersChange([...users, { ...created, locationRoles: [] }])
    setName(''); setUsername(''); setPin(''); setIsGAdmin(false); setEmail(''); setPhone('')
    setShowAdd(false); setError('')
    setSaving(false)
    onToast('Member added')
  }

  function startAssign(user) {
    setAssigningUserId(user.id)
    setAssignLocationId(activeLocationId !== 'all' ? activeLocationId : (locations[0]?.id || ''))
    setAssignRole('staff')
  }

  async function saveAssignment() {
    if (!assignLocationId) return
    const loc = locations.find(l => l.id === assignLocationId)
    if (!loc) return
    setAssignSaving(true)
    const res = await fetch('/api/location-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: assigningUserId,
        locationId: assignLocationId,
        locationName: loc.name,
        role: assignRole,
      }),
    })
    const newRole = await res.json()
    onUsersChange(users.map(u => {
      if (u.id !== assigningUserId) return u
      const existing = (u.locationRoles || []).filter(r => r.locationId !== assignLocationId)
      return { ...u, locationRoles: [...existing, newRole] }
    }))
    setAssigningUserId(null)
    setAssignSaving(false)
    onToast(`Role assigned at ${loc.name}`)
  }

  async function removeLocationRole(user, role) {
    await fetch(`/api/location-roles/${role.id}`, { method: 'DELETE' })
    onUsersChange(users.map(u => {
      if (u.id !== user.id) return u
      return { ...u, locationRoles: (u.locationRoles || []).filter(r => r.id !== role.id) }
    }))
    onToast('Role removed')
  }

  return (
    <div>
      <div className={styles.header}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          Team members
          {activeLocationId !== 'all' && !isGlobalAdmin && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
              at this location
            </span>
          )}
        </div>
        {isGlobalAdmin && (
          <button onClick={() => setShowAdd(s => !s)}>
            {showAdd ? 'Cancel' : '+ Add member'}
          </button>
        )}
      </div>

      {showAdd && isGlobalAdmin && (
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
              <label>Global role</label>
              <select value={isGAdmin ? '1' : '0'} onChange={e => setIsGAdmin(e.target.value === '1')}>
                <option value="0">Staff / Manager (location-based)</option>
                <option value="1">Global Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Email (for notifications)</label>
              <input type="email" placeholder="jane@bracelife.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone (for SMS, optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' }}>
                <span style={{ padding: '0 6px 0 8px', fontSize: 13, color: 'var(--text-tertiary)', borderRight: '0.5px solid var(--border)', background: 'var(--surface-raised)', lineHeight: '38px' }}>+1</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(555) 000-0000"
                  value={formatPhoneDisplay(phone)}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(digits)
                  }}
                  style={{ border: 'none', outline: 'none', padding: '0 8px', fontSize: 13, flex: 1, background: 'transparent', height: 38 }}
                />
              </div>
            </div>
          </div>
          {error && <div style={{ color: '#C62828', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button className="btn-primary" onClick={addUser} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Adding...' : 'Add member'}
          </button>
        </div>
      )}

      <div className={styles.list}>
        {displayUsers.map(user => (
          <div key={user.id} className={styles.row}>
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Name + badges */}
              <div className={styles.rowName}>
                {user.name}
                <span className={styles.rowUsername}>@{user.username}</span>
                {user.isAdmin && <span className="admin-tag">global admin</span>}
              </div>

              {/* Location roles */}
              {(user.locationRoles || []).length > 0 && (
                <div className={styles.rolesList}>
                  {(user.locationRoles || []).map(role => (
                    <span key={role.id} className={`${styles.roleChip} ${role.role === 'manager' ? styles.roleManager : styles.roleStaff}`}>
                      {role.role === 'manager' ? '◆' : '○'} {role.locationName || role.locationId}
                      <span className={styles.roleLabel}>{ROLE_LABELS[role.role]}</span>
                      {isGlobalAdmin && (
                        <button
                          className={styles.removeRoleBtn}
                          onClick={() => removeLocationRole(user, role)}
                          title="Remove this role"
                        >×</button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Assign role panel */}
              {assigningUserId === user.id && (
                <div className={styles.assignPanel}>
                  <div className="section-label" style={{ marginTop: 8, marginBottom: 6 }}>Assign to location</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={assignLocationId} onChange={e => setAssignLocationId(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
                      <option value="">Select location...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <select value={assignRole} onChange={e => setAssignRole(e.target.value)} style={{ minWidth: 110 }}>
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button className={styles.saveBtn} onClick={saveAssignment} disabled={assignSaving || !assignLocationId}>
                      {assignSaving ? 'Saving...' : 'Assign'}
                    </button>
                    <button onClick={() => setAssigningUserId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Email */}
              {editingEmail === user.id ? (
                <div className={styles.emailEditRow}>
                  <input
                    type="email"
                    className={styles.emailInput}
                    placeholder="email@example.com"
                    value={editEmailValue}
                    onChange={e => setEditEmailValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEmail(user); if (e.key === 'Escape') setEditingEmail(null) }}
                    autoFocus
                  />
                  <button className={styles.saveEmailBtn} onClick={() => saveEmail(user)}>Save</button>
                  <button className={styles.cancelEmailBtn} onClick={() => setEditingEmail(null)}>Cancel</button>
                </div>
              ) : (
                <div className={styles.emailRow}>
                  <span className={styles.emailDisplay}>
                    {user.email || <span style={{ color: 'var(--text-tertiary)' }}>No email</span>}
                  </span>
                  <button className={styles.editEmailBtn} onClick={() => startEditEmail(user)}>
                    {user.email ? 'Edit' : 'Add email'}
                  </button>
                </div>
              )}

              {/* Phone */}
              {editingPhone === user.id ? (
                <div className={styles.emailEditRow} style={{ marginTop: 4 }}>
                  <PhoneInput
                    value={editPhoneValue}
                    onChange={setEditPhoneValue}
                    onSave={() => savePhone(user)}
                    onCancel={() => setEditingPhone(null)}
                  />
                </div>
              ) : (
                <div className={styles.emailRow} style={{ marginTop: 2 }}>
                  <span className={styles.emailDisplay}>
                    {user.phone
                      ? formatPhoneDisplay(user.phone)
                      : <span style={{ color: 'var(--text-tertiary)' }}>No phone</span>}
                  </span>
                  <button className={styles.editEmailBtn} onClick={() => startEditPhone(user)}>
                    {user.phone ? 'Edit' : 'Add phone'}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.rowActions}>
              {isGlobalAdmin && !user.isAdmin && (
                <button onClick={() => startAssign(user)} style={{ fontSize: 12 }}>+ Location</button>
              )}
              {isGlobalAdmin && (
                <button onClick={() => toggleGlobalAdmin(user)} style={{ fontSize: 12 }}>
                  {user.isAdmin ? 'Remove admin' : 'Make admin'}
                </button>
              )}
              {isGlobalAdmin && user.id !== currentUser.id && (
                <button className="btn-danger" onClick={() => removeUser(user)}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}