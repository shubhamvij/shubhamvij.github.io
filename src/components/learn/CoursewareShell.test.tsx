import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CoursewareShell from './CoursewareShell'
import { invalidateCourseProgressCaches } from '@/components/courses/engine/progress'
import { COURSE_CATALOG } from '@/lib/courseCatalog'

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

// Mirrors HomeClient: the caller owns both the slug and the booted flag, so
// boot state survives content remounts (window minimize/restore, resize).
function ControlledShell({ slug, onNavigate }: { slug: string | null; onNavigate: (s: string | null) => void }) {
  const [booted, setBooted] = useState(false)
  return <CoursewareShell slug={slug} onNavigate={onNavigate} booted={booted} onBooted={() => setBooted(true)} />
}

function Harness({ initialSlug = null }: { initialSlug?: string | null }) {
  const [slug, setSlug] = useState<string | null>(initialSlug)
  return <ControlledShell slug={slug} onNavigate={setSlug} />
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
    // Assert against COURSE_CATALOG itself, not copied-in numbers: the
    // attention course's minutes/highlights change repeatedly as deep-dive
    // subchapters land, and a hardcoded string here would break every time.
    for (const course of COURSE_CATALOG) {
      expect(screen.getByText(course.title)).toBeDefined()
      expect(
        screen.getByText(`${course.modules} modules · ~${course.minutes} min`, { exact: false })
      ).toBeDefined()
      expect(screen.getByText(course.highlights, { exact: false })).toBeDefined()
    }
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
    render(<ControlledShell slug="not-a-course" onNavigate={vi.fn()} />)
    skipBoot()
    expect(screen.getByText('Contents')).toBeDefined()
  })

  it('swaps courses in place once booted — no second boot sequence', () => {
    const { rerender } = render(<ControlledShell slug={null} onNavigate={vi.fn()} />)
    skipBoot()
    expect(screen.getByText('Contents')).toBeDefined()

    // A launch link elsewhere on the desktop updates the slug prop; the course
    // must appear immediately, without replaying the CD-ROM intro.
    rerender(<ControlledShell slug="attention-mechanisms" onNavigate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Attention, from scratch' })).toBeDefined()
    expect(screen.queryByText(/autorun\.exe/)).toBeNull()
  })

  it('boot state lives with the caller: a remount while booted skips the splash', () => {
    // Minimize/restore (and breakpoint changes) unmount and remount window
    // content, so the shell must report boot completion upward instead of
    // remembering it locally — like a program that stays running.
    const onBooted = vi.fn()
    const { unmount } = render(
      <CoursewareShell slug={null} onNavigate={vi.fn()} booted={false} onBooted={onBooted} />
    )
    skipBoot()
    expect(onBooted).toHaveBeenCalledTimes(1)

    unmount()
    render(<CoursewareShell slug={null} onNavigate={vi.fn()} booted={true} onBooted={vi.fn()} />)
    expect(screen.queryByText(/autorun\.exe/)).toBeNull()
    expect(screen.getByText('Contents')).toBeDefined()
  })

  it('cross-course links inside lessons swap the course through onNavigate', () => {
    const onNavigate = vi.fn()
    render(<ControlledShell slug="attention-mechanisms" onNavigate={onNavigate} />)
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
