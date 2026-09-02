import { PUBLIC_API_URL } from 'astro:env/client'

const PUBLIC_API_BASE = PUBLIC_API_URL.replace(/\/$/, '')

export function resolveApiBase(): string {
  if (typeof window === 'undefined') return PUBLIC_API_BASE
  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'|| hostname.endsWith('.localhost')
  if (isLocal) return PUBLIC_API_BASE
  const url = new URL(PUBLIC_API_BASE)
  url.hostname = hostname
  return url.toString().replace(/\/$/, '')
}
