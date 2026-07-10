'use client'
import s from './learn.module.css'
import BootSplash from './BootSplash'
import CourseLibrary from './CourseLibrary'
import CourseShell from '@/components/courses/engine/CourseShell'
import { COURSE_DEFINITIONS } from './courses'

interface Props {
  /** Current course slug (controlled by the window manager / URL). */
  slug: string | null
  onNavigate: (slug: string | null) => void
  /**
   * Boot state is owned by the caller (HomeClient) so it survives content
   * remounts — minimize/restore and viewport-breakpoint changes unmount the
   * window body. Like a program: boots when opened, stays booted until closed.
   */
  booted: boolean
  onBooted: () => void
}

export default function CoursewareShell({ slug, onNavigate, booted, onBooted }: Props) {

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
        <BootSplash onDone={onBooted} />
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
