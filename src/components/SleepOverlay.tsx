'use client'
import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getScreenSaver } from '@/lib/screenSavers'

interface SleepOverlayProps {
  isActive: boolean
  screenSaverId: string
  onWake: () => void
}

export default function SleepOverlay({ isActive, screenSaverId, onWake }: SleepOverlayProps) {
  const cumulativeMove = useRef(0)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!lastPos.current) {
      lastPos.current = { x: e.clientX, y: e.clientY }
      return
    }
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    cumulativeMove.current += Math.sqrt(dx * dx + dy * dy)
    lastPos.current = { x: e.clientX, y: e.clientY }
    if (cumulativeMove.current > 5) {
      onWake()
    }
  }, [onWake])

  const handleWake = useCallback(() => {
    onWake()
  }, [onWake])

  const meta = getScreenSaver(screenSaverId)
  const ScreenSaverComponent = meta?.component ?? null

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
          style={{ zIndex: 99999, cursor: 'none' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleWake}
          onKeyDown={handleWake}
          tabIndex={0}
          onAnimationComplete={() => {
            cumulativeMove.current = 0
            lastPos.current = null
          }}
        >
          {ScreenSaverComponent ? <ScreenSaverComponent /> : <div className="w-full h-full bg-black" />}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
