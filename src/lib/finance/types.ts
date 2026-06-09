// Shared types for the Finance Planner. No logic lives here.

export const SCHEMA_VERSION = 2

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh'
export type TaxYear = 2025 | 2026
export type SavingsMode = 'expenses' | 'rate' | 'contribution'

export interface IncomeStream {
  label: string
  annual: number
}

export interface ExpenseLine {
  key: string
  label: string
  monthly: number
}

/** The full set of user inputs — the single source of truth for the app. */
export interface PlannerState {
  v: number
  taxYear: TaxYear
  filingStatus: FilingStatus
  /** Two-letter state/DC code, e.g. 'CA', 'TX', 'DC'. */
  state: string
  householdSize: number
  dependents: number
  annualIncome: number
  otherIncome: IncomeStream[]
  /** Annual pre-tax dollars. 401k reduces income tax but NOT FICA. */
  pretax401k: number
  /** HSA reduces both income tax and FICA. */
  pretaxHsa: number
  /** Health/FSA premiums reduce both income tax and FICA. */
  pretaxHealthInsurance: number
  /** Annual employer 401k match $, added to contributions (not income). */
  employerMatch: number
  desiredMonthlyRetirementIncome: number
  expectedReturnPct: number
  inflationPct: number
  withdrawalRatePct: number
  /** More conservative return used during the retirement drawdown phase. */
  retirementReturnPct: number
  currentAge: number
  retirementAge: number
  /** Age the projection (and drawdown) runs to. */
  lifeExpectancy: number
  currentSavings: number
  savingsMode: SavingsMode
  savingsRatePct: number
  directMonthlyContribution: number
  expenses: ExpenseLine[]
  /** false => recompute expenses from cost-of-living defaults; true => user owns the table. */
  expensesEdited: boolean
}

/** A marginal tax bracket. `rate` is a percentage (e.g. 22 = 22%). `upTo` null = top band. */
export interface Bracket {
  upTo: number | null
  rate: number
}

export interface FederalYearData {
  brackets: Record<FilingStatus, Bracket[]>
  standardDeduction: Record<FilingStatus, number>
  ctcPerChild: number
  otherDependentCredit: number
  ctcPhaseoutStart: Record<FilingStatus, number>
  ssWageBase: number
  ssRate: number
  medicareRate: number
  addlMedicareRate: number
  addlMedicareThreshold: Record<FilingStatus, number>
}

export type StateTaxKind = 'none' | 'flat' | 'progressive'

export interface StateTaxInfo {
  code: string
  name: string
  kind: StateTaxKind
  /** percent, present when kind === 'flat' */
  flatRatePct?: number
  /** present when kind === 'progressive' */
  brackets?: Record<FilingStatus, Bracket[]>
  /** state standard deduction per filing status */
  standardDeduction?: Record<FilingStatus, number>
  /** e.g. local-tax hint */
  note?: string
}

export interface TaxBreakdown {
  gross: number
  pretaxTotal: number
  federalTaxableIncome: number
  federalTax: number
  federalMarginalRatePct: number
  federalEffectiveRatePct: number
  childTaxCredit: number
  ficaSocialSecurity: number
  ficaMedicare: number
  ficaTotal: number
  stateTax: number
  stateMarginalRatePct: number
  stateEffectiveRatePct: number
  totalTax: number
  netAnnual: number
  netMonthly: number
}

export interface BalancePoint {
  month: number
  balance: number
}

export interface LifecyclePoint {
  age: number
  balance: number
}

export interface PlanResult extends TaxBreakdown {
  expensesMonthly: number
  resolvedExpenses: ExpenseLine[]
  monthlyContribution: number
  monthlyContributionSource: SavingsMode
  requiredNestEgg: number
  realMonthlyReturnRate: number
  monthsToGoal: number | null
  reachedAtAge: number | null
  alreadyMet: boolean
  balanceSeries: BalancePoint[]
  goalCrossMonth: number | null
  // Full lifecycle: accumulate to retirement age, then draw down to life expectancy.
  lifecycleSeries: LifecyclePoint[]
  balanceAtRetirement: number
  /** Age the balance hits zero in retirement, or null if it lasts to life expectancy. */
  depletionAge: number | null
  lastsToLifeExpectancy: boolean
  /** Age the lifecycle balance first reaches the nest-egg target, or null. */
  lifecycleGoalAge: number | null
  /** Will you have at least the required nest egg by your retirement age? */
  onTrack: boolean
  /** First-year withdrawal as a % of the nest egg (target × 12 ÷ nest egg). */
  impliedWithdrawalRatePct: number
}
