import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fa from 'firebase/auth'
import { api } from './api.js'
import App from './App.jsx'

vi.mock('./api.js', () => ({ api: vi.fn(() => Promise.resolve([])) }))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  setPersistence: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  browserLocalPersistence: 'local',
  browserSessionPersistence: 'session',
}))

let emit
const setup = (user = null) => {
  fa.onAuthStateChanged.mockImplementation((_, cb) => {
    emit = cb
    cb(user)
    return () => {}
  })
  render(<App />)
}
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))
const flush = () => act(() => Promise.resolve())

beforeEach(() => {
  vi.clearAllMocks()
  window.location.hash = ''
})
afterEach(cleanup)

describe('session', () => {
  it('shows sign in when signed out', () => {
    setup()
    expect(screen.getByRole('button', { name: /^sign in/i })).toBeTruthy()
  })

  it('shows dashboard when signed in and signs out', () => {
    setup({ uid: 'u1' })
    click('Sign out')
    expect(fa.signOut).toHaveBeenCalled()
    act(() => emit(null))
    expect(screen.getByRole('button', { name: /^sign in/i })).toBeTruthy()
  })
})

describe('sign in', () => {
  it('signs in with remembered persistence', async () => {
    setup()
    type('Email address', 'a@x.com')
    type('Password', 'secret123')
    click(/^sign in/i)
    await flush()
    expect(fa.setPersistence).toHaveBeenCalledWith(expect.anything(), 'local')
    expect(fa.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'a@x.com', 'secret123')
  })

  it('uses session persistence when not remembered', async () => {
    setup()
    fireEvent.click(screen.getByRole('checkbox'))
    type('Email address', 'a@x.com')
    type('Password', 'secret123')
    click(/^sign in/i)
    await flush()
    expect(fa.setPersistence).toHaveBeenCalledWith(expect.anything(), 'session')
  })

  it('shows error on bad credentials', async () => {
    fa.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' })
    setup()
    type('Email address', 'a@x.com')
    type('Password', 'wrong')
    click(/^sign in/i)
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Incorrect email or password.')
  })

  it('sends password reset only with an email', async () => {
    setup()
    fireEvent.click(screen.getByText('Forgot password?'))
    await flush()
    expect(screen.getByRole('alert').textContent).toMatch(/Enter your email/)
    expect(fa.sendPasswordResetEmail).not.toHaveBeenCalled()

    type('Email address', 'a@x.com')
    fireEvent.click(screen.getByText('Forgot password?'))
    await flush()
    expect(fa.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'a@x.com')
    expect(screen.getByRole('status').textContent).toMatch(/reset link/)
  })

  it('signs in with Google', async () => {
    setup()
    click(/continue with google/i)
    await flush()
    expect(fa.signInWithPopup).toHaveBeenCalled()
  })
})

describe('sign up', () => {
  const openSignUp = () => {
    setup()
    fireEvent.click(screen.getByText('Sign up'))
  }

  it('creates account and saves display name', async () => {
    fa.createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'u1' } })
    openSignUp()
    type('Full Name', ' Alex ')
    type('Work or Personal Email', 'a@x.com')
    type('Create Password', 'longpassword1')
    fireEvent.click(screen.getByRole('checkbox'))
    click(/create account/i)
    await flush()
    expect(fa.createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'a@x.com', 'longpassword1')
    expect(fa.updateProfile).toHaveBeenCalledWith({ uid: 'u1' }, { displayName: 'Alex' })
  })

  it('requires terms before Google sign up', async () => {
    openSignUp()
    click(/sign up with google/i)
    await flush()
    expect(fa.signInWithPopup).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/Terms of Service/)
  })

  it('opens terms and privacy pages', () => {
    openSignUp()
    fireEvent.click(screen.getByText('Terms of Service'))
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeTruthy()
    click('Back')
    fireEvent.click(screen.getByText('Privacy Policy'))
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeTruthy()
  })
})

describe('routing', () => {
  it('opens a deep-linked page and keeps it in the URL', () => {
    window.location.hash = '#/signup'
    setup()
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy()
    fireEvent.click(screen.getByText('Sign in'))
    expect(window.location.hash).toBe('#/signin')
  })

  it('follows hash changes to help and back', async () => {
    setup({ uid: 'u1' })
    window.location.hash = '#/help'
    await screen.findByRole('heading', { name: 'Help & Documentation' })
    click('Back')
    expect(window.location.hash).toBe('#/')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('hides account pages when signed out', () => {
    window.location.hash = '#/settings'
    setup()
    expect(screen.getByRole('button', { name: /^sign in/i })).toBeTruthy()
  })
})

describe('settings', () => {
  const PROFILE = { id: 'a@x.com', email: 'a@x.com', createdAt: 'x', name: 'Alex', avatar: '', tags: ['work'], preferences: { theme: 'dark' } }

  it('saves name and default view, keeping other profile fields', async () => {
    api.mockImplementation((path, opts) => Promise.resolve(opts ? { ...PROFILE, ...opts.body } : PROFILE))
    window.location.hash = '#/settings'
    setup({ uid: 'u1' })
    await flush()
    expect(screen.getByLabelText('Display Name').value).toBe('Alex')
    type('Default Calendar View', 'Month')
    click('Save')
    await flush()
    expect(api).toHaveBeenCalledWith('/users/me', {
      method: 'PUT',
      body: { name: 'Alex', avatar: '', tags: ['work'], preferences: { theme: 'dark', defaultView: 'Month' } },
    })
    expect(screen.getByRole('status').textContent).toBe('Settings saved.')
  })

  it('creates the profile when none exists', async () => {
    api.mockImplementation((path, opts) => (opts ? Promise.resolve(opts.body) : Promise.reject(Object.assign(new Error('404'), { status: 404 }))))
    window.location.hash = '#/settings'
    setup({ uid: 'u1' })
    await flush()
    type('Display Name', 'Sam')
    click('Save')
    await flush()
    expect(api).toHaveBeenCalledWith('/users/me', { method: 'PUT', body: { name: 'Sam', preferences: { defaultView: 'Week' } } })
  })

  it('blocks saving when the profile fails to load', async () => {
    api.mockRejectedValue(Object.assign(new Error('offline'), { status: 500 }))
    window.location.hash = '#/settings'
    setup({ uid: 'u1' })
    await flush()
    expect(screen.getByRole('alert').textContent).toContain('offline')
    expect(screen.getByRole('button', { name: 'Save' }).disabled).toBe(true)
  })
})
