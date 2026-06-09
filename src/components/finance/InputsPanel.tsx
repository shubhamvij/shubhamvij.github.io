'use client'
import { Dispatch } from 'react'
import s from './finance.module.css'
import type { PlannerState, PlanResult, FilingStatus, TaxYear, SavingsMode } from '@/lib/finance/types'
import { STATES } from '@/lib/finance/stateTaxData'
import { fmtMoney } from '@/lib/finance/format'
import { GroupBox, MoneyField, PercentField, IntField, SelectField, NumberInput } from './fields'
import ExpensesTable from './ExpensesTable'
import type { PlannerAction } from './reducer'

const STATE_OPTIONS = [...STATES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((st) => ({ value: st.code, label: st.name }))

const FILING_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married, joint' },
  { value: 'mfs', label: 'Married, separate' },
  { value: 'hoh', label: 'Head of household' },
]

const YEAR_OPTIONS = [
  { value: 2025, label: '2025' },
  { value: 2026, label: '2026' },
]

const MODES: { id: SavingsMode; label: string }[] = [
  { id: 'expenses', label: 'By expenses' },
  { id: 'rate', label: 'By rate %' },
  { id: 'contribution', label: 'Fixed $/mo' },
]

export default function InputsPanel({
  state,
  dispatch,
  result,
}: {
  state: PlannerState
  dispatch: Dispatch<PlannerAction>
  result: PlanResult
}) {
  const patch = (p: Partial<PlannerState>) => dispatch({ type: 'PATCH', patch: p })
  const stateInfo = STATES.find((st) => st.code === state.state)

  return (
    <div className={s.col}>
      <GroupBox title="Income & Household">
        <MoneyField label="Annual income" value={state.annualIncome} onChange={(n) => patch({ annualIncome: n })} />
        <SelectField
          label="Filing status"
          value={state.filingStatus}
          onChange={(v) => patch({ filingStatus: v as FilingStatus })}
          options={FILING_OPTIONS}
        />
        <SelectField label="State" value={state.state} onChange={(v) => patch({ state: v })} options={STATE_OPTIONS} />
        <SelectField
          label="Tax year"
          value={state.taxYear}
          onChange={(v) => patch({ taxYear: Number(v) as TaxYear })}
          options={YEAR_OPTIONS}
        />
        <IntField label="People in household" value={state.householdSize} onChange={(n) => patch({ householdSize: Math.max(1, n) })} max={20} />
        <IntField label="Dependents" value={state.dependents} onChange={(n) => patch({ dependents: n })} max={15} />
        {stateInfo?.note && (
          <div className={s.hint} style={{ marginTop: 5 }}>
            ⓘ {stateInfo.note}
          </div>
        )}
      </GroupBox>

      <GroupBox title="Other Income (annual)">
        {state.otherIncome.length === 0 && <div className={s.hint}>No additional income streams yet.</div>}
        {state.otherIncome.map((inc, i) => (
          <div key={i} className={s.expRow}>
            <input
              className={`${s.field} ${s.grow}`}
              value={inc.label}
              aria-label="Income label"
              onChange={(e) => dispatch({ type: 'SET_INCOME', index: i, patch: { label: e.target.value } })}
            />
            <span className={s.money}>
              <span className={s.moneySign}>$</span>
              <NumberInput
                value={inc.annual}
                onChange={(n) => dispatch({ type: 'SET_INCOME', index: i, patch: { annual: n } })}
                className={`${s.field} ${s.moneyInput} ${s.w90}`}
              />
            </span>
            <button type="button" className={s.btn} aria-label="Remove" onClick={() => dispatch({ type: 'REMOVE_INCOME', index: i })}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className={s.link} style={{ marginTop: 6 }} onClick={() => dispatch({ type: 'ADD_INCOME' })}>
          + Add income stream
        </button>
      </GroupBox>

      <GroupBox title="Pre-tax Deductions (annual)">
        <MoneyField label="401(k) / 403(b)" value={state.pretax401k} onChange={(n) => patch({ pretax401k: n })} />
        <MoneyField label="HSA" value={state.pretaxHsa} onChange={(n) => patch({ pretaxHsa: n })} />
        <MoneyField label="Health premiums" value={state.pretaxHealthInsurance} onChange={(n) => patch({ pretaxHealthInsurance: n })} />
        <MoneyField label="Employer match" value={state.employerMatch} onChange={(n) => patch({ employerMatch: n })} />
      </GroupBox>

      <GroupBox title="Retirement Goal">
        <MoneyField
          label="Target income"
          hint="/mo"
          value={state.desiredMonthlyRetirementIncome}
          onChange={(n) => patch({ desiredMonthlyRetirementIncome: n })}
          info="The monthly income (in today's dollars) you want to spend in retirement."
        />
        <MoneyField label="Current savings" value={state.currentSavings} onChange={(n) => patch({ currentSavings: n })} info="What you've already invested toward retirement today." />
        <IntField label="Current age" value={state.currentAge} onChange={(n) => patch({ currentAge: n })} max={100} />
        <IntField label="Retire at age" value={state.retirementAge} onChange={(n) => patch({ retirementAge: n })} max={110} info="When you stop contributing and begin drawing down your savings." />
        <IntField label="Life expectancy" value={state.lifeExpectancy} onChange={(n) => patch({ lifeExpectancy: n })} max={120} info="The age the projection and draw-down run to. Default 95." />
      </GroupBox>

      <GroupBox title="Assumptions">
        <PercentField
          label="Expected return"
          hint="pre-retirement"
          value={state.expectedReturnPct}
          onChange={(n) => patch({ expectedReturnPct: n })}
          info="Average yearly investment growth you expect while still working. Historically ~6–7% for a balanced stock/bond portfolio."
        />
        <PercentField
          label="Retirement return"
          hint="in drawdown"
          value={state.retirementReturnPct}
          onChange={(n) => patch({ retirementReturnPct: n })}
          info="A typically more conservative growth rate during retirement, when portfolios are usually de-risked toward bonds."
        />
        <PercentField
          label="Inflation"
          value={state.inflationPct}
          onChange={(n) => patch({ inflationPct: n })}
          info="How fast prices rise each year. Everything here is shown in today's dollars by adjusting returns for inflation."
        />
      </GroupBox>

      <GroupBox title="How You Save">
        <div className={s.toggle}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${s.toggleBtn} ${state.savingsMode === m.id ? s.toggleBtnActive : ''}`}
              onClick={() => patch({ savingsMode: m.id })}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className={s.hint} style={{ marginTop: 6 }}>
          → Saving <b>{fmtMoney(result.monthlyContribution)}</b>/mo toward retirement
        </div>
        {state.savingsMode === 'rate' && (
          <PercentField label="Save rate of take-home" value={state.savingsRatePct} onChange={(n) => patch({ savingsRatePct: n })} />
        )}
        {state.savingsMode === 'contribution' && (
          <MoneyField label="Monthly investment" value={state.directMonthlyContribution} onChange={(n) => patch({ directMonthlyContribution: n })} />
        )}
        {state.savingsMode === 'expenses' && (
          <div style={{ marginTop: 8 }}>
            <ExpensesTable
              lines={result.resolvedExpenses}
              edited={state.expensesEdited}
              total={result.expensesMonthly}
              onEdit={(lines) => dispatch({ type: 'EDIT_EXPENSES', expenses: lines })}
              onReset={() => dispatch({ type: 'RESET_EXPENSES' })}
            />
          </div>
        )}
      </GroupBox>
    </div>
  )
}
