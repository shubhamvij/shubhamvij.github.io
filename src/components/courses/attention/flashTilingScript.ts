// Pure logic behind the Flash Tiling Lab — no React, no DOM, fully testable.
//
// The score-matrix VISUAL is a toy 16×16 (4×4 tiles) so it reads at widget
// size, but every byte and time figure is computed at REAL scale so the meters
// mean something. Hardware anchors are A100-80GB, matching subchapter 3.2's
// prose and FlashAttention (Dao et al. 2022, §1–2): HBM 1.5–2.0 TB/s (we use
// 2.0); 108 SMs × 192 KB SRAM ≈ 20 MB at ~19 TB/s; bf16 tensor-core peak
// 312 TFLOP/s (A100 dense). Verified 2026-07-11 against the paper + datasheet.

export const N_REAL = 4096
export const D_HEAD = 64
export const BYTES = 2 // bf16
export const SRAM_MB = 20
export const HBM_TBS = 2 // TB/s
export const MATMUL_TFLOPS = 312 // bf16 dense tensor cores

const MB = 1e6
export const QKVO_MB = (N_REAL * D_HEAD * BYTES) / MB // 0.524288 — one of Q/K/V/O
export const S_MB = (N_REAL * N_REAL * BYTES) / MB // 33.554432 — full n×n scores

// Toy visual geometry. TILES_PER_SIDE doubles as the number of Q row-blocks.
export const GRID = 16
export const TILE = 4
export const TILES_PER_SIDE = GRID / TILE // 4

// One 1024×1024 flash score tile at real scale (fits the 20 MB SRAM budget).
const SCORE_TILE_MB = ((N_REAL / TILES_PER_SIDE) ** 2 * BYTES) / MB // 2.097
const Q_BLOCK_MB = QKVO_MB / TILES_PER_SIDE // 0.131 — one Q row-block
const KV_COL_MB = (2 * QKVO_MB) / TILES_PER_SIDE // 0.262 — K+V one column chunk
const FLASH_SRAM_MB = Q_BLOCK_MB + KV_COL_MB + SCORE_TILE_MB // ~2.49 resident set
const FLASH_TOTAL = 10 * QKVO_MB // Q + 4·(K+V) + O = 5.24
const FLASH_AFTER_TWO = Q_BLOCK_MB + 2 * KV_COL_MB // 0.655 after the two fine tiles

export type Visual =
  | { kind: 'hw' }
  | { kind: 'naiveFill' } // S fully materialized in HBM
  | { kind: 'naiveSoftmax' } // full S, a row highlighted (row-wise normalize)
  | { kind: 'naiveOut' } // reading P+V → O
  | { kind: 'flashTile'; tile: number; rescale: boolean } // active gold tile in SRAM
  | { kind: 'flashDone' } // all tiles swept
  | { kind: 'verdict' }

export type Step = {
  act: 1 | 2 | 3
  label: string
  caption: string
  hbmDelta: number // MB moved this step
  odometer: number // cumulative MB after this step (filled by withOdometer)
  sramMb: number // MB resident in SRAM during this step
  hbmScores: boolean // is the n×n S resident in HBM this step
  visual: Visual
  arrow: 'load' | 'store' | null
}

const withOdometer = (steps: Omit<Step, 'odometer'>[]): Step[] => {
  let acc = 0
  return steps.map(st => {
    acc += st.hbmDelta
    return { ...st, odometer: acc }
  })
}

// ---- Act 1: naive attention = three kernels, each round-trips HBM ----
export const ACT1: Step[] = withOdometer([
  {
    act: 1, label: 'the hardware', arrow: null, hbmDelta: 0, sramMb: 0, hbmScores: false,
    visual: { kind: 'hw' },
    caption:
      'Two memories. HBM is huge and slow (~2 TB/s); on-chip SRAM is tiny (~20 MB) and ~10× faster, and the compute units read only from SRAM. Q, K, V start in HBM. We draw a 16×16 score matrix so you can see it — the meters below use the real n = 4096.',
  },
  {
    act: 1, label: 'kernel 1 loads Q, K', arrow: 'load', hbmDelta: 2 * QKVO_MB, sramMb: 2 * QKVO_MB, hbmScores: false,
    visual: { kind: 'hw' },
    caption: 'Kernel 1 — the QKᵀ matmul — streams Q and K from HBM into SRAM. About 1 MB. Cheap.',
  },
  {
    act: 1, label: 'kernel 1 spills S', arrow: 'store', hbmDelta: S_MB, sramMb: 2 * QKVO_MB, hbmScores: true,
    visual: { kind: 'naiveFill' },
    caption:
      'It computes all n² scores — but S is 33.6 MB, larger than SRAM itself, and the kernel is ending. So every score is written back to HBM. 16.8 million numbers to slow memory: the original sin.',
  },
  {
    act: 1, label: 'kernel 2 re-reads S', arrow: 'load', hbmDelta: S_MB, sramMb: 2 * QKVO_MB, hbmScores: true,
    visual: { kind: 'naiveSoftmax' },
    caption:
      'Softmax is a separate kernel, so it reads all 33.6 MB of S back in — the same numbers written moments ago. A kernel boundary forces the round trip.',
  },
  {
    act: 1, label: 'kernel 2 writes P', arrow: 'store', hbmDelta: S_MB, sramMb: 2 * QKVO_MB, hbmScores: true,
    visual: { kind: 'naiveSoftmax' },
    caption: 'It normalizes each row and writes the n×n probabilities P back to HBM — another 33.6 MB out.',
  },
  {
    act: 1, label: 'kernel 3 writes O', arrow: 'store', hbmDelta: S_MB + 2 * QKVO_MB, sramMb: 2 * QKVO_MB, hbmScores: true,
    visual: { kind: 'naiveOut' },
    caption:
      'Kernel 3 reads P back (33.6 MB) and V, multiplies, and writes the output O. Three kernels, four full trips through the n×n matrix.',
  },
  {
    act: 1, label: 'verdict', arrow: null, hbmDelta: 0, sramMb: 0, hbmScores: true,
    visual: { kind: 'verdict' },
    caption:
      'About 136 MB moved — nearly all of it S and P, which the final answer never needed. At 2 TB/s that is ~68 µs of memory traffic versus ~14 µs of actual math: the GPU spent most of the time waiting, not multiplying.',
  },
])

// ---- Act 2: FlashAttention = one fused kernel, S never born in HBM ----
// FA-2 loop order (outer over Q row-blocks, inner over K/V): Q loaded once
// (0.524) + K,V re-streamed once per row-block (4 × 1.048) + O written once
// (0.524) = 5.24 MB = 10 × QKVO_MB. Fine steps walk row-block 0's first two
// column tiles, then one jump processes the rest.
export const ACT2: Step[] = withOdometer([
  {
    act: 2, label: 'one kernel', arrow: null, hbmDelta: 0, sramMb: 0, hbmScores: false,
    visual: { kind: 'hw' },
    caption:
      'FlashAttention fuses everything into one kernel with no boundaries, so nothing has to spill. SRAM now holds a Q-block, a K/V-block, one score tile, the running stats (m, ℓ), and the output block.',
  },
  {
    act: 2, label: 'load first blocks', arrow: 'load', hbmDelta: Q_BLOCK_MB + KV_COL_MB, sramMb: FLASH_SRAM_MB, hbmScores: false,
    visual: { kind: 'flashTile', tile: 0, rescale: false },
    caption: 'Load one block of Q rows and one block of K/V columns into SRAM — a fraction of a MB.',
  },
  {
    act: 2, label: 'score tile in SRAM', arrow: null, hbmDelta: 0, sramMb: FLASH_SRAM_MB, hbmScores: false,
    visual: { kind: 'flashTile', tile: 0, rescale: false },
    caption:
      'Compute this 4×4 block of scores right here in SRAM. HBM traffic this step: +0 MB. This is the whole trick — the score tile is born and dies on-chip.',
  },
  {
    act: 2, label: 'online softmax seeds m, ℓ', arrow: null, hbmDelta: 0, sramMb: FLASH_SRAM_MB, hbmScores: false,
    visual: { kind: 'flashTile', tile: 0, rescale: false },
    caption:
      'Fold the tile into the output while tracking a running max (m) and running denominator (ℓ) per row. The first tile just seeds m and ℓ.',
  },
  {
    act: 2, label: 'next tile rescales', arrow: 'load', hbmDelta: KV_COL_MB, sramMb: FLASH_SRAM_MB, hbmScores: false,
    visual: { kind: 'flashTile', tile: 1, rescale: true },
    caption:
      'Stream the next K/V block, score the next tile. It raises the running max — so the output accumulated so far is rescaled to match. Algebraically identical to a full-row softmax: exact, not approximate.',
  },
  {
    act: 2, label: 'process remaining tiles', arrow: 'load', hbmDelta: FLASH_TOTAL - FLASH_AFTER_TWO, sramMb: FLASH_SRAM_MB, hbmScores: false,
    visual: { kind: 'flashDone' },
    caption:
      'Repeat across every tile and row-block. K/V re-stream once per row-block and each output block is written exactly once — the n×n matrix never touches HBM.',
  },
  {
    act: 2, label: 'verdict', arrow: null, hbmDelta: 0, sramMb: 0, hbmScores: false,
    visual: { kind: 'verdict' },
    caption:
      'About 5 MB moved instead of 136, and peak score memory was one tile, never n×n. Same FLOPs, a fraction of the bytes.',
  },
])

// ---- Act 3: the verdict (single screen; component renders comparison panels) ----
export const ACT3: Step[] = [
  {
    act: 3, label: 'the verdict', arrow: null, hbmDelta: 0, odometer: 0, sramMb: 0, hbmScores: false,
    visual: { kind: 'verdict' },
    caption: 'Same math, a fraction of the movement — that gap is the entire speedup.',
  },
]

export const ACTS: Record<1 | 2 | 3, Step[]> = { 1: ACT1, 2: ACT2, 3: ACT3 }

// ---- Derived totals (locked by tests) ----
export const NAIVE_TOTAL_MB = ACT1[ACT1.length - 1].odometer // 136.31
export const FLASH_TOTAL_MB = ACT2[ACT2.length - 1].odometer // 5.24
export const TRAFFIC_RATIO = NAIVE_TOTAL_MB / FLASH_TOTAL_MB // 26.0
export const ATTN_GFLOP = (2 * (2 * N_REAL * N_REAL * D_HEAD)) / 1e9 // 4.29 (QKᵀ + PV)
export const NAIVE_US = NAIVE_TOTAL_MB / HBM_TBS // 68.16 — memory-bound
export const MATH_US = (ATTN_GFLOP / MATMUL_TFLOPS) * 1e3 // 13.77
const FLASH_MEM_US = FLASH_TOTAL_MB / HBM_TBS // 2.62
export const FLASH_US = Math.max(FLASH_MEM_US, MATH_US) // 13.77 — compute-bound

export const fmtMb = (mb: number) => (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1))
