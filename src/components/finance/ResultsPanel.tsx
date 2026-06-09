'use client'
import { ReactNode } from 'react'
import s from './finance.module.css'
import type { PlanResult, PlannerState } from '@/lib/finance/types'
import { fmtMoney, fmtPct } from '@/lib/finance/format'
import { GroupBox, Stat, Divider } from './fields'
import GrowthChart from './GrowthChart'

function Lcd({ result, state }: { result: PlanResult; state: PlannerState }) {
  const target = state.desiredMonthlyRetirementIncome
  const yearsToRetire = Math.max(0, state.retirementAge - state.currentAge)

  let bigClass = s.lcdBig
  let big: string
  let sub: ReactNode

  if (result.alreadyMet) {
    big = '★ Goal Met'
    bigClass = `${s.lcdBig} ${s.lcdGold}`
    sub = (
      <>
        You already hold the {fmtMoney(result.requiredNestEgg)} needed to draw <b>{fmtMoney(target)}/mo</b> to age{' '}
        {state.lifeExpectancy}.
      </>
    )
  } else if (result.onTrack) {
    big = 'On Track ✓'
    sub = (
      <>
        At {state.retirementAge} you&apos;ll have <b>{fmtMoney(result.balanceAtRetirement)}</b> — past the{' '}
        {fmtMoney(result.requiredNestEgg)} needed. Funds {fmtMoney(target)}/mo to {state.lifeExpectancy}.
      </>
    )
  } else {
    const gap = Math.max(0, result.requiredNestEgg - result.balanceAtRetirement)
    big = `Short ${fmtMoney(gap)}`
    bigClass = `${s.lcdBig} ${s.lcdWarn}`
    sub =
      result.depletionAge != null ? (
        <>
          At {state.retirementAge} you&apos;ll have {fmtMoney(result.balanceAtRetirement)} of the{' '}
          {fmtMoney(result.requiredNestEgg)} needed — savings run out at age {Math.round(result.depletionAge)}.
        </>
      ) : (
        <>
          At {state.retirementAge} you&apos;ll have {fmtMoney(result.balanceAtRetirement)} of the{' '}
          {fmtMoney(result.requiredNestEgg)} needed for {fmtMoney(target)}/mo.
        </>
      )
  }

  return (
    <div className={s.lcd}>
      <div className={s.lcdLabel}>Retirement outlook · {yearsToRetire} yr to go</div>
      <div className={bigClass}>{big}</div>
      <div className={s.lcdSub}>{sub}</div>
    </div>
  )
}

const MODE_LABEL: Record<PlanResult['monthlyContributionSource'], string> = {
  expenses: 'from take-home',
  rate: 'set % of take-home',
  contribution: 'fixed amount',
}

export default function ResultsPanel({ result, state }: { result: PlanResult; state: PlannerState }) {
  const incomeMo = result.gross / 12
  const taxMo = result.totalTax / 12
  const pretaxMo = result.pretaxTotal / 12
  const expensesMo = result.expensesMonthly
  const disposable = result.netMonthly - expensesMo
  const match12 = state.employerMatch / 12
  const k401Mo = state.pretax401k / 12
  const cashSavings = Math.max(0, result.monthlyContribution - match12 - k401Mo)

  return (
    <div className={s.col}>
      <Lcd result={result} state={state} />

      <GroupBox title={`Savings Through Life (to age ${state.lifeExpectancy})`}>
        <GrowthChart
          series={result.lifecycleSeries}
          target={result.requiredNestEgg}
          currentAge={state.currentAge}
          retirementAge={state.retirementAge}
          lifeExpectancy={state.lifeExpectancy}
          goalAge={result.lifecycleGoalAge}
          depletionAge={result.depletionAge}
        />
        <div style={{ marginTop: 6 }}>
          <Stat
            label="Nest egg needed"
            sub={`by age ${state.retirementAge}`}
            value={fmtMoney(result.requiredNestEgg)}
            gold
            info="What you need at retirement so your target income lasts to your life expectancy, given your retirement return. Retiring earlier means a longer draw-down, so you need more."
          />
          <Stat
            label="Implied withdrawal"
            value={`${fmtPct(result.impliedWithdrawalRatePct)}/yr`}
            info="Your first-year withdrawal as a share of the nest egg (target ÷ nest egg). Around 4% or less is considered safe."
          />
          <Stat label="Balance at retirement" sub={`age ${state.retirementAge}`} value={fmtMoney(result.balanceAtRetirement)} />
          {result.lastsToLifeExpectancy ? (
            <Stat
              label="Outlook"
              value={`Lasts past age ${state.lifeExpectancy} ✓`}
              info="With this balance at retirement, drawing your target income leaves money past your life expectancy."
            />
          ) : (
            <Stat
              label="Outlook"
              value={`Runs out at age ${Math.round(result.depletionAge ?? 0)}`}
              negative
              info="Drawing your target income from this balance exhausts the savings before your life expectancy."
            />
          )}
        </div>
      </GroupBox>

      <GroupBox title="Monthly Cash Flow">
        <Stat label="Income" sub="gross" value={fmtMoney(incomeMo)} strong />
        <Stat label="− Taxes" value={fmtMoney(taxMo)} negative info="Federal income tax + Social Security & Medicare + state income tax, per month." />
        {pretaxMo > 0 && (
          <Stat label="− Pre-tax deductions" value={fmtMoney(pretaxMo)} negative info="401(k), HSA, and health premiums withheld before tax." />
        )}
        <Stat label="= Take-home pay" value={fmtMoney(result.netMonthly)} strong />
        <Stat label="− Living expenses" value={fmtMoney(expensesMo)} negative />
        <Stat label="= Money left over" value={fmtMoney(disposable)} negative={disposable < 0} />
        <Divider />
        <Stat label="Cash you save" sub={MODE_LABEL[result.monthlyContributionSource]} value={fmtMoney(cashSavings)} />
        {k401Mo > 0 && <Stat label="+ 401(k)" value={fmtMoney(k401Mo)} />}
        {match12 > 0 && <Stat label="+ Employer match" value={fmtMoney(match12)} />}
        <Divider />
        <Stat
          label="= Invested / month"
          value={fmtMoney(result.monthlyContribution)}
          strong
          gold
          info="Total going toward retirement each month — your cash savings plus any 401(k) and employer match."
        />
      </GroupBox>

      <GroupBox title="Tax Summary">
        <Stat
          label="Federal"
          sub={`${fmtPct(result.federalMarginalRatePct)} marginal`}
          value={`${fmtPct(result.federalEffectiveRatePct)} eff.`}
          info="Marginal = the rate on your next dollar (your top bracket). Effective = total tax ÷ income (your average rate)."
        />
        <Stat label="State" sub={`${fmtPct(result.stateMarginalRatePct)} marginal`} value={`${fmtPct(result.stateEffectiveRatePct)} eff.`} />
        {result.childTaxCredit > 0 && <Stat label="Child tax credit" value={`+${fmtMoney(result.childTaxCredit)}`} />}
        <Divider />
        <Stat label="Total tax / year" value={fmtMoney(result.totalTax)} strong />
      </GroupBox>
    </div>
  )
}
