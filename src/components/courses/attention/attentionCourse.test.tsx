import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CourseShell from '../engine/CourseShell'
import { attentionCourse } from './index'
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

describe('Attention course through CourseShell', () => {
  it('renders module 1 with the Attention Lab', () => {
    render(<CourseShell course={attentionCourse} />)
    expect(screen.getByRole('heading', { name: 'Attention, from scratch' })).toBeDefined()
    expect(screen.getByText('Attention Lab')).toBeDefined()
    // default query token is "it" — the lab's stat chip reports it in quotes
    // (also appears in prose, so assert at least one)
    expect(screen.getAllByText('"it"').length).toBeGreaterThan(0)
  })

  it('every widget key used by the content is registered', () => {
    const used = new Set<string>()
    for (const m of MODULES) {
      for (const b of m.blocks) {
        if (b.kind === 'widget') used.add(b.widget)
      }
    }
    for (const key of used) {
      expect(attentionCourse.widgets[key], `widget "${key}" missing from registry`).toBeDefined()
    }
  })

  it('mask lab switches modes and reports pair counts', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /3\. Taming the n²/ }))
    expect(screen.getByText('Attention Mask Lab')).toBeDefined()
    // full mode: 100/100 pairs
    expect(screen.getByText('100 / 100')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Causal \(GPT\)/ }))
    expect(screen.getByText('55 / 100')).toBeDefined() // triangular incl. diagonal
    fireEvent.click(screen.getByRole('button', { name: /Sliding window/ }))
    expect(screen.getByText('27 / 100')).toBeDefined() // w=2 causal band
  })

  it('typed attention lab toggles between shared and per-type parameters', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /6\. Graph transformer blocks/ }))
    expect(screen.getByText('Typed Attention Lab')).toBeDefined()
    // default: typed mode with I2 selected (viewed + sold-by neighborhoods = 2 param sets)
    expect(screen.getByText('2×')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /shared attention/ }))
    expect(screen.getByText('1×')).toBeDefined()
  })

  it('patchify lab updates token counts with patch size', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /4\. Vision Transformers/ }))
    expect(screen.getByText('Patchify Lab')).toBeDefined()
    // default 4x4 patches: 1 + 16 tokens
    expect(screen.getByText(/sequence length: 1 \+ 4×4 = 17 tokens/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '2×2 patches' }))
    expect(screen.getByText(/sequence length: 1 \+ 8×8 = 65 tokens/)).toBeDefined()
  })

  it('quiz answers persist under the attention course storage key', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /a weighted average of all tokens/ }))
    expect(screen.getByText(/Correct/)).toBeDefined()
    const raw = window.localStorage.getItem('attention-course-progress-v1')
    expect(raw).toContain('am1-q1')
  })
})
