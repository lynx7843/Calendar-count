import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})) }))

const { authMessage } = await import('./auth.js')

describe('authMessage', () => {
  it('maps known Firebase codes', () => {
    expect(authMessage({ code: 'auth/invalid-credential' })).toBe('Incorrect email or password.')
    expect(authMessage({ code: 'auth/email-already-in-use' })).toMatch(/already exists/)
  })

  it('hides closed popup errors', () => {
    expect(authMessage({ code: 'auth/popup-closed-by-user' })).toBe('')
  })

  it('falls back for unknown errors', () => {
    expect(authMessage(new Error('boom'))).toMatch(/Something went wrong/)
  })
})
