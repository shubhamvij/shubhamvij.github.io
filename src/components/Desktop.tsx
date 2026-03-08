'use client'
import { useState, useCallback } from 'react'
import DesktopIcon from './DesktopIcon'
import DesktopContextMenu from './DesktopContextMenu'
import { useMobile } from '@/lib/useMobile'
import type { SocialLink } from '@/lib/social'

interface DesktopProps {
  onOpenWindow: (id: string) => void
  onOpenDisplayProperties: () => void
  socialLinks: SocialLink[]
}

const APP_ICONS = [
  { id: 'blog', label: 'Blog', icon: '/images/icons/notepad.svg' },
  { id: 'resume', label: 'Resume', icon: '/images/icons/resume.svg' },
  { id: 'research', label: 'Research', icon: '/images/icons/research.svg' },
]

export default function Desktop({ onOpenWindow, onOpenDisplayProperties, socialLinks }: DesktopProps) {
  const isMobile = useMobile()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  return (
    <div
      className="w-full h-full bg-cover bg-center relative"
      style={{
        background: "url('/images/xp-bliss.jpg') center/cover no-repeat, linear-gradient(180deg, #4a90d9 0%, #4a90d9 40%, #5cb85c 40%, #3d8b37 100%)",
      }}
      onContextMenu={handleContextMenu}
    >
      {!isMobile && (
        <div
          className="grid grid-cols-1 gap-1 p-2 content-start absolute top-0 left-0 bottom-12"
          onContextMenu={(e) => e.stopPropagation()}
        >
          {APP_ICONS.map(icon => (
            <DesktopIcon
              key={icon.id}
              icon={icon.icon}
              label={icon.label}
              onDoubleClick={() => onOpenWindow(icon.id)}
            />
          ))}
          {socialLinks.map(link => (
            <DesktopIcon
              key={link.id}
              icon={link.icon}
              label={link.label}
              isExternal
              onDoubleClick={() => window.open(link.href, '_blank')}
            />
          ))}
        </div>
      )}
      {contextMenu && (
        <DesktopContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenDisplayProperties={onOpenDisplayProperties}
        />
      )}
    </div>
  )
}
