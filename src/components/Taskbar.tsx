'use client'
import { useState, useEffect } from 'react'
import type { WindowState } from '@/lib/useWindowManager'

interface TaskbarProps {
  windows: WindowState[]
  onStartClick: () => void
  onWindowClick: (id: string) => void
  startMenuOpen: boolean
}

export default function Taskbar({ windows, onStartClick, onWindowClick, startMenuOpen }: TaskbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-9 flex items-center px-1"
      style={{
        background: 'linear-gradient(180deg, #245edb 0%, #3f8cf3 2%, #245edb 4%, #1941a5 95%, #1941a5 100%)',
        zIndex: 9999,
      }}
    >
      <button
        onClick={onStartClick}
        className="flex items-center gap-1 h-7 px-3 rounded-sm text-white text-sm font-bold shrink-0"
        style={{
          fontFamily: 'Tahoma, sans-serif',
          background: startMenuOpen
            ? 'linear-gradient(180deg, #1a6a1a 0%, #2d8e2d 50%, #1a6a1a 100%)'
            : 'linear-gradient(180deg, #22b522 0%, #3ec93e 8%, #1da41d 93%, #1a8c1a 100%)',
        }}
      >
        Start
      </button>

      <div className="flex-1 flex items-center gap-1 mx-2 overflow-hidden">
        {windows.map(w => (
          <button
            key={w.id}
            onClick={() => onWindowClick(w.id)}
            className="h-6 px-3 text-xs text-white rounded-sm truncate max-w-[150px]"
            style={{
              fontFamily: 'Tahoma, sans-serif',
              background: w.isMinimized ? 'rgba(30, 60, 140, 0.5)' : 'rgba(30, 60, 140, 0.8)',
            }}
          >
            {w.title}
          </button>
        ))}
      </div>

      <div className="text-white text-xs px-2 shrink-0" style={{ fontFamily: 'Tahoma, sans-serif' }}>
        {time}
      </div>
    </div>
  )
}
