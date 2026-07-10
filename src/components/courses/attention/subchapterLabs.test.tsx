import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrderBlindLab from './OrderBlindLab'
import PositionLab from './PositionLab'

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
