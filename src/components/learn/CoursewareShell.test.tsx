import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CoursewareShell from './CoursewareShell'
import { invalidateCourseProgressCaches } from '@/components/courses/engine/progress'

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

function Harness({ initialSlug = null }: { initialSlug?: string | null }) {
  const [slug, setSlug] = useState<string | null>(initialSlug)
  return <CoursewareShell slug={slug} onNavigate={setSlug} />
}

function skipBoot() {
  fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }))
}

describe('CoursewareShell', () => {
  it('boots with a skippable CD-ROM splash', () => {
    render(<Harness />)
    expect(screen.getByText(/autorun\.exe/)).toBeDefined()
    skipBoot()
    expect(screen.getByText('VIJCARTA')).toBeDefined()
    expect(screen.getByText('Contents')).toBeDefined()
  })

  it('lists both courses in the library with their meta', () => {
    render(<Harness />)
    skipBoot()
    expect(screen.getByText('Graph Foundation Models')).toBeDefined()
    expect(screen.getByText('Attention, Everywhere')).toBeDefined()
    expect(screen.getByText(/7 modules · ~66 min/)).toBeDefined()
    expect(screen.getByText(/7 modules · ~64 min/)).toBeDefined()
    expect(screen.getByText(/More titles in production/)).toBeDefined()
  })

  it('opens a course from the library and returns via the Library button', () => {
    render(<Harness />)
    skipBoot()
    const startButtons = screen.getAllByRole('button', { name: 'Start course ▸' })
    fireEvent.click(startButtons[0]) // first card: GFM
    expect(screen.getByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: '← Library' }))
    expect(screen.getByText('Contents')).toBeDefined()
  })

  it('deep links straight to a course after the splash', () => {
    render(<Harness initialSlug="attention-mechanisms" />)
    skipBoot()
    expect(screen.getByRole('heading', { name: 'Attention, from scratch' })).toBeDefined()
  })

  it('falls back to the library for an unknown slug', () => {
    render(<CoursewareShell slug="not-a-course" onNavigate={vi.fn()} />)
    skipBoot()
    expect(screen.getByText('Contents')).toBeDefined()
  })

  it('swaps courses in place once booted — no second boot sequence', () => {
    const { rerender } = render(<CoursewareShell slug={null} onNavigate={vi.fn()} />)
    skipBoot()
    expect(screen.getByText('Contents')).toBeDefined()

    // A launch link elsewhere on the desktop updates the slug prop; the course
    // must appear immediately, without replaying the CD-ROM intro.
    rerender(<CoursewareShell slug="attention-mechanisms" onNavigate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Attention, from scratch' })).toBeDefined()
    expect(screen.queryByText(/autorun\.exe/)).toBeNull()
  })

  it('cross-course links inside lessons swap the course through onNavigate', () => {
    const onNavigate = vi.fn()
    render(<CoursewareShell slug="attention-mechanisms" onNavigate={onNavigate} />)
    skipBoot()
    // Module 7 prose links the GFM course.
    fireEvent.click(screen.getByRole('button', { name: /7\. One mental model/ }))
    const link = screen.getByRole('link', { name: 'Graph Foundation Models course' })
    fireEvent.click(link)
    expect(onNavigate).toHaveBeenCalledWith('graph-foundation-models')
  })

  it('shows continue state once a course has progress', () => {
    render(<Harness />)
    skipBoot()
    fireEvent.click(screen.getAllByRole('button', { name: 'Start course ▸' })[0])
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    fireEvent.click(screen.getByRole('button', { name: '← Library' }))
    expect(screen.getByText('14%')).toBeDefined() // 1/7 modules
    expect(screen.getByRole('button', { name: 'Continue ▸' })).toBeDefined()
  })
})
