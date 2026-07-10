'use client'
import { useRef, useState } from 'react'
import s from './course.module.css'
import type { CourseDefinition, CourseModule, LessonBlock } from './types'
import { useCourseProgress } from './progress'
import Quiz from './Quiz'

interface Props {
  course: CourseDefinition
  onBack?: () => void
  backLabel?: string
}

/** One row of the flattened reading order: a module or a subchapter with its context. */
interface FlatEntry {
  module: CourseModule
  /** Top-level index of this module (or of its parent, for subchapters). */
  topIndex: number
  parent?: CourseModule
  subIndex?: number
  subCount?: number
}

function flatten(modules: CourseModule[]): FlatEntry[] {
  const flat: FlatEntry[] = []
  modules.forEach((m, mi) => {
    flat.push({ module: m, topIndex: mi })
    m.subchapters?.forEach((sub, si) => {
      flat.push({ module: sub, topIndex: mi, parent: m, subIndex: si, subCount: m.subchapters!.length })
    })
  })
  return flat
}

export default function CourseShell({ course, onBack, backLabel = '← Back' }: Props) {
  const { progress, markModuleComplete, recordQuizAnswer, setLastModule, resetProgress } = useCourseProgress(course.storageKey)
  const [navChoice, setNavChoice] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const paneRef = useRef<HTMLDivElement>(null)

  const modules = course.modules
  const flat = flatten(modules)

  // Until the reader navigates, resume wherever they left off (falling back to module 1).
  const resumeId = progress.lastModuleId && flat.some(e => e.module.id === progress.lastModuleId)
    ? progress.lastModuleId
    : flat[0].module.id
  const activeId = navChoice ?? resumeId

  const activeIndex = flat.findIndex(e => e.module.id === activeId)
  const entry = flat[activeIndex]
  const active = entry.module
  const completedCount = flat.filter(e => progress.completedModules.includes(e.module.id)).length
  const pct = Math.round((completedCount / flat.length) * 100)
  const allDone = completedCount === flat.length

  const goTo = (id: string) => {
    setNavChoice(id)
    setLastModule(id)
    if (paneRef.current) paneRef.current.scrollTop = 0
  }

  const completeAndContinue = () => {
    markModuleComplete(active.id)
    if (activeIndex < flat.length - 1) {
      goTo(flat[activeIndex + 1].module.id)
    }
  }

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    resetProgress()
    setConfirmingReset(false)
    goTo(flat[0].module.id)
  }

  const renderBlock = (block: LessonBlock, i: number) => {
    switch (block.kind) {
      case 'prose':
        return <div key={i} className={s.prose}>{block.body}</div>
      case 'heading':
        return <h3 key={i} className={s.sectionHeading}>{block.text}</h3>
      case 'callout':
        return (
          <div key={i} className={s.callout}>
            <span className={s.calloutIcon}>{block.icon}</span>
            <span className={s.calloutBody}>
              <strong>{block.title}</strong>
              {block.body}
            </span>
          </div>
        )
      case 'widget': {
        const Widget = course.widgets[block.widget]
        return Widget ? <Widget key={i} /> : null
      }
      case 'quiz':
        return (
          <div key={i}>
            <h3 className={s.sectionHeading}>Check your understanding</h3>
            <Quiz
              questions={block.questions}
              savedAnswers={progress.quizAnswers}
              onCorrect={recordQuizAnswer}
            />
          </div>
        )
      case 'refs':
        return (
          <div key={i} className={s.refsBox}>
            <p className={s.refsHeading}>References & further reading</p>
            {block.items.map(item => (
              <div key={item.href} className={s.refItem}>
                <span className={s.refBullet}>▸</span>
                <span>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
                  {item.note && <span className={s.refNote}> — {item.note}</span>}
                </span>
              </div>
            ))}
          </div>
        )
    }
  }

  const sidebarItem = (e: FlatEntry) => {
    const m = e.module
    const isSub = e.parent !== undefined
    const isLastSub = isSub && e.subIndex === (e.subCount ?? 0) - 1
    return (
      <button
        key={m.id}
        type="button"
        className={[
          s.moduleItem,
          m.id === activeId ? s.moduleItemActive : '',
          isSub ? s.subModuleItem : '',
          isSub && !isLastSub ? s.subModuleItemMid : '',
        ].filter(Boolean).join(' ')}
        onClick={() => goTo(m.id)}
      >
        <span className={s.moduleTick}>{progress.completedModules.includes(m.id) ? '✓' : ''}</span>
        <span className={s.moduleLabel}>{m.navLabel}</span>
        <span className={s.moduleMinutes}>{m.minutes}m</span>
      </button>
    )
  }

  const kicker = entry.parent
    ? `Module ${entry.topIndex + 1} · Deep dive ${(entry.subIndex ?? 0) + 1} of ${entry.subCount} · ~${active.minutes} min`
    : `Module ${entry.topIndex + 1} of ${modules.length} · ~${active.minutes} min`

  return (
    <div className={s.guide}>
      <div className={s.toolbar}>
        {onBack && (
          <button type="button" className={s.backLink} onClick={onBack}>
            {backLabel}
          </button>
        )}
        <span className={s.toolbarTitle} title={course.tagline}>{course.title}</span>
        <span className={s.toolbarSpacer} />
        <span className={s.toolbarPct}>{pct}% complete</span>
        <div className={s.progressTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <button type="button" className={s.btn} aria-label="Reset progress" onClick={handleReset} onBlur={() => setConfirmingReset(false)}>
          {confirmingReset ? 'Sure?' : 'Reset'}
        </button>
      </div>

      <div className={s.narrowNav}>
        <select
          className={s.narrowSelect}
          value={activeId}
          onChange={e => goTo(e.target.value)}
          aria-label="Jump to module"
        >
          {flat.map(e => (
            <option key={e.module.id} value={e.module.id}>
              {progress.completedModules.includes(e.module.id) ? '✓ ' : ''}
              {e.parent ? `   └ ${e.module.navLabel}` : e.module.navLabel}
            </option>
          ))}
        </select>
      </div>

      <div className={s.body}>
        <nav className={s.sidebar}>
          <p className={s.sidebarHeading}>Modules</p>
          {flat.map(sidebarItem)}
        </nav>

        <div className={s.lessonPane} ref={paneRef}>
          <div className={s.lessonInner}>
            <p className={s.lessonKicker}>{kicker}</p>
            <h2 className={s.lessonTitle}>{active.title}</h2>
            <p className={s.lessonSubtitle}>{active.subtitle}</p>

            {active.blocks.map(renderBlock)}

            {allDone && activeIndex === flat.length - 1 && (
              <div className={s.completeBanner}>
                <span>🎉</span>
                <span>
                  <strong>Course complete.</strong> All {flat.length} modules done — the reference
                  shelves and reading paths are yours whenever you need them.
                </span>
              </div>
            )}

            <div className={s.footerNav}>
              {activeIndex > 0 && (
                <button type="button" className={s.btn} onClick={() => goTo(flat[activeIndex - 1].module.id)}>
                  ← {flat[activeIndex - 1].module.navLabel}
                </button>
              )}
              <span className={s.footerSpacer} />
              {progress.completedModules.includes(active.id) ? (
                activeIndex < flat.length - 1 && (
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => goTo(flat[activeIndex + 1].module.id)}>
                    {flat[activeIndex + 1].module.navLabel} →
                  </button>
                )
              ) : (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={completeAndContinue}>
                  {activeIndex < flat.length - 1 ? 'Mark complete & continue →' : 'Mark complete ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
