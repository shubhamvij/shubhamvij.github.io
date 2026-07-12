import { ReactNode } from 'react'
import type { CourseDefinition } from '@/components/courses/engine/types'
import { gfmCourse } from '@/components/courses/gfm'
import { attentionCourse } from '@/components/courses/attention'
import { dlrmCourse } from '@/components/courses/dlrm'

/** Interactive course definitions, keyed by slug (must mirror src/lib/courseCatalog.ts). */
export const COURSE_DEFINITIONS: Record<string, CourseDefinition> = {
  [gfmCourse.id]: gfmCourse,
  [attentionCourse.id]: attentionCourse,
  [dlrmCourse.id]: dlrmCourse,
}

/** Library-card cover art per course. */
export const COURSE_ART: Record<string, ReactNode> = {
  'graph-foundation-models': (
    <svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <line x1="30" y1="60" x2="78" y2="26" stroke="#8cacf8" strokeWidth="1.4" />
      <line x1="78" y1="26" x2="132" y2="52" stroke="#8cacf8" strokeWidth="1.4" />
      <line x1="132" y1="52" x2="186" y2="24" stroke="#8cacf8" strokeWidth="1.4" />
      <line x1="132" y1="52" x2="176" y2="74" stroke="#8cacf8" strokeWidth="1.4" />
      <line x1="30" y1="60" x2="86" y2="76" stroke="#8cacf8" strokeWidth="1.4" />
      <line x1="86" y1="76" x2="132" y2="52" stroke="#8cacf8" strokeWidth="1.4" />
      <circle cx="30" cy="60" r="9" fill="#f0d98c" stroke="#0a0d33" />
      <circle cx="78" cy="26" r="7" fill="#8cf0a0" stroke="#0a0d33" />
      <rect x="124" y="44" width="16" height="16" fill="#f09c8c" stroke="#0a0d33" />
      <circle cx="186" cy="24" r="8" fill="#8cd8f0" stroke="#0a0d33" />
      <rect x="169" y="67" width="14" height="14" fill="#c8a0f0" stroke="#0a0d33" />
      <circle cx="86" cy="76" r="6" fill="#8cf0a0" stroke="#0a0d33" />
      <text x="212" y="80" fontSize="26" fill="rgba(255,255,255,0.35)" fontFamily="Trebuchet MS" fontWeight="bold">G</text>
    </svg>
  ),
  'attention-mechanisms': (
    <svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* attention heatmap motif */}
      {[0, 1, 2, 3, 4].map(r =>
        [0, 1, 2, 3, 4].map(c => (
          <rect
            key={`${r}-${c}`}
            x={26 + c * 17}
            y={8 + r * 17}
            width={14}
            height={14}
            fill={r === c ? '#f0d98c' : c < r ? '#5a7ce0' : '#26307a'}
            opacity={r === c ? 0.95 : c < r ? 0.55 + 0.1 * ((r + c) % 3) : 0.35}
          />
        ))
      )}
      {/* query token attending */}
      <circle cx="168" cy="26" r="9" fill="#f0d98c" stroke="#0a0d33" />
      <circle cx="206" cy="18" r="6" fill="#8cd8f0" stroke="#0a0d33" />
      <circle cx="210" cy="52" r="6" fill="#8cd8f0" stroke="#0a0d33" />
      <circle cx="178" cy="68" r="6" fill="#8cd8f0" stroke="#0a0d33" />
      <line x1="168" y1="26" x2="206" y2="18" stroke="#f0d98c" strokeWidth="3" opacity="0.9" />
      <line x1="168" y1="26" x2="210" y2="52" stroke="#f0d98c" strokeWidth="1.6" opacity="0.6" />
      <line x1="168" y1="26" x2="178" y2="68" stroke="#f0d98c" strokeWidth="0.9" opacity="0.4" />
    </svg>
  ),
  'dlrm-embedding-tables': (
    <svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(r => (
        <rect key={r} x={26} y={12 + r * 12} width={120} height={10}
          fill={r === 3 ? '#f0d98c' : '#26307a'} opacity={r === 3 ? 0.95 : 0.4 + 0.06 * r}
          stroke="#0a0d33" strokeWidth={0.5} />
      ))}
      <text x={150} y={52} fontSize={9} fill="#8cacf8" fontFamily="Tahoma">row i</text>
      <line x1="146" y1="48" x2="176" y2="48" stroke="#f0d98c" strokeWidth="2" />
      <circle cx="200" cy="34" r="7" fill="#8cf0a0" stroke="#0a0d33" />
      <circle cx="212" cy="60" r="6" fill="#8cd8f0" stroke="#0a0d33" />
      <text x="206" y="84" fontSize="24" fill="rgba(255,255,255,0.35)" fontFamily="Trebuchet MS" fontWeight="bold">R</text>
    </svg>
  ),
}
