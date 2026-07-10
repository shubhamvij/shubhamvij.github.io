'use client'
import { useRef, useState } from 'react'
import s from './course.module.css'
import type { CourseDefinition, LessonBlock } from './types'
import { useCourseProgress } from './progress'
import Quiz from './Quiz'

interface Props {
  course: CourseDefinition
  onBack?: () => void
  backLabel?: string
}

export default function CourseShell({ course, onBack, backLabel = '← Back' }: Props) {
  const { progress, markModuleComplete, recordQuizAnswer, setLastModule, resetProgress } = useCourseProgress(course.storageKey)
  const [navChoice, setNavChoice] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const paneRef = useRef<HTMLDivElement>(null)

  const modules = course.modules

  // Until the reader navigates, resume wherever they left off (falling back to module 1).
  const resumeId = progress.lastModuleId && modules.some(m => m.id === progress.lastModuleId)
    ? progress.lastModuleId
    : modules[0].id
  const activeId = navChoice ?? resumeId

  const activeIndex = modules.findIndex(m => m.id === activeId)
  const active = modules[activeIndex]
  const completedCount = modules.filter(m => progress.completedModules.includes(m.id)).length
  const pct = Math.round((completedCount / modules.length) * 100)
  const allDone = completedCount === modules.length

  const goTo = (id: string) => {
    setNavChoice(id)
    setLastModule(id)
    if (paneRef.current) paneRef.current.scrollTop = 0
  }

  const completeAndContinue = () => {
    markModuleComplete(active.id)
    if (activeIndex < modules.length - 1) {
      goTo(modules[activeIndex + 1].id)
    }
  }

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    resetProgress()
    setConfirmingReset(false)
    goTo(modules[0].id)
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
          {modules.map(m => (
            <option key={m.id} value={m.id}>
              {progress.completedModules.includes(m.id) ? '✓ ' : ''}{m.navLabel}
            </option>
          ))}
        </select>
      </div>

      <div className={s.body}>
        <nav className={s.sidebar}>
          <p className={s.sidebarHeading}>Modules</p>
          {modules.map(m => (
            <button
              key={m.id}
              type="button"
              className={`${s.moduleItem} ${m.id === activeId ? s.moduleItemActive : ''}`}
              onClick={() => goTo(m.id)}
            >
              <span className={s.moduleTick}>{progress.completedModules.includes(m.id) ? '✓' : ''}</span>
              <span className={s.moduleLabel}>{m.navLabel}</span>
              <span className={s.moduleMinutes}>{m.minutes}m</span>
            </button>
          ))}
        </nav>

        <div className={s.lessonPane} ref={paneRef}>
          <div className={s.lessonInner}>
            <p className={s.lessonKicker}>
              Module {activeIndex + 1} of {modules.length} · ~{active.minutes} min
            </p>
            <h2 className={s.lessonTitle}>{active.title}</h2>
            <p className={s.lessonSubtitle}>{active.subtitle}</p>

            {active.blocks.map(renderBlock)}

            {allDone && activeIndex === modules.length - 1 && (
              <div className={s.completeBanner}>
                <span>🎉</span>
                <span>
                  <strong>Course complete.</strong> All {modules.length} modules done — the reference
                  shelves and reading paths are yours whenever you need them.
                </span>
              </div>
            )}

            <div className={s.footerNav}>
              {activeIndex > 0 && (
                <button type="button" className={s.btn} onClick={() => goTo(modules[activeIndex - 1].id)}>
                  ← {modules[activeIndex - 1].navLabel}
                </button>
              )}
              <span className={s.footerSpacer} />
              {progress.completedModules.includes(active.id) ? (
                activeIndex < modules.length - 1 && (
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => goTo(modules[activeIndex + 1].id)}>
                    {modules[activeIndex + 1].navLabel} →
                  </button>
                )
              ) : (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={completeAndContinue}>
                  {activeIndex < modules.length - 1 ? 'Mark complete & continue →' : 'Mark complete ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
