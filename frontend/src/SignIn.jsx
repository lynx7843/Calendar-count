import { useState } from 'react'
import './SignIn.css'

// Dummy credentials until a backend exists.
const DUMMY_EMAIL = 'email'
const DUMMY_PASSWORD = 'password'

const BADGES = [
  { icon: 'sync', label: 'Sync with Google Calendar' },
  { icon: 'repeat', label: 'Repeating Routines Tracker' },
  { icon: 'hourglass_bottom', label: 'Automated Activity Cut-off' },
]

function Icon({ name, size }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  )
}

export default function SignIn({ onSuccess, onSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email === DUMMY_EMAIL && password === DUMMY_PASSWORD) {
      setError('')
      onSuccess?.()
    } else {
      setError('Incorrect email or password.')
    }
  }

  return (
    <main className="signin">
      <div className="signin-wrap">
        <div className="aura aura-a" />
        <div className="aura aura-b" />

        <div className="auth-card">
          <div className="brand-block">
            <div className="brand-row">
              <div className="brand-icon">
                <Icon name="calendar_today" size={18} />
              </div>
              <span className="brand-name">
                Calendar-count<span className="brand-dot" />
              </span>
            </div>
            <p className="tagline">Sign in to manage your daily and repeating activities</p>
          </div>

          <button type="button" className="google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span>or continue with email</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="username"
                placeholder="alex@workspace.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <div className="label-row">
                <label htmlFor="auth-password">Password</label>
                <a href="#" className="link" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <div className="pwd-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="pwd"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember this device for 30 days</span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="submit-btn">
              <span>Sign In</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          </form>

          <div className="switch-prompt">
            <p>
              Don&apos;t have an account?
              <a
                href="#"
                className="link"
                onClick={(e) => {
                  e.preventDefault()
                  onSignUp?.()
                }}
              >
                Sign up
              </a>
            </p>
          </div>
        </div>

        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.label} className="badge">
              <Icon name={b.icon} size={14} />
              <span>{b.label}</span>
            </div>
          ))}
        </div>

        <div className="meta">v2.4 • End-to-End Encrypted Sync</div>
      </div>
    </main>
  )
}
