import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrderBlindLab from './OrderBlindLab'
import PositionLab from './PositionLab'
import HeadMatrixLab from './HeadMatrixLab'
import ResidualStreamLab from './ResidualStreamLab'
import ParamBudgetLab from './ParamBudgetLab'
import HeadShareLab from './HeadShareLab'
import FlashTilingLab from './FlashTilingLab'
import KvCacheLab from './KvCacheLab'

describe('OrderBlindLab', () => {
  it('shows permutation equivariance without positions, broken symmetry with', () => {
    render(<OrderBlindLab />)
    fireEvent.click(screen.getByRole('button', { name: /shuffle/i }))
    expect(screen.getByText(/same output vectors/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /positions/i }))
    expect(screen.getByText(/outputs changed/i)).toBeDefined()
  })
})

describe('PositionLab', () => {
  it('RoPE: shifting both positions leaves the attention score unchanged', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    // defaults m=6, n=2, pair θ=0.1 → score cos(0.4) ≈ 0.92
    expect(screen.getByText('0.92')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /shift both \+5/i }))
    expect(screen.getByText('m = 11')).toBeDefined()
    expect(screen.getByText('n = 7')).toBeDefined()
    expect(screen.getByText('0.92')).toBeDefined() // unchanged — relative invariance
  })

  it('RoPE: changing one position changes the score', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    fireEvent.change(screen.getByLabelText(/query position m/i), { target: { value: '12' } })
    // Δ=10, θ=0.1 → cos(1.0) ≈ 0.54
    expect(screen.getByText('0.54')).toBeDefined()
  })

  it('learned tab marks untrained positions', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /learned/i }))
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })

  it('switches to the ALiBi tab', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /ALiBi/ }))
    expect(screen.getByText(/linear distance penalty/i)).toBeDefined()
  })
})

describe('HeadMatrixLab', () => {
  it('slicing into more heads shrinks d_head but not the parameter count', () => {
    render(<HeadMatrixLab />)
    // defaults: d_model=512, h=8 → d_head=64; attn params 4·512² = 1,048,576
    expect(screen.getByText(/d_head = 64/)).toBeDefined()
    expect(screen.getAllByText(/1,048,576/).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText(/number of heads/i), { target: { value: '4' } }) // index 4 → h=16
    expect(screen.getByText(/d_head = 32/)).toBeDefined()
    expect(screen.getAllByText(/1,048,576/).length).toBeGreaterThan(0) // unchanged
  })

  it('fewer K/V heads shrink the KV cache readout', () => {
    render(<HeadMatrixLab />)
    expect(screen.getByText(/0\.54 GB/)).toBeDefined() // g=8 (=h), 8k ctx, 32 layers, fp16
    fireEvent.change(screen.getByLabelText(/K\/V heads/i), { target: { value: '1' } }) // index 1 → g=2
    expect(screen.getByText(/0\.13 GB/)).toBeDefined()
  })
})

describe('ResidualStreamLab', () => {
  it('shows vanishing signal without residuals and stable signal with them', () => {
    render(<ResidualStreamLab />)
    expect(screen.getByText(/100%/)).toBeDefined() // residuals + norm: healthy
    fireEvent.click(screen.getByRole('button', { name: /residuals ON/i }))
    // 16 layers of 0.8× shrink → 0.8^16 ≈ 2.8% of the input signal
    expect(screen.getByText(/2\.8% of the input signal/)).toBeDefined()
  })

  it('toggles between pre-norm and post-norm placement', () => {
    render(<ResidualStreamLab />)
    fireEvent.click(screen.getByRole('button', { name: /post-norm/i }))
    expect(screen.getByText(/original 2017 placement/i)).toBeDefined()
  })
})

describe('ParamBudgetLab', () => {
  it('reproduces real model sizes from the component formulas', () => {
    render(<ParamBudgetLab />)
    // GPT-2 small is the default preset: 38.6M emb + 28.3M attn + 56.6M ffn ≈ 124M
    expect(screen.getByText('124M')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Llama-3-8B/ }))
    expect(screen.getByText('8.0B')).toBeDefined()
  })

  it('MoE multiplies total but not active parameters', () => {
    render(<ParamBudgetLab />)
    fireEvent.click(screen.getByRole('button', { name: /mixture-of-experts/i }))
    expect(screen.getByText('520M')).toBeDefined()
    expect(screen.getByText('180M')).toBeDefined()
  })
})

describe('HeadShareLab', () => {
  it('cache per token shrinks from MHA to MQA', () => {
    render(<HeadShareLab />)
    expect(screen.getByText(/1024 values/)).toBeDefined() // MHA: 2·8·64
    fireEvent.click(screen.getByRole('button', { name: /^MQA$/ }))
    expect(screen.getByText(/128 values/)).toBeDefined() // 2·1·64
  })
  it('MLA mode shows the latent-vector story', () => {
    render(<HeadShareLab />)
    fireEvent.click(screen.getByRole('button', { name: /^MLA$/ }))
    expect(screen.getByText(/288 values/)).toBeDefined() // d_c=256 + d_R=32
    // "low-rank latent" appears both in the MLA blurb and the always-on labNote — assert presence, not uniqueness
    expect(screen.getAllByText(/low-rank latent/i).length).toBeGreaterThan(0)
  })
})

describe('FlashTilingLab', () => {
  it('naive mode materializes the score matrix; tiled mode never does', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/256 scores/)).toBeDefined() // 16×16 written to HBM
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    expect(screen.getByText(/0 scores/)).toBeDefined()
  })
  it('steps through tiles with the online-softmax narration', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    fireEvent.click(screen.getByRole('button', { name: /process next tile/i }))
    // "tile 1/16" and "running max" each appear in two places (SVG label / feedback narration,
    // and feedback narration / the always-on labNote's <strong>) — assert presence, not uniqueness
    expect(screen.getAllByText(/tile 1\/16/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/running max/i).length).toBeGreaterThan(0)
  })
})

describe('KvCacheLab', () => {
  it('counts cached vs recomputed K/V projections while decoding', () => {
    render(<KvCacheLab />)
    // 3 tokens generated, cache ON: each token's K/V computed exactly once
    expect(screen.getByText(/3 — once per token, then reused/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /KV cache ON/i }))
    expect(screen.getByText(/6 — every past token reprojected/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /generate next token/i }))
    expect(screen.getByText(/10 — every past token reprojected/)).toBeDefined()
  })
  it('sizes the cache for real configs', () => {
    render(<KvCacheLab />)
    // default Llama-3-8B at 8k ctx: 2·32·8·128·2B·8192 = 1.07 GB
    expect(screen.getByText(/1\.07 GB/)).toBeDefined()
    fireEvent.change(screen.getByLabelText(/context length/i), { target: { value: '4' } }) // 131072
    expect(screen.getByText(/17\.18 GB/)).toBeDefined()
  })
})
