import { describe, it, expect } from 'vitest'
import {
  requiredNestEgg,
  nestEggForDrawdown,
  monthlyRateFromAnnual,
  realMonthlyRate,
  simulateAccumulation,
  simulateLifecycle,
  resolveMonthlyContribution,
} from '../retirementEngine'
import { makeDefaultState } from '../defaults'
import type { SavingsMode } from '../types'

describe('requiredNestEgg', () => {
  it('uses the 4% rule: a $5,000/mo target needs $1.5M', () => {
    expect(requiredNestEgg(5000, 4)).toBe(1_500_000)
  })

  it('scales with the withdrawal rate', () => {
    expect(requiredNestEgg(4000, 4)).toBe(1_200_000)
    expect(requiredNestEgg(4000, 3.5)).toBeCloseTo(1_371_428.57, 2)
  })
})

describe('nestEggForDrawdown', () => {
  it('with no growth equals income times months', () => {
    expect(nestEggForDrawdown(1000, 120, 0)).toBe(120000)
  })

  it('needs less when the portfolio keeps growing in retirement', () => {
    const n = nestEggForDrawdown(1000, 120, 0.005)
    expect(n).toBeLessThan(120000)
    expect(n).toBeGreaterThan(0)
  })

  it('grows with a longer retirement (retiring earlier needs more)', () => {
    const r = monthlyRateFromAnnual(5)
    expect(nestEggForDrawdown(5000, 480, r)).toBeGreaterThan(nestEggForDrawdown(5000, 240, r))
  })

  it('is zero when there is no retirement period', () => {
    expect(nestEggForDrawdown(5000, 0, 0.004)).toBe(0)
  })

  it('matches a worked range for a 28-year retirement ($5k/mo, ~5% nominal / 2.5% inflation)', () => {
    const nest = nestEggForDrawdown(5000, 336, realMonthlyRate(5, 2.5))
    expect(nest).toBeGreaterThan(1_150_000)
    expect(nest).toBeLessThan(1_280_000)
  })
})

describe('monthlyRateFromAnnual', () => {
  it('compounds (not divides) the annual rate', () => {
    // (1.06)^(1/12) - 1 ≈ 0.0048676, NOT 0.06/12 = 0.005
    expect(monthlyRateFromAnnual(6)).toBeCloseTo(0.004868, 6)
  })

  it('is zero for a zero return', () => {
    expect(monthlyRateFromAnnual(0)).toBe(0)
  })
})

describe('realMonthlyRate', () => {
  it('applies the Fisher relation for inflation', () => {
    // ((1.06/1.025))^(1/12) - 1 ≈ 0.0028016
    expect(realMonthlyRate(6, 2.5)).toBeCloseTo(0.002802, 5)
  })

  it('equals the nominal monthly rate when inflation is zero', () => {
    expect(realMonthlyRate(6, 0)).toBeCloseTo(monthlyRateFromAnnual(6), 10)
  })
})

describe('simulateAccumulation', () => {
  it('returns 0 months when the goal is already met', () => {
    const r = simulateAccumulation({
      startBalance: 1_500_000,
      monthlyContribution: 0,
      monthlyRate: 0.004,
      target: 1_500_000,
    })
    expect(r.monthsToGoal).toBe(0)
    expect(r.goalCrossMonth).toBe(0)
  })

  it('reaches $1.5M from $0 at $2,000/mo and 6% in ~26.4 years (~317 months)', () => {
    const r = simulateAccumulation({
      startBalance: 0,
      monthlyContribution: 2000,
      monthlyRate: monthlyRateFromAnnual(6),
      target: 1_500_000,
    })
    expect(r.monthsToGoal).not.toBeNull()
    expect(r.monthsToGoal!).toBeGreaterThanOrEqual(315)
    expect(r.monthsToGoal!).toBeLessThanOrEqual(319)
    expect(r.goalCrossMonth).toBe(r.monthsToGoal)
  })

  it('returns null when the goal is never reached within the cap', () => {
    const r = simulateAccumulation({
      startBalance: 0,
      monthlyContribution: 0,
      monthlyRate: 0,
      target: 1000,
      capMonths: 1200,
    })
    expect(r.monthsToGoal).toBeNull()
    expect(r.goalCrossMonth).toBeNull()
  })

  it('produces a sampled, monotonically-increasing series starting at the opening balance', () => {
    const r = simulateAccumulation({
      startBalance: 5000,
      monthlyContribution: 500,
      monthlyRate: monthlyRateFromAnnual(6),
      target: 1_000_000,
    })
    expect(r.series.length).toBeGreaterThan(1)
    expect(r.series.length).toBeLessThanOrEqual(121)
    expect(r.series[0]).toEqual({ month: 0, balance: 5000 })
    for (let i = 1; i < r.series.length; i++) {
      expect(r.series[i].balance).toBeGreaterThan(r.series[i - 1].balance)
    }
  })
})

describe('simulateLifecycle', () => {
  it('accumulates to retirement then draws down; lasts when the balance is large', () => {
    const r = simulateLifecycle({
      startBalance: 0,
      monthlyContribution: 5000,
      accumMonthlyRate: monthlyRateFromAnnual(6),
      retireMonthlyRate: monthlyRateFromAnnual(5),
      monthlyWithdrawal: 4000,
      currentAge: 40,
      retirementAge: 65,
      lifeExpectancy: 90,
      target: 1_500_000,
    })
    expect(r.depletionAge).toBeNull()
    expect(r.balanceAtRetirement).toBeGreaterThan(1_000_000)
    expect(r.series[0].age).toBe(40)
    const last = r.series[r.series.length - 1]
    expect(last.age).toBe(90)
    expect(r.goalAge).not.toBeNull()
    expect(r.goalAge!).toBeGreaterThan(40)
    expect(r.goalAge!).toBeLessThan(65)
  })

  it('reports the depletion age when savings run out in retirement', () => {
    const r = simulateLifecycle({
      startBalance: 12000,
      monthlyContribution: 0,
      accumMonthlyRate: 0,
      retireMonthlyRate: 0,
      monthlyWithdrawal: 1000,
      currentAge: 60,
      retirementAge: 60, // retire immediately
      lifeExpectancy: 90,
      target: 99_000_000,
    })
    // $12,000 / $1,000 per month = 12 months -> depletes at age 61
    expect(r.depletionAge).not.toBeNull()
    expect(r.depletionAge!).toBeCloseTo(61, 1)
    expect(r.goalAge).toBeNull()
  })

  it('handles retirement age at/after life expectancy (pure accumulation)', () => {
    const r = simulateLifecycle({
      startBalance: 100000,
      monthlyContribution: 1000,
      accumMonthlyRate: monthlyRateFromAnnual(6),
      retireMonthlyRate: monthlyRateFromAnnual(5),
      monthlyWithdrawal: 4000,
      currentAge: 30,
      retirementAge: 95,
      lifeExpectancy: 95,
      target: 1_500_000,
    })
    expect(r.depletionAge).toBeNull()
    expect(r.series[0]).toEqual({ age: 30, balance: 100000 })
    expect(r.series.length).toBeLessThanOrEqual(121)
  })
})

describe('resolveMonthlyContribution', () => {
  it('mode "contribution" uses the direct amount plus monthly employer match', () => {
    const s = {
      ...makeDefaultState(),
      savingsMode: 'contribution' as SavingsMode,
      directMonthlyContribution: 1000,
      employerMatch: 1200,
    }
    const r = resolveMonthlyContribution(s, 5000, 3000)
    expect(r.source).toBe('contribution')
    expect(r.amount).toBe(1100) // 1000 + 1200/12
  })

  it('mode "rate" uses a percentage of take-home and ignores expenses', () => {
    const s = {
      ...makeDefaultState(),
      savingsMode: 'rate' as SavingsMode,
      savingsRatePct: 20,
      employerMatch: 0,
    }
    const r = resolveMonthlyContribution(s, 5000, 9999)
    expect(r.amount).toBe(1000)
  })

  it('mode "expenses" is take-home minus expenses', () => {
    const s = { ...makeDefaultState(), savingsMode: 'expenses' as SavingsMode, employerMatch: 0 }
    const r = resolveMonthlyContribution(s, 5000, 3500)
    expect(r.amount).toBe(1500)
  })

  it('clamps negative savings (expenses exceed take-home) to zero', () => {
    const s = { ...makeDefaultState(), savingsMode: 'expenses' as SavingsMode, employerMatch: 0 }
    const r = resolveMonthlyContribution(s, 3000, 5000)
    expect(r.amount).toBe(0)
  })
})
