import { describe, it, expect } from 'vitest'
import {
  ACT1, ACT2, ACT3, S_MB, QKVO_MB, SRAM_MB,
  NAIVE_TOTAL_MB, FLASH_TOTAL_MB, TRAFFIC_RATIO,
  ATTN_GFLOP, NAIVE_US, MATH_US, FLASH_US,
} from './flashTilingScript'

describe('naive accounting', () => {
  it('total equals the closed form 4·S + 4·(Q/K/V/O) ≈ 136.3 MB', () => {
    expect(NAIVE_TOTAL_MB).toBeCloseTo(4 * S_MB + 4 * QKVO_MB, 6)
    expect(NAIVE_TOTAL_MB).toBeCloseTo(136.31, 1)
  })
  it('odometer is monotonically non-decreasing', () => {
    for (let i = 1; i < ACT1.length; i++) {
      expect(ACT1[i].odometer).toBeGreaterThanOrEqual(ACT1[i - 1].odometer)
    }
  })
})

describe('flash accounting', () => {
  it('total equals 10× one Q/K/V/O tensor (Q + 4·(K+V) + O) ≈ 5.24 MB', () => {
    expect(FLASH_TOTAL_MB).toBeCloseTo(10 * QKVO_MB, 6)
    expect(FLASH_TOTAL_MB).toBeCloseTo(5.24, 2)
  })
  it('the score-tile compute step moves zero bytes (the whole trick)', () => {
    const zero = ACT2.find(st => st.visual.kind === 'flashTile' && st.caption.includes('+0 MB'))
    expect(zero).toBeDefined()
    expect(zero!.hbmDelta).toBe(0)
  })
  it('traffic reduction is ~26×', () => {
    expect(TRAFFIC_RATIO).toBeCloseTo(26, 0)
  })
})

describe('invariants across all acts', () => {
  it('SRAM never exceeds the 20 MB budget in any step', () => {
    for (const st of [...ACT1, ...ACT2, ...ACT3]) expect(st.sramMb).toBeLessThanOrEqual(SRAM_MB)
  })
  it('naive materializes S in HBM; flash never does', () => {
    expect(ACT1.some(st => st.hbmScores)).toBe(true)
    expect(ACT2.every(st => !st.hbmScores)).toBe(true)
  })
  it('FLOPs identical (flash reduces bytes, not math) ≈ 4.29 GFLOP', () => {
    expect(ATTN_GFLOP).toBeCloseTo(4.29, 1)
  })
  it('naive is memory-bound (~68 µs); flash is compute-bound at the math time (~14 µs)', () => {
    expect(NAIVE_US).toBeCloseTo(68.2, 0)
    expect(MATH_US).toBeCloseTo(13.8, 0)
    expect(FLASH_US).toBeCloseTo(MATH_US, 6)
  })
  it('every step has a non-empty label and caption', () => {
    for (const st of [...ACT1, ...ACT2, ...ACT3]) {
      expect(st.label.length).toBeGreaterThan(0)
      expect(st.caption.length).toBeGreaterThan(0)
    }
  })
})
