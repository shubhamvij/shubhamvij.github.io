'use client'
import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'gfm-guide-progress-v1'

export interface GuideProgress {
  completedModules: string[]
  /** questionId -> chosen option index (only stored once answered correctly) */
  quizAnswers: Record<string, number>
  lastModuleId: string | null
}

const EMPTY: GuideProgress = { completedModules: [], quizAnswers: {}, lastModuleId: null }

// Progress lives in a tiny external store backed by localStorage. localStorage is
// unavailable in some environments (jsdom, private browsing with storage disabled);
// there the in-memory cache alone carries the session.
let cache: GuideProgress | null = null
const listeners = new Set<() => void>()

function readStorage(): GuideProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
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

function getSnapshot(): GuideProgress {
  if (cache === null) cache = readStorage()
  return cache
}

function getServerSnapshot(): GuideProgress {
  return EMPTY
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function write(next: GuideProgress) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // in-memory cache still holds the value
  }
  listeners.forEach(l => l())
}

/** Clears saved progress (also used by tests to isolate the module-level store). */
export function resetGuideProgress() {
  write(EMPTY)
}

/** Drops the in-memory cache so the next read comes from storage. Test seam. */
export function invalidateGuideProgressCache() {
  cache = null
}

export function useGuideProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const markModuleComplete = useCallback((moduleId: string) => {
    const prev = getSnapshot()
    if (!prev.completedModules.includes(moduleId)) {
      write({ ...prev, completedModules: [...prev.completedModules, moduleId] })
    }
  }, [])

  const recordQuizAnswer = useCallback((questionId: string, optionIndex: number) => {
    const prev = getSnapshot()
    write({ ...prev, quizAnswers: { ...prev.quizAnswers, [questionId]: optionIndex } })
  }, [])

  const setLastModule = useCallback((moduleId: string) => {
    const prev = getSnapshot()
    if (prev.lastModuleId !== moduleId) {
      write({ ...prev, lastModuleId: moduleId })
    }
  }, [])

  return { progress, markModuleComplete, recordQuizAnswer, setLastModule, resetProgress: resetGuideProgress }
}
