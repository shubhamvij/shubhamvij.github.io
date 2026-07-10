import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWindowManager } from '../useWindowManager'

describe('useWindowManager z-ordering', () => {
  it('gives distinct ascending z-indexes to windows opened in one synchronous batch', () => {
    const { result } = renderHook(() => useWindowManager())
    // Mirrors the mount effect: cookie-restored windows plus the URL window,
    // all opened back-to-back before any re-render.
    act(() => {
      result.current.openWindow('learn', 'Courseware')
      result.current.openWindow('blog', 'Blog')
      result.current.openWindow('blog', 'Blog') // URL window already restored
    })
    const zs = Object.fromEntries(result.current.windows.map(w => [w.id, w.zIndex]))
    expect(new Set(result.current.windows.map(w => w.zIndex)).size).toBe(result.current.windows.length)
    // The URL-specified window (re-opened last) must be on top.
    expect(zs.blog).toBeGreaterThan(zs.learn)
  })

  it('re-opening an existing window raises it above all others', () => {
    const { result } = renderHook(() => useWindowManager())
    act(() => {
      result.current.openWindow('a', 'A')
      result.current.openWindow('b', 'B')
    })
    act(() => {
      result.current.openWindow('a', 'A')
    })
    const zs = Object.fromEntries(result.current.windows.map(w => [w.id, w.zIndex]))
    expect(zs.a).toBeGreaterThan(zs.b)
  })

  it('focusWindow raises the target above the current top', () => {
    const { result } = renderHook(() => useWindowManager())
    act(() => {
      result.current.openWindow('a', 'A')
      result.current.openWindow('b', 'B')
    })
    act(() => {
      result.current.focusWindow('a')
    })
    const zs = Object.fromEntries(result.current.windows.map(w => [w.id, w.zIndex]))
    expect(zs.a).toBeGreaterThan(zs.b)
  })
})
