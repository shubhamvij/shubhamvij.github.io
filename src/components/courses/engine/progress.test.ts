import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCourseProgress, invalidateCourseProgressCaches } from './progress'

// jsdom's localStorage is unreliable in this repo's test env; install a working stub
// so we can test persistence, and a throwing one to test the in-memory fallback.
function installLocalStorage() {
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
  return store
}

function installBrokenLocalStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => { throw new Error('storage disabled') },
      setItem: () => { throw new Error('storage disabled') },
    },
  })
  invalidateCourseProgressCaches()
}

const KEY = 'test-course-progress'

describe('useCourseProgress', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('starts empty and records module completion and quiz answers', () => {
    const { result } = renderHook(() => useCourseProgress(KEY))
    expect(result.current.progress.completedModules).toEqual([])

    act(() => {
      result.current.markModuleComplete('m1')
      result.current.recordQuizAnswer('q1', 2)
    })
    expect(result.current.progress.completedModules).toEqual(['m1'])
    expect(result.current.progress.quizAnswers['q1']).toBe(2)
  })

  it('does not duplicate completed modules', () => {
    const { result } = renderHook(() => useCourseProgress(KEY))
    act(() => {
      result.current.markModuleComplete('m1')
      result.current.markModuleComplete('m1')
    })
    expect(result.current.progress.completedModules).toEqual(['m1'])
  })

  it('persists to localStorage and restores in a fresh hook', () => {
    const first = renderHook(() => useCourseProgress(KEY))
    act(() => {
      first.result.current.markModuleComplete('m1')
      first.result.current.setLastModule('m2')
    })
    first.unmount()

    const second = renderHook(() => useCourseProgress(KEY))
    expect(second.result.current.progress.completedModules).toEqual(['m1'])
    expect(second.result.current.progress.lastModuleId).toBe('m2')
  })

  it('keeps per-course progress isolated by storage key', () => {
    const a = renderHook(() => useCourseProgress('course-a'))
    const b = renderHook(() => useCourseProgress('course-b'))
    act(() => {
      a.result.current.markModuleComplete('m1')
    })
    expect(a.result.current.progress.completedModules).toEqual(['m1'])
    expect(b.result.current.progress.completedModules).toEqual([])
  })

  it('resets progress', () => {
    const { result } = renderHook(() => useCourseProgress(KEY))
    act(() => {
      result.current.markModuleComplete('m1')
      result.current.resetProgress()
    })
    expect(result.current.progress.completedModules).toEqual([])
    expect(result.current.progress.quizAnswers).toEqual({})
  })

  it('still works in-memory when localStorage throws', () => {
    installBrokenLocalStorage()
    const { result } = renderHook(() => useCourseProgress(KEY))
    act(() => {
      result.current.markModuleComplete('m1')
    })
    expect(result.current.progress.completedModules).toEqual(['m1'])
  })
})
