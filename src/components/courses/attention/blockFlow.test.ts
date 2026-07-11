import { describe, it, expect } from 'vitest'
import { FLOW, FLOW_TOKENS, TOKEN_IDS, EMB, POS, posVec, D_MODEL, D_HEAD, N_HEADS, D_FF } from './blockFlow'

const argmax = (r: number[]) => r.indexOf(Math.max(...r))
const maxAbs = (m: number[][]) => Math.max(...m.flat().map(Math.abs))

describe('blockFlow forward pass', () => {
  it('has 4 tokens × 6 dims through the block, 2 heads of 4×4 weights and 4×3 outputs', () => {
    expect(FLOW_TOKENS).toHaveLength(4)
    expect(D_MODEL).toBe(6)
    expect(D_FF).toBe(24)
    for (const m of [FLOW.x0, FLOW.x1, FLOW.q, FLOW.k, FLOW.v, FLOW.a, FLOW.x2, FLOW.x3, FLOW.f, FLOW.out, FLOW.concat]) {
      expect(m).toHaveLength(4)
      for (const row of m) expect(row).toHaveLength(D_MODEL)
    }
    expect(FLOW.headWeights).toHaveLength(N_HEADS)
    for (const hw of FLOW.headWeights) {
      expect(hw).toHaveLength(4)
      for (const row of hw) expect(row).toHaveLength(4)
    }
    expect(FLOW.headOut).toHaveLength(N_HEADS)
    for (const ho of FLOW.headOut) {
      expect(ho).toHaveLength(4)
      for (const row of ho) expect(row).toHaveLength(D_HEAD)
    }
  })

  it('token ids are the real GPT-2 tokenizer ids for "The cat sat here"', () => {
    // verified against js-tiktoken's gpt2 encoding: one token per word
    expect(TOKEN_IDS).toEqual([464, 3797, 3332, 994])
    expect(TOKEN_IDS).toHaveLength(FLOW_TOKENS.length)
  })

  it('x0 is exactly token embedding + position vector, elementwise', () => {
    for (let p = 0; p < 4; p++) {
      for (let d = 0; d < D_MODEL; d++) {
        expect(FLOW.x0[p][d]).toBeCloseTo(EMB[p][d] + POS[p][d], 10)
      }
    }
  })

  it('position vector at pos 0 is the sin/cos barcode [0, .5, 0, .5, 0, .5]', () => {
    expect(posVec(0).map(v => Number(v.toFixed(4)))).toEqual([0, 0.5, 0, 0.5, 0, 0.5])
    expect(POS[2]).toEqual(posVec(2))
  })

  it('per-head attention rows sum to 1', () => {
    for (const hw of FLOW.headWeights) {
      for (const row of hw) {
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
      }
    }
  })

  // Locks the seed to the pedagogy: step-2 note text claims head 1 leans toward
  // "The"/"cat" while head 2 locks onto "sat"/"here". If a seed change breaks
  // this, the note text must change too.
  it('the two heads attend visibly differently (head 1 → cols {0,1}, head 2 → cols {2,3})', () => {
    const [h1, h2] = FLOW.headWeights
    for (const row of h1) expect([0, 1]).toContain(argmax(row))
    for (const row of h2) expect([2, 3]).toContain(argmax(row))
  })

  it('each head has peaky rows (max weight ≥ 0.45 in at least 2 rows)', () => {
    for (const hw of FLOW.headWeights) {
      const peaky = hw.filter(row => Math.max(...row) >= 0.45).length
      expect(peaky).toBeGreaterThanOrEqual(2)
    }
  })

  it('all displayed tensors stay within the color ramp\'s useful range', () => {
    for (const m of [FLOW.x0, FLOW.x1, FLOW.q, FLOW.k, FLOW.v, FLOW.a, FLOW.x2, FLOW.x3, FLOW.f, FLOW.out, ...FLOW.headOut]) {
      expect(maxAbs(m)).toBeLessThanOrEqual(2.3)
    }
  })

  it('the FFN is alive (ReLU did not zero the edit out)', () => {
    expect(maxAbs(FLOW.f)).toBeGreaterThanOrEqual(0.1)
  })
})
