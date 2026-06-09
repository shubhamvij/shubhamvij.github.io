import type { FederalYearData, TaxYear, Bracket } from './types'

const b = (upTo: number | null, rate: number): Bracket => ({ upTo, rate })

// Sources: IRS Rev. Proc. 2024-40 (2025), IRS 2026 inflation adjustments + One Big Beautiful Bill
// (Public Law 119-21), SSA contribution & benefit base. See plan Appendix A.
export const FEDERAL_BY_YEAR: Record<TaxYear, FederalYearData> = {
  2025: {
    brackets: {
      single: [b(11925, 10), b(48475, 12), b(103350, 22), b(197300, 24), b(250525, 32), b(375800, 35), b(null, 37)],
      mfj: [b(23850, 10), b(96950, 12), b(206700, 22), b(394600, 24), b(501050, 32), b(751600, 35), b(null, 37)],
      mfs: [b(11925, 10), b(48475, 12), b(103350, 22), b(196350, 24), b(250525, 32), b(375800, 35), b(null, 37)],
      hoh: [b(15975, 10), b(64025, 12), b(137775, 22), b(263175, 24), b(333325, 32), b(501600, 35), b(null, 37)],
    },
    standardDeduction: { single: 15750, mfj: 31500, mfs: 15750, hoh: 23625 },
    ctcPerChild: 2200,
    otherDependentCredit: 500,
    ctcPhaseoutStart: { single: 200000, mfj: 400000, mfs: 200000, hoh: 200000 },
    ssWageBase: 176100,
    ssRate: 6.2,
    medicareRate: 1.45,
    addlMedicareRate: 0.9,
    addlMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 },
  },
  2026: {
    brackets: {
      single: [b(12400, 10), b(50400, 12), b(105700, 22), b(201775, 24), b(256225, 32), b(384100, 35), b(null, 37)],
      mfj: [b(24800, 10), b(100800, 12), b(211400, 22), b(403550, 24), b(512450, 32), b(768700, 35), b(null, 37)],
      mfs: [b(12400, 10), b(50400, 12), b(105700, 22), b(201875, 24), b(256225, 32), b(384350, 35), b(null, 37)],
      hoh: [b(16600, 10), b(63300, 12), b(140900, 22), b(268750, 24), b(339600, 32), b(512450, 35), b(null, 37)],
    },
    standardDeduction: { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150 },
    ctcPerChild: 2200,
    otherDependentCredit: 500,
    ctcPhaseoutStart: { single: 200000, mfj: 400000, mfs: 200000, hoh: 200000 },
    ssWageBase: 184500,
    ssRate: 6.2,
    medicareRate: 1.45,
    addlMedicareRate: 0.9,
    addlMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 },
  },
}
