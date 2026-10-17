import { useState } from 'react'
import './SignUp.css'

const FEATURES = [
  { icon: 'repeat', label: 'Recurring Engine' },
  { icon: 'history', label: 'Zero Lost History' },
  { icon: 'view_timeline', label: 'Zero-Clutter Canvas' },
]

const TRUST = [
  { icon: 'lock', label: '256-bit SSL' },
  { icon: 'cloud_done', label: 'Instant Sync' },
  { icon: 'verified_user', label: 'GDPR Compliant' },
]

function Icon({ name, size, filled, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        ...(size ? { fontSize: size } : null),
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : null),
      }}
    >
      {name}
    </span>
  )
}

// 0 = empty, 1 = weak, 2 = good, 3 = strong
function passwordStrength(val) {
  const len = val.length
  if (len === 0) return 0
  const hasNumbers = /\d/.test(val)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val)
  const hasUpper = /[A-Z]/.test(val)

  let score = 0
  if (len >= 6) score++
  if (len >= 10 && (hasNumbers || hasSpecial)) score++
  if (len >= 12 && hasNumbers && hasSpecial && hasUpper) score++

  return score <= 1 ? 1 : score
}

const STRENGTH_LABELS = ['Empty', 'Weak', 'Good', 'Strong']
const STRENGTH_TONES = ['', 'weak', 'good', 'strong']

export default function SignUp({ onSignIn }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const strength = passwordStrength(password)
  const tone = STRENGTH_TONES[strength]

  // Skeleton only: account creation is not wired to a backend yet.
  const handleSubmit = (e) => {
    e.preventDefault()
  }

  return (
    <main className="signup">
      <div className="signup-wrap">
        <div className="aura aura-a" />
        <div className="aura aura-b" />

        <div className="card">
          <div className="brand-block">
            <div className="brand-logo">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            </div>
            <div className="brand-name">
              <span>Calendar-</span>
              <span className="accent">count</span>
            </div>
            <h1>Create your account</h1>
            <p className="tagline">
              Start building consistent daily routines and tracking completed tasks
            </p>
          </div>

          <div className="features">
            {FEATURES.map((f) => (
              <div key={f.label} className="feature">
                <Icon name={f.icon} size={18} filled className="accent" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          <button type="button" className="google-btn">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span>or register with email</span>
            <div className="divider-line" />
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrap">
                <Icon name="person" size={18} className="lead" />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Robin Van Persie"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="email">Work or Personal Email</label>
              <div className="input-wrap">
                <Icon name="mail" size={18} className="lead" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="password">Create Password</label>
                <span className={`strength-label ${tone}`}>
                  Strength: {STRENGTH_LABELS[strength]}
                </span>
              </div>
              <div className="input-wrap">
                <Icon name="lock" size={18} className="lead" />
                <input
                  id="password"
                  className="has-trail"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
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
              <div className="meter">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`bar ${strength >= n ? `on-${tone}` : ''}`} />
                ))}
              </div>
            </div>

            <div className="terms">
              <input
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
              />
              <label htmlFor="terms">
                I agree to the{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
              </label>
            </div>

            <button type="submit" className="submit-btn">
              <span>Create Account</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          </form>

          <div className="switch-prompt">
            <p>
              Already have an account?
              <a
                href="#"
                className="signin-link"
                onClick={(e) => {
                  e.preventDefault()
                  onSignIn?.()
                }}
              >
                Sign in
              </a>
            </p>
          </div>
        </div>

        <div className="preview">
          <div className="row">
            <div className="preview-icon">
              <Icon name="task_alt" size={16} />
            </div>
            <div className="col">
              <span className="preview-title">Daily Review &amp; Routine Audit</span>
              <div className="row preview-meta">
                <span className="tert">09:00 AM • Mon–Fri</span>
                <span className="daily-tag">
                  <Icon name="sync" size={11} /> Daily
                </span>
              </div>
            </div>
          </div>
          <span className="done-pill">14/15 done</span>
        </div>

        <div className="trust">
          {TRUST.map((t, i) => (
            <div key={t.label} className="row trust-item">
              {i > 0 && <span className="trust-dot" />}
              <Icon name={t.icon} size={14} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
