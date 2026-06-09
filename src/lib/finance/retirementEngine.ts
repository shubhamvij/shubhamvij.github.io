import type { PlannerState, SavingsMode, BalancePoint, LifecyclePoint } from './types'

/** Nest egg needed so the target income is `withdrawalRatePct`% of the portfolio (4% rule → ×25). */
export function requiredNestEgg(desiredMonthly: number, withdrawalRatePct: number): number {
  if (withdrawalRatePct <= 0) return Infinity
  return (desiredMonthly * 12) / (withdrawalRatePct / 100)
}

/**
 * Retirement-aware nest egg: the present value at retirement of drawing `monthlyIncome`
 * for `months` (retirement age → life expectancy) while the balance grows at `monthlyRate`.
 * Larger when you retire earlier (more months) or returns are lower.
 */
export function nestEggForDrawdown(monthlyIncome: number, months: number, monthlyRate: number): number {
  if (months <= 0) return 0
  if (Math.abs(monthlyRate) < 1e-9) return monthlyIncome * months
  return (monthlyIncome * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate
}

/** Convert an annual rate to its compounding monthly rate. Do NOT just divide by 12. */
export function monthlyRateFromAnnual(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1
}

/** Inflation-adjusted (real) monthly rate via the Fisher relation. */
export function realMonthlyRate(nominalPct: number, inflationPct: number): number {
  const realAnnual = (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1
  return Math.pow(1 + realAnnual, 1 / 12) - 1
}

export interface SimParams {
  startBalance: number
  monthlyContribution: number
  monthlyRate: number
  target: number
  capMonths?: number
}

export interface SimResult {
  monthsToGoal: number | null
  series: BalancePoint[]
  goalCrossMonth: number | null
}

const MAX_SERIES_POINTS = 121

/** Downsample a per-month balance array to at most `maxPoints`, always keeping first and last. */
function sampleSeries(balances: number[], maxPoints = MAX_SERIES_POINTS): BalancePoint[] {
  const n = balances.length
  if (n <= maxPoints) return balances.map((balance, month) => ({ month, balance }))
  const out: BalancePoint[] = []
  const step = (n - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i++) {
    const month = Math.round(i * step)
    out.push({ month, balance: balances[month] })
  }
  return out
}

/**
 * Month-by-month accumulation: each month the balance grows then a contribution is added.
 * Returns months-to-target (null if not reached within the cap) plus a sampled series.
 */
export function simulateAccumulation(p: SimParams): SimResult {
  const cap = p.capMonths ?? 1200

  if (p.startBalance >= p.target) {
    return {
      monthsToGoal: 0,
      series: [{ month: 0, balance: p.startBalance }],
      goalCrossMonth: 0,
    }
  }

  let balance = p.startBalance
  const balances: number[] = [balance]
  let monthsToGoal: number | null = null

  for (let m = 1; m <= cap; m++) {
    balance = balance * (1 + p.monthlyRate) + p.monthlyContribution
    balances.push(balance)
    if (balance >= p.target) {
      monthsToGoal = m
      break
    }
  }

  return {
    monthsToGoal,
    series: sampleSeries(balances),
    goalCrossMonth: monthsToGoal,
  }
}

export interface LifecycleParams {
  startBalance: number
  monthlyContribution: number
  accumMonthlyRate: number
  retireMonthlyRate: number
  monthlyWithdrawal: number
  currentAge: number
  retirementAge: number
  lifeExpectancy: number
  target: number
}

export interface LifecycleResult {
  series: LifecyclePoint[]
  balanceAtRetirement: number
  /** Age the balance hits zero during drawdown, or null if it survives to life expectancy. */
  depletionAge: number | null
  /** Age the balance first reaches the target, or null. */
  goalAge: number | null
  peakBalance: number
}

function sampleLifecycle(balances: number[], currentAge: number, maxPoints = MAX_SERIES_POINTS): LifecyclePoint[] {
  const n = balances.length
  const toPoint = (month: number): LifecyclePoint => ({ age: currentAge + month / 12, balance: balances[month] })
  if (n <= maxPoints) return balances.map((_, month) => toPoint(month))
  const out: LifecyclePoint[] = []
  const step = (n - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i++) out.push(toPoint(Math.round(i * step)))
  return out
}

/**
 * Two-phase lifecycle: contribute & grow until retirement age, then stop contributing and
 * withdraw `monthlyWithdrawal` each month at the (typically lower) retirement rate until life
 * expectancy. Reports when the balance hits the target and whether/when it runs out.
 */
export function simulateLifecycle(p: LifecycleParams): LifecycleResult {
  const monthsToRetirement = Math.max(0, Math.round((p.retirementAge - p.currentAge) * 12))
  const totalMonths = Math.max(0, Math.round((p.lifeExpectancy - p.currentAge) * 12))

  let balance = p.startBalance
  const balances: number[] = [balance]
  let depletionMonth: number | null = null
  let goalMonth: number | null = balance >= p.target ? 0 : null

  for (let m = 1; m <= totalMonths; m++) {
    if (m <= monthsToRetirement) {
      balance = balance * (1 + p.accumMonthlyRate) + p.monthlyContribution
    } else {
      balance = balance * (1 + p.retireMonthlyRate) - p.monthlyWithdrawal
      if (balance <= 0) {
        balance = 0
        if (depletionMonth === null) depletionMonth = m
      }
    }
    if (goalMonth === null && balance >= p.target) goalMonth = m
    balances.push(balance)
  }

  return {
    series: sampleLifecycle(balances, p.currentAge),
    balanceAtRetirement: balances[Math.min(monthsToRetirement, balances.length - 1)],
    depletionAge: depletionMonth === null ? null : p.currentAge + depletionMonth / 12,
    goalAge: goalMonth === null ? null : p.currentAge + goalMonth / 12,
    peakBalance: balances.reduce((a, b) => Math.max(a, b), 0),
  }
}

/** Resolve the effective monthly contribution from the active savings mode, plus employer match. */
export function resolveMonthlyContribution(
  state: PlannerState,
  netMonthly: number,
  expensesMonthly: number,
): { amount: number; source: SavingsMode } {
  let base: number
  switch (state.savingsMode) {
    case 'rate':
      base = netMonthly * (state.savingsRatePct / 100)
      break
    case 'contribution':
      base = state.directMonthlyContribution
      break
    case 'expenses':
    default:
      base = netMonthly - expensesMonthly
      break
  }
  const amount = Math.max(0, base) + Math.max(0, state.employerMatch) / 12
  return { amount, source: state.savingsMode }
}
