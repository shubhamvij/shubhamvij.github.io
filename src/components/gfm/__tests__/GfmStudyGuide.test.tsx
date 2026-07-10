import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import GfmStudyGuide from '../GfmStudyGuide'
import { MODULES } from '../content'
import { invalidateGuideProgressCache } from '../progress'

beforeEach(() => {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    },
  })
  invalidateGuideProgressCache()
})

describe('GfmStudyGuide', () => {
  it('renders the first module with sidebar navigation for all modules', () => {
    render(<GfmStudyGuide />)
    expect(screen.getByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()
    const nav = screen.getByRole('navigation')
    for (const m of MODULES) {
      expect(within(nav).getByText(m.navLabel)).toBeDefined()
    }
    expect(screen.getByText('0% complete')).toBeDefined()
  })

  it('navigates to another module from the sidebar and renders its widget', () => {
    render(<GfmStudyGuide />)
    fireEvent.click(screen.getByRole('button', { name: /2\. Learning on graphs/ }))
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    expect(screen.getByText('Message Passing Lab')).toBeDefined()
    expect(screen.getByText(/Run 1 layer/)).toBeDefined()
  })

  it('marks a module complete, advances, and updates the progress bar', () => {
    render(<GfmStudyGuide />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    // Advanced to module 2...
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    // ...and 1/7 modules complete.
    expect(screen.getByText(`${Math.round(100 / MODULES.length)}% complete`)).toBeDefined()
  })

  it('persists progress across remounts and resumes the last module', () => {
    const first = render(<GfmStudyGuide />)
    fireEvent.click(first.getByRole('button', { name: /Mark complete & continue/ }))
    first.unmount()

    render(<GfmStudyGuide />)
    // Resumes on module 2 with prior completion intact.
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    expect(screen.getByText(`${Math.round(100 / MODULES.length)}% complete`)).toBeDefined()
  })

  it('records quiz answers through the shared progress store', () => {
    render(<GfmStudyGuide />)
    // Module 1, Q1: correct answer is the "accounts and merchants" option.
    fireEvent.click(screen.getByRole('button', { name: /Nodes: accounts and merchants/ }))
    expect(screen.getByText(/Correct/)).toBeDefined()
  })

  it('resets progress after confirmation', () => {
    render(<GfmStudyGuide />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    const resetBtn = screen.getByRole('button', { name: 'Reset progress' })
    fireEvent.click(resetBtn) // arm
    fireEvent.click(resetBtn) // confirm
    expect(screen.getByText('0% complete')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()
  })

  it('invokes onBack from the toolbar', () => {
    const onBack = vi.fn()
    render(<GfmStudyGuide onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /All posts/ }))
    expect(onBack).toHaveBeenCalled()
  })
})
