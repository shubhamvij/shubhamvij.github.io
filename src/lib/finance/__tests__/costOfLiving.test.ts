import { describe, it, expect } from 'vitest'
import { estimateExpenses, sumMonthly } from '../costOfLiving'
import { COL_NATIONAL_BASELINE } from '../costOfLivingData'

describe('sumMonthly', () => {
  it('totals the monthly amounts', () => {
    expect(sumMonthly([
      { key: 'a', label: 'A', monthly: 100 },
      { key: 'b', label: 'B', monthly: 250 },
    ])).toBe(350)
  })
})

describe('estimateExpenses', () => {
  it('returns one line per baseline category, keys preserved', () => {
    const lines = estimateExpenses('TX', 1, 0)
    expect(lines.map((l) => l.key)).toEqual(COL_NATIONAL_BASELINE.map((l) => l.key))
  })

  it('scales totals up for a high cost-of-living state', () => {
    const ca = sumMonthly(estimateExpenses('CA', 2, 1))
    const tx = sumMonthly(estimateExpenses('TX', 2, 1))
    expect(ca).toBeGreaterThan(tx)
  })

  it('grows with household size but sub-linearly across adults', () => {
    const single = sumMonthly(estimateExpenses('TX', 1, 0))
    const twoAdults = sumMonthly(estimateExpenses('TX', 2, 0))
    expect(twoAdults).toBeGreaterThan(single)
    expect(twoAdults).toBeLessThan(single * 2) // economies of scale
  })

  it('adds a non-zero childcare line only when there are dependents', () => {
    const noKids = estimateExpenses('TX', 1, 0).find((l) => l.key === 'childcare')!
    const twoKids = estimateExpenses('TX', 3, 2).find((l) => l.key === 'childcare')!
    expect(noKids.monthly).toBe(0)
    expect(twoKids.monthly).toBeGreaterThan(0)
  })

  it('falls back to the national index for an unknown state', () => {
    const lines = estimateExpenses('ZZ', 1, 0)
    const housing = lines.find((l) => l.key === 'housing')!
    expect(housing.monthly).toBe(1500) // baseline unscaled
  })
})
