import { describe, it, expect } from 'vitest'
import { computePlan } from '../computePlan'
import { makeDefaultState } from '../defaults'
import { nestEggForDrawdown, realMonthlyRate } from '../retirementEngine'
import { sumMonthly } from '../costOfLiving'
import type { SavingsMode } from '../types'

describe('computePlan', () => {
  it('produces an internally-consistent take-home figure', () => {
    const r = computePlan(makeDefaultState())
    expect(r.netAnnual).toBeCloseTo(r.gross - r.totalTax - r.pretaxTotal, 4)
    expect(r.netMonthly).toBeCloseTo(r.netAnnual / 12, 4)
  })

  it('computes a retirement-aware nest egg (present value of the drawdown to life expectancy)', () => {
    const def = makeDefaultState()
    const r = computePlan(def)
    const months = (def.lifeExpectancy - def.retirementAge) * 12
    const expected = nestEggForDrawdown(
      def.desiredMonthlyRetirementIncome,
      months,
      realMonthlyRate(def.retirementReturnPct, def.inflationPct),
    )
    expect(r.requiredNestEgg).toBeCloseTo(expected, 2)
  })

  it('makes the nest egg respond to retirement age (retiring earlier needs more)', () => {
    const base = makeDefaultState()
    const earlier = computePlan({ ...base, retirementAge: 50 }).requiredNestEgg
    const later = computePlan({ ...base, retirementAge: 67 }).requiredNestEgg
    expect(earlier).toBeGreaterThan(later)
  })

  it('reports on-track only when the balance at retirement covers the nest egg', () => {
    const rich = computePlan({ ...makeDefaultState(), currentSavings: 5_000_000 })
    expect(rich.onTrack).toBe(true)
    const poor = computePlan({
      ...makeDefaultState(),
      savingsMode: 'contribution' as SavingsMode,
      directMonthlyContribution: 0,
      currentSavings: 0,
      desiredMonthlyRetirementIncome: 12000,
    })
    expect(poor.onTrack).toBe(false)
  })

  it('auto-estimates editable expenses and totals them', () => {
    const r = computePlan(makeDefaultState())
    expect(r.resolvedExpenses.some((l) => l.key === 'childcare')).toBe(true)
    expect(r.expensesMonthly).toBe(sumMonthly(r.resolvedExpenses))
  })

  it('uses user-entered expenses once expensesEdited is set', () => {
    const s = {
      ...makeDefaultState(),
      expensesEdited: true,
      expenses: [{ key: 'housing', label: 'Housing', monthly: 2000 }],
    }
    const r = computePlan(s)
    expect(r.expensesMonthly).toBe(2000)
    expect(r.resolvedExpenses).toHaveLength(1)
  })

  it('combines cash-flow savings, employer match, and 401k into the monthly contribution', () => {
    const s = {
      ...makeDefaultState(),
      state: 'TX',
      annualIncome: 120000,
      otherIncome: [],
      savingsMode: 'contribution' as SavingsMode,
      directMonthlyContribution: 1000,
      employerMatch: 1200, // 100/mo
      pretax401k: 6000, // 500/mo
    }
    const r = computePlan(s)
    expect(r.monthlyContributionSource).toBe('contribution')
    expect(r.monthlyContribution).toBeCloseTo(1000 + 100 + 500, 4)
  })

  it('reports the goal already met when current savings exceed the target', () => {
    const s = { ...makeDefaultState(), currentSavings: 2_000_000 }
    const r = computePlan(s)
    expect(r.alreadyMet).toBe(true)
    expect(r.monthsToGoal).toBe(0)
    expect(r.reachedAtAge).toBe(s.currentAge)
  })

  it('projects a reach age beyond the current age for a default saver', () => {
    const r = computePlan(makeDefaultState())
    expect(r.monthsToGoal).not.toBeNull()
    expect(r.reachedAtAge!).toBeGreaterThan(makeDefaultState().currentAge)
    expect(r.balanceSeries.length).toBeGreaterThan(1)
    expect(r.goalCrossMonth).toBe(r.monthsToGoal)
  })

  it('models the full lifecycle from current age to life expectancy', () => {
    const def = makeDefaultState()
    const r = computePlan(def)
    expect(r.lifecycleSeries.length).toBeGreaterThan(1)
    expect(r.lifecycleSeries[0].age).toBe(def.currentAge)
    expect(r.lifecycleSeries[r.lifecycleSeries.length - 1].age).toBe(def.lifeExpectancy)
    expect(r.lastsToLifeExpectancy).toBe(r.depletionAge === null)
  })

  it('flags depletion when contributions are far too low for the target', () => {
    const s = {
      ...makeDefaultState(),
      state: 'TX',
      currentSavings: 0,
      savingsMode: 'contribution' as SavingsMode,
      directMonthlyContribution: 100,
      employerMatch: 0,
      pretax401k: 0,
      desiredMonthlyRetirementIncome: 10000,
    }
    const r = computePlan(s)
    expect(r.lastsToLifeExpectancy).toBe(false)
    expect(r.depletionAge).not.toBeNull()
  })

  it('lasts to life expectancy with a large starting balance and modest spending', () => {
    const s = { ...makeDefaultState(), currentSavings: 5_000_000, desiredMonthlyRetirementIncome: 3000 }
    const r = computePlan(s)
    expect(r.lastsToLifeExpectancy).toBe(true)
    expect(r.depletionAge).toBeNull()
  })
})
