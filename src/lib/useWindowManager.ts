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

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [topZ, setTopZ] = useState(10)

  const openWindow = useCallback((id: string, title: string, geometry?: { position: { x: number; y: number }; size: { width: number; height: number }; isMaximized?: boolean }) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id)
      if (existing) {
        return prev.map(w =>
          w.id === id
            ? { ...w, isMinimized: false, zIndex: topZ + 1 }
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
        zIndex: topZ + 1,
        defaultPosition: pos,
        defaultSize: size,
        position: pos,
        size,
      }]
    })
    setTopZ(z => z + 1)
  }, [topZ])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const focusWindow = useCallback((id: string) => {
    setTopZ(z => {
      setWindows(prev =>
        prev.map(w => w.id === id ? { ...w, zIndex: z + 1 } : w)
      )
      return z + 1
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
