import type { PlannerState, ExpenseLine } from '@/lib/finance/types'
import { makeDefaultState } from '@/lib/finance/defaults'

export type PlannerAction =
  | { type: 'PATCH'; patch: Partial<PlannerState> }
  | { type: 'ADD_INCOME' }
  | { type: 'REMOVE_INCOME'; index: number }
  | { type: 'SET_INCOME'; index: number; patch: Partial<{ label: string; annual: number }> }
  | { type: 'EDIT_EXPENSES'; expenses: ExpenseLine[] }
  | { type: 'RESET_EXPENSES' }
  | { type: 'LOAD_STATE'; state: PlannerState }
  | { type: 'RESET' }

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.patch }
    case 'ADD_INCOME':
      return { ...state, otherIncome: [...state.otherIncome, { label: 'Side income', annual: 0 }] }
    case 'REMOVE_INCOME':
      return { ...state, otherIncome: state.otherIncome.filter((_, i) => i !== action.index) }
    case 'SET_INCOME':
      return {
        ...state,
        otherIncome: state.otherIncome.map((inc, i) =>
          i === action.index ? { ...inc, ...action.patch } : inc,
        ),
      }
    case 'EDIT_EXPENSES':
      return { ...state, expenses: action.expenses, expensesEdited: true }
    case 'RESET_EXPENSES':
      return { ...state, expenses: [], expensesEdited: false }
    case 'LOAD_STATE':
      return action.state
    case 'RESET':
      return makeDefaultState()
    default:
      return state
  }
}
