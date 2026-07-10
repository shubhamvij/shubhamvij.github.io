'use client'

/**
 * Windows XP–inspired UI sound engine, synthesized with the Web Audio API.
 * No audio assets: every sound (including the Vijcarta jingle and its
 * convolver reverb impulse) is generated in code, so the palette stays
 * "inspired by" rather than a copy of Microsoft's copyrighted files.
 *
 * Design notes (see docs/superpowers/specs/2026-07-09-xp-sounds-design.md):
 * - Lazy singleton AudioContext; every entry point no-ops when Web Audio is
 *   unavailable (SSR, jsdom) or the context can't run yet (autoplay policy).
 * - initSounds() unlocks audio on the first user gesture and fires a queued
 *   startup chime, which expires if the first gesture comes too late.
 * - Mute is a master-gain switch persisted to localStorage.
 */

export type UiSound =
  | 'openWindow'
  | 'closeWindow'
  | 'minimize'
  | 'restore'
  | 'menuPop'
  | 'click'
  | 'error'
  | 'sleep'

const MASTER_LEVEL = 0.35
const REVERB_LEVEL = 0.3
const MUTE_KEY = 'sound.muted'
const STARTUP_QUEUE_TTL_MS = 30_000
const STARTUP_SUPPRESS_MS = 700

let ctx: AudioContext | null = null
let bus: GainNode | null = null // every sound enters here (dry + reverb send)
let master: GainNode | null = null // mute/volume control
let noiseBuffer: AudioBuffer | null = null
let muted = readStoredMute()
let pendingStartupAt: number | null = null
let suppressUiUntil = 0
let listenersInstalled = false

const noop = () => {}

function readStoredMute(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    return null
  }
  master = ctx.createGain()
  master.gain.value = muted ? 0 : MASTER_LEVEL
  master.connect(ctx.destination)
  bus = ctx.createGain()
  bus.gain.value = 1
  bus.connect(master)
  try {
    const convolver = ctx.createConvolver()
    convolver.buffer = makeImpulseResponse(ctx, 0.9)
    const wet = ctx.createGain()
    wet.gain.value = REVERB_LEVEL
    bus.connect(convolver)
    convolver.connect(wet)
    wet.connect(master)
  } catch {
    // Reverb is a nicety; dry-only is fine.
  }
  return ctx
}

/** Context that is actually allowed to produce sound right now, or null. */
function readyCtx(): AudioContext | null {
  const c = getCtx()
  if (!c || !bus) return null
  if (c.state !== 'running') {
    try {
      void c.resume().catch(noop)
    } catch {
      // ignore — a later gesture will unlock it
    }
    return null
  }
  return c
}

/** Short exponential-decay noise burst used as a reverb impulse response. */
function makeImpulseResponse(c: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(c.sampleRate * seconds))
  const buffer = c.createBuffer(2, length, c.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8)
    }
  }
  return buffer
}

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = Math.max(1, Math.floor(c.sampleRate))
    noiseBuffer = c.createBuffer(1, length, c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

interface ToneOpts {
  freq: number
  at?: number // seconds from now
  dur: number // seconds until the release begins
  type?: OscillatorType
  peak?: number
  attack?: number
  release?: number
  detune?: number // cents
  slideTo?: number // glide the frequency here over dur
}

function tone(c: AudioContext, dest: AudioNode, o: ToneOpts): AudioScheduledSourceNode {
  const t0 = c.currentTime + (o.at ?? 0)
  const attack = o.attack ?? 0.008
  const release = o.release ?? 0.08
  const peak = o.peak ?? 0.15
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t0)
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + o.dur)
  if (o.detune) osc.detune.setValueAtTime(o.detune, t0)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(peak, t0 + attack)
  g.gain.setValueAtTime(peak, t0 + Math.max(attack, o.dur))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur + release)
  osc.connect(g)
  g.connect(dest)
  osc.start(t0)
  osc.stop(t0 + o.dur + release + 0.05)
  return osc
}

interface NoiseOpts {
  at?: number
  dur: number
  peak?: number
  attack?: number
  release?: number
  filter?: BiquadFilterType
  from: number // filter frequency start
  to?: number // filter frequency end
  q?: number
}

function noiseBurst(c: AudioContext, dest: AudioNode, o: NoiseOpts): AudioScheduledSourceNode {
  const t0 = c.currentTime + (o.at ?? 0)
  const attack = o.attack ?? 0.01
  const release = o.release ?? 0.05
  const peak = o.peak ?? 0.05
  const src = c.createBufferSource()
  src.buffer = getNoiseBuffer(c)
  src.loop = true
  const filter = c.createBiquadFilter()
  filter.type = o.filter ?? 'bandpass'
  filter.frequency.setValueAtTime(o.from, t0)
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur)
  filter.Q.value = o.q ?? 1
  const g = c.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(peak, t0 + attack)
  g.gain.setValueAtTime(peak, t0 + Math.max(attack, o.dur))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur + release)
  src.connect(filter)
  filter.connect(g)
  g.connect(dest)
  src.start(t0)
  src.stop(t0 + o.dur + release + 0.05)
  return src
}

/** Glassy bell voice: fundamental + soft octave partial + detuned chorus pair. */
function bell(c: AudioContext, dest: AudioNode, freq: number, at: number, peak: number, dur: number) {
  tone(c, dest, { freq, at, dur, peak, release: dur * 1.4 })
  tone(c, dest, { freq: freq * 1.004, at, dur, peak: peak * 0.5, detune: 5, release: dur * 1.4 })
  tone(c, dest, { freq: freq * 2.001, at, dur: dur * 0.6, peak: peak * 0.22, release: dur })
}

function stopAll(sources: AudioScheduledSourceNode[]): () => void {
  return () => {
    for (const source of sources) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
  }
}

/**
 * Install one-time gesture listeners that unlock the AudioContext (browsers
 * keep it suspended until a user interaction) and fire any queued startup
 * chime. Returns a cleanup function for React effects.
 */
export function initSounds(): () => void {
  if (typeof window === 'undefined' || listenersInstalled) return noop
  listenersInstalled = true
  const remove = () => {
    if (!listenersInstalled) return
    listenersInstalled = false
    window.removeEventListener('pointerdown', onGesture, true)
    window.removeEventListener('keydown', onGesture, true)
  }
  const onGesture = () => {
    const c = getCtx()
    if (!c) {
      remove()
      return
    }
    const finish = () => {
      tryPlayPendingStartup()
      if (c.state === 'running') remove()
    }
    if (c.state === 'running') {
      finish()
    } else {
      try {
        void c.resume().then(finish).catch(noop)
      } catch {
        // keep listening for the next gesture
      }
    }
  }
  window.addEventListener('pointerdown', onGesture, true)
  window.addEventListener('keydown', onGesture, true)
  return remove
}

export function isMuted(): boolean {
  return muted
}

const muteListeners = new Set<() => void>()

/** Subscribe to mute changes (useSyncExternalStore-compatible). */
export function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener)
  return () => muteListeners.delete(listener)
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    window.localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // in-memory only
  }
  if (ctx && master) {
    master.gain.setTargetAtTime(value ? 0 : MASTER_LEVEL, ctx.currentTime, 0.02)
  }
  muteListeners.forEach(listener => listener())
}

export function toggleMuted(): boolean {
  setMuted(!muted)
  return muted
}

/**
 * Ask for the XP-style startup chime. Plays now if audio is unlocked,
 * otherwise on the first user gesture — unless that comes so late the
 * chime would feel out of context.
 */
export function requestStartupChime(): void {
  pendingStartupAt = Date.now()
  tryPlayPendingStartup()
}

function tryPlayPendingStartup(): void {
  if (pendingStartupAt === null) return
  if (muted || Date.now() - pendingStartupAt > STARTUP_QUEUE_TTL_MS) {
    pendingStartupAt = null
    return
  }
  const c = getCtx()
  if (!c || !bus || c.state !== 'running') return // stays queued for the unlock gesture
  pendingStartupAt = null
  suppressUiUntil = Date.now() + STARTUP_SUPPRESS_MS
  scheduleStartupChime(c, bus)
}

/** ~3.5s rising pad + glassy motif, in the spirit of the XP logon sound. */
function scheduleStartupChime(c: AudioContext, out: AudioNode) {
  const pad = [146.83, 220.0, 293.66, 369.99] // D3 A3 D4 F#4
  pad.forEach((freq, i) => {
    tone(c, out, {
      freq,
      at: 0.02,
      dur: 2.4,
      type: 'triangle',
      peak: 0.05,
      attack: 0.55,
      release: 0.9,
      detune: i % 2 ? 5 : -5,
    })
  })
  bell(c, out, 440.0, 0.05, 0.12, 0.5) // A4
  bell(c, out, 587.33, 0.42, 0.12, 0.55) // D5
  bell(c, out, 880.0, 0.82, 0.14, 1.5) // A5, held
  bell(c, out, 739.99, 1.6, 0.07, 1.1) // F#5 echo
  tone(c, out, { freq: 73.42, at: 0.8, dur: 1.7, peak: 0.09, attack: 0.3, release: 0.8 }) // D2 root
}

/**
 * Which sound an "open window" request should make: a fresh window pops open,
 * a minimized one swooshes back, an already-visible one just gets focus.
 */
export function soundForWindowAction(existing: { isMinimized: boolean } | undefined): UiSound | null {
  if (!existing) return 'openWindow'
  if (existing.isMinimized) return 'restore'
  return null
}

export function playSound(name: UiSound): void {
  if (muted || Date.now() < suppressUiUntil) return
  const c = readyCtx()
  if (!c || !bus) return
  const out = bus
  switch (name) {
    case 'openWindow':
      tone(c, out, { freq: 659.25, dur: 0.05, peak: 0.09, release: 0.07 })
      tone(c, out, { freq: 880.0, at: 0.07, dur: 0.06, peak: 0.11, release: 0.1 })
      break
    case 'closeWindow':
      tone(c, out, { freq: 880.0, dur: 0.05, peak: 0.1, release: 0.07 })
      tone(c, out, { freq: 587.33, at: 0.07, dur: 0.06, peak: 0.09, release: 0.1 })
      break
    case 'minimize':
      noiseBurst(c, out, { dur: 0.2, peak: 0.06, filter: 'lowpass', from: 2200, to: 260, q: 0.8 })
      tone(c, out, { freq: 420, slideTo: 160, dur: 0.18, peak: 0.05, release: 0.08 })
      break
    case 'restore':
      noiseBurst(c, out, { dur: 0.2, peak: 0.06, filter: 'lowpass', from: 260, to: 2200, q: 0.8 })
      tone(c, out, { freq: 160, slideTo: 420, dur: 0.18, peak: 0.05, release: 0.08 })
      break
    case 'menuPop':
      tone(c, out, { freq: 987.77, dur: 0.035, type: 'triangle', peak: 0.07, release: 0.06 })
      break
    case 'click':
      tone(c, out, { freq: 1975.5, dur: 0.018, peak: 0.05, release: 0.03 })
      noiseBurst(c, out, { dur: 0.015, peak: 0.03, filter: 'highpass', from: 3000, release: 0.02 })
      break
    case 'error':
      // Two-tone "ding-dong" in the spirit of the XP exclamation.
      tone(c, out, { freq: 783.99, dur: 0.16, type: 'triangle', peak: 0.12, release: 0.25 })
      tone(c, out, { freq: 787.0, dur: 0.16, type: 'sine', peak: 0.05, release: 0.25 })
      tone(c, out, { freq: 587.33, at: 0.14, dur: 0.28, type: 'triangle', peak: 0.12, release: 0.4 })
      break
    case 'sleep':
      tone(c, out, { freq: 587.33, dur: 0.45, peak: 0.07, attack: 0.09, release: 0.5 })
      tone(c, out, { freq: 392.0, at: 0.32, dur: 0.7, peak: 0.07, attack: 0.12, release: 0.7 })
      break
  }
}

/**
 * CD-ROM drive spin-up + seek ticks for the Vijcarta autorun screen.
 * Returns a stop() handle so skipping the intro cuts the audio.
 */
export function playCdInsert(): () => void {
  if (muted) return noop
  const c = readyCtx()
  if (!c || !bus) return noop
  const out = bus
  const sources: AudioScheduledSourceNode[] = []
  // Drive motor winding up
  sources.push(tone(c, out, { freq: 42, slideTo: 118, dur: 1.0, peak: 0.05, attack: 0.18, release: 0.3 }))
  // Air/spindle noise
  sources.push(noiseBurst(c, out, { dur: 1.0, peak: 0.035, filter: 'bandpass', from: 240, to: 900, q: 1.4, attack: 0.2, release: 0.3 }))
  // Head seek ticks
  for (const at of [0.3, 0.52, 0.74]) {
    sources.push(noiseBurst(c, out, { at, dur: 0.012, peak: 0.05, filter: 'highpass', from: 2500, release: 0.015 }))
  }
  return stopAll(sources)
}

/**
 * Encarta-inspired splash jingle for Vijcarta '26: warm add9 pad, rising
 * celesta arpeggio, low root and a breath of air. ~2.6s plus reverb tail.
 * Returns a stop() handle so skipping the splash cuts the audio.
 */
export function playVijcartaJingle(): () => void {
  if (muted) return noop
  const c = readyCtx()
  if (!c || !bus) return noop
  const out = bus
  const sources: AudioScheduledSourceNode[] = []
  // Pad: Cadd9 (C4 E4 G4 D5)
  const pad = [261.63, 329.63, 392.0, 587.33]
  pad.forEach((freq, i) => {
    sources.push(tone(c, out, {
      freq,
      at: 0.02,
      dur: 1.9,
      type: 'triangle',
      peak: 0.05,
      attack: 0.5,
      release: 0.7,
      detune: i % 2 ? 6 : -6,
    }))
  })
  // Low root swell (C2)
  sources.push(tone(c, out, { freq: 65.41, at: 0.15, dur: 1.9, peak: 0.09, attack: 0.4, release: 0.6 }))
  // Celesta arpeggio: C5 E5 G5 C6, then a held E6+G5 sparkle
  const arp: Array<[number, number]> = [[523.25, 0.12], [659.25, 0.3], [783.99, 0.48], [1046.5, 0.66]]
  for (const [freq, at] of arp) {
    sources.push(tone(c, out, { freq, at, dur: 0.14, peak: 0.1, release: 0.35 }))
    sources.push(tone(c, out, { freq: freq * 2.002, at, dur: 0.1, peak: 0.025, release: 0.25 }))
  }
  sources.push(tone(c, out, { freq: 1318.5, at: 0.95, dur: 0.8, peak: 0.09, release: 0.9 })) // E6
  sources.push(tone(c, out, { freq: 783.99, at: 0.95, dur: 0.8, peak: 0.06, release: 0.9 })) // G5
  // A breath of air rising under the sparkle
  sources.push(noiseBurst(c, out, { at: 0.7, dur: 1.1, peak: 0.018, filter: 'highpass', from: 3800, to: 6800, attack: 0.5, release: 0.5 }))
  return stopAll(sources)
}
