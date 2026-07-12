import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LookupLab from './LookupLab'

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
