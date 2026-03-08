'use client'
import { Rnd } from 'react-rnd'
import { ReactNode, useState, useEffect } from 'react'
import type { WindowState } from '@/lib/useWindowManager'
import { useMobile } from '@/lib/useMobile'

interface WindowProps {
  state: WindowState
  onClose: () => void
  onFocus: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
  onUpdateGeometry: (position?: { x: number; y: number }, size?: { width: number; height: number }) => void
  children: ReactNode
}

export default function Window({
  state, onClose, onFocus, onMinimize, onToggleMaximize, onUpdateGeometry, children
}: WindowProps) {
  const isMobile = useMobile()
  const [visible, setVisible] = useState(!state.isMinimized)

  useEffect(() => {
    if (state.isMinimized) {
      // Delay unmount to allow exit animation
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    } else {
      setVisible(true)
    }
  }, [state.isMinimized])

  // Keep in DOM during exit animation, hide after
  if (!visible && state.isMinimized) return null

  const minimizeStyle: React.CSSProperties = {
    transition: 'transform 300ms ease, opacity 200ms ease',
    transformOrigin: 'bottom center',
    ...(state.isMinimized
      ? { transform: 'scale(0.1) translateY(100vh)', opacity: 0, pointerEvents: 'none' as const }
      : { transform: 'scale(1) translateY(0)', opacity: 1 }),
  }

  const titleBar = (
    <div
      className="window-title-bar flex items-center justify-between px-2 py-1 cursor-move select-none shrink-0"
      style={{
        background: 'linear-gradient(180deg, #0a246a 0%, #3a6ea5 8%, #4a86c8 40%, #3a6ea5 88%, #0a246a 93%, #0a246a 100%)',
      }}
      onDoubleClick={isMobile ? undefined : onToggleMaximize}
    >
      <span className="text-white text-xs font-bold truncate"
        style={{ fontFamily: 'Tahoma, sans-serif' }}>
        {state.title}
      </span>
      <div className="flex gap-0.5 ml-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          className="w-5 h-5 rounded-sm text-xs font-bold text-black flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #fff 0%, #c0c0c0 100%)' }}
        >_</button>
        {!isMobile && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }}
            className="w-5 h-5 rounded-sm text-xs font-bold text-black flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #fff 0%, #c0c0c0 100%)' }}
          >&#9633;</button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-5 h-5 rounded-sm text-xs font-bold text-white flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #e08040 0%, #c03020 100%)' }}
        >&times;</button>
      </div>
    </div>
  )

  // On mobile, render a fixed fullscreen window (no drag/resize)
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ zIndex: state.zIndex, bottom: '36px', pointerEvents: 'auto', ...minimizeStyle }}
        onClick={onFocus}
      >
        <div className="flex flex-col w-full h-full overflow-hidden shadow-xl border border-blue-800">
          {titleBar}
          <div className="flex-1 bg-white overflow-auto">
            {children}
          </div>
        </div>
      </div>
    )
  }

  const resizeCursorEW = `url('/images/cursors/aero_ew.png') 12 8, ew-resize`
  const resizeCursorNS = `url('/images/cursors/aero_ns.png') 8 12, ns-resize`
  const resizeCursorNESW = `url('/images/cursors/aero_nesw.png') 11 11, nesw-resize`
  const resizeCursorNWSE = `url('/images/cursors/aero_nwse.png') 11 11, nwse-resize`

  const resizeHandleStyles = {
    top: { cursor: resizeCursorNS },
    bottom: { cursor: resizeCursorNS },
    left: { cursor: resizeCursorEW },
    right: { cursor: resizeCursorEW },
    topLeft: { cursor: resizeCursorNWSE },
    topRight: { cursor: resizeCursorNESW },
    bottomLeft: { cursor: resizeCursorNESW },
    bottomRight: { cursor: resizeCursorNWSE },
  }

  return (
    <div style={{ position: 'absolute', inset: 0, ...minimizeStyle }}>
      <Rnd
        position={state.isMaximized ? { x: 0, y: 0 } : state.position}
        size={state.isMaximized
          ? { width: '100%', height: '100%' }
          : state.size
        }
        minWidth={250}
        minHeight={150}
        bounds="parent"
        dragHandleClassName="window-title-bar"
        style={{ zIndex: state.zIndex, pointerEvents: 'auto' }}
        resizeHandleStyles={resizeHandleStyles}
        onMouseDown={onFocus}
        disableDragging={state.isMaximized}
        enableResizing={!state.isMaximized}
        onDragStop={(_e, d) => {
          if (!state.isMaximized) {
            onUpdateGeometry({ x: d.x, y: d.y })
          }
        }}
        onResizeStop={(_e, _dir, ref, _delta, position) => {
          if (!state.isMaximized) {
            onUpdateGeometry(
              { x: position.x, y: position.y },
              { width: ref.offsetWidth, height: ref.offsetHeight }
            )
          }
        }}
      >
        <div className="flex flex-col w-full h-full rounded-t-lg overflow-hidden shadow-xl border border-blue-800">
          {titleBar}
          <div className="flex-1 bg-white overflow-auto">
            {children}
          </div>
        </div>
      </Rnd>
    </div>
  )
}
