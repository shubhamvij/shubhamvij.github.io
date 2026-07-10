'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import type { WindowState } from '@/lib/useWindowManager'
import { isMuted, subscribeMuted, toggleMuted, playSound } from '@/lib/sounds'

// Server snapshot is always "unmuted"; the persisted value syncs in on the client.
const getServerMuted = () => false

interface TaskbarProps {
  windows: WindowState[]
  onStartClick: () => void
  onWindowClick: (id: string) => void
  startMenuOpen: boolean
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <polygon points="1,5 4,5 7.5,1.5 7.5,12.5 4,9 1,9" fill="#ececec" stroke="#3a3a3a" strokeWidth="0.6" strokeLinejoin="round" />
      {muted ? (
        <g stroke="#e02020" strokeWidth="1.7" strokeLinecap="round">
          <line x1="9.2" y1="4.8" x2="13" y2="9.2" />
          <line x1="13" y1="4.8" x2="9.2" y2="9.2" />
        </g>
      ) : (
        <g fill="none" stroke="#ececec" strokeWidth="1.1" strokeLinecap="round">
          <path d="M9.2 5 A 3 3 0 0 1 9.2 9" />
          <path d="M10.9 3.4 A 5.2 5.2 0 0 1 10.9 10.6" />
        </g>
      )}
    </svg>
  )
}

export default function Taskbar({ windows, onStartClick, onWindowClick, startMenuOpen }: TaskbarProps) {
  const [time, setTime] = useState('')
  const muted = useSyncExternalStore(subscribeMuted, isMuted, getServerMuted)

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSoundToggle = () => {
    const next = toggleMuted()
    if (!next) playSound('click') // audible confirmation on unmute
  }

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

      <div
        className="flex items-center gap-1.5 h-7 px-2 shrink-0 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #1290e9 0%, #19b9f3 3%, #1290e9 5%, #1064c8 95%, #1064c8 100%)',
          boxShadow: 'inset 1px 0 2px rgba(9, 34, 88, 0.5)',
        }}
      >
        <button
          onClick={handleSoundToggle}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
          className="flex items-center justify-center w-5 h-5 rounded-sm hover:bg-white/20"
        >
          <SpeakerIcon muted={muted} />
        </button>
        <span className="text-white text-xs" style={{ fontFamily: 'Tahoma, sans-serif' }}>
          {time}
        </span>
      </div>
    </div>
  )
}
