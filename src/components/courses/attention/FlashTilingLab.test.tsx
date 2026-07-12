import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlashTilingLab from './FlashTilingLab'

describe('FlashTilingLab 3-act walkthrough', () => {
  it('opens on Act 1 step 0 with the hardware framing', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/Two memories/)).toBeDefined()
    // odometer starts at 0 MB
    expect(screen.getByText(/HBM traffic so far/i)).toBeDefined()
  })

  it('next/back walk Act 1 and clamp at the ends', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next) // step 1
    expect(screen.getByText(/streams Q and K/)).toBeDefined()
    const back = screen.getByRole('button', { name: /back/i })
    fireEvent.click(back) // back to step 0
    expect(screen.getByText(/Two memories/)).toBeDefined()
    fireEvent.click(back) // clamp — still step 0
    expect(screen.getByText(/Two memories/)).toBeDefined()
  })

  it('reaches the Act 1 verdict (~136 MB, ~68 µs) by stepping to the end', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    for (let i = 0; i < 6; i++) fireEvent.click(next)
    expect(screen.getByText(/136 MB moved/)).toBeDefined()
  })

  it('the flash tab shows the +0 MB score-tile step (traffic-free compute)', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /flash/i }))
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next) // load blocks
    fireEvent.click(next) // score tile in SRAM
    expect(screen.getByText(/\+0 MB/)).toBeDefined()
  })

  it('switching acts resets that act to step 0', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(screen.getByRole('button', { name: /flash/i }))
    expect(screen.getByText(/fuses everything into one kernel/)).toBeDefined() // Act 2 step 0
  })

  it('the verdict tab shows both totals and the identical-FLOPs stamp', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /verdict/i }))
    // 136 / 5.2 / 26× each render in both a bar label and the footnote — assert presence, not uniqueness
    expect(screen.getAllByText(/136/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/5\.2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/26×/).length).toBeGreaterThan(0)
    expect(screen.getByText(/identical/i)).toBeDefined() // only in the <strong> stamp
  })

  it('keeps a peak-score-memory counter (referenced by quiz am3-2-q2)', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/peak score memory/i)).toBeDefined()
  })
})
