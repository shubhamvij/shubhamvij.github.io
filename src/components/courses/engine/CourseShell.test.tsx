import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CourseShell from './CourseShell'
import type { CourseDefinition } from './types'
import { invalidateCourseProgressCaches } from './progress'

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

const NESTED: CourseDefinition = {
  id: 'fixture-nested',
  title: 'Fixture Course',
  tagline: 'test',
  storageKey: 'fixture-nested-progress',
  widgets: {},
  modules: [
    { id: 'one', navLabel: '1. One', title: 'Module One', subtitle: 's', minutes: 5, blocks: [] },
    {
      id: 'two', navLabel: '2. Two', title: 'Module Two', subtitle: 's', minutes: 5, blocks: [],
      subchapters: [
        { id: 'two-a', navLabel: '2.1 Two-A', title: 'Deep Dive A', subtitle: 's', minutes: 3, blocks: [] },
        { id: 'two-b', navLabel: '2.2 Two-B', title: 'Deep Dive B', subtitle: 's', minutes: 3, blocks: [] },
      ],
    },
    { id: 'three', navLabel: '3. Three', title: 'Module Three', subtitle: 's', minutes: 5, blocks: [] },
  ],
}

describe('CourseShell with nested subchapters', () => {
  it('renders subchapters in the sidebar and navigates to them', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /2\.1 Two-A/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive A' })).toBeDefined()
    expect(screen.getByText(/Module 2 · Deep dive 1 of 2/)).toBeDefined()
  })

  it('threads subchapters into the prev/next flat order', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. Two/ }))
    // complete module 2 -> lands on 2.1
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive A' })).toBeDefined()
    // complete 2.1 -> 2.2, complete 2.2 -> module 3
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive B' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Module Three' })).toBeDefined()
  })

  it('counts subchapters in the progress percentage (5 flat modules)', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByText('20% complete')).toBeDefined()
  })

  it('keeps top-level kicker numbering over top-level count', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /3\. Three/ }))
    expect(screen.getByText(/Module 3 of 3/)).toBeDefined()
  })

  it('resumes on a subchapter via lastModuleId', () => {
    window.localStorage.setItem('fixture-nested-progress', JSON.stringify({
      completedModules: [], quizAnswers: {}, lastModuleId: 'two-b',
    }))
    invalidateCourseProgressCaches()
    render(<CourseShell course={NESTED} />)
    expect(screen.getByRole('heading', { name: 'Deep Dive B' })).toBeDefined()
  })

  it('renders a subchapter-free course exactly as before', () => {
    const flat: CourseDefinition = { ...NESTED, id: 'fixture-flat', storageKey: 'fixture-flat-progress', modules: NESTED.modules.map(m => ({ ...m, subchapters: undefined })) }
    render(<CourseShell course={flat} />)
    expect(screen.getByText(/Module 1 of 3/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Module Two' })).toBeDefined()
    expect(screen.getByText(/33% complete/)).toBeDefined()
  })
})
