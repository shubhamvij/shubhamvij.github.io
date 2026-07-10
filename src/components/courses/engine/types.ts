import { ComponentType, ReactNode } from 'react'
import type { QuizQuestion } from './Quiz'

export type LessonBlock =
  | { kind: 'prose'; body: ReactNode }
  | { kind: 'heading'; text: string }
  | { kind: 'callout'; icon: string; title: string; body: ReactNode }
  | { kind: 'widget'; widget: string }
  | { kind: 'quiz'; questions: QuizQuestion[] }
  | { kind: 'refs'; items: { label: string; href: string; note?: string }[] }

export interface CourseModule {
  id: string
  navLabel: string
  title: string
  subtitle: string
  minutes: number
  blocks: LessonBlock[]
}

export interface CourseDefinition {
  /** Course slug — must match the catalog entry and /learn/<slug> route. */
  id: string
  title: string
  tagline: string
  /** localStorage key for progress; never change once shipped or readers lose progress. */
  storageKey: string
  modules: CourseModule[]
  /** Widget key (used in lesson blocks) -> component. */
  widgets: Record<string, ComponentType>
}
