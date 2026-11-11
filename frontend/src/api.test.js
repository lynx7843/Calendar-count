import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.js'

vi.mock('./auth.js', () => ({ auth: { currentUser: { getIdToken: () => Promise.resolve('tok') } } }))
afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('explains an unreachable backend instead of "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(api('/events')).rejects.toThrow(/Can't reach the server.*backend running/)
  })

  it('includes the server detail and status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ detail: 'no db' }), { status: 503 }))))
    await expect(api('/events', { method: 'POST', body: {} })).rejects.toMatchObject({ message: 'POST /events failed (503): no db', status: 503 })
  })

  it('sends the token and JSON body', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response('{"id":"e1"}', { status: 201 })))
    vi.stubGlobal('fetch', fetch)
    expect(await api('/events', { method: 'POST', body: { title: 'Run' } })).toEqual({ id: 'e1' })
    expect(fetch.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: '{"title":"Run"}' })
  })
})
