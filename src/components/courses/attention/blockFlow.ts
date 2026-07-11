// Pure math behind the TransformerBlockDiagram data-flow panel: one real
// forward pass through a pre-norm block. 4 tokens, d=6, 2 heads × d_head=3,
// d_ff=24, fixed seeded weights, no biases, LayerNorm with γ=1, β=0.
export const FLOW_TOKENS = ['The', 'cat', 'sat', 'here']
// Real GPT-2 tokenizer ids for "The cat sat here" (one token per word),
// verified with js-tiktoken's gpt2 encoding.
export const TOKEN_IDS = [464, 3797, 3332, 994]
export const D_MODEL = 6
export const N_HEADS = 2
export const D_HEAD = 3 // D_MODEL / N_HEADS
export const D_FF = 24 // 4 × D_MODEL

// Deterministic PRNG so the fixed weights are reproducible without literal blobs.
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const randMat = (rows: number, cols: number, seed: number, scale = 0.55) => {
  const rnd = mulberry32(seed)
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rnd() * 2 - 1) * scale))
}

// Seed chosen by search so the two heads' patterns are visibly different
// (head 1's per-row argmax lands on "The"/"cat", head 2's on "sat"/"here",
// peaks up to 0.72) and every displayed value stays within the color ramp.
// blockFlow.test.ts locks these properties — a seed change must keep them
// or the step-2 note text in TransformerBlockDiagram must change with it.
const SEED = 225
const W_Q = randMat(D_MODEL, D_MODEL, SEED)
const W_K = randMat(D_MODEL, D_MODEL, SEED + 1)
const W_V = randMat(D_MODEL, D_MODEL, SEED + 2)
const W_O = randMat(D_MODEL, D_MODEL, SEED + 3)
const W_1 = randMat(D_FF, D_MODEL, SEED + 4)
const W_2 = randMat(D_MODEL, D_FF, SEED + 5, 0.3)

export const EMB = [
  [0.2, -0.6, 0.4, 0.1, -0.3, 0.5],
  [0.9, 0.3, -0.5, 0.7, 0.2, -0.4],
  [-0.4, 0.8, 0.6, -0.2, 0.5, 0.1],
  [0.5, -0.3, -0.7, -0.8, 0.4, 0.6],
]

// Sinusoidal position vector: 3 (sin, cos) frequency pairs across d=6, halved
// so the sum with the embedding stays legible.
export const posVec = (p: number) => [0.9, 0.35, 0.15].flatMap(w => [Math.sin(w * p), Math.cos(w * p)]).map(v => v * 0.5)
export const POS = FLOW_TOKENS.map((_, p) => posVec(p))

const matVec = (W: number[][], x: number[]) => W.map(row => row.reduce((acc, w, i) => acc + w * x[i], 0))
const layerNorm = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length + 1e-5)
  return v.map(x => (x - m) / sd)
}

function blockForward() {
  const x0 = EMB.map((e, p) => e.map((v, d) => v + POS[p][d]))
  const x1 = x0.map(layerNorm)
  const q = x1.map(v => matVec(W_Q, v))
  const k = x1.map(v => matVec(W_K, v))
  const vv = x1.map(v => matVec(W_V, v))
  // Per-head attention over column slices [h·D_HEAD, (h+1)·D_HEAD)
  const headWeights: number[][][] = []
  const headOut: number[][][] = []
  for (let h = 0; h < N_HEADS; h++) {
    const lo = h * D_HEAD
    const w = q.map(qi => {
      const scores = k.map(kj => {
        let acc = 0
        for (let d = lo; d < lo + D_HEAD; d++) acc += qi[d] * kj[d]
        return acc / Math.sqrt(D_HEAD)
      })
      const mx = Math.max(...scores)
      const exps = scores.map(sc => Math.exp(sc - mx))
      const sum = exps.reduce((a, b) => a + b, 0)
      return exps.map(e => e / sum)
    })
    headWeights.push(w)
    headOut.push(w.map(wi => Array.from({ length: D_HEAD }, (_, d) =>
      wi.reduce((acc, wj, j) => acc + wj * vv[j][lo + d], 0))))
  }
  const concat = headOut[0].map((row, i) => [...row, ...headOut[1][i]])
  const a = concat.map(row => matVec(W_O, row))
  const x2 = x0.map((v, i) => v.map((x, d) => x + a[i][d]))
  const x3 = x2.map(layerNorm)
  const f = x3.map(v => matVec(W_2, matVec(W_1, v).map(h => Math.max(0, h))))
  const out = x2.map((v, i) => v.map((x, d) => x + f[i][d]))
  return { x0, x1, q, k, v: vv, headWeights, headOut, concat, a, x2, x3, f, out }
}

export const FLOW = blockForward()
