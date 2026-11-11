import { useEffect, useState } from 'react'
import { api } from './api.js'
import { auth } from './auth.js'
import { VIEWS } from './calendar.js'
import './SignUp.css'

// Profile and preferences, saved to /users/me (full replace).
export default function Settings({ onBack }) {
  const [profile, setProfile] = useState(null) // null = loading
  const [f, setF] = useState({ name: '', defaultView: 'Week' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api('/users/me')
      .catch((e) => {
        if (e.status === 404) return {} // no profile yet, first save creates it
        throw e
      })
      .then((p) => {
        setProfile(p)
        setF({ name: p.name ?? auth.currentUser?.displayName ?? '', defaultView: p.preferences?.defaultView ?? 'Week' })
      })
      .catch((e) => setError(`Couldn't load settings: ${e.message}`))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    // Server-owned fields are rejected by the API, so strip them.
    const { id: _id, email: _email, createdAt: _createdAt, ...rest } = profile
    try {
      setProfile(await api('/users/me', { method: 'PUT', body: { ...rest, name: f.name.trim(), preferences: { ...rest.preferences, defaultView: f.defaultView } } }))
      setError('')
      setSaved(true)
    } catch (err) {
      setError(`Couldn't save settings: ${err.message}`)
    }
  }
  const set = (patch) => {
    setF((old) => ({ ...old, ...patch }))
    setSaved(false)
  }

  return (
    <main className="signup">
      <div className="signup-wrap">
        <div className="card legal">
          <h1>Settings</h1>
          <form className="form" onSubmit={save}>
            <div className="field">
              <label htmlFor="name">Display Name</label>
              <div className="input-wrap">
                <span className="material-symbols-outlined lead">person</span>
                <input id="name" type="text" required value={f.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="defaultView">Default Calendar View</label>
              <div className="input-wrap">
                <span className="material-symbols-outlined lead">calendar_view_month</span>
                <select id="defaultView" value={f.defaultView} onChange={(e) => set({ defaultView: e.target.value })}>
                  {VIEWS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {saved && <p role="status">Settings saved.</p>}
            <button type="submit" className="submit-btn" disabled={!profile}>
              <span>Save</span>
            </button>
          </form>
          <button type="button" className="submit-btn" onClick={onBack}>
            <span>Back</span>
          </button>
        </div>
      </div>
    </main>
  )
}
