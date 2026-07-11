import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ZooMapLab from './ZooMapLab'

describe('ZooMapLab', () => {
  it('compares ULTRA vs GraphBFF by default', () => {
    render(<ZooMapLab />)
    expect(screen.getByText('conditional MPNN (NBFNet-style)')).toBeDefined()
    expect(screen.getByText('graph transformer: TCA + TAA fused per block')).toBeDefined()
  })

  it('replaces the older selection first and marks identical rows as same', () => {
    render(<ZooMapLab />)
    fireEvent.click(screen.getByRole('button', { name: /LLaGA/ }))   // [GraphBFF, LLaGA]
    fireEvent.click(screen.getByRole('button', { name: /GraphGPT/ })) // [LLaGA, GraphGPT]
    // GraphGPT and LLaGA share prediction locus and frozen-vs-trained cells:
    expect(screen.getAllByText('· same ·').length).toBe(2)
    expect(screen.getAllByText('the LLM generates the answer').length).toBe(2)
  })

  it('points every card at a deep dive', () => {
    render(<ZooMapLab />)
    expect(screen.getAllByText(/deep dive 5\./).length).toBe(10)
  })
})
