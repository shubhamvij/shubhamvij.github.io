import { describe, it, expect } from 'vitest'
import {
  grossIncome,
  computeBracketTax,
  computeFederalTaxableIncome,
  computeChildTaxCredit,
  computeFICA,
  computeStateTax,
  computeTaxes,
} from '../taxEngine'
import { FEDERAL_BY_YEAR } from '../federalTaxData'
import { makeDefaultState } from '../defaults'

const FED25 = FEDERAL_BY_YEAR[2025]

describe('grossIncome', () => {
  it('sums primary income and all other income streams', () => {
    const s = {
      ...makeDefaultState(),
      annualIncome: 100000,
      otherIncome: [
        { label: 'Rental', annual: 12000 },
        { label: 'Dividends', annual: 3000 },
      ],
    }
    expect(grossIncome(s)).toBe(115000)
  })
})

describe('computeBracketTax', () => {
  it('matches the IRS worked example: $100k single 2025 = $16,914', () => {
    const r = computeBracketTax(100000, FED25.brackets.single)
    expect(r.tax).toBeCloseTo(16914, 2)
    expect(r.marginalRatePct).toBe(22)
  })

  it('is zero with a 0% marginal rate at zero taxable income', () => {
    const r = computeBracketTax(0, FED25.brackets.single)
    expect(r.tax).toBe(0)
    expect(r.marginalRatePct).toBe(0)
  })

  it('reports the marginal rate of the band the income lands in', () => {
    expect(computeBracketTax(11925, FED25.brackets.single).marginalRatePct).toBe(10)
    expect(computeBracketTax(11926, FED25.brackets.single).marginalRatePct).toBe(12)
    expect(computeBracketTax(500000, FED25.brackets.single).marginalRatePct).toBe(37)
  })
})

describe('computeFederalTaxableIncome', () => {
  it('subtracts the standard deduction from gross', () => {
    const s = { ...makeDefaultState(), annualIncome: 100000, otherIncome: [] }
    expect(computeFederalTaxableIncome(s, FED25)).toBe(100000 - 15750)
  })

  it('subtracts 401k, HSA, and health premiums from taxable income', () => {
    const s = {
      ...makeDefaultState(),
      annualIncome: 100000,
      otherIncome: [],
      pretax401k: 10000,
      pretaxHsa: 2000,
      pretaxHealthInsurance: 3000,
    }
    expect(computeFederalTaxableIncome(s, FED25)).toBe(100000 - 15000 - 15750)
  })

  it('never goes below zero', () => {
    const s = { ...makeDefaultState(), annualIncome: 5000, otherIncome: [] }
    expect(computeFederalTaxableIncome(s, FED25)).toBe(0)
  })
})

describe('computeFICA', () => {
  it('applies SS 6.2% and Medicare 1.45% to wages', () => {
    const s = { ...makeDefaultState(), annualIncome: 100000, otherIncome: [], filingStatus: 'single' as const }
    const r = computeFICA(s, FED25)
    expect(r.socialSecurity).toBeCloseTo(6200, 2)
    expect(r.medicare).toBeCloseTo(1450, 2)
    expect(r.total).toBeCloseTo(7650, 2)
  })

  it('caps Social Security at the wage base and adds the 0.9% additional Medicare', () => {
    const s = { ...makeDefaultState(), annualIncome: 300000, otherIncome: [], filingStatus: 'single' as const }
    const r = computeFICA(s, FED25)
    expect(r.socialSecurity).toBeCloseTo(176100 * 0.062, 2) // capped
    expect(r.medicare).toBeCloseTo(300000 * 0.0145 + (300000 - 200000) * 0.009, 2)
  })

  it('does NOT let 401k reduce FICA wages, but HSA/health do', () => {
    const with401k = { ...makeDefaultState(), annualIncome: 100000, otherIncome: [], pretax401k: 20000 }
    expect(computeFICA(with401k, FED25).socialSecurity).toBeCloseTo(6200, 2) // unchanged

    const withHsa = { ...makeDefaultState(), annualIncome: 100000, otherIncome: [], pretaxHsa: 5000 }
    expect(computeFICA(withHsa, FED25).socialSecurity).toBeCloseTo(95000 * 0.062, 2)
  })
})

describe('computeChildTaxCredit', () => {
  it('grants $2,200 per dependent below the phaseout', () => {
    const s = { ...makeDefaultState(), dependents: 2, filingStatus: 'single' as const }
    expect(computeChildTaxCredit(s, FED25, 120000)).toBe(4400)
  })

  it('phases out $50 per $1,000 over $200k (single) and floors at zero', () => {
    const s = { ...makeDefaultState(), dependents: 2, filingStatus: 'single' as const }
    // ($410k - $200k)/1k = 210 -> 210*$50 = $10,500 phaseout > $4,400 credit -> 0
    expect(computeChildTaxCredit(s, FED25, 410000)).toBe(0)
  })

  it('is zero with no dependents', () => {
    const s = { ...makeDefaultState(), dependents: 0 }
    expect(computeChildTaxCredit(s, FED25, 50000)).toBe(0)
  })
})

describe('computeStateTax', () => {
  it('is zero for a no-income-tax state', () => {
    const s = { ...makeDefaultState(), state: 'TX', annualIncome: 100000, otherIncome: [] }
    expect(computeStateTax(s).tax).toBe(0)
  })

  it('applies a flat rate after the state standard deduction', () => {
    const s = { ...makeDefaultState(), state: 'CO', annualIncome: 100000, otherIncome: [], filingStatus: 'single' as const }
    // (100000 - 15000) * 4.4%
    expect(computeStateTax(s).tax).toBeCloseTo(85000 * 0.044, 2)
    expect(computeStateTax(s).marginalRatePct).toBe(4.4)
  })

  it('walks progressive brackets (California single, $100k)', () => {
    const s = { ...makeDefaultState(), state: 'CA', annualIncome: 100000, otherIncome: [], filingStatus: 'single' as const }
    // taxable = 100000 - 5540 = 94460; hand-computed CA tax
    expect(computeStateTax(s).tax).toBeCloseTo(5327.14, 1)
    expect(computeStateTax(s).marginalRatePct).toBe(9.3)
  })
})

describe('computeTaxes (orchestration)', () => {
  it('produces a consistent full breakdown for $100k single in TX', () => {
    const s = {
      ...makeDefaultState(),
      annualIncome: 100000,
      otherIncome: [],
      state: 'TX',
      filingStatus: 'single' as const,
      dependents: 0,
      taxYear: 2025 as const,
    }
    const t = computeTaxes(s)
    expect(t.gross).toBe(100000)
    expect(t.federalTaxableIncome).toBe(84250)
    expect(t.federalTax).toBeCloseTo(13449, 0) // 10/12/22 on 84250
    expect(t.ficaTotal).toBeCloseTo(7650, 2)
    expect(t.stateTax).toBe(0)
    expect(t.totalTax).toBeCloseTo(13449 + 7650, 0)
    expect(t.netAnnual).toBeCloseTo(100000 - 13449 - 7650, 0)
    expect(t.netMonthly).toBeCloseTo(t.netAnnual / 12, 4)
    expect(t.federalEffectiveRatePct).toBeCloseTo(13.449, 1)
  })

  it('subtracts the child tax credit from federal tax', () => {
    const base = { ...makeDefaultState(), annualIncome: 100000, otherIncome: [], state: 'TX', dependents: 0 }
    const withKids = { ...base, dependents: 2 }
    const noKidsTax = computeTaxes(base).federalTax
    const withKidsTax = computeTaxes(withKids).federalTax
    expect(noKidsTax - withKidsTax).toBeCloseTo(4400, 0)
    expect(computeTaxes(withKids).childTaxCredit).toBeCloseTo(4400, 0)
  })

  it('selects the 2026 tables when taxYear is 2026 (higher SS wage base)', () => {
    const s2025 = { ...makeDefaultState(), annualIncome: 300000, otherIncome: [], state: 'TX', taxYear: 2025 as const }
    const s2026 = { ...s2025, taxYear: 2026 as const }
    // SS cap higher in 2026 -> more SS tax
    expect(computeTaxes(s2026).ficaSocialSecurity).toBeGreaterThan(computeTaxes(s2025).ficaSocialSecurity)
    expect(computeTaxes(s2026).ficaSocialSecurity).toBeCloseTo(184500 * 0.062, 2)
  })
})
