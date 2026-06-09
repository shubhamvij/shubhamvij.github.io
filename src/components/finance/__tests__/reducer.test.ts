import { describe, it, expect } from 'vitest'
import { plannerReducer } from '../reducer'
import { makeDefaultState } from '@/lib/finance/defaults'

describe('plannerReducer', () => {
  it('PATCH merges shallow field updates', () => {
    const s = makeDefaultState()
    const next = plannerReducer(s, { type: 'PATCH', patch: { annualIncome: 123456, state: 'TX' } })
    expect(next.annualIncome).toBe(123456)
    expect(next.state).toBe('TX')
    expect(next.filingStatus).toBe(s.filingStatus) // untouched
  })

  it('ADD_INCOME appends a row and REMOVE_INCOME drops one', () => {
    const s = makeDefaultState()
    const added = plannerReducer(s, { type: 'ADD_INCOME' })
    expect(added.otherIncome).toHaveLength(1)
    const removed = plannerReducer(added, { type: 'REMOVE_INCOME', index: 0 })
    expect(removed.otherIncome).toHaveLength(0)
  })

  it('SET_INCOME edits a single stream', () => {
    const s = { ...makeDefaultState(), otherIncome: [{ label: 'A', annual: 1 }] }
    const next = plannerReducer(s, { type: 'SET_INCOME', index: 0, patch: { annual: 5000 } })
    expect(next.otherIncome[0]).toEqual({ label: 'A', annual: 5000 })
  })

  it('EDIT_EXPENSES sets the table and flips expensesEdited true', () => {
    const s = makeDefaultState()
    const next = plannerReducer(s, {
      type: 'EDIT_EXPENSES',
      expenses: [{ key: 'housing', label: 'Housing', monthly: 2000 }],
    })
    expect(next.expensesEdited).toBe(true)
    expect(next.expenses).toHaveLength(1)
  })

  it('RESET_EXPENSES clears the table and re-enables auto-estimate', () => {
    const s = { ...makeDefaultState(), expensesEdited: true, expenses: [{ key: 'x', label: 'X', monthly: 1 }] }
    const next = plannerReducer(s, { type: 'RESET_EXPENSES' })
    expect(next.expensesEdited).toBe(false)
    expect(next.expenses).toHaveLength(0)
  })

  it('LOAD_STATE replaces the whole state and RESET restores defaults', () => {
    const s = { ...makeDefaultState(), annualIncome: 999 }
    const loaded = plannerReducer(makeDefaultState(), { type: 'LOAD_STATE', state: s })
    expect(loaded.annualIncome).toBe(999)
    const reset = plannerReducer(s, { type: 'RESET' })
    expect(reset.annualIncome).toBe(makeDefaultState().annualIncome)
  })
})
