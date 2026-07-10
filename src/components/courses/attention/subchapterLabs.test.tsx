import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrderBlindLab from './OrderBlindLab'
import PositionLab from './PositionLab'
import HeadMatrixLab from './HeadMatrixLab'
import ResidualStreamLab from './ResidualStreamLab'

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
