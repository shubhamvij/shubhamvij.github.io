'use client'
import { useEffect, useState } from 'react'
import s from './learn.module.css'

const CAPTIONS = [
  'Loading multimedia database…',
  'Initializing knowledge engine…',
  'Indexing course references…',
]

function CdGlyph() {
  return (
    <svg className={s.cdGlyph} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#c8d8e8" stroke="#7a92aa" strokeWidth="1" />
      <circle cx="8" cy="8" r="2" fill="#000" stroke="#7a92aa" strokeWidth="1" />
      <path d="M8 1 A7 7 0 0 1 15 8" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

function Globe() {
  return (
    <svg className={s.splashGlobe} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="34" fill="#16205e" stroke="#8cacf8" strokeWidth="2" />
      <ellipse cx="48" cy="48" rx="34" ry="13" fill="none" stroke="#5a7ce0" strokeWidth="1" />
      <ellipse cx="48" cy="48" rx="13" ry="34" fill="none" stroke="#5a7ce0" strokeWidth="1" />
      <ellipse cx="48" cy="48" rx="25" ry="34" fill="none" stroke="#3a54b0" strokeWidth="1" />
      <line x1="14" y1="48" x2="82" y2="48" stroke="#5a7ce0" strokeWidth="1" />
      <ellipse cx="48" cy="52" rx="45" ry="10" fill="none" stroke="#d8b64a" strokeWidth="2" transform="rotate(-18 48 52)" />
      <circle cx="30" cy="36" r="3" fill="#f0d98c" />
      <circle cx="62" cy="58" r="2.4" fill="#f0d98c" />
      <circle cx="54" cy="30" r="2" fill="#f0d98c" />
      <line x1="30" y1="36" x2="54" y2="30" stroke="#f0d98c" strokeWidth="0.8" />
      <line x1="54" y1="30" x2="62" y2="58" stroke="#f0d98c" strokeWidth="0.8" />
      <line x1="30" y1="36" x2="62" y2="58" stroke="#f0d98c" strokeWidth="0.8" />
    </svg>
  )
}

export default function BootSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'insert' | 'splash'>('insert')
  const [caption, setCaption] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('splash'), 950),
      setTimeout(() => setCaption(1), 1900),
      setTimeout(() => setCaption(2), 2750),
      setTimeout(onDone, 3500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  if (phase === 'insert') {
    return (
      <div
        className={s.bootScreen}
        role="button"
        tabIndex={0}
        aria-label="Skip intro"
        onClick={onDone}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDone() }}
      >
        <div className={s.bootLine}>D:\&gt; autorun.exe</div>
        <div className={s.bootLine}>VIJCARTA &apos;26 Multimedia System — CD-ROM detected</div>
        <div className={s.bootLine}>Reading disc <CdGlyph /> please wait&hellip;<span className={s.blinkCursor} /></div>
      </div>
    )
  }

  return (
    <div
      className={s.splash}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onClick={onDone}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDone() }}
    >
      <Globe />
      <div className={s.wordmark}>VIJCARTA</div>
      <div className={s.wordmarkRule} />
      <div className={s.tagline}>Interactive Courseware Library</div>
      <div className={s.edition}>2026 EDITION</div>
      <div className={s.loadBox}>
        <div className={s.loadTrack}>
          <div className={s.loadFill} />
        </div>
        <div className={s.loadCaption}>{CAPTIONS[caption]}</div>
      </div>
      <span className={s.splashSmallPrint}>© 2026 Shubham Vij Multimedia. All rights reserved.</span>
      <span className={s.skipHint}>Click anywhere to skip</span>
    </div>
  )
}
