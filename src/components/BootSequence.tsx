'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BOOT_LINES = [
  'BIOS v2.4 ... OK',
  'Memory Test: 640K ... OK',
  'Detecting drives ... C:\\ found',
  'Loading SHUBHAM.SYS ...',
  'Loading PORTFOLIO.DRV ...',
  'Loading BLOG.EXE ...',
  'Initializing network ... CONNECTED',
  '',
  'C:\\> Welcome, Shubham.',
  'C:\\> Starting desktop environment...',
]

interface BootSequenceProps {
  onComplete: () => void
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [done, setDone] = useState(false)

  // Auto-skip if returning visitor
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('bootSeen')) {
      onComplete()
    }
  }, [onComplete])

  useEffect(() => {
    if (visibleLines < BOOT_LINES.length) {
      const delay = BOOT_LINES[visibleLines] === '' ? 200 : 150 + Math.random() * 200
      const timer = setTimeout(() => setVisibleLines(v => v + 1), delay)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setDone(true), 800)
      return () => clearTimeout(timer)
    }
  }, [visibleLines])

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bootSeen', '1')
    }
    onComplete()
  }

  useEffect(() => {
    if (done) {
      const timer = setTimeout(handleComplete, 500)
      return () => clearTimeout(timer)
    }
  }, [done])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="w-full h-full bg-black p-4 font-mono text-sm relative"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="text-green-400 leading-relaxed">
              {line || '\u00A0'}
            </div>
          ))}
          {visibleLines < BOOT_LINES.length && (
            <span className="text-green-400 animate-pulse">_</span>
          )}
          <button
            onClick={handleComplete}
            className="absolute bottom-4 right-4 text-green-400/60 hover:text-green-400 text-xs font-mono transition-colors"
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
