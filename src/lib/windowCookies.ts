export interface SavedWindow {
  id: string
  x: number
  y: number
  w: number
  h: number
  max?: boolean
}

const COOKIE_NAME = 'open_windows'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function getOpenWindows(): SavedWindow[] {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match || !match[1]) return []
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return []
  }
}

export function setOpenWindows(windows: SavedWindow[]): void {
  const value = JSON.stringify(windows)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; max-age=${MAX_AGE}; path=/; SameSite=Lax`
}
