import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LookupLab from './LookupLab'
import ParamFlopLab from './ParamFlopLab'
import TableSizerLab from './TableSizerLab'
import ShardShuffleLab from './ShardShuffleLab'
import CollisionLab from './CollisionLab'

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

describe('TableSizerLab', () => {
  it('computes total size and picks the memory tier', () => {
    render(<TableSizerLab />)
    // defaults: 100 tables × 1e7 rows × 64 dim × 4 bytes = 256 GB -> DRAM tier
    expect(screen.getByText(/256 GB/)).toBeDefined()
    expect(screen.getByText(/DRAM/)).toBeDefined()
  })

  it('crosses to SSD tier when the table grows past DRAM', () => {
    render(<TableSizerLab />)
    const rows = screen.getByLabelText(/rows per table/i)
    fireEvent.change(rows, { target: { value: '9' } }) // 1e9 rows -> 100×1e9×64×4 = 25.6 TB
    expect(screen.getByText(/SSD/)).toBeDefined()
  })

  it('switches to the cache-locality view', () => {
    render(<TableSizerLab />)
    fireEvent.click(screen.getByRole('button', { name: /cache locality/i }))
    expect(screen.getByText(/hit rate/i, { selector: 'p' })).toBeDefined()
  })
})

describe('ShardShuffleLab', () => {
  it('shows model-parallel tables and data-parallel MLP', () => {
    render(<ShardShuffleLab />)
    expect(screen.getByText(/model-parallel/i)).toBeDefined()
    expect(screen.getByText(/data-parallel/i)).toBeDefined()
  })

  it('all-to-all overtakes compute as GPU count grows', () => {
    render(<ShardShuffleLab />)
    const g = screen.getByRole('slider', { name: /gpus/i })
    fireEvent.change(g, { target: { value: '7' } }) // index 7 = 1000 GPUs in GPU_STEPS
    // at 1000 GPUs the ledger says all-to-all > 3x embedding compute
    expect(screen.getByText(/communication-bound/i)).toBeDefined()
  })
})

describe('CollisionLab', () => {
  it('modulo collides two ids that share a residue; Q-R resolves them', () => {
    render(<CollisionLab />)
    // N=48, m=8: ids 3 and 11 both %8==3
    fireEvent.click(screen.getByRole('button', { name: /^id 3$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^id 11$/ }))
    // modulo mode (default): both map to row 3 -> collision reported
    expect(screen.getByText(/collide/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /quotient-remainder/i }))
    expect(screen.getByText(/unique/i)).toBeDefined()
  })

  it('memory readout follows the real formulas as m changes', () => {
    render(<CollisionLab />)
    const m = screen.getByLabelText(/buckets/i)
    fireEvent.change(m, { target: { value: '8' } })
    // Q-R rows = m + ceil(48/8) = 8 + 6 = 14 (of 48 full)
    fireEvent.click(screen.getByRole('button', { name: /quotient-remainder/i }))
    expect(screen.getByText(/14 rows/)).toBeDefined()
  })

  it('quantization tab moves bytes/row with bit-width', () => {
    render(<CollisionLab />)
    fireEvent.click(screen.getByRole('button', { name: /shrink each row/i }))
    const bits = screen.getByLabelText(/bits/i)
    fireEvent.change(bits, { target: { value: '4' } })
    expect(screen.getByText(/int4/i)).toBeDefined()
  })
})
