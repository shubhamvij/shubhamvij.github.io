import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CourseShell from '../engine/CourseShell'
import { gfmCourse } from './index'
import { MODULES } from './content'
import { invalidateCourseProgressCaches } from '../engine/progress'

const FLAT_COUNT = MODULES.reduce((n, m) => n + 1 + (m.subchapters?.length ?? 0), 0)

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
  invalidateCourseProgressCaches()
})

describe('GFM course through CourseShell', () => {
  it('renders the first module with sidebar navigation for all modules', () => {
    render(<CourseShell course={gfmCourse} />)
    expect(screen.getByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()
    const nav = screen.getByRole('navigation')
    for (const m of MODULES) {
      expect(within(nav).getByText(m.navLabel)).toBeDefined()
    }
    expect(screen.getByText('0% complete')).toBeDefined()
  })

  it('navigates to another module from the sidebar and renders its widget', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. Learning on graphs/ }))
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    expect(screen.getByText('Message Passing Lab')).toBeDefined()
    expect(screen.getByText(/Run 1 layer/)).toBeDefined()
  })

  it('marks a module complete, advances, and updates the progress bar', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    expect(screen.getByText(`${Math.round(100 / FLAT_COUNT)}% complete`)).toBeDefined()
  })

  it('persists progress across remounts and resumes the last module', () => {
    const first = render(<CourseShell course={gfmCourse} />)
    fireEvent.click(first.getByRole('button', { name: /Mark complete & continue/ }))
    first.unmount()

    render(<CourseShell course={gfmCourse} />)
    expect(screen.getByRole('heading', { name: 'How machines learn on graphs' })).toBeDefined()
    expect(screen.getByText(`${Math.round(100 / FLAT_COUNT)}% complete`)).toBeDefined()
  })

  it('records quiz answers through the shared progress store', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /Nodes: accounts and merchants/ }))
    expect(screen.getByText(/Correct/)).toBeDefined()
  })

  it('resets progress after confirmation', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    const resetBtn = screen.getByRole('button', { name: 'Reset progress' })
    fireEvent.click(resetBtn) // arm
    fireEvent.click(resetBtn) // confirm
    expect(screen.getByText('0% complete')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()
  })

  it('invokes onBack with the provided label', () => {
    const onBack = vi.fn()
    render(<CourseShell course={gfmCourse} onBack={onBack} backLabel="← Library" />)
    fireEvent.click(screen.getByRole('button', { name: /Library/ }))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders the five zoo deep dives in the sidebar and navigates to 5.1', () => {
    render(<CourseShell course={gfmCourse} />)
    const nav = screen.getByRole('navigation')
    for (const label of ['5.1 ULTRA: relations', '5.2 Text as glue', '5.3 Structure + in-context', '5.4 GraphBFF: typed attention', '5.5 The relational bet']) {
      expect(within(nav).getByText(label)).toBeDefined()
    }
    fireEvent.click(screen.getByRole('button', { name: /5\.1 ULTRA/ }))
    expect(screen.getByRole('heading', { name: 'A vocabulary of relations — ULTRA' })).toBeDefined()
    expect(screen.getByText(/Module 5 · Deep dive 1 of 5/)).toBeDefined()
    expect(screen.getByText('Relation-Graph Builder')).toBeDefined()
  })

  it('threads deep dives into prev/next order after module 5', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /5\. The GFM zoo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'A vocabulary of relations — ULTRA' })).toBeDefined()
  })
})
