import type { PlannerState, FederalYearData, TaxBreakdown, Bracket } from './types'
import { FEDERAL_BY_YEAR } from './federalTaxData'
import { STATE_BY_CODE } from './stateTaxData'

export function grossIncome(s: PlannerState): number {
  return s.annualIncome + s.otherIncome.reduce((sum, x) => sum + (x.annual || 0), 0)
}

/** Pre-tax dollars that reduce federal taxable income (all three reduce income tax). */
function pretaxForIncome(s: PlannerState): number {
  return Math.max(0, s.pretax401k) + Math.max(0, s.pretaxHsa) + Math.max(0, s.pretaxHealthInsurance)
}

/** Walk marginal brackets. Returns total tax and the marginal rate the income lands in. */
export function computeBracketTax(
  taxable: number,
  brackets: Bracket[],
): { tax: number; marginalRatePct: number } {
  if (taxable <= 0) return { tax: 0, marginalRatePct: 0 }
  let tax = 0
  let lower = 0
  let marginalRatePct = 0
  for (const band of brackets) {
    const upper = band.upTo ?? Infinity
    const amountInBand = Math.min(taxable, upper) - lower
    if (amountInBand > 0) {
      tax += amountInBand * (band.rate / 100)
      marginalRatePct = band.rate
    }
    if (taxable <= upper) break
    lower = upper
  }
  return { tax, marginalRatePct }
}

export function computeFederalTaxableIncome(s: PlannerState, fed: FederalYearData): number {
  const std = fed.standardDeduction[s.filingStatus]
  return Math.max(0, grossIncome(s) - pretaxForIncome(s) - std)
}

/** All dependents are treated as qualifying children (an estimator simplification). */
export function computeChildTaxCredit(s: PlannerState, fed: FederalYearData, agi: number): number {
  if (s.dependents <= 0) return 0
  const raw = s.dependents * fed.ctcPerChild
  const over = Math.max(0, agi - fed.ctcPhaseoutStart[s.filingStatus])
  const phaseout = Math.ceil(over / 1000) * 50
  return Math.max(0, raw - phaseout)
}

/** FICA applies to primary W-2 wages; other income is assumed non-wage. 401k does NOT reduce FICA. */
export function computeFICA(
  s: PlannerState,
  fed: FederalYearData,
): { socialSecurity: number; medicare: number; total: number } {
  const ficaWages = Math.max(
    0,
    s.annualIncome - Math.max(0, s.pretaxHsa) - Math.max(0, s.pretaxHealthInsurance),
  )
  const socialSecurity = Math.min(ficaWages, fed.ssWageBase) * (fed.ssRate / 100)
  const medicareBase = ficaWages * (fed.medicareRate / 100)
  const addlMedicare =
    Math.max(0, ficaWages - fed.addlMedicareThreshold[s.filingStatus]) * (fed.addlMedicareRate / 100)
  const medicare = medicareBase + addlMedicare
  return { socialSecurity, medicare, total: socialSecurity + medicare }
}

export function computeStateTax(s: PlannerState): { tax: number; marginalRatePct: number } {
  const info = STATE_BY_CODE[s.state]
  if (!info || info.kind === 'none') return { tax: 0, marginalRatePct: 0 }
  const std = info.standardDeduction?.[s.filingStatus] ?? 0
  const base = Math.max(0, grossIncome(s) - pretaxForIncome(s) - std)
  if (info.kind === 'flat') {
    const rate = info.flatRatePct ?? 0
    return { tax: base * (rate / 100), marginalRatePct: base > 0 ? rate : 0 }
  }
  return computeBracketTax(base, info.brackets![s.filingStatus])
}

export function computeTaxes(s: PlannerState): TaxBreakdown {
  const fed = FEDERAL_BY_YEAR[s.taxYear]
  const gross = grossIncome(s)
  const pretaxTotal = pretaxForIncome(s)
  const federalTaxableIncome = computeFederalTaxableIncome(s, fed)
  const { tax: federalBeforeCredit, marginalRatePct: federalMarginalRatePct } = computeBracketTax(
    federalTaxableIncome,
    fed.brackets[s.filingStatus],
  )
  const agi = Math.max(0, gross - pretaxTotal)
  const rawCredit = computeChildTaxCredit(s, fed, agi)
  const childTaxCredit = Math.min(rawCredit, federalBeforeCredit)
  const federalTax = federalBeforeCredit - childTaxCredit
  const fica = computeFICA(s, fed)
  const state = computeStateTax(s)
  const totalTax = federalTax + fica.total + state.tax
  const netAnnual = gross - totalTax - pretaxTotal
  return {
    gross,
    pretaxTotal,
    federalTaxableIncome,
    federalTax,
    federalMarginalRatePct,
    federalEffectiveRatePct: gross > 0 ? (federalTax / gross) * 100 : 0,
    childTaxCredit,
    ficaSocialSecurity: fica.socialSecurity,
    ficaMedicare: fica.medicare,
    ficaTotal: fica.total,
    stateTax: state.tax,
    stateMarginalRatePct: state.marginalRatePct,
    stateEffectiveRatePct: gross > 0 ? (state.tax / gross) * 100 : 0,
    totalTax,
    netAnnual,
    netMonthly: netAnnual / 12,
  }
}
