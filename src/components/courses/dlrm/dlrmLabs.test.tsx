import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LookupLab from './LookupLab'
import ParamFlopLab from './ParamFlopLab'

describe('LookupLab', () => {
  it('selects the embedding row for the picked category', () => {
    render(<LookupLab />)
    // default pick is index 0 (Action); its row is highlighted and echoed
    expect(screen.getByText(/row 0 selected/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /^Comedy$/ }))
    expect(screen.getByText(/row 3 selected/i)).toBeDefined()
  })

  it('multi-hot pooling averages two rows', () => {
    render(<LookupLab />)
    fireEvent.click(screen.getByRole('button', { name: /multi-hot/i }))
    // pooling two one-hots => "2 rows pooled"
    expect(screen.getByText(/2 rows pooled/i)).toBeDefined()
  })

  it('reports the toy table parameter count V×d', () => {
    render(<LookupLab />)
    // 6 categories × 4 dims = 24
    const stat = screen.getByText(/table params/i)
    expect(within(stat).getByText('24')).toBeDefined()
  })
})

describe('ParamFlopLab', () => {
  it('plots the verified production DLRM points', () => {
    render(<ParamFlopLab />)
    expect(screen.getByText(/DLRM-12T/)).toBeDefined()
    expect(screen.getByText(/GPT-3/)).toBeDefined()
  })

  it('grows params, not FLOPs, as table size increases', () => {
    render(<ParamFlopLab />)
    const rowsSlider = screen.getByLabelText(/rows per table/i)
    const before = screen.getByTestId('your-params').textContent
    fireEvent.change(rowsSlider, { target: { value: '9' } }) // 10^9 rows
    const after = screen.getByTestId('your-params').textContent
    expect(before).not.toBe(after)
    // FLOPs readout is driven only by MLP widths, unaffected by table rows
    const flops = screen.getByTestId('your-flops').textContent
    fireEvent.change(rowsSlider, { target: { value: '6' } })
    expect(screen.getByTestId('your-flops').textContent).toBe(flops)
  })
})
