import { auth } from './auth.js'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function api(path, { method = 'GET', body } = {}) {
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`)
  return res.status === 204 ? null : res.json()
}
