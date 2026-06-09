import { describe, it, expect } from 'vitest'
import { encodeState, decodeState, bytesToBase64Url } from '../serialize'
import { makeDefaultState } from '../defaults'
import { SCHEMA_VERSION } from '../types'
import type { PlannerState } from '../types'

describe('encode/decode round-trip', () => {
  it('losslessly round-trips the default state', () => {
    const s = makeDefaultState()
    expect(decodeState(encodeState(s))).toEqual(s)
  })

  it('losslessly round-trips a fully-populated state (unicode, arrays, edited expenses)', () => {
    const full: PlannerState = {
      v: SCHEMA_VERSION,
      taxYear: 2026,
      filingStatus: 'mfj',
      state: 'NY',
      householdSize: 4,
      dependents: 2,
      annualIncome: 185000,
      otherIncome: [
        { label: 'Rental ☕', annual: 24000 },
        { label: 'Dividends', annual: 3500 },
      ],
      pretax401k: 23000,
      pretaxHsa: 4150,
      pretaxHealthInsurance: 6000,
      employerMatch: 5000,
      desiredMonthlyRetirementIncome: 8000,
      expectedReturnPct: 6.5,
      inflationPct: 2.5,
      withdrawalRatePct: 3.5,
      retirementReturnPct: 4.5,
      currentAge: 35,
      retirementAge: 60,
      lifeExpectancy: 92,
      currentSavings: 250000,
      savingsMode: 'rate',
      savingsRatePct: 22.5,
      directMonthlyContribution: 1500,
      expenses: [
        { key: 'housing', label: 'Rent — Brooklyn', monthly: 3800 },
        { key: 'childcare', label: 'Daycare', monthly: 2400 },
      ],
      expensesEdited: true,
    }
    expect(decodeState(encodeState(full))).toEqual(full)
  })

  it('produces a compact, URL-safe code', () => {
    const code = encodeState(makeDefaultState())
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/) // base64url, no padding
    expect(code.length).toBeGreaterThan(10)
    expect(code.length).toBeLessThan(140)
  })

  it('changes the code when an input changes', () => {
    const a = encodeState({ ...makeDefaultState(), annualIncome: 100000 })
    const b = encodeState({ ...makeDefaultState(), annualIncome: 100001 })
    expect(a).not.toBe(b)
  })
})

describe('decodeState robustness', () => {
  it('returns null for an unknown schema version', () => {
    const bad = bytesToBase64Url(new Uint8Array([99, 0, 0, 0]))
    expect(decodeState(bad)).toBeNull()
  })

  it('decodes a legacy v1 code, defaulting the new v2 fields', () => {
    // A real v1 code (mfj / TX / $700k income / $10k target) generated before the v2 schema bump.
    const v1 = 'AQABVFgBAODcKgAAAAAAkE48ABkAKAAeQwAAyADoBwA'
    const d = decodeState(v1)
    expect(d).not.toBeNull()
    expect(d!.filingStatus).toBe('mfj')
    expect(d!.state).toBe('TX')
    expect(d!.annualIncome).toBe(700000)
    expect(d!.desiredMonthlyRetirementIncome).toBe(10000)
    expect(d!.lifeExpectancy).toBe(95) // defaulted
    expect(d!.retirementReturnPct).toBe(5) // defaulted
  })

  it('returns null for garbage or truncated input', () => {
    expect(decodeState('')).toBeNull()
    expect(decodeState('@@@not-base64@@@')).toBeNull()
    const valid = encodeState(makeDefaultState())
    expect(decodeState(valid.slice(0, 3))).toBeNull()
  })
})
