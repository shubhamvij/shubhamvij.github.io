'use client'
import { useState, useCallback } from 'react'

export interface WindowState {
  id: string
  title: string
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  defaultPosition: { x: number; y: number }
  defaultSize: { width: number; height: number }
  position: { x: number; y: number }
  size: { width: number; height: number }
}

// Windows stack above the desktop (z 10) — each open/focus goes one above the current top.
function nextZ(windows: WindowState[]): number {
  return windows.reduce((max, w) => Math.max(max, w.zIndex), 10) + 1
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([])

  // z-index is derived inside the functional update so several synchronous calls
  // (e.g. restoring cookie windows plus the URL window on mount) stack distinctly
  // instead of sharing one stale "top" value.
  const openWindow = useCallback((id: string, title: string, geometry?: { position?: { x: number; y: number }; size?: { width: number; height: number }; isMaximized?: boolean }) => {
    setWindows(prev => {
      const zIndex = nextZ(prev)
      const existing = prev.find(w => w.id === id)
      if (existing) {
        return prev.map(w =>
          w.id === id
            ? { ...w, isMinimized: false, zIndex }
            : w
        )
      }
      const pos = geometry?.position ?? { x: 50 + prev.length * 30, y: 30 + prev.length * 30 }
      const size = geometry?.size ?? { width: 500, height: 350 }
      return [...prev, {
        id,
        title,
        isMinimized: false,
        isMaximized: geometry?.isMaximized ?? false,
        zIndex,
        defaultPosition: pos,
        defaultSize: size,
        position: pos,
        size,
      }]
    })
  }, [])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const target = prev.find(w => w.id === id)
      if (!target) return prev
      const zIndex = nextZ(prev)
      return prev.map(w => w.id === id ? { ...w, zIndex } : w)
    })
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isMinimized: true } : w)
    )
  }, [])

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)
    )
  }, [])

  const updateWindowGeometry = useCallback((id: string, position?: { x: number; y: number }, size?: { width: number; height: number }) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? {
        ...w,
        ...(position ? { position } : {}),
        ...(size ? { size } : {}),
      } : w)
    )
  }, [])

  return { windows, openWindow, closeWindow, focusWindow, minimizeWindow, toggleMaximize, updateWindowGeometry }
}
