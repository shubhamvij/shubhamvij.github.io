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
      <CourseShell
        course={definition}
        onBack={() => onNavigate(null)}
        backLabel="← Library"
      />
    )
  }

  return (
    <div className={s.shell}>
      <CourseLibrary onOpenCourse={onNavigate} />
    </div>
  )
}
