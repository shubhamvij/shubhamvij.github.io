# Block-Diagram Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the "Anatomy of a Transformer Block" widget's data-flow panel so the embed stage shows `embedding ⊕ position = input`, the MHA stage becomes a 3-step Q/K/V stepper with 2 real heads, and subchapter 2.3 gains the add-vs-concat intuition.

**Architecture:** Extract the widget's forward-pass math into a pure module `blockFlow.ts` (4 tokens × d=6, 2 heads × d_head=3, d_ff=24, weights from seeded PRNG — seed 225, verified). The component renders stages as generic "grid/operator item" sequences through a generalized `VecGrid` (column headers, row-label overrides, head tinting); the MHA stage swaps in a 3-step chip stepper. Prose additions go in `subchapters.tsx` (2.3) and the `add1` blurb.

**Tech Stack:** Next.js + React 19 client components, CSS modules, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-10-block-diagram-flow-redesign-design.md`

## Global Constraints

- Dimensions: n=4 tokens `['The', 'cat', 'sat', 'here']`, d=6, 2 heads × d_head=3, d_ff=24.
- PRNG weights: mulberry32, **SEED = 225** (verified: per-row argmax of head 1 ∈ {The, cat} on all 4 rows, head 2 ∈ {sat, here}; all displayed tensors ≤ 1.98 abs; FFN alive). Do not change the seed or draw order (W_Q: seed, W_K: seed+1, W_V: seed+2, W_O: seed+3, W_1: seed+4, W_2: seed+5 with scale 0.3).
- No changes to the SVG block diagram (boxes, highway, arrows) except the `add1` blurb text.
- Head tint = colored label with 2px colored bottom border spanning the column group — never cell background tints (backgrounds encode values). Head colors: `#2b6fd0` (head 1), `#2f8e2f` (head 2) — matching MultiHeadLab.
- Code style: no semicolons, single quotes, `\'` escapes in strings, `&apos;`/`&quot;` entities in JSX prose (match existing files).
- Test baseline: 12 pre-existing vitest failures elsewhere in the repo (jsdom/localStorage quirks). Judge new work only against `src/components/courses/attention` results.
- Commit after every task; end commit messages with the Claude Code trailer used in this repo's recent history (Co-Authored-By: Claude Fable 5 + Claude-Session link).

---

### Task 1: `blockFlow.ts` — the d=6 two-head forward pass (pure math + tests)

**Files:**
- Create: `src/components/courses/attention/blockFlow.ts`
- Test: `src/components/courses/attention/blockFlow.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 2–3):
  - `FLOW_TOKENS: string[]` — `['The', 'cat', 'sat', 'here']`
  - `D_MODEL = 6`, `N_HEADS = 2`, `D_HEAD = 3`, `D_FF = 24`
  - `EMB: number[][]` (4×6 embedding rows), `POS: number[][]` (4×6 position vectors), `posVec(p: number): number[]`
  - `FLOW: { x0, x1, q, k, v, a, x2, x3, f, out: number[][] (all 4×6); headWeights: number[][][] (2×4×4); headOut: number[][][] (2×4×3); concat: number[][] (4×6) }`

- [ ] **Step 1: Capture the attention-dir test baseline**

Run: `npx vitest run src/components/courses/attention 2>&1 | tail -8`
Record pass/fail counts. Expected: all passing today (the 12 known failures live elsewhere; if any appear here, note them — they are pre-existing only if they reproduce on `git stash`-clean state).

- [ ] **Step 2: Write the failing test**

Create `src/components/courses/attention/blockFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { FLOW, FLOW_TOKENS, EMB, POS, posVec, D_MODEL, D_HEAD, N_HEADS, D_FF } from './blockFlow'

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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/blockFlow.test.ts`
Expected: FAIL — `Cannot find module './blockFlow'` (or equivalent resolve error).

- [ ] **Step 4: Implement `blockFlow.ts`**

Create `src/components/courses/attention/blockFlow.ts`:

```ts
// Pure math behind the TransformerBlockDiagram data-flow panel: one real
// forward pass through a pre-norm block. 4 tokens, d=6, 2 heads × d_head=3,
// d_ff=24, fixed seeded weights, no biases, LayerNorm with γ=1, β=0.
export const FLOW_TOKENS = ['The', 'cat', 'sat', 'here']
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/attention/blockFlow.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/attention/blockFlow.ts src/components/courses/attention/blockFlow.test.ts
git commit -m "Add blockFlow: d=6 two-head forward pass for the block diagram"
```

---

### Task 2: Rewrite the flow panel — items model, axis labels, embed ⊕, visible adds

**Files:**
- Modify: `src/components/courses/attention/TransformerBlockDiagram.tsx` (full rewrite of everything below the `PARTS` array; `PARTS`, the SVG, and the default export's diagram markup survive)
- Modify: `src/components/courses/engine/course.module.css` (append two classes)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx:97-104` (update shapes test)

**Interfaces:**
- Consumes from Task 1: `FLOW`, `FLOW_TOKENS`, `EMB`, `POS`, `D_HEAD` from `./blockFlow`.
- Produces (Task 3 extends this file): `interface GridSpec { label: string; data: number[][]; rows?: string[]; cols?: string[]; weights?: boolean; headSplit?: boolean; headIndex?: number }`, `type StageItem = GridSpec | { op: string }`, `function StageItems({ items }: { items: StageItem[] })`, `const DCOLS: string[]` (`['d₁'…'d₆']`), `const HEAD_COLORS: string[]`, `const FLOW_STAGES: Record<string, FlowStage>` with `interface FlowStage { items: StageItem[]; shape: string; note: string }`.
- The `mha` stage ships here as a plain two-grid stage; Task 3 replaces it with the stepper.

- [ ] **Step 1: Update the existing shapes test to the new dimensions and ⊕ decomposition**

In `src/components/courses/attention/attentionCourse.test.tsx`, replace the whole `'block diagram shows shapes and data flowing through the selected component'` test with:

```tsx
  it('block diagram shows shapes and data flowing through the selected component', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. The transformer block/ }))
    fireEvent.click(screen.getAllByText('feed-forward network')[0])
    expect(screen.getByText(/4×6 → 4×24 → 4×6/)).toBeDefined()
    fireEvent.click(screen.getAllByText('token embeddings + positions')[0])
    expect(screen.getByText(/tokens \[4\] → vectors \[4×6\]/)).toBeDefined()
    // the ⊕ decomposition: embedding operand, position rows, sum
    expect(screen.getByText('token embedding (lookup row)')).toBeDefined()
    expect(screen.getByText('pos 0')).toBeDefined()
    expect(screen.getByText('what enters the block')).toBeDefined()
  })

  it('residual add stage shows residual + edit = updated stream', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. The transformer block/ }))
    fireEvent.click(screen.getAllByText('⊕ add (residual)')[0])
    expect(screen.getByText('residual copy (pre-norm input)')).toBeDefined()
    expect(screen.getByText('attention edit')).toBeDefined()
    expect(screen.getByText('updated stream')).toBeDefined()
  })
```

- [ ] **Step 2: Run tests to verify the new assertions fail**

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — the two block-diagram tests (old component still renders `4×4 → 4×8 → 4×4` and has no `pos 0` / `residual copy` labels). The other tests still pass.

- [ ] **Step 3: Append grid-header CSS**

Append to `src/components/courses/engine/course.module.css` (after `.flowNote`):

```css
.vecColHead {
  font-size: 7.5px;
  color: #778;
  text-align: center;
  padding: 1px 2px;
}
.vecHeadLabel {
  font-size: 8px;
  font-weight: bold;
  text-align: center;
  padding: 1px 0 2px;
}
```

- [ ] **Step 4: Rewrite the component's data/render layer**

Replace the ENTIRE contents of `src/components/courses/attention/TransformerBlockDiagram.tsx` with the following. (The `PARTS` array and the SVG portion of the default export are unchanged from the current file except where noted; they are included so this step is copy-paste complete.)

```tsx
'use client'
import { Fragment, useState } from 'react'
import s from '../engine/course.module.css'
import { FLOW, FLOW_TOKENS, EMB, POS, D_HEAD } from './blockFlow'

interface Part {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
  blurb: string
}

// One pre-norm transformer block, drawn as a residual "highway" with two stops.
const PARTS: Part[] = [
  { id: 'embed', label: 'token embeddings + positions', x: 130, y: 250, w: 220, h: 26, color: '#d8e3f5', blurb: 'Tokens become vectors. Position information is added here (learned or sinusoidal) or injected inside attention itself (RoPE rotates Q/K; ALiBi biases scores by distance) — attention alone is order-blind, so without this "cat sat" = "sat cat". Deep dive: 2.1.' },
  { id: 'ln1', label: 'LayerNorm', x: 155, y: 208, w: 78, h: 22, color: '#f4f2e8', blurb: 'Normalizes each token vector before attention (the "pre-norm" placement modern LLMs use). Keeps activations in a healthy range so 100-layer stacks train stably. Deep dive: 2.3.' },
  { id: 'mha', label: 'multi-head attention', x: 145, y: 168, w: 170, h: 30, color: '#cfe0f5', blurb: 'The communication step: the only place tokens exchange information. Every token queries every other token (module 1) with several heads in parallel (this module). Cost: O(n²) in sequence length — the villain of module 3. Deep dive: 2.2.' },
  { id: 'add1', label: '⊕ add (residual)', x: 155, y: 130, w: 130, h: 22, color: '#e3f6e3', blurb: 'The attention output is ADDED to the input, not substituted for it. The untouched copy flowing around every sublayer is the residual stream — an information highway that makes very deep stacks trainable and lets layers make small, composable edits. Deep dive: 2.3.' },
  { id: 'ln2', label: 'LayerNorm', x: 155, y: 92, w: 78, h: 22, color: '#f4f2e8', blurb: 'Same normalization again, before the feed-forward sublayer. Deep dive: 2.3.' },
  { id: 'ffn', label: 'feed-forward network', x: 145, y: 52, w: 170, h: 30, color: '#fbe7d4', blurb: 'The computation step: a two-layer MLP (usually 4× wider than the model dimension) applied to each token independently — no token-to-token communication here. Roughly 2/3 of a transformer\'s parameters live in these layers; much of its stored "knowledge" does too. Deep dive: 2.4.' },
  { id: 'add2', label: '⊕ add (residual)', x: 155, y: 14, w: 130, h: 22, color: '#e3f6e3', blurb: 'Second residual add. Output shape = input shape, so blocks stack like LEGO: GPT-3 is 96 of these; a ViT is the same block over image patches; a graph transformer is the same block with attention restricted by a graph. Deep dive: 2.3.' },
]

// ---------- Data-flow panel: real numbers from blockFlow (4 tokens, d=6, 2 heads) ----------

const DCOLS = ['d₁', 'd₂', 'd₃', 'd₄', 'd₅', 'd₆']
const POS_ROWS = ['pos 0', 'pos 1', 'pos 2', 'pos 3']
const HEAD_COLORS = ['#2b6fd0', '#2f8e2f']

interface GridSpec {
  label: string
  data: number[][]
  rows?: string[] // row labels; default: the tokens
  cols?: string[] // column headers: dims, or token names for attention patterns
  weights?: boolean // 0..1 attention shading instead of signed shading
  headSplit?: boolean // label d₁–d₃ / d₄–d₆ column groups as head 1 / head 2
  headIndex?: number // whole grid belongs to one head (e.g. a 4×3 head output)
}
type StageItem = GridSpec | { op: string }

interface FlowStage {
  items: StageItem[]
  shape: string
  note: string
}

const FLOW_STAGES: Record<string, FlowStage> = {
  embed: {
    items: [
      { label: 'token embedding (lookup row)', data: EMB, cols: DCOLS },
      { op: '⊕' },
      { label: 'position vector (sinusoidal)', data: POS, rows: POS_ROWS, cols: DCOLS },
      { op: '=' },
      { label: 'what enters the block', data: FLOW.x0, cols: DCOLS },
    ],
    shape: 'tokens [4] → vectors [4×6]',
    note: '"cat" anywhere in any text fetches the SAME embedding row, and pos 1 adds the SAME vector no matter which token sits there — only the sum knows both. After the ⊕, "cat at position 1" ≠ "cat at position 3": that is how order sneaks into an otherwise order-blind mechanism. Deep dive 2.1 covers the schemes that inject position inside attention instead (RoPE, ALiBi).',
  },
  ln1: {
    items: [
      { label: 'from embeddings', data: FLOW.x0, cols: DCOLS },
      { op: '→' },
      { label: 'normalized', data: FLOW.x1, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'Each ROW — one token\'s 6 numbers — is rescaled to mean 0, variance 1. Compare a row across the two grids: per token, never across the batch.',
  },
  mha: {
    items: [
      { label: 'normalized input', data: FLOW.x1, cols: DCOLS },
      { op: '→' },
      { label: 'attention output (the edit)', data: FLOW.a, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'The attention edit for each token — a mix of the other tokens\' value vectors.',
  },
  add1: {
    items: [
      { label: 'residual copy (pre-norm input)', data: FLOW.x0, cols: DCOLS },
      { op: '+' },
      { label: 'attention edit', data: FLOW.a, cols: DCOLS },
      { op: '=' },
      { label: 'updated stream', data: FLOW.x2, cols: DCOLS },
    ],
    shape: '[4×6] + [4×6] → [4×6]',
    note: 'The edit is ADDED to the untouched pre-norm input — attention adjusts each token\'s vector, it never replaces it. Adding (not concatenating) also keeps the width at 6 forever — the add-vs-concat callout in 2.3 is the why.',
  },
  ln2: {
    items: [
      { label: 'residual stream', data: FLOW.x2, cols: DCOLS },
      { op: '→' },
      { label: 'normalized', data: FLOW.x3, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'Same normalization again before the FFN — each row back to mean 0, variance 1.',
  },
  ffn: {
    items: [
      { label: 'normalized input', data: FLOW.x3, cols: DCOLS },
      { op: '→' },
      { label: 'FFN output (the edit)', data: FLOW.f, cols: DCOLS },
    ],
    shape: '4×6 → 4×24 → 4×6 (expand 4× → ReLU → project back)',
    note: 'Each row goes through the SAME two matrices independently — cover the other rows and nothing changes. No token sees any other token here.',
  },
  add2: {
    items: [
      { label: 'residual stream', data: FLOW.x2, cols: DCOLS },
      { op: '+' },
      { label: 'FFN edit', data: FLOW.f, cols: DCOLS },
      { op: '=' },
      { label: 'block output', data: FLOW.out, cols: DCOLS },
    ],
    shape: '[4×6] + [4×6] → [4×6]',
    note: 'Output shape = input shape, so the next block consumes this directly — stack 96 of them and you have a GPT.',
  },
}

const flowColor = (v: number) => {
  const t = Math.max(-1.6, Math.min(1.6, v)) / 1.6
  return t >= 0
    ? `rgb(${Math.round(255 - 55 * t)}, ${Math.round(255 - 144 * t)}, ${Math.round(255 - 231 * t)})`
    : `rgb(${Math.round(255 + 212 * t)}, ${Math.round(255 + 144 * t)}, ${Math.round(255 + 47 * t)})`
}

function VecGrid({ g }: { g: GridSpec }) {
  const rows = g.rows ?? FLOW_TOKENS
  const nCols = g.data[0].length
  const headLabels = g.headIndex !== undefined ? [g.headIndex] : g.headSplit ? [0, 1] : null
  return (
    <div>
      <div className={s.vecGrid} style={{ gridTemplateColumns: `auto repeat(${nCols}, auto)` }}>
        {headLabels && (
          <>
            <span />
            {headLabels.map(h => (
              <span
                key={`h${h}`}
                className={s.vecHeadLabel}
                style={{
                  gridColumn: `span ${headLabels.length === 1 ? nCols : D_HEAD}`,
                  color: HEAD_COLORS[h],
                  borderBottom: `2px solid ${HEAD_COLORS[h]}`,
                }}
              >
                head {h + 1}
              </span>
            ))}
          </>
        )}
        {g.cols && (
          <>
            <span />
            {g.cols.map((c, i) => <span key={`c${i}`} className={s.vecColHead}>{c}</span>)}
          </>
        )}
        {rows.map((tok, i) => (
          <Fragment key={`row${i}`}>
            <span className={s.vecTok}>{tok}</span>
            {g.data[i].map((v, d) => (
              // weights are 0..1: negate so flowColor's blue (negative) branch renders a white→blue ramp
              <span key={`${i}-${d}`} className={s.vecCell} style={{ background: g.weights ? flowColor(-v * 1.6) : flowColor(v) }}>
                {v.toFixed(2)}
              </span>
            ))}
          </Fragment>
        ))}
      </div>
      <p className={s.flowShape}>{g.label}</p>
    </div>
  )
}

function StageItems({ items }: { items: StageItem[] }) {
  return (
    <div className={s.flowGrids}>
      {items.map((it, i) => 'op' in it
        ? <span key={`op${i}`} className={s.flowArrow}>{it.op}</span>
        : <VecGrid key={`g${i}`} g={it} />)}
    </div>
  )
}

export default function TransformerBlockDiagram() {
  const [selected, setSelected] = useState('mha')
  const part = PARTS.find(p => p.id === selected)!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Anatomy of a Transformer Block</span>
        <span className={s.widgetHint}>click each component</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 480 290" className={s.labCanvas} role="img" aria-label="Transformer block diagram with clickable components">
          {/* residual highway */}
          <line x1="112" y1="262" x2="112" y2="18" stroke="#9ab48c" strokeWidth={6} opacity={0.55} />
          <text x="104" y="146" fontSize="9" fill="#4a7a3a" textAnchor="middle" transform="rotate(-90 104 146)">residual stream</text>
          {/* skip curves into the adds */}
          <path d="M 112 236 C 112 190, 140 150, 155 141" fill="none" stroke="#9ab48c" strokeWidth={2.5} />
          <path d="M 112 120 C 112 74, 140 34, 155 25" fill="none" stroke="#9ab48c" strokeWidth={2.5} />
          {/* main flow arrows */}
          <line x1="240" y1="250" x2="240" y2="230" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="208" x2="240" y2="198" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="168" x2="240" y2="152" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="130" x2="240" y2="114" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="92" x2="240" y2="82" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="52" x2="240" y2="36" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#777" />
            </marker>
          </defs>
          {PARTS.map(p => (
            <g key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
              <rect
                x={p.x} y={p.y} width={p.w} height={p.h} rx={4}
                fill={p.color}
                stroke={selected === p.id ? '#0a246a' : '#8898a8'}
                strokeWidth={selected === p.id ? 2.5 : 1}
              />
              <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 3.5} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif" fontWeight={selected === p.id ? 'bold' : 'normal'}>
                {p.label}
              </text>
            </g>
          ))}
          <text x="240" y="284" fontSize="9.5" fill="#888" textAnchor="middle">input: one vector per token — output: same shape, so blocks stack</text>
          <text x="416" y="152" fontSize="10" fill="#666" textAnchor="middle">×N layers</text>
          <rect x="384" y="160" width="64" height="4" fill="#ccc" />
          <rect x="384" y="168" width="64" height="4" fill="#ddd" />
          <rect x="384" y="176" width="64" height="4" fill="#eee" />
        </svg>
        <div className={`${s.feedback} ${s.feedbackCorrect}`} style={{ marginTop: 8 }}>
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{part.label}:</strong> {part.blurb}</span>
        </div>
        {(() => {
          const flow = FLOW_STAGES[selected]
          if (!flow) return null
          return (
            <div className={s.flowPanel}>
              <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
              <StageItems items={flow.items} />
              <p className={s.flowShape}>{flow.shape}</p>
              <p className={s.flowNote}>{flow.note}</p>
            </div>
          )
        })()}
        <p className={s.labNote}>
          Read bottom-up. The pattern to internalize: <strong>attention communicates, the FFN computes,
          residuals + LayerNorm keep it all trainable</strong>. Every architecture in this course is this block
          with one ingredient swapped.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the attention tests**

Run: `npx vitest run src/components/courses/attention`
Expected: PASS — including the two updated/new block-diagram tests and all of Task 1's blockFlow tests. (The MHA stepper test does not exist yet.)

- [ ] **Step 6: Lint**

Run: `npx eslint src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/attention/blockFlow.ts`
Expected: no errors (unused-import errors here mean a leftover from the old file — remove it).

- [ ] **Step 7: Commit**

```bash
git add src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/engine/course.module.css src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Rework block-diagram flow panel: d=6, axis labels, embed ⊕, visible adds"
```

---

### Task 3: The MHA 3-step stepper

**Files:**
- Modify: `src/components/courses/attention/TransformerBlockDiagram.tsx` (add `MHA_STEPS` + `MhaStepper`, swap the `mha` render branch)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx` (add stepper test)

**Interfaces:**
- Consumes: `GridSpec`, `StageItem`, `StageItems`, `DCOLS`, `FLOW`, `FLOW_TOKENS` from Task 2's rewrite; `FLOW.headWeights`, `FLOW.headOut` from Task 1.
- Produces: user-facing stepper only; no exports.

- [ ] **Step 1: Write the failing test**

Add to `src/components/courses/attention/attentionCourse.test.tsx`, after the `'residual add stage shows residual + edit = updated stream'` test:

```tsx
  it('multi-head attention stage steps through Q/K/V → scores → mix', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. The transformer block/ }))
    // mha is the default selection; step 1 shows the three projections with role captions
    expect(screen.getByText(/what am I looking for\?/)).toBeDefined()
    expect(screen.getByText(/what do I advertise\?/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /2 · score \+ softmax/ }))
    expect(screen.getByText('head 1 pattern (rows sum to 1)')).toBeDefined()
    expect(screen.getByText('head 2 pattern (rows sum to 1)')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /3 · mix \+ combine/ }))
    expect(screen.getByText(/head 1 out/)).toBeDefined()
    expect(screen.getByText('attention output (the edit)')).toBeDefined()
    // leaving and returning resets to step 1
    fireEvent.click(screen.getAllByText('LayerNorm')[0])
    fireEvent.click(screen.getAllByText('multi-head attention')[0])
    expect(screen.getByText(/what am I looking for\?/)).toBeDefined()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — `what am I looking for?` not found (Task 2's placeholder mha stage renders instead).

- [ ] **Step 3: Implement the stepper**

In `src/components/courses/attention/TransformerBlockDiagram.tsx`:

3a. DELETE the `mha` entry from `FLOW_STAGES` (the placeholder from Task 2).

3b. Insert after the `FLOW_STAGES` definition:

```tsx
// ---------- MHA stepper: the one stage that gets a step-through ----------
const MHA_STEPS: { chip: string; heading: string; items: StageItem[]; shape: string; note: string }[] = [
  {
    chip: '1 · make Q, K, V',
    heading: 'every token is projected three ways',
    items: [
      { label: 'x (normalized input)', data: FLOW.x1, cols: DCOLS },
      { op: '→' },
      { label: 'Q — "what am I looking for?"', data: FLOW.q, cols: DCOLS, headSplit: true },
      { label: 'K — "what do I advertise?"', data: FLOW.k, cols: DCOLS, headSplit: true },
      { label: 'V — "what I hand over if you attend to me"', data: FLOW.v, cols: DCOLS, headSplit: true },
    ],
    shape: 'x·W_Q, x·W_K, x·W_V — [4×6] each',
    note: 'Three learned matrix multiplies, nothing more. The colored groups mark the head split: columns d₁–d₃ belong to head 1, d₄–d₆ to head 2 — "2 heads" slices the same three matrices into subspaces, it does not add new networks (deep dive 2.2).',
  },
  {
    chip: '2 · score + softmax',
    heading: 'each head compares its own Q slice with its own K slice',
    items: [
      { label: 'head 1 pattern (rows sum to 1)', data: FLOW.headWeights[0], cols: FLOW_TOKENS, weights: true, headIndex: 0 },
      { label: 'head 2 pattern (rows sum to 1)', data: FLOW.headWeights[1], cols: FLOW_TOKENS, weights: true, headIndex: 1 },
    ],
    shape: 'softmax(Q_h·K_hᵀ / √3) → [4×4] per head — row = query token, column = who it attends to',
    note: 'Same four tokens, two different learned lenses: head 1 leans toward "The"/"cat" while head 2 locks onto "sat"/"here". And note the shape — this token×token grid has 4 columns because there are 4 tokens to look at, not because d=6. It is a different kind of matrix from the [4×6] activations.',
  },
  {
    chip: '3 · mix + combine',
    heading: 'each head blends V by its pattern; W_O merges the heads',
    items: [
      { label: 'head 1 out (weights₁·V₁)', data: FLOW.headOut[0], cols: ['d₁', 'd₂', 'd₃'], headIndex: 0 },
      { label: 'head 2 out (weights₂·V₂)', data: FLOW.headOut[1], cols: ['d₄', 'd₅', 'd₆'], headIndex: 1 },
      { op: 'concat → ×W_O →' },
      { label: 'attention output (the edit)', data: FLOW.a, cols: DCOLS },
    ],
    shape: '[4×3] ⌢ [4×3] = [4×6] → W_O → [4×6]',
    note: 'Concatenation happens HERE — at fixed, planned width (3+3=6), once — and W_O immediately mixes the heads\' writes into shared directions of the residual stream. Without W_O each head would be locked to its own 3 columns forever (deep dive 2.2).',
  },
]

function MhaStepper() {
  const [step, setStep] = useState(0)
  const st = MHA_STEPS[step]
  return (
    <div>
      <div className={s.chipRow}>
        {MHA_STEPS.map((m, i) => (
          <button key={m.chip} type="button" className={`${s.chip} ${step === i ? s.chipOn : ''}`} onClick={() => setStep(i)}>
            {m.chip}
          </button>
        ))}
      </div>
      <p className={s.flowTitle} style={{ margin: '6px 0 4px' }}>step {step + 1} of 3 — {st.heading}</p>
      <StageItems items={st.items} />
      <p className={s.flowShape}>{st.shape}</p>
      <p className={s.flowNote}>{st.note}</p>
    </div>
  )
}
```

3c. In the default export, replace the flow-panel IIFE:

```tsx
        {(() => {
          const flow = FLOW_STAGES[selected]
          if (!flow) return null
          return (
            <div className={s.flowPanel}>
              <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
              <StageItems items={flow.items} />
              <p className={s.flowShape}>{flow.shape}</p>
              <p className={s.flowNote}>{flow.note}</p>
            </div>
          )
        })()}
```

with:

```tsx
        {selected === 'mha' ? (
          <div className={s.flowPanel}>
            <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
            <MhaStepper />
          </div>
        ) : (() => {
          const flow = FLOW_STAGES[selected]
          if (!flow) return null
          return (
            <div className={s.flowPanel}>
              <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
              <StageItems items={flow.items} />
              <p className={s.flowShape}>{flow.shape}</p>
              <p className={s.flowNote}>{flow.note}</p>
            </div>
          )
        })()}
```

(`MhaStepper` mounts fresh whenever the user re-selects mha, so it always reopens on step 1.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention`
Expected: PASS — all, including the new stepper test.

- [ ] **Step 5: Lint**

Run: `npx eslint src/components/courses/attention/TransformerBlockDiagram.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Add 3-step Q/K/V stepper with two real heads to the block diagram"
```

---

### Task 4: Add-vs-concat — blurb sentence, 2.3 callout, quiz question

**Files:**
- Modify: `src/components/courses/attention/TransformerBlockDiagram.tsx` (one sentence in the `add1` blurb)
- Modify: `src/components/courses/attention/subchapters.tsx` (callout after the residual-stream widget; fifth quiz question)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx` (add 2.3 test)

**Interfaces:**
- Consumes: nothing from other tasks (prose only).
- Produces: quiz id `am2-3-q5` (persists via the existing progress storage; no schema change).

- [ ] **Step 1: Write the failing test**

Add to `src/components/courses/attention/attentionCourse.test.tsx`:

```tsx
  it('2.3 explains why residuals add instead of concatenating', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\.3 Residuals & LayerNorm/ }))
    expect(screen.getByText('Why add, not concatenate?')).toBeDefined()
    expect(screen.getByText(/ADD each sublayer&?'?s output instead of CONCATENATING/)).toBeDefined()
  })
```

(Note: `getByText` sees rendered text, so the prompt assertion should match the rendered apostrophe. Use: `screen.getByText(/instead of CONCATENATING it\?/)` if the fuller regex is brittle.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — `Why add, not concatenate?` not found.

- [ ] **Step 3: Extend the add1 blurb**

In `src/components/courses/attention/TransformerBlockDiagram.tsx`, in the `add1` entry of `PARTS`, replace:

```
lets layers make small, composable edits. Deep dive: 2.3.
```

with:

```
lets layers make small, composable edits. Why add rather than concatenate? Concat would double the width at every sublayer — nothing would stack. Deep dive: 2.3.
```

- [ ] **Step 4: Add the callout and quiz question in 2.3**

In `src/components/courses/attention/subchapters.tsx`, inside the `block-residuals` module:

4a. Directly after the line `{ kind: 'widget', widget: 'residual-stream' },` insert:

```tsx
      {
        kind: 'callout',
        icon: '⚖️',
        title: 'Why add, not concatenate?',
        body: (
          <>
            Heads&apos; outputs get concatenated (module 2), DenseNets concatenate every skip — so why is the
            residual stream a running <em>sum</em>, not a growing list? <strong>Stackability:</strong>{' '}
            concatenation grows the width at every sublayer (d → 2d → 4d → …); 192 sublayers deep nothing fits,
            and every layer would need different-shaped weights. Adding keeps output shape = input shape — the
            LEGO property. <strong>Editable memory:</strong> an add writes the update into the <em>same</em>{' '}
            feature space, so a later layer can strengthen, refine, or cancel an earlier layer&apos;s write;
            concatenation is append-only — old features sit frozen in their own columns forever.{' '}
            <strong>And the two are cousins:</strong> W·[x; f(x)] = W₁x + W₂f(x), so concat-then-mix IS a
            learned add. Multi-head attention uses exactly that (concat once, at fixed width, then W_O). The
            residual connection is the special case with the mix frozen to identity — frozen precisely so the
            gradient highway can never be trained away.
          </>
        ),
      },
```

4b. In the same module's quiz block, after the `am2-3-q4` question object, add:

```tsx
          {
            id: 'am2-3-q5',
            prompt: 'Why does the residual stream ADD each sublayer\'s output instead of CONCATENATING it?',
            options: [
              { text: 'Concatenation would be too slow to compute', explain: 'One concat is nearly free — the problem is shape, not speed: width doubling at every sublayer means nothing stacks.' },
              { text: 'Adding keeps output shape = input shape so blocks stack, and lands edits in the same feature space where later layers can refine or cancel them — concat grows the width and freezes old features in place', correct: true, explain: 'And W·[x; f(x)] = W₁x + W₂f(x): concat-then-mix is just a learned add. The residual freezes that mix to identity so the gradient highway survives training.' },
              { text: 'Softmax requires all inputs to have equal width', explain: 'Softmax normalizes attention scores — it never sees the residual stream\'s width.' },
            ],
          },
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/courses/attention`
Expected: PASS — all, including the new 2.3 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/attention/subchapters.tsx src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Explain add-vs-concat: add1 blurb, 2.3 callout, and quiz question"
```

---

### Task 5: Independent fact-check of the new prose

Course prose written in a plan gets transcribed faithfully — including its errors. Dispatch a fresh-eyes reviewer over ONLY the new/changed prose.

**Files:**
- Possibly modify: `TransformerBlockDiagram.tsx`, `subchapters.tsx` (fixes only)

- [ ] **Step 1: Dispatch a fact-check subagent**

Use the Agent tool (general-purpose). Prompt it to review, in `src/components/courses/attention/TransformerBlockDiagram.tsx` and `subchapters.tsx` (the `block-residuals` module), all prose added by recent commits (`git log --oneline -4`, `git diff HEAD~4 -- '*.tsx'`) for technical correctness as expert-level ML course content. Specific claims to verify:

1. Q/K/V role captions ("what am I looking for / what do I advertise / what I hand over") — standard framing, not misleading?
2. "softmax(Q_h·K_hᵀ/√3)" — is √d_head (=√3 here) the correct scaling for per-head attention (not √d_model)?
3. Head-split framing: "slices the same three matrices into subspaces, does not add new networks" — consistent with standard MHA formulation?
4. Step-2 note's factual claims about the displayed patterns (head 1 → "The"/"cat", head 2 → "sat"/"here") — cross-check against `blockFlow.test.ts` assertions.
5. Sinusoidal claim in the embed note + "position vector depends only on the seat".
6. Add-vs-concat callout: the identity W·[x; f(x)] = W₁x + W₂f(x); "192 sublayers" (96 blocks × 2); DenseNet concatenation characterization; "frozen identity preserves the gradient path" argument.
7. Quiz q5 wording and explains.

The subagent must report findings as a list of (location, claim, verdict, suggested fix), CONFIRMED/INCORRECT/MISLEADING per claim, without editing files.

- [ ] **Step 2: Apply fixes for confirmed findings**

Edit the flagged prose. If the reviewer flags nothing, skip.

- [ ] **Step 3: Re-run tests and commit (only if fixes were made)**

Run: `npx vitest run src/components/courses/attention`
Expected: PASS.

```bash
git add -A src/components/courses/attention
git commit -m "Apply fact-check fixes to block-diagram and 2.3 prose"
```

---

### Task 6: Full verification — suite, build, real browser

**Files:** none (verification only; fixes go where they belong if anything surfaces)

- [ ] **Step 1: Full test suite vs baseline**

Run: `npx vitest run 2>&1 | tail -10`
Expected: failure count ≤ the pre-existing baseline (12 known failures elsewhere); zero failures under `src/components/courses/attention`.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds (static export to `out/`).

- [ ] **Step 3: Drive the widget in a real browser**

Invoke the `/verify` skill (build/serve/drive the static export). Check, on `/learn/attention-mechanisms`, module 2:

1. Click "token embeddings + positions" → three grids joined by ⊕ and = ; middle grid rows read `pos 0…3`; column headers `d₁…d₆` visible.
2. Click "multi-head attention" → stepper chips; step 1 shows x → Q, K, V with blue/green head-group labels; step 2 shows two visibly different 4×4 patterns with token-name columns; step 3 shows two 4×3 head outputs → `concat → ×W_O →` → output.
3. Click "⊕ add (residual)" (lower one) → `residual copy + attention edit = updated stream`.
4. Click "feed-forward network" → caption `4×6 → 4×24 → 4×6`.
5. Sidebar → 2.3 → "Why add, not concatenate?" callout renders; quiz has 5 questions; answering q5 correctly shows its explain text.
6. Narrow the viewport (~700px): grids wrap without horizontal page scroll.

Screenshot the embed stage, each stepper step, and the 2.3 callout for the final report.

- [ ] **Step 4: Final commit (if verification produced fixes)**

```bash
git add -A
git commit -m "Post-verification polish for block-diagram flow redesign"
```

---

## Plan self-review (done at write time)

- **Spec coverage:** dims/PRNG/seed ✓ (Task 1), axis labels + embed ⊕ + visible adds ✓ (Task 2), stepper + 2 heads ✓ (Task 3), add1 blurb + 2.3 callout + quiz ✓ (Task 4), fact-check ✓ (Task 5), tests + /verify ✓ (Tasks 1–4, 6). FFN caption 4× ✓ (Task 2 ffn stage). Head tint = label + colored border, not backgrounds ✓ (VecGrid).
- **Placeholders:** none; all code complete. Task 2's interim `mha` stage is intentional scaffolding replaced in Task 3 (labeled as such in both tasks).
- **Type consistency:** `GridSpec`/`StageItem`/`StageItems`/`DCOLS`/`HEAD_COLORS` defined in Task 2, consumed by Task 3 with matching names; `FLOW.headWeights`/`headOut` shapes match Task 1's tests; quiz id `am2-3-q5` unique.
