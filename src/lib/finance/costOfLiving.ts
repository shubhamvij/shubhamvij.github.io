import type { ExpenseLine } from './types'
import {
  COL_NATIONAL_BASELINE,
  STATE_COL_INDEX,
  CHILDCARE_PER_CHILD,
  householdScale,
} from './costOfLivingData'

/** Auto-estimate an editable monthly expense breakdown from state + household composition. */
export function estimateExpenses(state: string, householdSize: number, dependents: number): ExpenseLine[] {
  const index = STATE_COL_INDEX[state] ?? 1
  const kids = Math.max(0, dependents)
  const adults = Math.max(1, householdSize - kids)
  const scale = householdScale(adults, kids)
  return COL_NATIONAL_BASELINE.map((line) => {
    if (line.key === 'childcare') {
      return { ...line, monthly: Math.round(kids * CHILDCARE_PER_CHILD * index) }
    }
    return { ...line, monthly: Math.round(line.monthly * index * scale) }
  })
}

export function sumMonthly(lines: ExpenseLine[]): number {
  return lines.reduce((sum, l) => sum + (l.monthly || 0), 0)
}
