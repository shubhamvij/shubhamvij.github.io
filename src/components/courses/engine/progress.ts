'use client'
import { useCallback, useSyncExternalStore } from 'react'

export interface CourseProgress {
  completedModules: string[]
  /** questionId -> chosen option index (only stored once answered correctly) */
  quizAnswers: Record<string, number>
  lastModuleId: string | null
}

const EMPTY: CourseProgress = { completedModules: [], quizAnswers: {}, lastModuleId: null }

// Each course keeps its progress in a tiny external store backed by localStorage
// under its own key. localStorage is unavailable in some environments (jsdom,
// private browsing with storage disabled); there the in-memory cache alone
// carries the session.
interface ProgressStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => CourseProgress
  write: (next: CourseProgress) => void
}

const stores = new Map<string, ProgressStore>()

function makeStore(storageKey: string): ProgressStore {
  let cache: CourseProgress | null = null
  const listeners = new Set<() => void>()

  const readStorage = (): CourseProgress => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return EMPTY
      const parsed = JSON.parse(raw)
      return {
        completedModules: Array.isArray(parsed.completedModules) ? parsed.completedModules : [],
        quizAnswers: parsed.quizAnswers && typeof parsed.quizAnswers === 'object' ? parsed.quizAnswers : {},
        lastModuleId: typeof parsed.lastModuleId === 'string' ? parsed.lastModuleId : null,
      }
    } catch {
      return EMPTY
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      if (cache === null) cache = readStorage()
      return cache
    },
    write(next) {
      cache = next
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // in-memory cache still holds the value
      }
      listeners.forEach(l => l())
    },
  }
}

function getStore(storageKey: string): ProgressStore {
  let s = stores.get(storageKey)
  if (!s) {
    s = makeStore(storageKey)
    stores.set(storageKey, s)
  }
  return s
}

function getServerSnapshot(): CourseProgress {
  return EMPTY
}

/** Clears saved progress for one course. */
export function resetCourseProgress(storageKey: string) {
  getStore(storageKey).write(EMPTY)
}

/** Drops all in-memory caches so the next read comes from storage. Test seam. */
export function invalidateCourseProgressCaches() {
  stores.clear()
}

export function useCourseProgress(storageKey: string) {
  const store = getStore(storageKey)
  const progress = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)

  const markModuleComplete = useCallback((moduleId: string) => {
    const s = getStore(storageKey)
    const prev = s.getSnapshot()
    if (!prev.completedModules.includes(moduleId)) {
      s.write({ ...prev, completedModules: [...prev.completedModules, moduleId] })
    }
  }, [storageKey])

  const recordQuizAnswer = useCallback((questionId: string, optionIndex: number) => {
    const s = getStore(storageKey)
    const prev = s.getSnapshot()
    s.write({ ...prev, quizAnswers: { ...prev.quizAnswers, [questionId]: optionIndex } })
  }, [storageKey])

  const setLastModule = useCallback((moduleId: string) => {
    const s = getStore(storageKey)
    const prev = s.getSnapshot()
    if (prev.lastModuleId !== moduleId) {
      s.write({ ...prev, lastModuleId: moduleId })
    }
  }, [storageKey])

  const resetProgress = useCallback(() => {
    resetCourseProgress(storageKey)
  }, [storageKey])

  return { progress, markModuleComplete, recordQuizAnswer, setLastModule, resetProgress }
}
