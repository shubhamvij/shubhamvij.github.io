'use client'
import s from './learn.module.css'
import { COURSE_CATALOG, CourseCatalogEntry } from '@/lib/courseCatalog'
import { COURSE_DEFINITIONS, COURSE_ART } from './courses'
import { useCourseProgress } from '@/components/courses/engine/progress'

function CourseCard({ entry, onOpen }: { entry: CourseCatalogEntry; onOpen: (slug: string) => void }) {
  const definition = COURSE_DEFINITIONS[entry.slug]
  const { progress } = useCourseProgress(definition.storageKey)
  const done = definition.modules.filter(m => progress.completedModules.includes(m.id)).length
  const pct = Math.round((done / definition.modules.length) * 100)

  return (
    <div className={s.courseCard}>
      <div className={s.courseCover}>
        <div className={s.courseCoverArt}>{COURSE_ART[entry.slug]}</div>
        <span className={s.courseCoverBadge}>COURSE</span>
      </div>
      <div className={s.courseBody}>
        <div className={s.courseTitle}>{entry.title}</div>
        <div className={s.courseSub}>{entry.subtitle}</div>
        <div className={s.courseMeta}>
          {entry.modules} modules · ~{entry.minutes} min · {entry.highlights}
        </div>
        {pct > 0 && (
          <div className={s.courseProgressRow}>
            <div className={s.miniTrack}>
              <div className={s.miniFill} style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        )}
        <div className={s.courseActions}>
          <button type="button" className={s.launchBtn} onClick={() => onOpen(entry.slug)}>
            {pct > 0 && pct < 100 ? 'Continue ▸' : pct === 100 ? 'Revisit ▸' : 'Start course ▸'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CourseLibrary({ onOpenCourse }: { onOpenCourse: (slug: string) => void }) {
  return (
    <div className={s.library}>
      <div className={s.libHeader}>
        <span className={s.libWordmark}>VIJCARTA</span>
        <span className={s.libEdition}>2026 EDITION</span>
        <span className={s.libTagline}>Interactive Courseware Library</span>
      </div>
      <div className={s.libBody}>
        <p className={s.libSectionTitle}>Contents</p>
        <div className={s.courseGrid}>
          {COURSE_CATALOG.map(entry => (
            <CourseCard key={entry.slug} entry={entry} onOpen={onOpenCourse} />
          ))}
          <div className={s.comingCard}>
            <span>
              📀 More titles in production…
              <br />
              This library grows one disc at a time.
            </span>
          </div>
        </div>
        <p className={s.libFootnote}>
          Progress is saved on this device. Courses are free, self-paced, and open in this window.
        </p>
      </div>
    </div>
  )
}
