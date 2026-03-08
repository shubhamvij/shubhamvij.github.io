'use client'
import { useEffect, useRef } from 'react'

interface DesktopContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onOpenDisplayProperties: () => void
}

interface MenuItem {
  label: string
  disabled?: boolean
  separator?: boolean
  submenu?: boolean
  onClick?: () => void
}

export default function DesktopContextMenu({ x, y, onClose, onOpenDisplayProperties }: DesktopContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Adjust position to stay within viewport
  const menuWidth = 180
  const menuHeight = 230
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y

  const items: MenuItem[] = [
    { label: 'Arrange Icons By', disabled: true, submenu: true },
    { label: 'Refresh', disabled: true },
    { separator: true, label: '' },
    { label: 'Paste', disabled: true },
    { label: 'Paste Shortcut', disabled: true },
    { separator: true, label: '' },
    { label: 'New', disabled: true, submenu: true },
    { separator: true, label: '' },
    { label: 'Properties', onClick: () => { onOpenDisplayProperties(); onClose() } },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed shadow-md"
      style={{
        left: adjustedX,
        top: adjustedY,
        zIndex: 9998,
        fontFamily: 'Tahoma, sans-serif',
        fontSize: '11px',
        background: '#fff',
        border: '1px solid #808080',
        padding: '2px 0',
        minWidth: menuWidth,
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <hr key={i} style={{ margin: '3px 2px', border: 'none', borderTop: '1px solid #d0d0d0' }} />
        ) : (
          <button
            key={i}
            className="w-full text-left flex items-center justify-between px-6 py-0.5"
            style={{
              color: item.disabled ? '#808080' : '#000',
              cursor: item.disabled ? 'default' : 'pointer',
            }}
            onMouseOver={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = '#0a246a'
                e.currentTarget.style.color = '#fff'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = item.disabled ? '#808080' : '#000'
            }}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            <span>{item.label}</span>
            {item.submenu && <span style={{ fontSize: '8px' }}>&#9658;</span>}
          </button>
        )
      )}
    </div>
  )
}
