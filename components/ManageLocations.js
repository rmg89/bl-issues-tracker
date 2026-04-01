import { useState } from 'react'
import styles from './ManageLocations.module.css'

export default function ManageLocations({ locations, onLocationsChange, onToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')

  function autoSlug(val) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function addLocation() {
    if (!name.trim() || !slug.trim()) { setError('Name and slug are required.'); return }
    if (locations.find(l => l.slug === slug.trim())) { setError('Slug already exists.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), address: address.trim() }),
      })
      const created = await res.json()
      if (created.error) throw new Error(created.error)
      onLocationsChange([...locations, created])
      setName(''); setSlug(''); setAddress('')
      setShowAdd(false)
      onToast('Location added')
    } catch (e) {
      setError(e.message || 'Failed to add location')
    }
    setSaving(false)
  }

  function startEdit(loc) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditAddress(loc.address || '')
  }

  async function saveEdit(loc) {
    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), address: editAddress.trim() }),
      })
      const updated = await res.json()
      onLocationsChange(locations.map(l => l.id === loc.id ? { ...l, ...updated } : l))
      setEditingId(null)
      onToast('Location updated')
    } catch {
      onToast('Failed to save')
    }
  }

  async function deactivateLocation(loc) {
    if (!confirm(`Deactivate "${loc.name}"? It will be hidden but issues won't be deleted.`)) return
    try {
      await fetch(`/api/locations/${loc.id}`, {
        method: 'DELETE',
      })
      onLocationsChange(locations.filter(l => l.id !== loc.id))
      onToast('Location deactivated')
    } catch {
      onToast('Failed to deactivate')
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Locations</div>
        <button onClick={() => setShowAdd(s => !s)}>
          {showAdd ? 'Cancel' : '+ Add location'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 12 }}>New location</div>
          <div className={styles.grid}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="e.g. Brace Life West"
                value={name}
                onChange={e => { setName(e.target.value); setSlug(autoSlug(e.target.value)) }}
              />
            </div>
            <div className="form-group">
              <label>Slug (URL-safe ID)</label>
              <input
                type="text"
                placeholder="e.g. west"
                value={slug}
                onChange={e => setSlug(autoSlug(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address (optional)</label>
              <input
                type="text"
                placeholder="e.g. 123 Main St, Austin TX"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
          </div>
          {error && <div style={{ color: '#C62828', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button className="btn-primary" onClick={addLocation} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Adding...' : 'Add location'}
          </button>
        </div>
      )}

      {locations.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14, padding: '3rem 0' }}>
          No locations yet. Add your first one above.
        </div>
      )}

      <div className={styles.list}>
        {locations.map(loc => (
          <div key={loc.id} className={styles.row}>
            {editingId === loc.id ? (
              <div style={{ flex: 1 }}>
                <div className={styles.editRow}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ marginBottom: 6 }}
                    placeholder="Location name"
                  />
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Address (optional)"
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className={styles.saveBtn} onClick={() => saveEdit(loc)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.locName}>
                    {loc.name}
                    <span className={styles.locSlug}>/{loc.slug}</span>
                  </div>
                  {loc.address && (
                    <div className={styles.locAddress}>{loc.address}</div>
                  )}
                </div>
                <div className={styles.rowActions}>
                  <button onClick={() => startEdit(loc)}>Edit</button>
                  <button className="btn-danger" onClick={() => deactivateLocation(loc)}>Deactivate</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}