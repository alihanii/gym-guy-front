const KEY = 'gg.tokens'

type Tokens = { access: string; refresh: string }

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

export function setTokens(t: Tokens | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: session-only login */
  }
}

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, data: unknown) {
    super(firstMessage(data) ?? `خطای ${status}`)
    this.status = status
    this.data = data
  }
}

/** Pull the first human-readable message out of a DRF error payload. */
function firstMessage(data: unknown): string | undefined {
  if (!data) return undefined
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return firstMessage(data[0])
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    for (const v of Object.values(obj)) {
      const m = firstMessage(v)
      if (m) return m
    }
  }
  return undefined
}

let refreshing: Promise<boolean> | null = null

async function refresh(): Promise<boolean> {
  const t = getTokens()
  if (!t) return false
  refreshing ??= fetch('/api/auth/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: t.refresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false
      const data = await r.json()
      setTokens({ access: data.access, refresh: data.refresh ?? t.refresh })
      return true
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  const t = getTokens()
  if (t) headers.set('Authorization', `Bearer ${t.access}`)
  let body = init.body
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body })
  if (res.status === 401 && retry && (await refresh())) return api<T>(path, init, false)
  if (res.status === 401) {
    setTokens(null)
    window.dispatchEvent(new Event('gg:logout'))
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data as T
}
