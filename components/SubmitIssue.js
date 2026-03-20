import { useState } from 'react'

export default function SubmitIssue({ currentUser, onToast, onSubmitted }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('medium')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState([])
  const [reportedVia, setReportedVia] = useState('')
  const [reportedByName, setReportedByName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files)
    setPhotos(files)
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Please enter a title.'); return }
    if (!description.trim()) { setError('Please enter a description.'); return }
    if (!location.trim()) { setError('Please enter a location or equipment.'); return }
    if (!reportedVia) { setError('Please select who reported this.'); return }
    if (reportedVia !== 'Staff (self)' && !reportedByName.trim()) { setError('Please enter the name.'); return }
    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('urgency', urgency)
      formData.append('location', location.trim())
      formData.append('submittedBy', currentUser.username)
      formData.append('submittedByName', currentUser.name)
      formData.append('reportedVia', reportedVia)
      formData.append('reportedByName', reportedByName)
      photos.forEach(photo => formData.append('photos', photo))

      const res = await fetch('/api/issues', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Failed to submit')
      setTitle(''); setDescription(''); setLocation(''); setUrgency('medium'); setPhotos([])
      setReportedVia(''); setReportedByName('')
      document.getElementById('photo-input').value = ''
      setSuccess(true)
      onToast('Issue submitted')
      if (onSubmitted) onSubmitted()
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setError('Something went wrong. Try again.')
    }
    setSubmitting(false)
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="section-label" style={{ marginTop: 0, marginBottom: 16 }}>New equipment / facility issue</div>

      <div className="form-group">
        <label>Issue title</label>
        <input type="text" placeholder="e.g. Cable machine pulley fraying" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea placeholder="Describe the issue in detail..." value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Urgency</label>
        <select value={urgency} onChange={e => setUrgency(e.target.value)}>
          <option value="low">Low — not blocking training</option>
          <option value="medium">Medium — needs attention soon</option>
          <option value="high">High — safety concern / blocking use</option>
        </select>
      </div>

      <div className="form-group">
        <label>Location / equipment</label>
        <input type="text" placeholder="e.g. Floor 2, Rack 3" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Reported by</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {['Staff (self)', 'Client', 'Other'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { setReportedVia(opt); setReportedByName(opt === 'Staff (self)' ? currentUser.name : '') }}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: reportedVia === opt ? '1.5px solid var(--orange)' : '1px solid var(--border)',
                backgroundColor: reportedVia === opt ? 'var(--orange-light)' : 'var(--surface)',
                color: reportedVia === opt ? 'var(--orange-dark)' : 'var(--text-secondary)',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        {reportedVia && reportedVia !== 'Staff (self)' && (
          <input
            type="text"
            placeholder={reportedVia === 'Client' ? "Client's name" : 'Name and context'}
            value={reportedByName}
            onChange={e => setReportedByName(e.target.value)}
          />
        )}
      </div>

      <div className="form-group">
        <label>Photos (optional)</label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          style={{ padding: '6px 12px', cursor: 'pointer' }}
        />
        {photos.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 20 }}>
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ color: '#C62828', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: '#2E7D32', fontSize: 13, marginBottom: 10 }}>Issue submitted successfully.</div>}

      <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%' }}>
        {submitting ? 'Submitting...' : 'Submit issue'}
      </button>
    </div>
  )
}