/** Display formatting helpers for the finance planner. */

export function fmtMoney(n: number, decimals = 0): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtPct(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

/** Months -> "X yr Y mo" / "Now" / "Never". */
export function fmtYearsMonths(months: number | null): string {
  if (months === null) return 'Never'
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  if (y === 0 && m === 0) return 'Now'
  const parts: string[] = []
  if (y > 0) parts.push(`${y} yr`)
  if (m > 0) parts.push(`${m} mo`)
  return parts.join(' ')
}
