import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CourseShell from '../engine/CourseShell'
import { dlrmCourse } from './index'
import { MODULES } from './content'
import { invalidateCourseProgressCaches } from '../engine/progress'

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

describe('DLRM course through CourseShell', () => {
  it('renders module 1 and lists all six modules in the sidebar', () => {
    render(<CourseShell course={dlrmCourse} />)
    expect(screen.getByRole('heading', { name: 'Why embedding tables exist' })).toBeDefined()
    const nav = screen.getByRole('navigation')
    for (const m of MODULES) expect(within(nav).getByText(m.navLabel)).toBeDefined()
    expect(screen.getByText('0% complete')).toBeDefined()
  })

  it('navigates to a module and renders its widget', () => {
    render(<CourseShell course={dlrmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /5\. Shrinking the table/ }))
    expect(screen.getByRole('heading', { name: 'Shrinking the table' })).toBeDefined()
    expect(screen.getByText('Collision Explorer')).toBeDefined()
  })

  it('marks a module complete and advances the progress bar', () => {
    render(<CourseShell course={dlrmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByText(`${Math.round(100 / MODULES.length)}% complete`)).toBeDefined()
  })
})
