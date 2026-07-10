'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import CRTFrame from '@/components/CRTFrame'
import BootSequence from '@/components/BootSequence'
import Desktop from '@/components/Desktop'
import Window from '@/components/Window'
import Taskbar from '@/components/Taskbar'
import StartMenu from '@/components/StartMenu'
import SleepOverlay from '@/components/SleepOverlay'
import DisplayProperties from '@/components/DisplayProperties'
import { useWindowManager } from '@/lib/useWindowManager'
import { useIdleTimer } from '@/lib/useIdleTimer'
import { getOpenWindows, setOpenWindows } from '@/lib/windowCookies'
import BlogList from '@/components/BlogList'
import ResumeViewer from '@/components/ResumeViewer'
import ScholarFeed from '@/components/ScholarFeed'
import AboutContent from '@/components/AboutContent'
import FinancePlanner from '@/components/finance/FinancePlanner'
import CoursewareShell from '@/components/learn/CoursewareShell'
import type { SocialLink } from '@/lib/social'

const WINDOW_TITLES: Record<string, string> = {
  blog: 'Blog - Notepad',
  resume: 'Resume',
  research: 'Research - Papers & Patents',
  about: 'About - Shubham Vij',
  finance: 'Finance Planner - Calculator',
  learn: "Vijcarta '26 - Interactive Courseware",
  'display-properties': 'Display Properties',
}

const ROUTABLE_SECTIONS = ['blog', 'resume', 'research', 'finance', 'learn'] as const

// Courseware and blog reading both want a roomier window than the 500x350 default.
function readingGeometry() {
  return {
    size: {
      width: Math.max(500, Math.min(920, window.innerWidth - 120)),
      height: Math.max(350, Math.min(680, window.innerHeight - 150)),
    },
  }
}

function parsePathSegments(path?: string[]): { section: string | null; slug: string | null } {
  if (!path || path.length === 0) return { section: null, slug: null }
  const section = path[0]
  const slug = path.length > 1 ? path.slice(1).join('/') : null
  return { section, slug }
}

interface HomeClientProps {
  socialLinks: SocialLink[]
  defaultScreenSaver: string
  defaultIdleTimeout: number
}

export default function HomeClient({ socialLinks, defaultScreenSaver, defaultIdleTimeout }: HomeClientProps) {
  const params = useParams<{ path?: string[] }>()
  const { section: initialSection, slug: initialSlug } = parsePathSegments(params.path as string[] | undefined)

  const isDeepLink = initialSection !== null
  const [phase, setPhase] = useState<'boot' | 'desktop'>(isDeepLink ? 'desktop' : 'boot')
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [sleeping, setSleeping] = useState(false)
  const [blogSlug, setBlogSlug] = useState<string | null>(initialSection === 'blog' ? initialSlug : null)
  const [learnSlug, setLearnSlug] = useState<string | null>(initialSection === 'learn' ? initialSlug : null)
  const [financeShareCode, setFinanceShareCode] = useState<string | null>(null)
  const suppressUrlSync = useRef(false)
  const closeGuardsRef = useRef<Record<string, (() => boolean) | null>>({})

  // Screen saver settings (localStorage-backed with server defaults)
  const [screenSaverId, setScreenSaverId] = useState(defaultScreenSaver)
  const [idleTimeout, setIdleTimeout] = useState(defaultIdleTimeout)

  useEffect(() => {
    const savedId = localStorage.getItem('screenSaver.id')
    const savedTimeout = localStorage.getItem('screenSaver.timeout')
    if (savedId) setScreenSaverId(savedId)
    if (savedTimeout) setIdleTimeout(parseInt(savedTimeout, 10))
  }, [])

  const updateScreenSaverSettings = useCallback((id: string, timeout: number) => {
    setScreenSaverId(id)
    setIdleTimeout(timeout)
    localStorage.setItem('screenSaver.id', id)
    localStorage.setItem('screenSaver.timeout', String(timeout))
  }, [])

  const handleSleep = useCallback(() => {
    setStartMenuOpen(false)
    setSleeping(true)
  }, [])

  const handleWake = useCallback(() => {
    setSleeping(false)
  }, [])

  useIdleTimer(idleTimeout * 1000, handleSleep, phase === 'desktop' && !sleeping)

  const { windows, openWindow, closeWindow, focusWindow, minimizeWindow, toggleMaximize, updateWindowGeometry } = useWindowManager()

  // Open initial window from URL on mount, restoring cookie-saved windows
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    suppressUrlSync.current = true

    // Restore previously open windows from cookie with saved geometry
    const saved = getOpenWindows()
    for (const s of saved) {
      if (WINDOW_TITLES[s.id]) {
        openWindow(s.id, WINDOW_TITLES[s.id], {
          position: { x: s.x, y: s.y },
          size: { width: s.w, height: s.h },
          isMaximized: s.max,
        })
      }
    }

    // Capture a finance share code (?s=...) before opening windows
    const shareCode = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('s')
      : null
    if (shareCode) setFinanceShareCode(shareCode)

    // Open URL-specified window last so it gets highest z-index
    if (initialSection && WINDOW_TITLES[initialSection]) {
      let geometry: { size: { width: number; height: number } } | undefined
      if (initialSection === 'finance') {
        geometry = { size: { width: 800, height: 640 } }
      } else if (initialSection === 'learn' || (initialSection === 'blog' && initialSlug)) {
        // Deep links to courseware or straight to a post get a reading-sized window
        geometry = readingGeometry()
      }
      openWindow(initialSection, WINDOW_TITLES[initialSection], geometry)
    } else if (shareCode) {
      openWindow('finance', WINDOW_TITLES['finance'], { size: { width: 800, height: 640 } })
    }

    requestAnimationFrame(() => { suppressUrlSync.current = false })
  }, [initialSection, openWindow])

  // Sync open window IDs to cookie whenever windows change
  useEffect(() => {
    if (!initializedRef.current) return
    setOpenWindows(windows.map(w => ({
      id: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.size.width,
      h: w.size.height,
      max: w.isMaximized || undefined,
    })))
  }, [windows])

  const syncUrl = useCallback((windowId?: string, slug?: string | null) => {
    if (suppressUrlSync.current) return
    if (windowId && (ROUTABLE_SECTIONS as readonly string[]).includes(windowId)) {
      const path = slug ? `/${windowId}/${slug}` : `/${windowId}`
      window.history.pushState(null, '', path)
    }
  }, [])

  const handleOpenWindow = useCallback((id: string) => {
    const title = WINDOW_TITLES[id] || id
    const geometry = id === 'finance'
      ? { size: { width: 800, height: 640 } }
      : id === 'learn' ? readingGeometry() : undefined
    openWindow(id, title, geometry)
    if (id !== 'blog') setBlogSlug(null)
    syncUrl(id, id === 'learn' ? learnSlug : undefined)
  }, [openWindow, syncUrl, learnSlug])

  const doCloseWindow = useCallback((id: string) => {
    closeWindow(id)
    if ((ROUTABLE_SECTIONS as readonly string[]).includes(id)) {
      const remaining = windows.filter(w => w.id !== id && (ROUTABLE_SECTIONS as readonly string[]).includes(w.id))
      if (remaining.length > 0) {
        const topWindow = remaining.reduce((a, b) => a.zIndex > b.zIndex ? a : b)
        window.history.pushState(null, '', `/${topWindow.id}`)
      } else {
        window.history.pushState(null, '', '/')
      }
    }
    if (id === 'blog') setBlogSlug(null)
    if (id === 'learn') setLearnSlug(null)
  }, [closeWindow, windows])

  // A window's content can register a guard (e.g. unsaved changes) that intercepts the close.
  const handleCloseWindow = useCallback((id: string) => {
    const guard = closeGuardsRef.current[id]
    if (guard && guard()) return
    doCloseWindow(id)
  }, [doCloseWindow])

  const registerFinanceCloseGuard = useCallback((guard: (() => boolean) | null) => {
    closeGuardsRef.current['finance'] = guard
  }, [])

  const closeFinance = useCallback(() => doCloseWindow('finance'), [doCloseWindow])

  const handleFocusWindow = useCallback((id: string) => {
    focusWindow(id)
    if (id === 'blog') {
      syncUrl(id, blogSlug)
    } else if (id === 'learn') {
      syncUrl(id, learnSlug)
    } else {
      syncUrl(id)
    }
  }, [focusWindow, syncUrl, blogSlug, learnSlug])

  const handleBlogNavigate = useCallback((slug: string | null) => {
    setBlogSlug(slug)
    const path = slug ? `/blog/${slug}` : '/blog'
    window.history.replaceState(null, '', path)
  }, [])

  const handleLearnNavigate = useCallback((slug: string | null) => {
    setLearnSlug(slug)
    const path = slug ? `/learn/${slug}` : '/learn'
    window.history.replaceState(null, '', path)
  }, [])

  const handleTaskbarWindowClick = useCallback((id: string) => {
    const win = windows.find(w => w.id === id)
    if (!win) return

    if (win.isMinimized) {
      openWindow(id, win.title)
    } else {
      const maxZ = Math.max(...windows.map(w => w.zIndex))
      if (win.zIndex === maxZ) {
        minimizeWindow(id)
      } else {
        focusWindow(id)
      }
    }
  }, [windows, openWindow, minimizeWindow, focusWindow])

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const pathSegments = window.location.pathname.split('/').filter(Boolean)
      const { section, slug } = parsePathSegments(pathSegments.length > 0 ? pathSegments : undefined)

      suppressUrlSync.current = true

      if (!section) {
        ROUTABLE_SECTIONS.forEach(s => closeWindow(s))
        setBlogSlug(null)
      } else if (WINDOW_TITLES[section]) {
        openWindow(section, WINDOW_TITLES[section])
        if (section === 'blog') {
          setBlogSlug(slug)
        } else if (section === 'learn') {
          setLearnSlug(slug)
        }
      }

      requestAnimationFrame(() => { suppressUrlSync.current = false })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [openWindow, closeWindow])

  function getWindowContent(id: string) {
    switch (id) {
      case 'blog': return <BlogList initialSlug={blogSlug} onNavigate={handleBlogNavigate} />
      case 'learn': return <CoursewareShell slug={learnSlug} onNavigate={handleLearnNavigate} />
      case 'resume': return <ResumeViewer />
      case 'research': return <ScholarFeed />
      case 'about': return <AboutContent />
      case 'finance': return (
        <FinancePlanner
          initialCode={financeShareCode}
          onClose={closeFinance}
          registerCloseGuard={registerFinanceCloseGuard}
        />
      )
      case 'display-properties': return (
        <DisplayProperties
          currentScreenSaver={screenSaverId}
          currentTimeout={idleTimeout}
          onApply={updateScreenSaverSettings}
          onPreview={(id) => { setScreenSaverId(id); handleSleep(); }}
          onClose={() => handleCloseWindow('display-properties')}
        />
      )
      default: return (
        <div className="p-4">
          <h2 className="text-lg font-bold">{id}</h2>
          <p className="text-gray-600 mt-2">Content coming soon.</p>
        </div>
      )
    }
  }

  return (
    <CRTFrame>
      {phase === 'boot' && (
        <BootSequence onComplete={() => setPhase('desktop')} />
      )}
      {phase === 'desktop' && (
        <div className="w-full h-full relative" onClick={() => startMenuOpen && setStartMenuOpen(false)}>
          <Desktop onOpenWindow={handleOpenWindow} onOpenDisplayProperties={() => handleOpenWindow('display-properties')} socialLinks={socialLinks} />
          <div className="absolute inset-0 bottom-9" style={{ overflow: 'hidden', pointerEvents: 'none' }}>
            {windows.map(w => (
              <Window
                key={w.id}
                state={w}
                onClose={() => handleCloseWindow(w.id)}
                onFocus={() => handleFocusWindow(w.id)}
                onMinimize={() => minimizeWindow(w.id)}
                onToggleMaximize={() => toggleMaximize(w.id)}
                onUpdateGeometry={(pos, size) => updateWindowGeometry(w.id, pos, size)}
              >
                {getWindowContent(w.id)}
              </Window>
            ))}
          </div>
          <StartMenu
            isOpen={startMenuOpen}
            onClose={() => setStartMenuOpen(false)}
            onNavigate={handleOpenWindow}
            onSleep={handleSleep}
            socialLinks={socialLinks}
          />
          <Taskbar
            windows={windows}
            onStartClick={() => setStartMenuOpen(prev => !prev)}
            onWindowClick={handleTaskbarWindowClick}
            startMenuOpen={startMenuOpen}
          />
        </div>
      )}
      <SleepOverlay isActive={sleeping} screenSaverId={screenSaverId} onWake={handleWake} />
    </CRTFrame>
  )
}
