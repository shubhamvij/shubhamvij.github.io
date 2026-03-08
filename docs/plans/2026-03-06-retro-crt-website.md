# Retro CRT Personal Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build shubhamvij.com as a retro CRT computer that boots into a Windows XP desktop with draggable windows, a blog, resume viewer, and Google Scholar integration.

**Architecture:** Next.js 14+ App Router with a single-page desktop experience. The page orchestrates a boot sequence (terminal animation), then renders an XP desktop with draggable/resizable windows via react-rnd. Blog content lives as markdown files read at build time. Scholar data is fetched client-side via a proxy API route.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, react-rnd, Framer Motion, gray-matter, next-mdx-remote, cheerio, axios

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**
```bash
cd /Users/shubhamvij/Developer/shubhamvij_com
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Accept defaults. This creates the full scaffold.

**Step 2: Install dependencies**
```bash
npm install react-rnd framer-motion gray-matter next-mdx-remote axios cheerio
npm install -D @types/cheerio
```

**Step 3: Verify dev server runs**
```bash
npm run dev
```
Expected: Site loads at localhost:3000 with default Next.js page.

**Step 4: Clean up defaults**
- Remove default content from `src/app/page.tsx` — replace with a simple `<main>shubhamvij.com</main>`
- Remove default styles from `src/app/globals.css` except Tailwind directives

**Step 5: Create content and asset directories**
```bash
mkdir -p content/blog public/images/icons src/components src/lib src/styles
```

**Step 6: Add placeholder assets**
- Copy the CRT computer image to `public/images/crt-frame.png`
- Download or create an XP Bliss wallpaper to `public/images/xp-bliss.jpg`

**Step 7: Commit**
```bash
git init && git add -A && git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: CRT Frame & Boot Sequence

**Files:**
- Create: `src/components/BootSequence.tsx`, `src/components/CRTFrame.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create CRTFrame component**

`src/components/CRTFrame.tsx` — A full-viewport container that shows the CRT computer image with a "screen area" positioned over the monitor's display. Uses CSS to position a child container exactly where the screen is on the CRT image.

```tsx
'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CRTFrameProps {
  children: ReactNode
  showFrame: boolean // true = show full CRT, false = zoomed into screen
}

export default function CRTFrame({ children, showFrame }: CRTFrameProps) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <motion.div
        className="relative"
        animate={showFrame ? {
          scale: 1,
          borderRadius: '0px',
        } : {
          scale: 2.8,
          borderRadius: '0px',
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      >
        {/* CRT monitor image */}
        <img
          src="/images/crt-frame.png"
          alt="CRT Monitor"
          className="w-[80vmin] h-auto pointer-events-none select-none"
        />
        {/* Screen area overlay — positioned to match the monitor's display */}
        <div className="absolute"
          style={{
            top: '8%',
            left: '14%',
            width: '72%',
            height: '62%',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
```

> **Note:** The `top/left/width/height` percentages will need fine-tuning to match the actual CRT image. Adjust after seeing the result.

**Step 2: Create BootSequence component**

`src/components/BootSequence.tsx` — Green terminal text that types out line by line, then calls `onComplete` when done.

```tsx
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

  useEffect(() => {
    if (done) {
      const timer = setTimeout(onComplete, 500)
      return () => clearTimeout(timer)
    }
  }, [done, onComplete])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="w-full h-full bg-black p-4 font-mono text-sm"
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 3: Wire up in page.tsx**

`src/app/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import CRTFrame from '@/components/CRTFrame'
import BootSequence from '@/components/BootSequence'

export default function Home() {
  const [phase, setPhase] = useState<'boot' | 'desktop'>('boot')

  return (
    <CRTFrame showFrame={phase === 'boot'}>
      {phase === 'boot' && (
        <BootSequence onComplete={() => setPhase('desktop')} />
      )}
      {phase === 'desktop' && (
        <div className="w-full h-full bg-blue-400 flex items-center justify-center text-white">
          Desktop placeholder
        </div>
      )}
    </CRTFrame>
  )
}
```

**Step 4: Verify**
```bash
npm run dev
```
Expected: CRT image loads → green text types out → fades → zooms into screen → "Desktop placeholder" shows.

**Step 5: Commit**
```bash
git add src/components/BootSequence.tsx src/components/CRTFrame.tsx src/app/page.tsx
git commit -m "feat: add CRT frame and terminal boot sequence animation"
```

---

## Task 3: CRT Visual Effects

**Files:**
- Create: `src/styles/crt-effects.css`
- Modify: `src/app/globals.css`, `src/components/CRTFrame.tsx`

**Step 1: Create CRT effects stylesheet**

`src/styles/crt-effects.css`:
```css
/* Scanlines overlay */
.crt-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 50;
}

/* Vignette effect */
.crt-vignette::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
  z-index: 50;
}

/* Subtle screen glow */
.crt-glow {
  box-shadow: inset 0 0 60px rgba(0, 255, 0, 0.05),
              inset 0 0 20px rgba(0, 255, 0, 0.03);
}
```

**Step 2: Import in globals.css**
Add to `src/app/globals.css`:
```css
@import '../styles/crt-effects.css';
```

**Step 3: Apply effects to CRTFrame screen area**
Add `crt-scanlines crt-vignette crt-glow` classes to the screen area `<div>` in `CRTFrame.tsx`.

**Step 4: Verify**
Expected: Subtle horizontal scanlines visible, slight darkening at edges, faint green glow.

**Step 5: Commit**
```bash
git add src/styles/crt-effects.css src/app/globals.css src/components/CRTFrame.tsx
git commit -m "feat: add CRT scanline, vignette, and glow effects"
```

---

## Task 4: Desktop Environment

**Files:**
- Create: `src/components/Desktop.tsx`, `src/components/DesktopIcon.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create DesktopIcon component**

`src/components/DesktopIcon.tsx`:
```tsx
'use client'

interface DesktopIconProps {
  icon: string       // path to icon image or emoji placeholder
  label: string
  onDoubleClick: () => void
}

export default function DesktopIcon({ icon, label, onDoubleClick }: DesktopIconProps) {
  return (
    <button
      className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/20 w-20 group"
      onDoubleClick={onDoubleClick}
    >
      <img src={icon} alt={label} className="w-10 h-10 pixelated" draggable={false} />
      <span className="text-white text-xs text-center font-['Tahoma',sans-serif] drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)] leading-tight select-none">
        {label}
      </span>
    </button>
  )
}
```

**Step 2: Create Desktop component**

`src/components/Desktop.tsx`:
```tsx
'use client'
import DesktopIcon from './DesktopIcon'

interface DesktopProps {
  onOpenWindow: (id: string) => void
}

const DESKTOP_ICONS = [
  { id: 'blog', label: 'Blog', icon: '/images/icons/notepad.png' },
  { id: 'resume', label: 'Resume', icon: '/images/icons/resume.png' },
  { id: 'research', label: 'Research', icon: '/images/icons/research.png' },
  { id: 'github', label: 'GitHub', icon: '/images/icons/github.png', href: 'https://github.com/shubhamvij' },
  { id: 'linkedin', label: 'LinkedIn', icon: '/images/icons/linkedin.png', href: 'https://linkedin.com/in/shubhamvij' },
  { id: 'email', label: 'Email', icon: '/images/icons/email.png', href: 'mailto:your@email.com' },
]

export default function Desktop({ onOpenWindow }: DesktopProps) {
  const handleDoubleClick = (icon: typeof DESKTOP_ICONS[0]) => {
    if ('href' in icon && icon.href) {
      window.open(icon.href, '_blank')
    } else {
      onOpenWindow(icon.id)
    }
  }

  return (
    <div
      className="w-full h-full bg-cover bg-center relative"
      style={{ backgroundImage: "url('/images/xp-bliss.jpg')" }}
    >
      <div className="grid grid-cols-1 gap-1 p-2 content-start absolute top-0 left-0 bottom-12">
        {DESKTOP_ICONS.map(icon => (
          <DesktopIcon
            key={icon.id}
            icon={icon.icon}
            label={icon.label}
            onDoubleClick={() => handleDoubleClick(icon)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Update page.tsx** to render Desktop instead of placeholder when `phase === 'desktop'`.

**Step 4: Create placeholder icon images**
For now, create simple colored square SVGs or PNGs in `public/images/icons/` as placeholders. We'll replace with pixel-art later. Alternatively, use emoji-based fallbacks until real icons are ready.

**Step 5: Verify**
Expected: After boot, XP Bliss wallpaper shows with desktop icons in a column on the left. Double-clicking external link icons opens new tabs.

**Step 6: Commit**
```bash
git add src/components/Desktop.tsx src/components/DesktopIcon.tsx src/app/page.tsx public/images/
git commit -m "feat: add desktop environment with icons and XP bliss wallpaper"
```

---

## Task 5: Window System

**Files:**
- Create: `src/components/Window.tsx`, `src/lib/useWindowManager.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create window manager hook**

`src/lib/useWindowManager.ts` — Manages open windows, focus order (z-index), minimize/maximize state.

```tsx
'use client'
import { useState, useCallback } from 'react'

export interface WindowState {
  id: string
  title: string
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  defaultPosition: { x: number; y: number }
  defaultSize: { width: number; height: number }
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [topZ, setTopZ] = useState(10)

  const openWindow = useCallback((id: string, title: string) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id)
      if (existing) {
        // Focus existing window, unminimize
        return prev.map(w =>
          w.id === id
            ? { ...w, isMinimized: false, zIndex: topZ + 1 }
            : w
        )
      }
      return [...prev, {
        id,
        title,
        isMinimized: false,
        isMaximized: false,
        zIndex: topZ + 1,
        defaultPosition: { x: 50 + prev.length * 30, y: 30 + prev.length * 30 },
        defaultSize: { width: 500, height: 350 },
      }]
    })
    setTopZ(z => z + 1)
  }, [topZ])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const focusWindow = useCallback((id: string) => {
    setTopZ(z => {
      setWindows(prev =>
        prev.map(w => w.id === id ? { ...w, zIndex: z + 1 } : w)
      )
      return z + 1
    })
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isMinimized: true } : w)
    )
  }, [])

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)
    )
  }, [])

  return { windows, openWindow, closeWindow, focusWindow, minimizeWindow, toggleMaximize }
}
```

**Step 2: Create Window component**

`src/components/Window.tsx` — Uses `react-rnd` for drag/resize. XP-style title bar with close/minimize/maximize buttons.

```tsx
'use client'
import { Rnd } from 'react-rnd'
import { ReactNode, useRef } from 'react'
import type { WindowState } from '@/lib/useWindowManager'

interface WindowProps {
  state: WindowState
  onClose: () => void
  onFocus: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
  children: ReactNode
  parentBounds: { width: number; height: number }
}

export default function Window({
  state, onClose, onFocus, onMinimize, onToggleMaximize, children, parentBounds
}: WindowProps) {
  if (state.isMinimized) return null

  const position = state.isMaximized
    ? { x: 0, y: 0 }
    : state.defaultPosition

  const size = state.isMaximized
    ? { width: parentBounds.width, height: parentBounds.height - 36 }
    : state.defaultSize

  return (
    <Rnd
      default={{
        ...state.defaultPosition,
        ...state.defaultSize,
      }}
      position={state.isMaximized ? position : undefined}
      size={state.isMaximized ? size : undefined}
      minWidth={250}
      minHeight={150}
      bounds="parent"
      dragHandleClassName="window-title-bar"
      style={{ zIndex: state.zIndex }}
      onMouseDown={onFocus}
      disableDragging={state.isMaximized}
      enableResizing={!state.isMaximized}
    >
      <div className="flex flex-col w-full h-full rounded-t-lg overflow-hidden shadow-xl border border-blue-800">
        {/* XP Title Bar */}
        <div
          className="window-title-bar flex items-center justify-between px-2 py-1 cursor-move select-none"
          style={{
            background: 'linear-gradient(180deg, #0a246a 0%, #3a6ea5 8%, #4a86c8 40%, #3a6ea5 88%, #0a246a 93%, #0a246a 100%)',
          }}
          onDoubleClick={onToggleMaximize}
        >
          <span className="text-white text-xs font-bold font-['Tahoma',sans-serif] truncate">
            {state.title}
          </span>
          <div className="flex gap-0.5 ml-2 shrink-0">
            <button
              onClick={onMinimize}
              className="w-5 h-5 rounded-sm text-xs font-bold text-black flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, #fff 0%, #c0c0c0 100%)' }}
            >_</button>
            <button
              onClick={onToggleMaximize}
              className="w-5 h-5 rounded-sm text-xs font-bold text-black flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, #fff 0%, #c0c0c0 100%)' }}
            >&#9633;</button>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-sm text-xs font-bold text-white flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, #e08040 0%, #c03020 100%)' }}
            >&times;</button>
          </div>
        </div>
        {/* Window content */}
        <div className="flex-1 bg-white overflow-auto">
          {children}
        </div>
      </div>
    </Rnd>
  )
}
```

**Step 3: Integrate into page.tsx**

Update `page.tsx` to use `useWindowManager` and render `Window` components on the desktop. Map window IDs to content components (placeholder `<div>`s for now).

**Step 4: Verify**
Expected: Double-clicking a desktop icon opens a draggable/resizable XP-style window. Title bar is blue gradient. Close/minimize/maximize buttons work. Multiple windows stack with correct z-index.

**Step 5: Commit**
```bash
git add src/components/Window.tsx src/lib/useWindowManager.ts src/app/page.tsx
git commit -m "feat: add draggable/resizable XP-style window system"
```

---

## Task 6: Taskbar & Start Menu

**Files:**
- Create: `src/components/Taskbar.tsx`, `src/components/StartMenu.tsx`
- Modify: `src/components/Desktop.tsx`

**Step 1: Create Taskbar component**

`src/components/Taskbar.tsx` — Bottom bar with Start button, open window tabs, and a clock.

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { WindowState } from '@/lib/useWindowManager'

interface TaskbarProps {
  windows: WindowState[]
  onStartClick: () => void
  onWindowClick: (id: string) => void
  startMenuOpen: boolean
}

export default function Taskbar({ windows, onStartClick, onWindowClick, startMenuOpen }: TaskbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-9 flex items-center px-1 z-[9999]"
      style={{
        background: 'linear-gradient(180deg, #245edb 0%, #3f8cf3 2%, #245edb 4%, #1941a5 95%, #1941a5 100%)',
      }}
    >
      {/* Start Button */}
      <button
        onClick={onStartClick}
        className="flex items-center gap-1 h-7 px-3 rounded-sm text-white text-sm font-bold font-['Tahoma',sans-serif] shrink-0"
        style={{
          background: startMenuOpen
            ? 'linear-gradient(180deg, #1a6a1a 0%, #2d8e2d 50%, #1a6a1a 100%)'
            : 'linear-gradient(180deg, #22b522 0%, #3ec93e 8%, #1da41d 93%, #1a8c1a 100%)',
        }}
      >
        Start
      </button>

      {/* Window tabs */}
      <div className="flex-1 flex items-center gap-1 mx-2 overflow-hidden">
        {windows.map(w => (
          <button
            key={w.id}
            onClick={() => onWindowClick(w.id)}
            className={`h-6 px-3 text-xs text-white font-['Tahoma',sans-serif] rounded-sm truncate max-w-[150px] ${
              w.isMinimized ? 'bg-blue-800/50' : 'bg-blue-700/80'
            }`}
          >
            {w.title}
          </button>
        ))}
      </div>

      {/* Clock */}
      <div className="text-white text-xs font-['Tahoma',sans-serif] px-2 shrink-0">
        {time}
      </div>
    </div>
  )
}
```

**Step 2: Create StartMenu component**

`src/components/StartMenu.tsx`:
```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (id: string) => void
}

const MENU_ITEMS = [
  { id: 'about', label: 'About Me', icon: '/images/icons/about.png' },
  { id: 'blog', label: 'Blog', icon: '/images/icons/notepad.png' },
  { id: 'resume', label: 'Resume', icon: '/images/icons/resume.png' },
  { id: 'research', label: 'Research', icon: '/images/icons/research.png' },
]

const SOCIAL_ITEMS = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/shubhamvij' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/shubhamvij' },
  { id: 'email', label: 'Email', href: 'mailto:your@email.com' },
]

export default function StartMenu({ isOpen, onClose, onNavigate }: StartMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-10 left-1 z-[10000] w-72 rounded-t-lg overflow-hidden shadow-2xl border border-blue-800"
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center gap-2"
            style={{ background: 'linear-gradient(180deg, #245edb 0%, #1941a5 100%)' }}
          >
            <div className="w-10 h-10 rounded-full bg-white/20" />
            <span className="text-white font-bold font-['Tahoma',sans-serif] text-sm">Shubham Vij</span>
          </div>

          {/* Body */}
          <div className="flex bg-white">
            {/* Left column — pages */}
            <div className="flex-1 py-1 border-r border-gray-200">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white text-sm font-['Tahoma',sans-serif] text-left"
                >
                  <img src={item.icon} alt="" className="w-6 h-6" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right column — social */}
            <div className="w-28 py-1 bg-blue-50">
              {SOCIAL_ITEMS.map(item => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-1.5 hover:bg-blue-600 hover:text-white text-xs font-['Tahoma',sans-serif]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Footer — Shut Down */}
          <div className="bg-gray-100 border-t border-gray-300 px-3 py-1.5">
            <button className="text-xs font-['Tahoma',sans-serif] text-gray-600 hover:text-red-600">
              Shut Down
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 3: Integrate Taskbar and StartMenu into Desktop**
Add them to `Desktop.tsx`. Taskbar is absolutely positioned at the bottom. StartMenu toggles on Start button click. Click outside closes the menu.

**Step 4: Verify**
Expected: Taskbar at bottom with green Start button and clock. Open windows show as tabs. Start menu opens with navigation items. Clicking items opens windows or external links.

**Step 5: Commit**
```bash
git add src/components/Taskbar.tsx src/components/StartMenu.tsx src/components/Desktop.tsx
git commit -m "feat: add XP taskbar with Start menu navigation"
```

---

## Task 7: Blog System

**Files:**
- Create: `src/lib/blog.ts`, `src/components/BlogList.tsx`, `src/components/BlogPost.tsx`, `content/blog/hello-world.md`
- Modify: `src/app/page.tsx` (add blog window content mapping)

**Step 1: Create sample blog post**

`content/blog/hello-world.md`:
```markdown
---
title: "Hello World"
date: "2026-03-06"
description: "Welcome to my retro blog."
tags: ["intro", "meta"]
---

# Hello World

Welcome to my blog! This runs inside a Windows XP window on a CRT monitor. How cool is that?

## What to expect

I'll write about software engineering, research, and whatever else comes to mind.

```javascript
console.log("Hello from the CRT!");
```
```

**Step 2: Create blog utility functions**

`src/lib/blog.ts`:
```tsx
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  description: string
  tags?: string[]
}

export function getAllPosts(): BlogPostMeta[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '')
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data } = matter(content)
    return { slug, ...data } as BlogPostMeta
  })
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): { meta: BlogPostMeta; content: string } {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  return { meta: { slug, ...data } as BlogPostMeta, content }
}
```

**Step 3: Create API route for blog data** (since we're in a client-side SPA context)

`src/app/api/blog/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/blog'

export async function GET() {
  const posts = getAllPosts()
  return NextResponse.json(posts)
}
```

`src/app/api/blog/[slug]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { getPostBySlug } from '@/lib/blog'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const post = getPostBySlug(params.slug)
    return NextResponse.json(post)
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
}
```

**Step 4: Create BlogList and BlogPost components**

`src/components/BlogList.tsx` — Fetches post list, renders clickable items.
`src/components/BlogPost.tsx` — Fetches single post markdown, renders with `next-mdx-remote` (client-side).

**Step 5: Map window ID `'blog'` to BlogList content in page.tsx**

**Step 6: Verify**
Add a second `.md` file to `content/blog/`. Restart dev server. Open Blog window — both posts appear. Click a post — renders markdown beautifully.

**Step 7: Commit**
```bash
git add src/lib/blog.ts src/components/BlogList.tsx src/components/BlogPost.tsx src/app/api/blog/ content/blog/
git commit -m "feat: add blog system with markdown rendering"
```

---

## Task 8: Resume Viewer

**Files:**
- Create: `src/components/ResumeViewer.tsx`
- Add: `public/resume.pdf`

**Step 1: Create ResumeViewer component**

`src/components/ResumeViewer.tsx`:
```tsx
'use client'

export default function ResumeViewer() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-sm font-['Tahoma',sans-serif]">Resume - Shubham Vij</span>
        <a
          href="/resume.pdf"
          download
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-['Tahoma',sans-serif]"
        >
          Download PDF
        </a>
      </div>
      <iframe
        src="/resume.pdf"
        className="flex-1 w-full"
        title="Resume"
      />
    </div>
  )
}
```

**Step 2: Add placeholder PDF** — Place a real or placeholder `resume.pdf` in `public/`.

**Step 3: Map window ID `'resume'` to ResumeViewer in page.tsx**

**Step 4: Verify**
Expected: Resume window shows embedded PDF with download button.

**Step 5: Commit**
```bash
git add src/components/ResumeViewer.tsx public/resume.pdf src/app/page.tsx
git commit -m "feat: add resume viewer with PDF embed and download"
```

---

## Task 9: Google Scholar Integration

**Files:**
- Create: `src/app/api/scholar/route.ts`, `src/lib/scholar.ts`, `src/components/ScholarFeed.tsx`

**Step 1: Create scholar scraping utility**

`src/lib/scholar.ts`:
```tsx
import axios from 'axios'
import * as cheerio from 'cheerio'

const SCHOLAR_URL = 'https://scholar.google.com/citations?user=Z6f8FFYAAAAJ&hl=en'

export interface ScholarPublication {
  title: string
  authors: string
  venue: string
  year: string
  citations: string
  link: string
}

export async function fetchScholarData(): Promise<ScholarPublication[]> {
  const { data } = await axios.get(SCHOLAR_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const $ = cheerio.load(data)
  const publications: ScholarPublication[] = []

  $('#gsc_a_b .gsc_a_tr').each((_, el) => {
    const titleEl = $(el).find('.gsc_a_t a')
    const title = titleEl.text()
    const link = 'https://scholar.google.com' + titleEl.attr('href')
    const grayTexts = $(el).find('.gs_gray')
    const authors = grayTexts.eq(0).text()
    const venue = grayTexts.eq(1).text()
    const year = $(el).find('.gsc_a_y span').text()
    const citations = $(el).find('.gsc_a_c a').text()

    if (title) {
      publications.push({ title, authors, venue, year, citations, link })
    }
  })

  return publications
}
```

**Step 2: Create API route**

`src/app/api/scholar/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { fetchScholarData } from '@/lib/scholar'

export async function GET() {
  try {
    const publications = await fetchScholarData()
    return NextResponse.json(publications)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scholar data' }, { status: 500 })
  }
}
```

**Step 3: Create ScholarFeed component**

`src/components/ScholarFeed.tsx` — Fetches from `/api/scholar`, renders publications list with title, authors, venue, year, citation count, and link.

**Step 4: Map window ID `'research'` to ScholarFeed in page.tsx**

**Step 5: Verify**
```bash
curl http://localhost:3000/api/scholar
```
Expected: JSON array of publications. Research window renders them in a styled list.

**Step 6: Commit**
```bash
git add src/lib/scholar.ts src/app/api/scholar/ src/components/ScholarFeed.tsx src/app/page.tsx
git commit -m "feat: add Google Scholar integration with proxy API"
```

---

## Task 10: About Page

**Files:**
- Create: `src/components/AboutContent.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create About component** with a brief bio, photo, and links. Styled to look like an XP "System Properties"-style dialog.

**Step 2: Map window ID `'about'` to AboutContent in page.tsx**

**Step 3: Commit**
```bash
git add src/components/AboutContent.tsx src/app/page.tsx
git commit -m "feat: add About Me window content"
```

---

## Task 11: Mobile Responsive Layout

**Files:**
- Modify: `src/components/Desktop.tsx`, `src/components/Window.tsx`, `src/components/CRTFrame.tsx`, `src/components/Taskbar.tsx`

**Step 1: CRTFrame mobile adaptation**
- On mobile (< 768px), hide the CRT monitor image frame and show content fullscreen
- Boot animation still plays but fills the screen

**Step 2: Desktop mobile adaptation**
- Hide desktop icons on mobile
- Navigation exclusively via Start menu
- Windows auto-maximize to fill screen (no drag/resize on mobile)

**Step 3: Taskbar mobile adaptation**
- Start button stays, clock stays
- Window tabs may need horizontal scrolling or be hidden

**Step 4: Verify on mobile viewport**
Use Chrome DevTools device toolbar to test iPhone/Android sizes.

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: add mobile responsive layout with simplified navigation"
```

---

## Task 12: Pixel Art Icons

**Files:**
- Create: SVG or PNG files in `public/images/icons/`

**Step 1: Create or source pixel-art icons**
Create simple 32x32 or 48x48 pixel-art style icons for:
- `notepad.png` — Notepad with pencil
- `resume.png` — Document with briefcase
- `research.png` — Microscope or beaker
- `email.png` — Envelope
- `github.png` — Pixel octocat
- `linkedin.png` — Pixel "in" badge
- `about.png` — User/person icon

Can use inline SVGs or generate with CSS if pixel art PNGs aren't available.

**Step 2: Add `image-rendering: pixelated` CSS** for crisp scaling of pixel art.

**Step 3: Commit**
```bash
git add public/images/icons/ && git commit -m "feat: add pixel-art XP-style desktop icons"
```

---

## Task 13: Polish & Final Touches

**Step 1:** Add XP-style font — Tahoma or MS Sans Serif via Google Fonts or local font file
**Step 2:** Add "Shut Down" Easter egg — shows XP shutdown dialog, then restarts boot sequence
**Step 3:** Add skip button on boot animation for repeat visitors (localStorage flag)
**Step 4:** Add `<title>` and meta tags for SEO in `layout.tsx`
**Step 5:** Verify all windows, navigation, blog, scholar sync work end-to-end
**Step 6:** Final commit
```bash
git add -A && git commit -m "feat: polish UI, add Easter eggs, and SEO meta tags"
```

---

## Task 14: GCP Deployment

**Step 1: Create Dockerfile**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 2: Update `next.config.ts`** to enable standalone output:
```ts
const nextConfig = { output: 'standalone' }
```

**Step 3: Deploy to Cloud Run**
```bash
gcloud run deploy shubhamvij-com --source . --region us-central1 --allow-unauthenticated
```

**Step 4: Verify production deployment**

**Step 5: Commit**
```bash
git add Dockerfile next.config.ts && git commit -m "chore: add Dockerfile and GCP Cloud Run deployment config"
```

---

## Verification Checklist

1. Dev server starts, CRT frame shows, boot animation plays, desktop renders
2. Desktop icons double-click to open draggable/resizable XP windows
3. Start menu opens/closes, navigates to all pages (About, Blog, Resume, Research)
4. Taskbar shows open windows, clicking tabs focuses/unminimizes windows
5. Blog: markdown files in `content/blog/` render beautifully with syntax highlighting
6. Adding a new `.md` file makes it appear in the blog list after rebuild
7. Resume: PDF displays in window with working download button
8. Research: Google Scholar publications load and display
9. Mobile: simplified layout with Start menu navigation, retro styling preserved
10. CRT effects (scanlines, vignette, glow) visible but not intrusive
11. Deployed to GCP Cloud Run and accessible via public URL
