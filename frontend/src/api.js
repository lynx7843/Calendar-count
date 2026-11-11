import { auth } from './auth.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function api(path, { method = 'GET', body } = {}) {
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => {
    throw new Error(`Can't reach the server at ${BASE}. Is the backend running?`)
  })
  if (!res.ok) {
    const detail = await res.json().then((b) => b.detail, () => null)
    const why = typeof detail === 'string' ? `: ${detail}` : '' // 422 details are lists, skip them
    throw Object.assign(new Error(`${method} ${path} failed (${res.status})${why}`), { status: res.status })
  }
  return res.status === 204 ? null : res.json()
}
