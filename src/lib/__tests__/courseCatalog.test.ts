import { describe, it, expect } from 'vitest'
import { COURSE_CATALOG } from '../courseCatalog'
import { COURSE_DEFINITIONS, COURSE_ART } from '@/components/learn/courses'

describe('course catalog <-> definitions sync', () => {
  it('has a definition and cover art for every catalog entry, and vice versa', () => {
    const catalogSlugs = COURSE_CATALOG.map(c => c.slug).sort()
    expect(Object.keys(COURSE_DEFINITIONS).sort()).toEqual(catalogSlugs)
    expect(Object.keys(COURSE_ART).sort()).toEqual(catalogSlugs)
  })

  it('keeps module counts and minute totals in sync with the definitions', () => {
    for (const entry of COURSE_CATALOG) {
      const def = COURSE_DEFINITIONS[entry.slug]
      expect(def.modules.length, `${entry.slug} module count`).toBe(entry.modules)
      const minutes = def.modules.reduce(
        (sum, m) => sum + m.minutes + (m.subchapters ?? []).reduce((s2, sub) => s2 + sub.minutes, 0),
        0
      )
      expect(minutes, `${entry.slug} minutes`).toBe(entry.minutes)
      expect(def.id).toBe(entry.slug)
    }
  })

  it('gives each course a unique storage key and non-empty metadata', () => {
    const keys = Object.values(COURSE_DEFINITIONS).map(d => d.storageKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const entry of COURSE_CATALOG) {
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(20)
    }
  })

  it('references only registered widgets from every module', () => {
    for (const def of Object.values(COURSE_DEFINITIONS)) {
      const all = def.modules.flatMap(m => [m, ...(m.subchapters ?? [])])
      for (const m of all) {
        for (const b of m.blocks) {
          if (b.kind === 'widget') {
            expect(def.widgets[b.widget], `${def.id}/${m.id} widget "${b.widget}"`).toBeDefined()
          }
        }
      }
    }
  })

  it('uses globally unique quiz question ids across courses', () => {
    const ids: string[] = []
    for (const def of Object.values(COURSE_DEFINITIONS)) {
      const all = def.modules.flatMap(m => [m, ...(m.subchapters ?? [])])
      for (const m of all) {
        for (const b of m.blocks) {
          if (b.kind === 'quiz') ids.push(...b.questions.map(q => q.id))
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
})
