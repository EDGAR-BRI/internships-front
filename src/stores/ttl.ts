export const DEFAULT_TTL_MS = 60_000

export function isFresh(lastFetched: number, ttlMs: number = DEFAULT_TTL_MS): boolean {
  return lastFetched > 0 && Date.now() - lastFetched < ttlMs
}
