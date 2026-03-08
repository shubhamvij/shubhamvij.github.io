'use client'

interface DesktopIconProps {
  icon: string
  label: string
  isExternal?: boolean
  onDoubleClick: () => void
}

export default function DesktopIcon({ icon, label, isExternal, onDoubleClick }: DesktopIconProps) {
  return (
    <button
      className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/20 w-20 group"
      onDoubleClick={onDoubleClick}
    >
      <div className="relative">
        <img src={icon} alt={label} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} draggable={false} />
        {isExternal && (
          <span
            className="absolute -bottom-0.5 -right-1 text-white text-[9px] leading-none drop-shadow-[1px_1px_1px_rgba(0,0,0,0.9)]"
            aria-hidden="true"
          >
            ↗
          </span>
        )}
      </div>
      <span className="text-white text-xs text-center drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)] leading-tight select-none"
        style={{ fontFamily: 'Tahoma, sans-serif' }}>
        {label}
      </span>
    </button>
  )
}
