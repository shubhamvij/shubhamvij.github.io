'use client'
import { motion, AnimatePresence } from 'framer-motion'
import type { SocialLink } from '@/lib/social'

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  onSleep: () => void
  socialLinks: SocialLink[]
}

const MENU_ITEMS = [
  { id: 'about', label: 'About Me', icon: '/images/icons/about.svg' },
  { id: 'blog', label: 'Blog', icon: '/images/icons/notepad.svg' },
  { id: 'resume', label: 'Resume', icon: '/images/icons/resume.svg' },
  { id: 'research', label: 'Research', icon: '/images/icons/research.svg' },
]

export default function StartMenu({ isOpen, onClose, onNavigate, onSleep, socialLinks }: StartMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-10 left-1 w-72 rounded-t-lg overflow-hidden shadow-2xl border border-blue-800"
          style={{ zIndex: 10000 }}
        >
          {/* Header */}
          <div className="px-3 py-2 flex items-center gap-2"
            style={{ background: 'linear-gradient(180deg, #245edb 0%, #1941a5 100%)' }}>
            <img src="/images/shubham.jpg" alt="Shubham Vij" className="w-10 h-10 rounded-full object-cover" />
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Tahoma, sans-serif' }}>Shubham Vij</span>
          </div>

          {/* Body */}
          <div className="flex bg-white">
            <div className="flex-1 py-1 border-r border-gray-200">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white text-sm text-left"
                  style={{ fontFamily: 'Tahoma, sans-serif' }}
                >
                  <img src={item.icon} alt="" className="w-6 h-6" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="w-28 py-1 bg-blue-50">
              {socialLinks.map(item => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-1.5 hover:bg-blue-600 hover:text-white text-xs"
                  style={{ fontFamily: 'Tahoma, sans-serif' }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 border-t border-gray-300 px-3 py-1.5">
            <button
              onClick={() => { onClose(); onSleep() }}
              className="text-xs text-gray-600 hover:text-blue-600"
              style={{ fontFamily: 'Tahoma, sans-serif' }}
            >
              Sleep
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
