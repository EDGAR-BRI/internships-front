import { PUBLIC_API_URL } from 'astro:env/client'

const PUBLIC_API_BASE = PUBLIC_API_URL.replace(/\/$/, '')

export function resolveApiBase(): string {
  return PUBLIC_API_BASE
}
