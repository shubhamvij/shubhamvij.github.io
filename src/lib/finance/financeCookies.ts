// Mirrors src/lib/windowCookies.ts: stores the encoded restore code in a 30-day cookie.

const COOKIE_NAME = 'finance_plan'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function getSavedPlanCode(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match || !match[1]) return null
  return decodeURIComponent(match[1])
}

export function setSavedPlanCode(code: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; max-age=${MAX_AGE}; path=/; SameSite=Lax`
}
