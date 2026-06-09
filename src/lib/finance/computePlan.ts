import type { PlannerState, PlanResult, ExpenseLine } from './types'
import { computeTaxes } from './taxEngine'
import { estimateExpenses, sumMonthly } from './costOfLiving'
import {
  nestEggForDrawdown,
  realMonthlyRate,
  resolveMonthlyContribution,
  simulateAccumulation,
  simulateLifecycle,
} from './retirementEngine'

/** Aggregates every derived output the UI needs from a single PlannerState. Pure & deterministic. */
export function computePlan(s: PlannerState): PlanResult {
  // 1. Resolve expenses — auto-estimate unless the user has taken over the table.
  const resolvedExpenses: ExpenseLine[] = s.expensesEdited
    ? s.expenses
    : estimateExpenses(s.state, s.householdSize, s.dependents)
  const expensesMonthly = sumMonthly(resolvedExpenses)

  // 2. Taxes & take-home.
  const tax = computeTaxes(s)

  // 3. Monthly contribution = cash-flow savings (+ employer match) + pre-tax 401k.
  const cashFlow = resolveMonthlyContribution(s, tax.netMonthly, expensesMonthly)
  const monthlyContribution = cashFlow.amount + Math.max(0, s.pretax401k) / 12

  // 4. Retirement target & projection (real returns; target stays in today's dollars).
  const monthlyRate = realMonthlyRate(s.expectedReturnPct, s.inflationPct)
  const retireMonthlyRate = realMonthlyRate(s.retirementReturnPct, s.inflationPct)

  // Retirement-aware nest egg: what you need AT retirement to fund the target income
  // down to life expectancy. Bigger if you retire earlier or returns are lower.
  const monthsInRetirement = Math.max(0, Math.round((s.lifeExpectancy - s.retirementAge) * 12))
  const target = nestEggForDrawdown(s.desiredMonthlyRetirementIncome, monthsInRetirement, retireMonthlyRate)
  const impliedWithdrawalRatePct = target > 0 ? ((s.desiredMonthlyRetirementIncome * 12) / target) * 100 : 0

  // How long to reach that nest egg if you keep contributing.
  const sim = simulateAccumulation({
    startBalance: s.currentSavings,
    monthlyContribution,
    monthlyRate,
    target,
  })
  const monthsToGoal = sim.monthsToGoal
  const reachedAtAge = monthsToGoal === null ? null : s.currentAge + monthsToGoal / 12

  // Full lifecycle: contribute until retirement age, then draw down to life expectancy.
  const lifecycle = simulateLifecycle({
    startBalance: s.currentSavings,
    monthlyContribution,
    accumMonthlyRate: monthlyRate,
    retireMonthlyRate,
    monthlyWithdrawal: s.desiredMonthlyRetirementIncome,
    currentAge: s.currentAge,
    retirementAge: s.retirementAge,
    lifeExpectancy: s.lifeExpectancy,
    target,
  })

  return {
    ...tax,
    expensesMonthly,
    resolvedExpenses,
    monthlyContribution,
    monthlyContributionSource: cashFlow.source,
    requiredNestEgg: target,
    realMonthlyReturnRate: monthlyRate,
    monthsToGoal,
    reachedAtAge,
    alreadyMet: monthsToGoal === 0,
    balanceSeries: sim.series,
    goalCrossMonth: sim.goalCrossMonth,
    lifecycleSeries: lifecycle.series,
    balanceAtRetirement: lifecycle.balanceAtRetirement,
    depletionAge: lifecycle.depletionAge,
    lastsToLifeExpectancy: lifecycle.depletionAge === null,
    lifecycleGoalAge: lifecycle.goalAge,
    onTrack: lifecycle.balanceAtRetirement >= target,
    impliedWithdrawalRatePct,
  }
}
