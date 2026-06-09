import type { PlannerState } from './types'
import { SCHEMA_VERSION } from './types'

export const DEFAULT_PLANNER_STATE: PlannerState = {
  v: SCHEMA_VERSION,
  taxYear: 2025,
  filingStatus: 'single',
  state: 'CA',
  householdSize: 1,
  dependents: 0,
  annualIncome: 100000,
  otherIncome: [],
  pretax401k: 0,
  pretaxHsa: 0,
  pretaxHealthInsurance: 0,
  employerMatch: 0,
  desiredMonthlyRetirementIncome: 5000,
  expectedReturnPct: 6,
  inflationPct: 2.5,
  withdrawalRatePct: 4,
  retirementReturnPct: 5,
  currentAge: 30,
  retirementAge: 67,
  lifeExpectancy: 95,
  currentSavings: 0,
  savingsMode: 'expenses',
  savingsRatePct: 20,
  directMonthlyContribution: 1000,
  expenses: [],
  expensesEdited: false,
}

/** Returns a fresh deep copy so callers never share array references with the constant. */
export function makeDefaultState(): PlannerState {
  return {
    ...DEFAULT_PLANNER_STATE,
    otherIncome: DEFAULT_PLANNER_STATE.otherIncome.map((s) => ({ ...s })),
    expenses: DEFAULT_PLANNER_STATE.expenses.map((e) => ({ ...e })),
  }
}
