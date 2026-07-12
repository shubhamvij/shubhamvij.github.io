import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MlaLab from './MlaLab'

describe('MlaLab', () => {
  it('opens on Act ① showing the cached latent and the d_c readout', () => {
    render(<MlaLab />)
    expect(screen.getByText(/cached so far/i)).toBeDefined()
    expect(screen.getByText(/d_c = 256 values/)).toBeDefined()
  })

  it('Act ② toggles between building per-head keys and the absorbed fixed matrix', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /② absorb/ }))
    expect(screen.getByText(/kᶜ = W_UK · c_kv/)).toBeDefined() // naïve default
    fireEvent.click(screen.getByRole('button', { name: /^absorbed$/ }))
    expect(screen.getByText(/W_UQᵀ W_UK — precomputed once/)).toBeDefined()
    expect(screen.getByText(/kᶜ never built/)).toBeDefined()
  })

  it('Act ③ slider: paths commute at Δ=0, diverge otherwise', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /③ RoPE breaks it/ }))
    const slider = screen.getByLabelText(/relative position offset delta/i)
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.getByText(/= fixed matrix ✓/)).toBeDefined()
    fireEvent.change(slider, { target: { value: '6' } })
    expect(screen.getByText(/changes with Δ/)).toBeDefined()
    expect(screen.getByText(/Δ = n − m = 6/)).toBeDefined()
  })

  it('Act ④ shows the two-lane split and the d_c + d_R cache total', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /④ decouple/ }))
    expect(screen.getByText(/kᴿ = RoPE\(W_KR · h_t\)/)).toBeDefined()
    expect(screen.getByText(/d_c \+ d_R = 256 \+ 32 = 288/)).toBeDefined()
    expect(screen.getByText(/576 vs 32768/)).toBeDefined()
  })
})
