'use client'
import { useCallback, useState } from 'react'
import s from './learn.module.css'
import BootSplash from './BootSplash'
import CourseLibrary from './CourseLibrary'
import CourseShell from '@/components/courses/engine/CourseShell'
import { COURSE_DEFINITIONS } from './courses'

interface Props {
  /** Current course slug (controlled by the window manager / URL). */
  slug: string | null
  onNavigate: (slug: string | null) => void
}

export default function CoursewareShell({ slug, onNavigate }: Props) {
  const [booted, setBooted] = useState(false)
  const handleBootDone = useCallback(() => setBooted(true), [])

  // Course prose may cross-link other courses (/learn/<slug>); swap in place
  // instead of reloading the page.
  const handleCourseLinkClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a')
    const href = anchor?.getAttribute('href')
    if (href?.startsWith('/learn')) {
      e.preventDefault()
      onNavigate(href.split('/').filter(Boolean)[1] ?? null)
    }
  }

  if (!booted) {
    return (
      <div className={s.shell}>
        <BootSplash onDone={handleBootDone} />
      </div>
    )
  }

  const definition = slug ? COURSE_DEFINITIONS[slug] : undefined
  if (definition) {
    return (
      <div className={s.shell} onClick={handleCourseLinkClick}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CourseShell
            course={definition}
            onBack={() => onNavigate(null)}
            backLabel="← Library"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={s.shell}>
      <CourseLibrary onOpenCourse={onNavigate} />
    </div>
  )
}
