# Flash Tiling Lab Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Flash Tiling Lab (subchapter 3.2 of the attention-mechanisms course) as a guided three-act walkthrough with live per-step HBM/SRAM memory meters, ending in an engineered aha moment: same FLOPs, ~26× fewer bytes moved, ~5× faster.

**Architecture:** Split the lab into a pure logic module (`flashTilingScript.ts`, all numbers/captions/step-arrays, no React — mirrors the existing `blockFlow.ts` + `TransformerBlockDiagram.tsx` precedent) and a thin presentational component (`FlashTilingLab.tsx`) that switches on a per-step `visual` discriminated union. Two new test files; no timers (pure click-stepper like every sibling lab); no CSS changes (reuse existing lab classes).

**Tech Stack:** Next.js static export, React (client components), TypeScript, CSS Modules, Vitest + @testing-library/react, jsdom.

## Global Constraints

- **Toy visual, real meters:** score matrix drawn at 16×16 (4×4 tiles); every byte/time figure computed at real scale n=4096, d_head=64, bf16 (2 bytes).
- **Hardware anchors (A100-80GB, fact-checked 2026-07-11 against Dao et al. 2022 §1–2 and the NVIDIA A100 datasheet):** HBM 2 TB/s; SRAM 20 MB aggregate (108 SMs × 192 KB) at ~19 TB/s; bf16 tensor-core peak 312 TFLOP/s.
- **Verified figures (locked by tests, do not hand-edit to different values):** naive traffic ≈ 136.3 MB; flash traffic ≈ 5.24 MB; ratio ≈ 26×; attention ≈ 4.29 GFLOP; naive ≈ 68 µs (memory-bound); flash ≈ 14 µs (compute-bound, = the math time).
- **No timers, no animation frame:** no `setInterval`/`setTimeout`/`requestAnimationFrame`/`useEffect`. "Process remaining tiles" is a single instant state jump to the `flashDone` step (matrix greys, odometer lands at the final value) — no motion to guard, so `prefers-reduced-motion` is satisfied trivially. Every act is a pure click-stepper like every sibling lab.
- **Do not touch** `src/components/courses/engine/course.module.css`, `blockFlow.ts`, `blockFlow.test.ts`, or `attentionCourse.test.tsx` — a concurrent session is editing some of these. Reuse existing CSS classes only.
- **Client component:** `FlashTilingLab.tsx` keeps its `'use client'` directive; `flashTilingScript.ts` is a plain module with no directive (like `blockFlow.ts`).
- **Determinism:** no `Date.now()`, no `Math.random()`.
- **Staging:** `git add` by explicit path only (never `git add -A`/`.`).

---

### Task 1: Pure logic module `flashTilingScript.ts` + math tests

**Files:**
- Create: `src/components/courses/attention/flashTilingScript.ts`
- Test: `src/components/courses/attention/flashTilingScript.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces (relied on by Task 3):
  - Constants: `GRID: number` (16), `TILE: number` (4), `TILES_PER_SIDE: number` (4), `SRAM_MB: number` (20), `S_MB: number`, `QKVO_MB: number`, `NAIVE_TOTAL_MB: number`, `FLASH_TOTAL_MB: number`, `TRAFFIC_RATIO: number`, `ATTN_GFLOP: number`, `NAIVE_US: number`, `MATH_US: number`, `FLASH_US: number`.
  - Types: `Visual` (discriminated union on `kind`), `Step` (`{ act, label, caption, hbmDelta, odometer, sramMb, hbmScores, visual, arrow }`).
  - `ACT1: Step[]`, `ACT2: Step[]`, `ACT3: Step[]`, and `ACTS: Record<1|2|3, Step[]>`.
  - `fmtMb(mb: number): string`.

- [ ] **Step 1: Write the module**

Create `src/components/courses/attention/flashTilingScript.ts`:

```ts
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
export const SRAM_TBS = 19 // TB/s
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
```

- [ ] **Step 2: Write the failing math test**

Create `src/components/courses/attention/flashTilingScript.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/attention/flashTilingScript.test.ts`
Expected: PASS — all 11 assertions green. (The module is written first because the arithmetic is the correctness-critical core; the test locks the verified figures from Global Constraints.)

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/attention/flashTilingScript.ts src/components/courses/attention/flashTilingScript.test.ts
git commit -m "Add flashTilingScript: pure 3-act memory-traffic model for Flash Tiling Lab"
```

---

### Task 2: Rewrite `FlashTilingLab.tsx` as the 3-act walkthrough + component tests

**Files:**
- Modify (full rewrite): `src/components/courses/attention/FlashTilingLab.tsx`
- Test: `src/components/courses/attention/FlashTilingLab.test.tsx`

**Interfaces:**
- Consumes: everything Task 1 produces (`ACTS`, `GRID`, `TILE`, `TILES_PER_SIDE`, `SRAM_MB`, `NAIVE_TOTAL_MB`, `FLASH_TOTAL_MB`, `TRAFFIC_RATIO`, `ATTN_GFLOP`, `NAIVE_US`, `FLASH_US`, `fmtMb`, types `Step`/`Visual`).
- Produces: default-exported `FlashTilingLab` React component (already wired at `index.tsx:41` as widget `'flash-tiling'` — no wiring change needed).

- [ ] **Step 1: Write the failing component test**

Create `src/components/courses/attention/FlashTilingLab.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlashTilingLab from './FlashTilingLab'

describe('FlashTilingLab 3-act walkthrough', () => {
  it('opens on Act 1 step 0 with the hardware framing', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/Two memories/)).toBeDefined()
    // odometer starts at 0 MB
    expect(screen.getByText(/HBM traffic so far/i)).toBeDefined()
  })

  it('next/back walk Act 1 and clamp at the ends', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next) // step 1
    expect(screen.getByText(/streams Q and K/)).toBeDefined()
    const back = screen.getByRole('button', { name: /back/i })
    fireEvent.click(back) // back to step 0
    expect(screen.getByText(/Two memories/)).toBeDefined()
    fireEvent.click(back) // clamp — still step 0
    expect(screen.getByText(/Two memories/)).toBeDefined()
  })

  it('reaches the Act 1 verdict (~136 MB, ~68 µs) by stepping to the end', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    for (let i = 0; i < 6; i++) fireEvent.click(next)
    expect(screen.getByText(/136 MB moved/)).toBeDefined()
  })

  it('the flash tab shows the +0 MB score-tile step (traffic-free compute)', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /flash/i }))
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next) // load blocks
    fireEvent.click(next) // score tile in SRAM
    expect(screen.getByText(/\+0 MB/)).toBeDefined()
  })

  it('switching acts resets that act to step 0', () => {
    render(<FlashTilingLab />)
    const next = screen.getByRole('button', { name: /next/i })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(screen.getByRole('button', { name: /flash/i }))
    expect(screen.getByText(/fuses everything into one kernel/)).toBeDefined() // Act 2 step 0
  })

  it('the verdict tab shows both totals and the identical-FLOPs stamp', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /verdict/i }))
    // 136 / 5.2 / 26× each render in both a bar label and the footnote — assert presence, not uniqueness
    expect(screen.getAllByText(/136/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/5\.2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/26×/).length).toBeGreaterThan(0)
    expect(screen.getByText(/identical/i)).toBeDefined() // only in the <strong> stamp
  })

  it('keeps a peak-score-memory counter (referenced by quiz am3-2-q2)', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/peak score memory/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/FlashTilingLab.test.tsx`
Expected: FAIL — the current component has no `next`/`back`/act-tab buttons or verdict strings (it still uses the old `process next tile` UI).

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/components/courses/attention/FlashTilingLab.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'
import {
  ACTS, GRID, TILE, TILES_PER_SIDE, SRAM_MB,
  NAIVE_TOTAL_MB, FLASH_TOTAL_MB, TRAFFIC_RATIO, ATTN_GFLOP,
  NAIVE_US, FLASH_US, fmtMb, type Step, type Visual,
} from './flashTilingScript'

const M = 208 // matrix draw size (px), left of the memory boxes
const cell = M / GRID
const tileOf = (r: number, c: number) => Math.floor(r / TILE) * TILES_PER_SIDE + Math.floor(c / TILE)

// Score-matrix cell color for the current visual state.
function cellFill(v: Visual, r: number, c: number): string {
  switch (v.kind) {
    case 'hw':
    case 'verdict':
      return '#f7f5ec'
    case 'naiveFill':
    case 'naiveOut':
      return '#c86018'
    case 'naiveSoftmax':
      return r === 8 ? '#f0d98c' : '#c86018' // one row lit = row-wise normalize
    case 'flashTile': {
      const t = tileOf(r, c)
      return t === v.tile ? '#f0d98c' : t < v.tile ? '#dfe8df' : '#f7f5ec'
    }
    case 'flashDone':
      return '#dfe8df'
  }
}

// Small labeled block glyph inside a memory box.
function Block({ x, y, w, label, fill, stroke }: { x: number; y: number; w: number; label: string; fill: string; stroke: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={16} fill={fill} stroke={stroke} />
      <text x={x + w / 2} y={y + 11} textAnchor="middle" fontSize={8.5}>{label}</text>
    </>
  )
}

export default function FlashTilingLab() {
  const [act, setAct] = useState<1 | 2 | 3>(1)
  const [idx, setIdx] = useState(0)

  const steps = ACTS[act]
  const step: Step = steps[idx]
  const v = step.visual
  const flashResident = act === 2 && (v.kind === 'flashTile' || v.kind === 'flashDone')
  const gotoAct = (a: 1 | 2 | 3) => { setAct(a); setIdx(0) }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Flash Tiling Lab</span>
        <span className={s.widgetHint}>walk the memory, find the bottleneck</span>
      </div>
      <div className={s.widgetBody}>
        {/* Act breadcrumb tabs */}
        <div className={s.chipRow}>
          {([[1, '1 · naive'], [2, '2 · flash'], [3, '3 · verdict']] as const).map(([a, label]) => (
            <button key={a} type="button" className={`${s.chip} ${act === a ? s.chipOn : ''}`} onClick={() => gotoAct(a)}>
              {label}
            </button>
          ))}
        </div>

        <svg viewBox="0 0 480 250" className={s.labCanvas} role="img" aria-label="Attention score matrix and the GPU memory hierarchy, naive versus tiled">
          {/* score matrix (toy 16×16) */}
          {Array.from({ length: GRID }, (_, r) =>
            Array.from({ length: GRID }, (_, c) => (
              <rect key={`${r}-${c}`} x={8 + c * cell} y={8 + r * cell} width={cell - 0.6} height={cell - 0.6}
                fill={cellFill(v, r, c)} stroke="#e0dcc8" strokeWidth={0.4} />
            )),
          )}
          <text x={8} y={M + 22} fontSize={8.5} fill="#666">n×n scores S = QKᵀ {act === 1 ? '(shown 16×16; real n = 4096)' : '— only a tile exists at a time'}</text>

          {/* HBM box */}
          <text x={240} y={22} fontSize={10.5} fontFamily="Tahoma, sans-serif" fontWeight="bold">HBM · ~20 GB · 2 TB/s</text>
          <rect x={240} y={28} width={232} height={40} fill="#fbe7d4" stroke="#b88a5a" />
          <Block x={248} y={44} w={30} label="Q" fill="#fff" stroke="#b88a5a" />
          <Block x={282} y={44} w={30} label="K" fill="#fff" stroke="#b88a5a" />
          <Block x={316} y={44} w={30} label="V" fill="#fff" stroke="#b88a5a" />
          <Block x={350} y={44} w={30} label="O" fill="#fff" stroke="#b88a5a" />
          {step.hbmScores && <Block x={388} y={44} w={76} label="S 33.6 MB ✗" fill="#c86018" stroke="#8a3f10" />}

          {/* SRAM box */}
          <text x={240} y={92} fontSize={10.5} fontFamily="Tahoma, sans-serif" fontWeight="bold">on-chip SRAM · 20 MB · 19 TB/s</text>
          <rect x={240} y={98} width={232} height={40} fill="#e3f6e3" stroke="#6a9a6a" />
          {flashResident ? (
            <>
              <Block x={248} y={114} w={40} label="Q-blk" fill="#fff" stroke="#6a9a6a" />
              <Block x={292} y={114} w={44} label="K/V-blk" fill="#fff" stroke="#6a9a6a" />
              <Block x={340} y={114} w={40} label="tile" fill="#f0d98c" stroke="#9a7a1a" />
              <Block x={384} y={114} w={36} label="m, ℓ" fill="#fff" stroke="#6a9a6a" />
              <Block x={424} y={114} w={40} label="O-blk" fill="#fff" stroke="#6a9a6a" />
            </>
          ) : (
            <text x={356} y={122} textAnchor="middle" fontSize={9} fill="#6a9a6a">
              {act === 1 ? '(naive barely uses it)' : 'idle'}
            </text>
          )}

          {/* load/store arrow */}
          {step.arrow && (
            <text x={356} y={84} textAnchor="middle" fontSize={11} fill="#333" fontWeight="bold">
              {step.arrow === 'load' ? '↓ load into SRAM' : '↑ store to HBM'}
            </text>
          )}

          {/* online-softmax rescale beat */}
          {v.kind === 'flashTile' && v.rescale && (
            <text x={356} y={158} textAnchor="middle" fontSize={9} fill="#2f8e2f">running max rose → earlier output rescaled (exact)</text>
          )}
        </svg>

        {/* narration */}
        <div className={`${s.feedback} ${s.feedbackCorrect}`} aria-live="polite">
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{step.label}.</strong> {step.caption}</span>
        </div>

        {/* controls */}
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>← back</button>
          <button type="button" className={s.btn} onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))} disabled={idx >= steps.length - 1}>
            {act === 2 && step.label === 'next tile rescales' ? 'process remaining tiles →' : 'next →'}
          </button>
          <button type="button" className={s.btn} onClick={() => setIdx(0)} disabled={idx === 0}>restart act</button>
          <span className={s.labStat}>step <span className={s.labStatValue}>{idx + 1}/{steps.length}</span></span>
        </div>

        {/* live meters (Acts 1–2) or verdict panels (Act 3) */}
        {act === 3 ? (
          <VerdictPanels />
        ) : (
          <div className={s.gapChart}>
            <div className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>HBM traffic so far</span>
                <span className={s.gapSub}>{fmtMb(step.odometer)} MB of {fmtMb(NAIVE_TOTAL_MB)} MB (naive total)</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${Math.min(100, (step.odometer / NAIVE_TOTAL_MB) * 100)}%`, background: act === 1 ? '#c86018' : '#2b6fd0' }} />
              </div>
            </div>
            <div className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>SRAM in use</span>
                <span className={s.gapSub}>{step.sramMb.toFixed(1)} MB of {SRAM_MB} MB</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${Math.min(100, (step.sramMb / SRAM_MB) * 100)}%`, background: '#2f8e2f' }} />
              </div>
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>peak score memory <span className={s.labStatValue}>{act === 1 ? '16×16 = n² in HBM' : 'one 4×4 tile in SRAM'}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function bar(mb: number, maxMb: number) {
  return `${Math.min(100, (mb / maxMb) * 100)}%`
}

function VerdictPanels() {
  return (
    <div className={s.gapChart}>
      <div className={s.gapRow}>
        <div className={s.gapLabel}><span>bytes moved through HBM</span><span className={s.gapSub}>{TRAFFIC_RATIO.toFixed(0)}× less</span></div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(NAIVE_TOTAL_MB, NAIVE_TOTAL_MB), background: '#c86018' }} /></div>
        <div className={s.gapSub}>naive {fmtMb(NAIVE_TOTAL_MB)} MB</div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(FLASH_TOTAL_MB, NAIVE_TOTAL_MB), background: '#2b6fd0' }} /></div>
        <div className={s.gapSub}>flash {fmtMb(FLASH_TOTAL_MB)} MB</div>
      </div>
      <div className={s.gapRow}>
        <div className={s.gapLabel}><span>time (roofline estimate)</span><span className={s.gapSub}>{(NAIVE_US / FLASH_US).toFixed(1)}× faster</span></div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(NAIVE_US, NAIVE_US), background: '#c86018' }} /></div>
        <div className={s.gapSub}>naive {NAIVE_US.toFixed(0)} µs — memory-bound</div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(FLASH_US, NAIVE_US), background: '#2b6fd0' }} /></div>
        <div className={s.gapSub}>flash {FLASH_US.toFixed(0)} µs — compute-bound</div>
      </div>
      <p className={s.labNote}>
        <strong>FLOPs: {ATTN_GFLOP.toFixed(1)} G — identical.</strong> Bytes: {fmtMb(NAIVE_TOTAL_MB)} MB → {fmtMb(FLASH_TOTAL_MB)} MB.
        You didn&apos;t do less math; you stopped commuting it through slow memory. This was one head, one layer —
        an 8B-class model runs about a thousand of these per forward pass. This toy uses 4 large tiles ({TRAFFIC_RATIO.toFixed(0)}× on paper);
        real kernels use smaller blocks limited by per-SM SRAM, so K/V re-stream more and the measured win is a few-fold —
        FlashAttention reports up to 9× fewer HBM accesses and up to 7.6× faster attention (~3× end-to-end on GPT-2),
        since real kernels also overlap compute with memory movement.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npx vitest run src/components/courses/attention/FlashTilingLab.test.tsx`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Typecheck the two new source files compile**

Run: `npx tsc --noEmit`
Expected: no errors introduced by `flashTilingScript.ts` / `FlashTilingLab.tsx` (pre-existing errors elsewhere, if any, are out of scope — compare against a baseline `git stash` run only if unsure).

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/attention/FlashTilingLab.tsx src/components/courses/attention/FlashTilingLab.test.tsx
git commit -m "Rewrite Flash Tiling Lab as guided 3-act walkthrough with live memory meters"
```

---

### Task 3: Content touches — quiz string + remove stale test block

**Files:**
- Modify: `src/components/courses/attention/efficiencySubchapters.tsx` (one quiz explain string)
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (remove the stale `FlashTilingLab` describe block + its now-unused import)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. This task removes a test that asserts deleted behavior and fixes one prose reference to the lab's counter.

- [ ] **Step 1: Fix the quiz reference to the lab's counter**

The rewritten lab labels its counter "peak score memory" (not "second counter"). In `src/components/courses/attention/efficiencySubchapters.tsx`, the `am3-2-q2` distractor explanation currently reads:

```tsx
            { text: 'Peak memory for the score matrix', explain: 'Reduced from n² to one tile — the lab\'s second counter.' },
```

Change it to:

```tsx
            { text: 'Peak memory for the score matrix', explain: 'Reduced from n² to one tile — the lab\'s peak-memory counter.' },
```

- [ ] **Step 2: Remove the stale FlashTilingLab test block**

The old `FlashTilingLab` describe in `src/components/courses/attention/subchapterLabs.test.tsx` (asserts `256 scores`, `process next tile`, `tile 1/16` — all removed by Task 2). Delete the whole block:

```tsx
describe('FlashTilingLab', () => {
  it('naive mode materializes the score matrix; tiled mode never does', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/256 scores/)).toBeDefined() // 16×16 written to HBM
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    expect(screen.getByText(/0 scores/)).toBeDefined()
  })
  it('steps through tiles with the online-softmax narration', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    fireEvent.click(screen.getByRole('button', { name: /process next tile/i }))
    // "tile 1/16" and "running max" each appear in two places (SVG label / feedback narration,
    // and feedback narration / the always-on labNote's <strong>) — assert presence, not uniqueness
    expect(screen.getAllByText(/tile 1\/16/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/running max/i).length).toBeGreaterThan(0)
  })
})
```

Then remove the now-unused import line near the top of the same file:

```tsx
import FlashTilingLab from './FlashTilingLab'
```

(FlashTilingLab is now covered by its own `FlashTilingLab.test.tsx`. Leave every other describe block, and the other imports, untouched.)

- [ ] **Step 3: Run the touched test file to verify it passes without the stale block**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS — the remaining blocks (OrderBlindLab, KvCacheLab, prose, etc.) still pass; no "FlashTilingLab" describe runs; no unused-import lint failure.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/attention/efficiencySubchapters.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Point quiz at renamed peak-memory counter; move Flash lab tests to their own file"
```

---

### Task 4: Full-suite check + browser verification

**Files:** none modified (verification only).

**Interfaces:** none.

- [ ] **Step 1: Capture the pre-existing failure baseline**

Run: `npx vitest run 2>&1 | tail -30`
Expected: the attention course's new tests pass. Per project memory there are ~12 pre-existing failures unrelated to this work (and jsdom localStorage quirks) — note the count and the failing file names so the next step can confirm this change added none.

- [ ] **Step 2: Confirm no new failures come from the three touched areas**

Run: `npx vitest run src/components/courses/attention/ 2>&1 | tail -30`
Expected: `flashTilingScript.test.ts`, `FlashTilingLab.test.tsx`, and `subchapterLabs.test.tsx` all pass. Any failure here is in-scope and must be fixed before proceeding; failures only in files outside `src/components/courses/attention/` match the known baseline.

- [ ] **Step 3: Verify in a real browser via the /verify skill**

Invoke the `verify` skill (build the static export, serve it, drive it in a browser). Manual walkthrough checklist:
- Subchapter 3.2 loads the widget without console errors.
- Act 1: stepping 0→6 fills the score matrix orange, shows the red "S 33.6 MB ✗" block appear in the HBM box, and drives the HBM-traffic bar from 0 to ~136 MB.
- Act 2: the "tile" glyph appears inside the SRAM box (not HBM); the "score tile in SRAM" step shows "+0 MB"; "process remaining tiles" lands the odometer at ~5 MB.
- Act 3: two comparison bars (136 MB vs 5.2 MB; 68 µs vs 14 µs) render with the "FLOPs … identical" stamp and the honest few-fold footnote.
- Act tabs switch and reset to step 0; back/next clamp at the ends.
- Narration box updates each step and is `aria-live="polite"`.

- [ ] **Step 4: Final commit if /verify surfaced any fixes**

```bash
git add -- <only the files you changed>
git commit -m "Flash Tiling Lab: fixes from browser verification"
```

(Skip if the browser walkthrough was clean.)

---

## Self-Review

**Spec coverage:**
- Guided 3-act tour, enforced order → Task 1 `ACT1/ACT2/ACT3`, Task 2 act-tab + stepper UI. ✓
- Memory-traffic level (odometer, HBM/SRAM occupancy) → Task 1 `hbmDelta`/`odometer`/`sramMb`, Task 2 meters. ✓
- Online-softmax level (qualitative rescale beat) → Task 1 Act 2 steps 4–5 (`rescale` flag, m/ℓ), Task 2 rescale text + SRAM `m, ℓ` block. ✓
- Toy visual / real meters, real-scale disclaimer → Task 1 Act 1 step 0 caption + matrix label. ✓
- Hardware constants + fact-check → Task 1 header comment; verified in planning (26× not 27×; 7.6× is attention-kernel not end-to-end; up to 9× HBM accesses). ✓
- Act 3 aha (bytes bar, time bars, identical-FLOPs stamp, honest footnote, "one head/one layer") → Task 2 `VerdictPanels`. ✓
- Peak-memory counter survives for quiz `am3-2-q2` → Task 2 counter + Task 3 quiz reword. ✓
- Pure-module + component split, two new test files, avoid concurrently-edited files → Tasks 1–3; CSS untouched, `blockFlow*`/`attentionCourse.test.tsx`/`course.module.css` untouched. ✓
- `/verify` browser check → Task 4. ✓

**Deviations from spec (deliberate, better-engineering calls made during planning):**
1. **Fast-forward = single state jump, not `setInterval`.** No sibling lab uses timers; a timer would be the first in the codebase and a jsdom-test liability. The "process remaining tiles" button advances one step to the `flashDone` state; the odometer jumps to the final 5.24 MB. Same pedagogy, no timer.
2. **No CSS additions.** `course.module.css` is being edited by a concurrent session; the verdict panels and meters reuse existing `.gapChart`/`.gapTrack`/`.gapFill`/`.labStat` classes, so that file is left untouched.
3. **Traffic ratio is ~26×, not the spec's 27×** (exact arithmetic: 136.31 / 5.24 = 26.0), and the honest footnote corrects the spec's conflation of 7.6× (attention-kernel) with end-to-end (~3×).

**Placeholder scan:** none — every step has complete code or an exact command with expected output.

**Type consistency:** `Step`/`Visual` field names (`hbmDelta`, `odometer`, `sramMb`, `hbmScores`, `arrow`, `visual`) are identical across the module (Task 1), its test, and the component (Task 2). `ACTS[act]` indexing uses the `1|2|3` union throughout. `fmtMb` signature is stable. Verdict constants (`NAIVE_TOTAL_MB`, `FLASH_TOTAL_MB`, `TRAFFIC_RATIO`, `ATTN_GFLOP`, `NAIVE_US`, `FLASH_US`) are defined once in Task 1 and only read in Task 2.
