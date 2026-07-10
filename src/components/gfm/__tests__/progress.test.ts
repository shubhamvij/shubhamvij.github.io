import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGuideProgress, invalidateGuideProgressCache } from '../progress'

// jsdom's localStorage is unreliable in this repo's test env; install a working stub
// so we can test persistence, and remove it to test the in-memory fallback.
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
  invalidateGuideProgressCache()
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
  invalidateGuideProgressCache()
}

describe('useGuideProgress', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('starts empty and records module completion and quiz answers', () => {
    const { result } = renderHook(() => useGuideProgress())
    expect(result.current.progress.completedModules).toEqual([])

    act(() => {
      result.current.markModuleComplete('graphs')
      result.current.recordQuizAnswer('m1-q1', 2)
    })
    expect(result.current.progress.completedModules).toEqual(['graphs'])
    expect(result.current.progress.quizAnswers['m1-q1']).toBe(2)
  })

  it('does not duplicate completed modules', () => {
    const { result } = renderHook(() => useGuideProgress())
    act(() => {
      result.current.markModuleComplete('graphs')
      result.current.markModuleComplete('graphs')
    })
    expect(result.current.progress.completedModules).toEqual(['graphs'])
  })

  it('persists to localStorage and restores in a fresh hook', () => {
    const first = renderHook(() => useGuideProgress())
    act(() => {
      first.result.current.markModuleComplete('graphs')
      first.result.current.setLastModule('message-passing')
    })
    first.unmount()

    const second = renderHook(() => useGuideProgress())
    expect(second.result.current.progress.completedModules).toEqual(['graphs'])
    expect(second.result.current.progress.lastModuleId).toBe('message-passing')
  })

  it('resets progress', () => {
    const { result } = renderHook(() => useGuideProgress())
    act(() => {
      result.current.markModuleComplete('graphs')
      result.current.resetProgress()
    })
    expect(result.current.progress.completedModules).toEqual([])
    expect(result.current.progress.quizAnswers).toEqual({})
  })

  it('still works in-memory when localStorage throws', () => {
    installBrokenLocalStorage()
    const { result } = renderHook(() => useGuideProgress())
    act(() => {
      result.current.markModuleComplete('graphs')
    })
    expect(result.current.progress.completedModules).toEqual(['graphs'])
  })
})
