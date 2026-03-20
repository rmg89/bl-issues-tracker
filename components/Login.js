import { useState, useEffect, useRef } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('name')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const pinRef = useRef(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = Array.isArray(users) ? users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  ) : []

  function selectUser(user) {
    setSelected(user)
    setSearch(user.name)
    setOpen(false)
  }

  function goToPin() {
    if (!selected) return
    setStep('pin')
    setPin('')
    setError('')
    setTimeout(() => pinRef.current?.focus(), 50)
  }

  async function doLogin() {
    if (!pin) return
    setLoading(true)
    setError('')
    if (selected.pin === pin) {
      onLogin(selected)
    } else {
      setError('Incorrect PIN. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <div className={styles.logo}><span>BL</span></div>
        <div className={styles.brandTitle}>Issues Tracker</div>
        <div className={styles.brandSub}>Brace Life Studios</div>
      </div>

      <div className="card" style={{ maxWidth: 380, width: '100%' }}>
        {step === 'name' && (
          <>
            <div className="form-group">
              <label>Who are you?</label>
              <div ref={wrapRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search your name..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); setOpen(true) }}
                  onFocus={() => { setSearch(''); setSelected(null); setOpen(true) }}
                  autoComplete="off"
                />
                {open && (
                  <div className={styles.dropdown}>
                    {filtered.length ? filtered.map(u => (
                      <div key={u.id} className={styles.option} onMouseDown={() => selectUser(u)}>
                        {u.name}
                        {u.isAdmin && <span className="admin-tag" style={{ marginLeft: 8 }}>admin</span>}
                      </div>
                    )) : (
                      <div className={styles.optionEmpty}>No match found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={goToPin}
              disabled={!selected}
            >
              Continue
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <div className={styles.greeting}>Welcome, {selected?.name}.</div>
            <div className="form-group">
              <label>Enter your PIN</label>
              <input
                ref={pinRef}
                type="password"
                placeholder="4-digit PIN"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => { setStep('name'); setError('') }} style={{ width: 120 }}>
                Back
              </button>
              <button className="btn-primary" style={{ width: 120 }} onClick={doLogin} disabled={loading || !pin}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}