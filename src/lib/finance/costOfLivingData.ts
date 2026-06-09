import type { ExpenseLine } from './types'

// Single-adult national-baseline monthly expenses (US avg, index = 1.00). Editable defaults derived
// from BLS Consumer Expenditure Survey 2024 (scaled to a single adult). See plan Appendix C.
export const COL_NATIONAL_BASELINE: ExpenseLine[] = [
  { key: 'housing', label: 'Housing / Rent', monthly: 1500 },
  { key: 'utilities', label: 'Utilities', monthly: 180 },
  { key: 'groceries', label: 'Groceries', monthly: 400 },
  { key: 'dining', label: 'Dining & Entertainment', monthly: 250 },
  { key: 'transportation', label: 'Transportation', monthly: 450 },
  { key: 'auto_insurance', label: 'Auto Insurance', monthly: 150 },
  { key: 'healthcare', label: 'Healthcare', monthly: 300 },
  { key: 'childcare', label: 'Childcare', monthly: 0 },
  { key: 'personal', label: 'Personal & Discretionary', monthly: 300 },
  { key: 'other', label: 'Other / Debt', monthly: 250 },
]

/** Average monthly childcare cost per child at the national index (state-scaled at use). */
export const CHILDCARE_PER_CHILD = 800

/** Per-state cost-of-living multiplier (US average = 1.00). Approx. BEA Regional Price Parities 2024. */
export const STATE_COL_INDEX: Record<string, number> = {
  AL: 0.875, AK: 1.05, AZ: 1.01, AR: 0.865, CA: 1.107, CO: 1.03, CT: 1.02, DE: 0.98,
  FL: 1.0, GA: 0.93, HI: 1.1, ID: 0.93, IL: 0.99, IN: 0.9, IA: 0.878, KS: 0.895,
  KY: 0.885, LA: 0.91, ME: 0.98, MD: 1.04, MA: 1.06, MI: 0.93, MN: 0.97, MS: 0.87,
  MO: 0.89, MT: 0.95, NE: 0.895, NV: 0.985, NH: 1.05, NJ: 1.088, NM: 0.93, NY: 1.08,
  NC: 0.93, ND: 0.9, OH: 0.89, OK: 0.878, OR: 1.0, PA: 0.97, RI: 1.0, SC: 0.92,
  SD: 0.88, TN: 0.9, TX: 0.92, UT: 0.97, VT: 1.0, VA: 1.0, WA: 1.03, WV: 0.88,
  WI: 0.92, WY: 0.93, DC: 1.099,
}

/** Sub-linear household multiplier for non-childcare expenses. */
export function householdScale(adults: number, kids: number): number {
  return 1 + 0.4 * Math.max(0, adults - 1) + 0.3 * Math.max(0, kids)
}
