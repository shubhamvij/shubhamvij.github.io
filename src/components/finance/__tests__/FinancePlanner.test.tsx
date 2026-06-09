import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FinancePlanner from '../FinancePlanner'

beforeEach(() => {
  document.cookie = 'finance_plan=; max-age=0; path=/'
})

describe('FinancePlanner', () => {
  it('renders the retirement outlook with a retirement-aware nest egg', () => {
    render(<FinancePlanner />)
    expect(screen.getByText(/Retirement outlook/)).toBeDefined()
    expect(screen.getByText('On Track ✓')).toBeDefined() // the default saver is on track
    expect(screen.getByText(/Nest egg needed/)).toBeDefined()
  })

  it('recomputes the nest egg when the retirement age changes', () => {
    render(<FinancePlanner />)
    const nestEgg = () => {
      const label = screen.getByText(/Nest egg needed/)
      return label.closest('div')?.querySelector('[class*="statValue"]')?.textContent
    }
    const before = nestEgg()
    // Retiring earlier means a longer draw-down -> a bigger nest egg.
    fireEvent.change(screen.getByRole('textbox', { name: /Retire at age/i }), { target: { value: '50' } })
    expect(nestEgg()).not.toBe(before)
  })

  it('opens the share dialog from the File menu', () => {
    render(<FinancePlanner />)
    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    fireEvent.click(screen.getByText(/Save & Share/))
    expect(screen.getByText('Save & Share Plan')).toBeDefined()
    expect(screen.getByDisplayValue(/\/finance\/\?s=/)).toBeDefined()
  })

  it('formats money inputs with thousands separators', () => {
    render(<FinancePlanner />)
    const income = screen.getByRole('textbox', { name: /Annual income/i }) as HTMLInputElement
    expect(income.value).toBe('100,000') // default 100000 shown with commas
  })

  it('shows a monthly cash-flow waterfall from income down to invested', () => {
    render(<FinancePlanner />)
    expect(screen.getByText('Monthly Cash Flow')).toBeDefined()
    expect(screen.getByText('Income')).toBeDefined()
    expect(screen.getByText('= Invested / month')).toBeDefined()
  })

  it('guards against closing with unsaved changes', () => {
    let guard: (() => boolean) | null = null
    render(<FinancePlanner registerCloseGuard={(g) => { guard = g }} />)
    expect(guard).not.toBeNull()
    // Clean on load -> does not intercept.
    expect(guard!()).toBe(false)
    // After an edit -> intercepts and surfaces the save prompt.
    fireEvent.change(screen.getByRole('textbox', { name: /Target income/i }), { target: { value: '6000' } })
    let intercepted = false
    act(() => {
      intercepted = guard!()
    })
    expect(intercepted).toBe(true)
    expect(screen.getByText(/Do you want to save/i)).toBeDefined()
  })
})
