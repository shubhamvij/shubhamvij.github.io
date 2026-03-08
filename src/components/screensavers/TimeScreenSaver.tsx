'use client'
import { useState, useEffect } from 'react'

export default function TimeScreenSaver() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <span
        className="text-white text-6xl font-bold select-none"
        style={{ fontFamily: 'Tahoma, sans-serif' }}
      >
        {displayHours}:{minutes}:{seconds} {period}
      </span>
    </div>
  )
}
