import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The engine is a module singleton — re-import a fresh copy for every test.
async function importSounds() {
  return await import('./sounds')
}

// Minimal Web Audio fake: just enough surface for the engine's node graph,
// with counters so tests can observe whether anything was scheduled.
function makeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  }
}

let fakeInitialState: 'suspended' | 'running' = 'running'
// Real browsers only let resume() succeed after a user gesture; tests flip
// this to model the gesture-less (deep link) case.
let fakeResumeAllowed = true
let lastCtx: FakeAudioContext | null = null

class FakeAudioContext {
  state: 'suspended' | 'running' = fakeInitialState
  currentTime = 0
  sampleRate = 8000
  destination = { connect: vi.fn(), disconnect: vi.fn() }
  sourcesCreated = 0

  resume = vi.fn(async () => {
    if (fakeResumeAllowed) this.state = 'running'
  })

  private node(extra: Record<string, unknown> = {}) {
    return { connect: vi.fn(), disconnect: vi.fn(), ...extra }
  }

  createGain() {
    return this.node({ gain: makeParam() })
  }

  createOscillator() {
    this.sourcesCreated++
    return this.node({
      type: 'sine',
      frequency: makeParam(),
      detune: makeParam(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })
  }

  createBufferSource() {
    this.sourcesCreated++
    return this.node({
      buffer: null,
      loop: false,
      playbackRate: makeParam(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })
  }

  createBiquadFilter() {
    return this.node({ type: 'lowpass', frequency: makeParam(), Q: makeParam(), gain: makeParam() })
  }

  createConvolver() {
    return this.node({ buffer: null })
  }

  createBuffer(channels: number, length: number, rate: number) {
    return {
      numberOfChannels: channels,
      getChannelData: (i: number) => {
        if (i >= channels) throw new Error(`channel ${i} out of range`)
        return new Float32Array(length)
      },
      duration: length / rate,
    }
  }
}

// Records each constructed context in lastCtx without aliasing `this`.
function stubAudioContext() {
  const Stub = function () {
    lastCtx = new FakeAudioContext()
    return lastCtx
  } as unknown as typeof AudioContext
  vi.stubGlobal('AudioContext', Stub)
}

function makeMemoryStorage(): Storage {
  const data: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = String(v) },
    removeItem: (k: string) => { delete data[k] },
    clear: () => { for (const k of Object.keys(data)) delete data[k] },
    key: () => null,
    get length() { return Object.keys(data).length },
  } as Storage
}

async function flushMicrotasks(times = 6) {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

function gesture() {
  window.dispatchEvent(new Event('pointerdown'))
}

describe('sounds engine', () => {
  let cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.resetModules()
    fakeInitialState = 'running'
    fakeResumeAllowed = true
    lastCtx = null
    vi.stubGlobal('localStorage', makeMemoryStorage())
  })

  afterEach(() => {
    cleanups.forEach(fn => fn())
    cleanups = []
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('no-ops safely when AudioContext is unavailable', async () => {
    // jsdom has no AudioContext by default — nothing should throw.
    const sounds = await importSounds()
    cleanups.push(sounds.initSounds())
    cleanups.push(sounds.initSounds()) // double init is harmless
    expect(() => {
      sounds.requestStartupChime()
      sounds.playSound('openWindow')
      sounds.playSound('closeWindow')
      sounds.playSound('minimize')
      sounds.playSound('restore')
      sounds.playSound('menuPop')
      sounds.playSound('click')
      sounds.playSound('error')
      sounds.playSound('sleep')
    }).not.toThrow()
    const stopCd = sounds.playCdInsert()
    const stopJingle = sounds.playVijcartaJingle()
    expect(typeof stopCd).toBe('function')
    expect(typeof stopJingle).toBe('function')
    expect(() => { stopCd(); stopJingle() }).not.toThrow()
    gesture() // unlock listener with no AudioContext must not throw either
  })

  it('defaults to unmuted and persists mute across module reloads', async () => {
    const sounds = await importSounds()
    expect(sounds.isMuted()).toBe(false)
    expect(sounds.toggleMuted()).toBe(true)
    expect(localStorage.getItem('sound.muted')).toBe('1')

    vi.resetModules()
    const fresh = await importSounds()
    expect(fresh.isMuted()).toBe(true)
    fresh.setMuted(false)
    expect(localStorage.getItem('sound.muted')).toBe('0')
  })

  it('notifies mute subscribers on change and stops after unsubscribe', async () => {
    const sounds = await importSounds()
    let calls = 0
    const unsubscribe = sounds.subscribeMuted(() => { calls++ })
    sounds.setMuted(true)
    expect(calls).toBe(1)
    unsubscribe()
    sounds.setMuted(false)
    expect(calls).toBe(1)
  })

  it('keeps working in-memory when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    })
    const sounds = await importSounds()
    expect(sounds.isMuted()).toBe(false)
    expect(sounds.toggleMuted()).toBe(true)
    expect(sounds.isMuted()).toBe(true)
  })

  it('queues the startup chime until the first gesture, then plays it exactly once', async () => {
    fakeInitialState = 'suspended'
    stubAudioContext()
    const sounds = await importSounds()
    cleanups.push(sounds.initSounds())

    sounds.requestStartupChime()
    expect(lastCtx?.sourcesCreated ?? 0).toBe(0)

    gesture()
    await flushMicrotasks()
    expect(lastCtx).not.toBeNull()
    const afterFirst = lastCtx!.sourcesCreated
    expect(afterFirst).toBeGreaterThan(0)

    gesture()
    await flushMicrotasks()
    expect(lastCtx!.sourcesCreated).toBe(afterFirst)
  })

  it('expires a queued startup chime after 30 seconds', async () => {
    vi.useFakeTimers()
    fakeInitialState = 'suspended'
    stubAudioContext()
    const sounds = await importSounds()
    cleanups.push(sounds.initSounds())

    sounds.requestStartupChime()
    vi.advanceTimersByTime(31_000)
    gesture()
    await flushMicrotasks()
    expect(lastCtx?.sourcesCreated ?? 0).toBe(0)
  })

  it('suppresses UI sounds briefly after the startup chime starts', async () => {
    vi.useFakeTimers()
    stubAudioContext()
    const sounds = await importSounds()
    cleanups.push(sounds.initSounds())

    sounds.requestStartupChime() // context already running → plays immediately
    const afterChime = lastCtx!.sourcesCreated
    expect(afterChime).toBeGreaterThan(0)

    sounds.playSound('click')
    expect(lastCtx!.sourcesCreated).toBe(afterChime)

    vi.advanceTimersByTime(800)
    sounds.playSound('click')
    expect(lastCtx!.sourcesCreated).toBeGreaterThan(afterChime)
  })

  it('schedules nothing while muted', async () => {
    stubAudioContext()
    const sounds = await importSounds()
    sounds.setMuted(true)
    sounds.playSound('openWindow')
    sounds.requestStartupChime()
    sounds.playCdInsert()
    sounds.playVijcartaJingle()
    expect(lastCtx?.sourcesCreated ?? 0).toBe(0)
  })

  it('picks the right sound for an open-window request', async () => {
    const sounds = await importSounds()
    expect(sounds.soundForWindowAction(undefined)).toBe('openWindow')
    expect(sounds.soundForWindowAction({ isMinimized: true })).toBe('restore')
    expect(sounds.soundForWindowAction({ isMinimized: false })).toBe(null)
  })

  it('plays the CD insert and jingle only when the context is running', async () => {
    fakeInitialState = 'suspended'
    fakeResumeAllowed = false
    stubAudioContext()
    const sounds = await importSounds()

    // Deep-link case: no gesture yet, context suspended → stays silent.
    const stopA = sounds.playCdInsert()
    const stopB = sounds.playVijcartaJingle()
    expect(lastCtx?.sourcesCreated ?? 0).toBe(0)
    stopA(); stopB()

    // After a gesture resumes the context, both schedule real sources.
    fakeResumeAllowed = true
    lastCtx!.state = 'running'
    const stopC = sounds.playCdInsert()
    expect(lastCtx!.sourcesCreated).toBeGreaterThan(0)
    const mid = lastCtx!.sourcesCreated
    const stopD = sounds.playVijcartaJingle()
    expect(lastCtx!.sourcesCreated).toBeGreaterThan(mid)
    expect(() => { stopC(); stopD() }).not.toThrow()
  })
})
