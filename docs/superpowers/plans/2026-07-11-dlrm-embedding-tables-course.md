# DLRM & Embedding-Tables Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new six-module interactive course, "Recommenders at Scale" (slug `dlrm-embedding-tables`), on DLRMs and the embedding-table problem — six honest-computation labs, full module content, catalog/registration, fact-check gate, and browser verification.

**Architecture:** A third `CourseDefinition` registered alongside the Attention and GFM courses. No engine changes — reuse `CourseModule`/`CourseShell`/`course.module.css`. Six self-contained `'use client'` lab components compute real math (one-hot×W, param/FLOP formulas, GB sizing, modulo vs quotient-remainder index math) in plain JS/SVG/HTML with zero randomness. Content is one flat `MODULES` array (no subchapters).

**Tech Stack:** Next.js (static export), React client components, CSS modules (`course.module.css`), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-11-dlrm-embedding-tables-course-design.md` — READ IT FIRST, especially the **verification ledger**: every architectural claim, number, and formula in this plan's prose was verified against primary papers across two research passes. Do not "improve" facts from memory. Vendor-reported numbers keep their attribution. The refuted claims listed in the spec must never appear.

## Global Constraints

- Do NOT touch `public/sitemap.xml`, `src/components/learn/CoursewareShell.tsx`, or `content/settings.yaml` — concurrent sessions may hold edits. `git add` by explicit path only; never `git add -A`/`.`.
- New course id `dlrm-embedding-tables`; storageKey `dlrm-course-progress-v1` (never change once shipped). Module ids: `why-tables`, `asymmetry`, `scale`, `distribute`, `shrink`, `pivot`. Widget keys: `lookup`, `param-flop`, `table-sizer`, `shard-shuffle`, `qr-collide`, `interaction-orders`. Quiz ids `d1-q*`…`d6-q*` (a catalog test asserts global uniqueness across ALL courses — attention + gfm + dlrm).
- Widgets: `'use client'`, styles via `import s from '../engine/course.module.css'` plus minimal inline styles, hand-drawn SVG/HTML in the house style of existing labs. No `Math.random()` / `Date.now()` anywhere — deterministic renders (tests + resume depend on it).
- Never flatten the nested `<span className={s.labStat}><span className={s.labStatValue}>value</span></span>` badge markup to satisfy a test matcher. If a matcher collides across nested elements, anchor the TEST on leaf strings or scope with `within()` — never distort the component. (This was the single most recurrent defect in the GFM run.)
- Curly quotes / unicode (×, →, ⊙, ℝ, Σ, √, ⌊⌋) inside JS string literals are VALID JavaScript — keep them; do not "fix" them to ASCII. `&apos;`/`&quot;` entities appear only in JSX text (eslint react/no-unescaped-entities). Internal links to another course (`/learn/attention-mechanisms`, `/learn/graph-foundation-models`) need `{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}` immediately above the `<a>` (see `gfm/zooSubchapters.tsx` for the exact form).
- Reported accuracy/compression numbers are shown as paper-reported chips, never as if computed live. Real math (row selection, param sums, GB, collision counts, memory formulas) IS computed live.
- The test suite has **12 pre-existing failures** unrelated to this work (navigation.test.tsx ×11, Window.test.tsx ×1). Record the baseline in Task 1 Step 1; "pass" means no NEW failures.
- jsdom lacks working localStorage — any test rendering `CourseShell` must stub it (copy the `beforeEach` from `gfm/GfmStudyGuide.test.tsx`). Pure widget tests don't need the stub.
- Commit after every task; imperative message, no prefix, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Deterministic-number tests: if an honest first run yields a different value than a plan literal, pin the ACTUAL output in the test and note it in the commit — determinism is the requirement, not the plan's guess. Never fudge the component to match the plan.

---

### Task 1: Lookup Lab (module 1)

**Files:**
- Create: `src/components/courses/dlrm/LookupLab.tsx`
- Create: `src/components/courses/dlrm/dlrmLabs.test.tsx`

**Interfaces:**
- Produces: default export `LookupLab` (no props) — registered as `lookup` in Task 9. Computes a real one-hot × W row selection on a small fixed matrix.

- [ ] **Step 1: Record the failing-test baseline**

Run: `cd /Users/shubhamvij/Developer/shubhamvij.github.io && npx vitest run 2>&1 | tail -3`
Expected: ~12 pre-existing failures. Write the exact counts down.

- [ ] **Step 2: Write the failing widget test**

Create `src/components/courses/dlrm/dlrmLabs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LookupLab from './LookupLab'

describe('LookupLab', () => {
  it('selects the embedding row for the picked category', () => {
    render(<LookupLab />)
    // default pick is index 0 (Action); its row is highlighted and echoed
    expect(screen.getByText(/row 0 selected/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /^Comedy$/ }))
    expect(screen.getByText(/row 3 selected/i)).toBeDefined()
  })

  it('multi-hot pooling averages two rows', () => {
    render(<LookupLab />)
    fireEvent.click(screen.getByRole('button', { name: /multi-hot/i }))
    // pooling two one-hots => "2 rows pooled"
    expect(screen.getByText(/2 rows pooled/i)).toBeDefined()
  })

  it('reports the toy table parameter count V×d', () => {
    render(<LookupLab />)
    // 6 categories × 4 dims = 24
    const stat = screen.getByText(/table params/i)
    expect(within(stat).getByText('24')).toBeDefined()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx`
Expected: FAIL — cannot resolve `./LookupLab`.

- [ ] **Step 4: Implement LookupLab**

Create `src/components/courses/dlrm/LookupLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// A tiny fixed embedding table: 6 movie genres (the "vocabulary") × 4 dims.
// Values are fixed (no randomness) so the lookup is a real, deterministic
// one-hot × W = row selection.
const CATEGORIES = ['Action', 'Drama', 'SciFi', 'Comedy', 'Horror', 'Docu']
const D = 4
const W: number[][] = [
  [0.82, -0.31, 0.15, 0.44],
  [-0.12, 0.67, -0.40, 0.22],
  [0.55, 0.28, 0.71, -0.18],
  [-0.48, 0.12, 0.33, 0.60],
  [0.20, -0.55, -0.22, 0.38],
  [0.05, 0.41, -0.16, -0.52],
]

export default function LookupLab() {
  const [pick, setPick] = useState(0)
  const [multiHot, setMultiHot] = useState(false)
  const [pick2, setPick2] = useState(2)

  // Real one-hot × W. For multi-hot, average the two selected rows (mean pooling).
  const oneHot = CATEGORIES.map((_, i) => (i === pick || (multiHot && i === pick2) ? 1 : 0))
  const rows = multiHot ? [pick, pick2] : [pick]
  const out = Array.from({ length: D }, (_, k) =>
    rows.reduce((acc, r) => acc + W[r][k], 0) / rows.length
  )

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Lookup Lab</span>
        <span className={s.widgetHint}>one-hot × W is just a row selection</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c, i) => (
            <button key={c} type="button" className={`${s.chip} ${i === pick ? s.chipOn : ''}`} onClick={() => setPick(i)}>
              {c}
            </button>
          ))}
          <button type="button" className={`${s.chip} ${multiHot ? s.chipOn : ''}`} onClick={() => setMultiHot(m => !m)}>
            multi-hot pooling
          </button>
        </div>
        {multiHot && (
          <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
            <span className={s.sliderLabel}>+ second genre:</span>
            {CATEGORIES.map((c, i) => (
              <button key={c} type="button" className={`${s.chip} ${i === pick2 ? s.chipOn : ''}`} onClick={() => setPick2(i)} disabled={i === pick}>
                {c}
              </button>
            ))}
          </div>
        )}
        <svg viewBox="0 0 470 200" className={s.labCanvas} role="img" aria-label="One-hot vector times embedding matrix selecting a row">
          {/* one-hot column */}
          <text x={24} y={16} fontSize={9} fontWeight="bold" fill="#333">one-hot</text>
          {CATEGORIES.map((c, i) => (
            <g key={c}>
              <rect x={14} y={24 + i * 26} width={22} height={22} fill={oneHot[i] ? '#f0d98c' : '#fff'} stroke="#666" />
              <text x={25} y={39 + i * 26} textAnchor="middle" fontSize={10}>{oneHot[i]}</text>
              <text x={44} y={39 + i * 26} fontSize={8.5} fill="#555">{c}</text>
            </g>
          ))}
          {/* matrix W */}
          <text x={150} y={16} fontSize={9} fontWeight="bold" fill="#333">W (V×d)</text>
          {W.map((row, i) => (
            <g key={i}>
              {row.map((v, k) => {
                const on = rows.includes(i)
                return (
                  <g key={k}>
                    <rect x={120 + k * 42} y={24 + i * 26} width={40} height={22}
                      fill={on ? '#dceefb' : '#fff'} stroke={on ? '#5a8fd0' : '#ccc'} strokeWidth={on ? 1.6 : 0.8} />
                    <text x={140 + k * 42} y={39 + i * 26} textAnchor="middle" fontSize={8.5} fill={on ? '#1a4a8a' : '#999'}>{v.toFixed(2)}</text>
                  </g>
                )
              })}
            </g>
          ))}
          {/* output vector */}
          <text x={330} y={16} fontSize={9} fontWeight="bold" fill="#333">embedding</text>
          {out.map((v, k) => (
            <g key={k}>
              <rect x={320} y={24 + k * 26} width={44} height={22} fill="#e9f5e9" stroke="#2f8e2f" />
              <text x={342} y={39 + k * 26} textAnchor="middle" fontSize={8.5} fill="#1a5a1a">{v.toFixed(3)}</text>
            </g>
          ))}
          <text x={388} y={70} fontSize={16} fill="#666">←</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>{multiHot ? `${rows.length} rows pooled` : `row ${pick} selected`}</span>
          <span className={s.labStat}>table params <span className={s.labStatValue}>{CATEGORIES.length * D}</span></span>
        </div>
        <p className={s.labNote}>
          A categorical value can&apos;t be a number the network does arithmetic on — &quot;genre 3&quot; isn&apos;t
          three times &quot;genre 1&quot;. So each value gets a <strong>learned row</strong> of an embedding
          table, and the lookup is exactly a one-hot vector times the matrix: <strong>wᵢᵀ = eᵢᵀW</strong> —
          a row selection. <strong>Multi-hot</strong> features (a movie with several genres) pool several rows.
          This toy table has {CATEGORIES.length}×{D} = {CATEGORIES.length * D} parameters; a production user-id
          table has billions of rows. That gap is the whole course.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx`
Expected: PASS (3 tests). If the multi-hot label reads differently, pin the actual leaf string.

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/dlrm/LookupLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Lookup Lab: one-hot × W row selection with multi-hot pooling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Params-vs-FLOPs Lab (module 2)

**Files:**
- Create: `src/components/courses/dlrm/ParamFlopLab.tsx`
- Modify: `src/components/courses/dlrm/dlrmLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `ParamFlopLab` — registered as `param-flop` in Task 9. Real param/FLOP arithmetic; a log-log scatter of verified production points.

- [ ] **Step 1: Append the failing test**

```tsx
import ParamFlopLab from './ParamFlopLab'

describe('ParamFlopLab', () => {
  it('plots the verified production DLRM points', () => {
    render(<ParamFlopLab />)
    expect(screen.getByText(/DLRM-12T/)).toBeDefined()
    expect(screen.getByText(/GPT-3/)).toBeDefined()
  })

  it('grows params, not FLOPs, as table size increases', () => {
    render(<ParamFlopLab />)
    const rowsSlider = screen.getByLabelText(/rows per table/i)
    const before = screen.getByTestId('your-params').textContent
    fireEvent.change(rowsSlider, { target: { value: '9' } }) // 10^9 rows
    const after = screen.getByTestId('your-params').textContent
    expect(before).not.toBe(after)
    // FLOPs readout is driven only by MLP widths, unaffected by table rows
    const flops = screen.getByTestId('your-flops').textContent
    fireEvent.change(rowsSlider, { target: { value: '6' } })
    expect(screen.getByTestId('your-flops').textContent).toBe(flops)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx`
Expected: FAIL — cannot resolve `./ParamFlopLab`.

- [ ] **Step 3: Implement ParamFlopLab**

Create `src/components/courses/dlrm/ParamFlopLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Verified production points (spec ledger): DLRMs 332B-12T params @ 5-638
// MFLOPS/sample (ISCA 2022, arXiv 2104.05158). Transformer points are
// order-of-magnitude public figures for contrast (params ~ FLOPs coupling).
// x = log10(params), y = log10(MFLOPs per sample).
const POINTS = [
  { name: 'DLRM-332B', lp: Math.log10(332e9), lf: Math.log10(60), kind: 'dlrm' },
  { name: 'DLRM-793B', lp: Math.log10(793e9), lf: Math.log10(638), kind: 'dlrm' },
  { name: 'DLRM-12T', lp: Math.log10(12e12), lf: Math.log10(5), kind: 'dlrm' },
  { name: 'GPT-3', lp: Math.log10(175e9), lf: Math.log10(350e3), kind: 'xf' },
  { name: 'BERT-large', lp: Math.log10(340e6), lf: Math.log10(680), kind: 'xf' },
]

const CH = { w: 360, h: 210, padL: 40, padR: 12, padT: 12, padB: 30 }
const X_MIN = 8, X_MAX = 13.2   // params 1e8..~1.6e13
const Y_MIN = 0.5, Y_MAX = 6    // MFLOPs 3..1e6

function fmtP(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return v.toFixed(0)
}

export default function ParamFlopLab() {
  const [logRows, setLogRows] = useState(7)   // rows per table, 10^x
  const [nTables, setNTables] = useState(26)
  const [dim, setDim] = useState(64)
  const [mlpW, setMlpW] = useState(512)

  const { params, mflops } = useMemo(() => {
    const rows = Math.pow(10, logRows)
    const embParams = rows * nTables * dim
    // MLP: bottom (13->mlpW->mlpW) + top (~interactions -> mlpW -> mlpW -> 1).
    // FLOPs per sample ~ 2 * sum of layer matmul sizes; depends ONLY on widths.
    const mlpParams = 13 * mlpW + mlpW * mlpW + mlpW * mlpW + mlpW * mlpW + mlpW
    const flops = 2 * mlpParams // ~2 FLOP per param per sample (matmul)
    return { params: embParams + mlpParams, mflops: flops / 1e6 }
  }, [logRows, nTables, dim, mlpW])

  const xOf = (lp: number) => CH.padL + ((lp - X_MIN) / (X_MAX - X_MIN)) * (CH.w - CH.padL - CH.padR)
  const yOf = (lf: number) => CH.padT + (1 - (lf - Y_MIN) / (Y_MAX - Y_MIN)) * (CH.h - CH.padT - CH.padB)
  const yourX = xOf(Math.log10(params))
  const yourY = yOf(Math.log10(Math.max(mflops, 3)))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Params vs FLOPs</span>
        <span className={s.widgetHint}>recommenders break the transformer assumption</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 360 210" className={s.labCanvas} role="img" aria-label="Log-log scatter of parameters versus FLOPs per sample">
          {/* axes */}
          <line x1={CH.padL} y1={CH.h - CH.padB} x2={CH.w - CH.padR} y2={CH.h - CH.padB} stroke="#888" />
          <line x1={CH.padL} y1={CH.padT} x2={CH.padL} y2={CH.h - CH.padB} stroke="#888" />
          <text x={CH.w / 2} y={CH.h - 4} textAnchor="middle" fontSize={8.5} fill="#555">parameters (log) →</text>
          <text x={10} y={CH.h / 2} textAnchor="middle" fontSize={8.5} fill="#555" transform={`rotate(-90 10 ${CH.h / 2})`}>MFLOPs/sample (log) →</text>
          {POINTS.map(p => (
            <g key={p.name}>
              <circle cx={xOf(p.lp)} cy={yOf(p.lf)} r={5} fill={p.kind === 'dlrm' ? '#c86018' : '#5a8fd0'} stroke="#333" />
              <text x={xOf(p.lp)} y={yOf(p.lf) - 8} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#333">{p.name}</text>
            </g>
          ))}
          {/* your model */}
          <circle cx={yourX} cy={yourY} r={7} fill="none" stroke="#0a246a" strokeWidth={2} strokeDasharray="3 2" />
          <text x={yourX} y={yourY + 16} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#0a246a">your model</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>rows/table 10^<strong>{logRows}</strong></span>
          <input type="range" min={6} max={9.5} step={0.5} value={logRows} aria-label="rows per table" className={s.slider} onChange={e => setLogRows(Number(e.target.value))} />
          <span className={s.sliderLabel}>dim <strong>{dim}</strong></span>
          <input type="range" min={16} max={256} step={16} value={dim} aria-label="embedding dim" className={s.slider} onChange={e => setDim(Number(e.target.value))} />
          <span className={s.sliderLabel}>MLP width <strong>{mlpW}</strong></span>
          <input type="range" min={128} max={2048} step={128} value={mlpW} aria-label="MLP width" className={s.slider} onChange={e => setMlpW(Number(e.target.value))} />
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>your params <span className={s.labStatValue} data-testid="your-params">{fmtP(params)}</span></span>
          <span className={s.labStat}>your compute <span className={s.labStatValue} data-testid="your-flops">{mflops.toFixed(1)} MFLOPs</span></span>
        </div>
        <p className={s.labNote}>
          In a transformer, params and FLOPs rise together — a bigger model costs more compute (the whole
          Attention course). Recommenders <strong>invert</strong> that: the orange points are real production
          DLRMs — <strong>332B to 12 trillion parameters at only 5–638 MFLOPs per sample</strong>. Drag
          &quot;rows/table&quot; and your model marches right (more memory) while &quot;your compute&quot;
          doesn&apos;t move — embedding lookups are O(1) gathers. Only the MLP-width slider changes FLOPs. A DLRM
          mostly <em>remembers</em>; it barely <em>computes</em>.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/dlrm/ParamFlopLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Params vs FLOPs lab: the DLRM param/compute asymmetry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Table Sizer & Roofline Lab (module 3)

**Files:**
- Create: `src/components/courses/dlrm/TableSizerLab.tsx`
- Modify: `src/components/courses/dlrm/dlrmLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `TableSizerLab` — registered as `table-sizer` in Task 9. Real GB arithmetic; tier thresholds from the spec ledger (HBM ~80GB, DRAM ~1.5TB, then SSD). Second tab: the verified cache hit-rate curve.

- [ ] **Step 1: Append the failing test**

```tsx
import TableSizerLab from './TableSizerLab'

describe('TableSizerLab', () => {
  it('computes total size and picks the memory tier', () => {
    render(<TableSizerLab />)
    // defaults: 100 tables × 1e7 rows × 64 dim × 4 bytes = 256 GB -> DRAM tier
    expect(screen.getByText(/256 GB/)).toBeDefined()
    expect(screen.getByText(/DRAM/)).toBeDefined()
  })

  it('crosses to SSD tier when the table grows past DRAM', () => {
    render(<TableSizerLab />)
    const rows = screen.getByLabelText(/rows per table/i)
    fireEvent.change(rows, { target: { value: '9' } }) // 1e9 rows -> 100×1e9×64×4 = 25.6 TB
    expect(screen.getByText(/SSD/)).toBeDefined()
  })

  it('switches to the cache-locality view', () => {
    render(<TableSizerLab />)
    fireEvent.click(screen.getByRole('button', { name: /cache locality/i }))
    expect(screen.getByText(/hit rate/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx` → FAIL (no `./TableSizerLab`).

- [ ] **Step 3: Implement TableSizerLab**

Create `src/components/courses/dlrm/TableSizerLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Memory tiers (spec ledger): a ZionEX node ~ 320 GB HBM + 1.5 TB DDR, then SSD.
const TIERS = [
  { name: 'HBM (on-GPU)', maxGB: 80, color: '#2f8e2f', note: 'fast + tiny' }, // single A100/H100 HBM; 320 is the 8-GPU node aggregate
  { name: 'DRAM (host)', maxGB: 1536, color: '#c8a030', note: 'big + slower' },
  { name: 'SSD / distributed', maxGB: Infinity, color: '#c0392b', note: 'huge + slowest' },
]
function tierFor(gb: number) { return TIERS.find(t => gb <= t.maxGB)! }

// Verified cache-locality curve (RecNMP, spec ledger): 8-64MB LRU -> 20-60% hit
// vs <5% random; reported anchor points, drawn as a curve.
const CACHE_PTS = [
  { mb: 8, hit: 20 }, { mb: 16, hit: 33 }, { mb: 32, hit: 47 }, { mb: 64, hit: 60 },
]

function fmtGB(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(gb >= 10240 ? 0 : 1)} TB`
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`
}

export default function TableSizerLab() {
  const [view, setView] = useState<'size' | 'cache'>('size')
  const [logRows, setLogRows] = useState(7)
  const [nTables, setNTables] = useState(100)
  const [dim, setDim] = useState(64)
  const [bytes, setBytes] = useState(4)

  const gb = useMemo(() => {
    const rows = Math.pow(10, logRows)
    return (rows * nTables * dim * bytes) / 1e9
  }, [logRows, nTables, dim, bytes])
  const tier = tierFor(gb)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Table Sizer &amp; Roofline</span>
        <span className={s.widgetHint}>you can&apos;t just buy a bigger GPU</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${view === 'size' ? s.chipOn : ''}`} onClick={() => setView('size')}>table size &amp; tiers</button>
          <button type="button" className={`${s.chip} ${view === 'cache' ? s.chipOn : ''}`} onClick={() => setView('cache')}>cache locality</button>
        </div>
        {view === 'size' ? (
          <>
            <svg viewBox="0 0 360 120" className={s.labCanvas} role="img" aria-label="Memory tier bar">
              {TIERS.map((t, i) => {
                const x = 14 + i * 112
                const active = t.name === tier.name
                return (
                  <g key={t.name}>
                    <rect x={x} y={30} width={104} height={44} rx={4} fill={active ? t.color : '#f2f0e8'} stroke={active ? '#333' : '#ccc'} strokeWidth={active ? 2 : 1} />
                    <text x={x + 52} y={50} textAnchor="middle" fontSize={9} fontWeight="bold" fill={active ? '#fff' : '#888'}>{t.name}</text>
                    <text x={x + 52} y={64} textAnchor="middle" fontSize={7.5} fill={active ? '#fff' : '#999'}>{t.note}</text>
                    <text x={x + 52} y={90} textAnchor="middle" fontSize={7.5} fill="#777">{t.maxGB === Infinity ? '> 1.5 TB' : `≤ ${fmtGB(t.maxGB)}`}</text>
                  </g>
                )
              })}
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>rows/table 10^<strong>{logRows}</strong></span>
              <input type="range" min={5} max={9.5} step={0.5} value={logRows} aria-label="rows per table" className={s.slider} onChange={e => setLogRows(Number(e.target.value))} />
              <span className={s.sliderLabel}>tables <strong>{nTables}</strong></span>
              <input type="range" min={1} max={400} step={1} value={nTables} aria-label="table count" className={s.slider} onChange={e => setNTables(Number(e.target.value))} />
              <span className={s.sliderLabel}>dim <strong>{dim}</strong></span>
              <input type="range" min={16} max={256} step={16} value={dim} aria-label="dim" className={s.slider} onChange={e => setDim(Number(e.target.value))} />
              <span className={s.sliderLabel}>bytes/elt <strong>{bytes}</strong></span>
              <input type="range" min={1} max={4} step={1} value={bytes} aria-label="bytes" className={s.slider} onChange={e => setBytes(Number(e.target.value))} />
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>total <span className={s.labStatValue}>{fmtGB(gb)}</span></span>
              <span className={s.labStat}>lands in <span className={s.labStatValue}>{tier.name}</span></span>
            </div>
          </>
        ) : (
          <>
            <svg viewBox="0 0 360 150" className={s.labCanvas} role="img" aria-label="Cache size versus hit rate">
              <line x1={34} y1={124} x2={348} y2={124} stroke="#888" />
              <line x1={34} y1={12} x2={34} y2={124} stroke="#888" />
              <polyline fill="none" stroke="#3a6ea5" strokeWidth={1.8}
                points={CACHE_PTS.map(p => `${34 + (Math.log2(p.mb) - 3) / 3 * 300},${124 - (p.hit / 65) * 108}`).join(' ')} />
              {CACHE_PTS.map(p => (
                <g key={p.mb}>
                  <circle cx={34 + (Math.log2(p.mb) - 3) / 3 * 300} cy={124 - (p.hit / 65) * 108} r={3.5} fill="#3a6ea5" />
                  <text x={34 + (Math.log2(p.mb) - 3) / 3 * 300} y={138} textAnchor="middle" fontSize={7.5} fill="#666">{p.mb}MB</text>
                </g>
              ))}
              <line x1={34} y1={124 - (5 / 65) * 108} x2={348} y2={124 - (5 / 65) * 108} stroke="#c0392b" strokeDasharray="3 2" />
              <text x={200} y={124 - (5 / 65) * 108 - 3} fontSize={7.5} fill="#c0392b">random access: &lt;5% hit</text>
              <text x={8} y={70} fontSize={8} fill="#555" transform="rotate(-90 8 70)">hit rate →</text>
            </svg>
            <p className={s.labNote}>
              Embeddings have <strong>temporal</strong> locality (popular items recur) but almost no{' '}
              <strong>spatial</strong> locality — an 8–64 MB LRU cache hits 20–60% on production traces vs under
              5% on random access, and (per RecNMP) the hit rate actually <em>falls</em> as the cacheline grows,
              because neighboring rows are unrelated. Caching hot rows works; prefetching contiguous ones doesn&apos;t.
            </p>
          </>
        )}
        {view === 'size' && (
          <p className={s.labNote}>
            rows × dim × bytes × tables → total memory. A single production table is ~1M rows; a real model has
            hundreds of tables and lands in the hundreds of GB to multi-TB range — past any single GPU&apos;s
            HBM. The problem isn&apos;t FLOPs, it&apos;s <strong>capacity and bandwidth</strong>: the gather-reduce
            (SLS) ops are 37–74% of serving latency, running within ~35% of the memory-bandwidth roofline.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes.** If the default GB string formats differently (e.g. "256 GB" vs "256.0 GB"), reconcile the `fmtGB` output with the test literal — pin the real output. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/dlrm/TableSizerLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Table Sizer & Roofline lab: GB math, memory tiers, cache locality

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Shard & Shuffle Lab (module 4)

**Files:**
- Create: `src/components/courses/dlrm/ShardShuffleLab.tsx`
- Modify: `src/components/courses/dlrm/dlrmLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `ShardShuffleLab` — registered as `shard-shuffle` in Task 9. A GPU-count slider drives a real "all-to-all vs compute" latency-shape comparison (illustrative curve shapes anchored to the ledger's >3× at 1K GPUs).

- [ ] **Step 1: Append the failing test**

```tsx
import ShardShuffleLab from './ShardShuffleLab'

describe('ShardShuffleLab', () => {
  it('shows model-parallel tables and data-parallel MLP', () => {
    render(<ShardShuffleLab />)
    expect(screen.getByText(/model-parallel/i)).toBeDefined()
    expect(screen.getByText(/data-parallel/i)).toBeDefined()
  })

  it('all-to-all overtakes compute as GPU count grows', () => {
    render(<ShardShuffleLab />)
    const g = screen.getByLabelText(/gpus/i)
    fireEvent.change(g, { target: { value: '1000' } })
    // at 1000 GPUs the ledger says all-to-all > 3x embedding compute
    expect(screen.getByText(/communication-bound/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails** → FAIL (no `./ShardShuffleLab`).

- [ ] **Step 3: Implement ShardShuffleLab**

Create `src/components/courses/dlrm/ShardShuffleLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Illustrative latency shapes anchored to the spec ledger: embedding compute is
// roughly flat per-GPU (~100-200ms at scale); all-to-all grows with GPU count,
// starts BELOW compute at small scale (compute-bound), and crosses to exceed 3x
// compute by ~1000 GPUs (>600ms). The crossover sits near ~64 GPUs. Shapes, not a benchmark.
function latencies(gpus: number) {
  const compute = 100 + 100 * Math.min(1, gpus / 1000) // ~100..200 ms, roughly flat per GPU
  const a2a = 7.8 * Math.pow(gpus, 0.64)               // ~30ms@8 (compute-bound) -> ~650ms@1000 (>3x compute)
  return { compute, a2a }
}

const GPU_STEPS = [8, 16, 32, 64, 128, 256, 512, 1000]

export default function ShardShuffleLab() {
  const [gpus, setGpus] = useState(8)
  const { compute, a2a } = useMemo(() => latencies(gpus), [gpus])
  const bound = a2a > compute ? 'communication-bound' : 'compute-bound'
  const shards = Math.min(gpus, 4) // draw up to 4 GPU boxes

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Shard &amp; Shuffle</span>
        <span className={s.widgetHint}>the DLRM training wall is communication</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 470 130" className={s.labCanvas} role="img" aria-label="Sharded embedding tables and replicated MLP across GPUs">
          {Array.from({ length: shards }, (_, i) => {
            const x = 12 + i * 116
            return (
              <g key={i}>
                <rect x={x} y={14} width={104} height={100} rx={4} fill="#f7f6f1" stroke="#bbb" />
                <text x={x + 52} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#555">GPU {i}</text>
                {/* model-parallel table shard */}
                <rect x={x + 8} y={34} width={88} height={26} rx={2} fill="#dceefb" stroke="#5a8fd0" />
                <text x={x + 52} y={51} textAnchor="middle" fontSize={7.5} fill="#1a4a8a">table shard {i}</text>
                {/* data-parallel MLP replica */}
                <rect x={x + 8} y={70} width={88} height={26} rx={2} fill="#ffe9d6" stroke="#c86018" />
                <text x={x + 52} y={87} textAnchor="middle" fontSize={7.5} fill="#8a3a0a">MLP (replica)</text>
              </g>
            )
          })}
          {/* all-to-all arrows between shards */}
          {shards > 1 && <text x={235} y={124} textAnchor="middle" fontSize={8} fill="#c0392b">↔ all-to-all: route each sample&apos;s rows to its MLP GPU ↔</text>}
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>GPUs <strong>{gpus}</strong></span>
          <input type="range" min={0} max={GPU_STEPS.length - 1} step={1} value={GPU_STEPS.indexOf(gpus)} aria-label="gpus"
            className={s.slider} onChange={e => setGpus(GPU_STEPS[Number(e.target.value)])} />
        </div>
        {/* latency bars */}
        <svg viewBox="0 0 360 70" className={s.labCanvas} role="img" aria-label="Compute versus all-to-all latency">
          <rect x={90} y={10} width={Math.min(260, compute / 3)} height={18} fill="#c86018" />
          <text x={8} y={23} fontSize={8} fill="#555">compute</text>
          <text x={94 + Math.min(260, compute / 3)} y={23} fontSize={8} fill="#555">{Math.round(compute)}ms</text>
          <rect x={90} y={36} width={Math.min(260, a2a / 3)} height={18} fill="#c0392b" />
          <text x={8} y={49} fontSize={8} fill="#555">all-to-all</text>
          <text x={94 + Math.min(260, a2a / 3)} y={49} fontSize={8} fill="#555">{Math.round(a2a)}ms</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>regime <span className={s.labStatValue}>{bound}</span></span>
        </div>
        <p className={s.labNote}>
          The table is too big to replicate, so it&apos;s <strong>model-parallel sharded</strong> across GPUs
          while the small MLP is <strong>data-parallel replicated</strong>. Each step, a personalized{' '}
          <strong>all-to-all</strong> routes every sample&apos;s rows to the GPU running its MLP; MLP gradients
          sync via allreduce. Slide the GPU count: the all-to-all grows until it dwarfs compute — on a ~2 TB,
          4000+-table model at 1000 GPUs it exceeds <strong>3×</strong> the embedding compute (&gt;600 ms). The
          DLRM wall is communication, not FLOPs — the mirror image of the attention course&apos;s memory-movement
          lesson.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/dlrm/ShardShuffleLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Shard & Shuffle lab: hybrid parallelism and the all-to-all wall

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Collision Explorer (module 5) — THE STAR LAB

**Files:**
- Create: `src/components/courses/dlrm/CollisionLab.tsx`
- Modify: `src/components/courses/dlrm/dlrmLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `CollisionLab` — registered as `qr-collide` in Task 9. REAL index math: `id % m` (modulo) vs quotient-remainder `(id % m, id ÷ m)` → element-wise combine. Memory formulas computed live: full `N·d`, modulo `m·d`, Q-R `(m + ⌈N/m⌉)·d`. Second tab: row quantization bit-width. Reported Criteo accuracy deltas shown as paper chips, never computed.

- [ ] **Step 1: Append the failing test**

```tsx
import CollisionLab from './CollisionLab'

describe('CollisionLab', () => {
  it('modulo collides two ids that share a residue; Q-R resolves them', () => {
    render(<CollisionLab />)
    // N=48, m=8: ids 3 and 11 both %8==3
    fireEvent.click(screen.getByRole('button', { name: /^id 3$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^id 11$/ }))
    // modulo mode (default): both map to row 3 -> collision reported
    expect(screen.getByText(/collide/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /quotient-remainder/i }))
    expect(screen.getByText(/unique/i)).toBeDefined()
  })

  it('memory readout follows the real formulas as m changes', () => {
    render(<CollisionLab />)
    const m = screen.getByLabelText(/buckets/i)
    fireEvent.change(m, { target: { value: '8' } })
    // Q-R rows = m + ceil(48/8) = 8 + 6 = 14 (of 48 full)
    fireEvent.click(screen.getByRole('button', { name: /quotient-remainder/i }))
    expect(screen.getByText(/14 rows/)).toBeDefined()
  })

  it('quantization tab moves bytes/row with bit-width', () => {
    render(<CollisionLab />)
    fireEvent.click(screen.getByRole('button', { name: /shrink each row/i }))
    const bits = screen.getByLabelText(/bits/i)
    fireEvent.change(bits, { target: { value: '4' } })
    expect(screen.getByText(/int4/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails** → FAIL (no `./CollisionLab`).

- [ ] **Step 3: Implement CollisionLab**

Create `src/components/courses/dlrm/CollisionLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

const N = 48          // toy ID space 0..47
const D = 16          // embedding dim (for memory math)

// Reported Criteo deltas (spec ledger) — shown as paper chips, NOT computed.
const QR_NOTE = 'Criteo Kaggle: ~4× smaller within 0.3% (DCN) / 0.7% (DLRM) of baseline BCE'
const QUANT_NOTE: Record<number, string> = {
  32: 'baseline (FP32)',
  16: 'FP16 · ~2× · quality-neutral',
  8: 'int8 · ~4× · negligible loss',
  4: 'int4 · ~7–8× (with per-row scale+bias) · log-loss-neutral on Terabyte Criteo',
}

export default function CollisionLab() {
  const [tab, setTab] = useState<'share' | 'shrink'>('share')
  const [mode, setMode] = useState<'mod' | 'qr'>('mod')
  const [m, setM] = useState(8)
  const [sel, setSel] = useState<number[]>([3, 11])
  const [bits, setBits] = useState(8)

  const qRows = Math.ceil(N / m)
  // Real index math.
  const collision = useMemo(() => {
    if (sel.length < 2) return null
    if (mode === 'mod') {
      const rows = sel.map(id => id % m)
      return rows[0] === rows[1] ? { kind: 'collide', detail: `both map to row ${rows[0]}` } : { kind: 'distinct', detail: `rows ${rows[0]} and ${rows[1]}` }
    }
    const a = { r: sel[0] % m, q: Math.floor(sel[0] / m) }
    const b = { r: sel[1] % m, q: Math.floor(sel[1] / m) }
    const same = a.r === b.r && a.q === b.q
    return same
      ? { kind: 'collide', detail: `(r${a.r},q${a.q}) = (r${b.r},q${b.q})` }
      : { kind: 'unique', detail: `(r${a.r},q${a.q}) vs (r${b.r},q${b.q}) — different pair` }
  }, [sel, mode, m])

  const fullRows = N
  const usedRows = mode === 'mod' ? m : m + qRows
  const memPct = Math.round((usedRows / fullRows) * 100)

  const toggle = (id: number) => setSel(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur.slice(-1), id])

  const bytesPerRow = (bits / 8) * D + (bits < 32 ? 6 : 0) // +scale+bias for low precision

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Collision Explorer</span>
        <span className={s.widgetHint}>memory vs collisions vs accuracy — pick your axis</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${tab === 'share' ? s.chipOn : ''}`} onClick={() => setTab('share')}>share rows</button>
          <button type="button" className={`${s.chip} ${tab === 'shrink' ? s.chipOn : ''}`} onClick={() => setTab('shrink')}>shrink each row</button>
        </div>
        {tab === 'share' ? (
          <>
            <div className={s.chipRow}>
              <button type="button" className={`${s.chip} ${mode === 'mod' ? s.chipOn : ''}`} onClick={() => setMode('mod')}>modulo hashing</button>
              <button type="button" className={`${s.chip} ${mode === 'qr' ? s.chipOn : ''}`} onClick={() => setMode('qr')}>quotient-remainder</button>
            </div>
            <svg viewBox="0 0 470 150" className={s.labCanvas} role="img" aria-label="ID space mapping into rows">
              {/* ID grid 0..47 */}
              {Array.from({ length: N }, (_, id) => {
                const x = 10 + (id % 12) * 30, y = 14 + Math.floor(id / 12) * 20
                const on = sel.includes(id)
                const share = collision?.kind === 'collide' && on
                return (
                  <g key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
                    <rect x={x} y={y} width={26} height={16} rx={2}
                      fill={share ? '#f0b8b8' : on ? '#f0d98c' : '#f2f0e8'} stroke={on ? '#0a246a' : '#ccc'} strokeWidth={on ? 1.6 : 0.6} />
                    <text x={x + 13} y={y + 12} textAnchor="middle" fontSize={8} fill="#333">{id}</text>
                  </g>
                )
              })}
              {/* target rows summary */}
              <text x={10} y={112} fontSize={9} fill="#333">
                {mode === 'mod' ? `${m} shared rows (id mod ${m})` : `${m} remainder rows ⊙ ${qRows} quotient rows`}
              </text>
              {collision && (
                <text x={10} y={132} fontSize={10} fontWeight="bold" fill={collision.kind === 'collide' ? '#c0392b' : '#2f8e2f'}>
                  {sel.length < 2 ? 'pick two ids' : `ids ${sel[0]} &amp; ${sel[1]}: ${collision.kind === 'collide' ? 'COLLIDE' : collision.kind === 'unique' ? 'UNIQUE' : 'distinct'} — ${collision.detail}`}
                </text>
              )}
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>buckets m <strong>{m}</strong></span>
              <input type="range" min={2} max={24} step={1} value={m} aria-label="buckets" className={s.slider} onChange={e => setM(Number(e.target.value))} />
              <span className={s.labStat}>rows stored <span className={s.labStatValue}>{usedRows} rows</span></span>
              <span className={s.labStat}>vs full <span className={s.labStatValue}>{memPct}%</span></span>
            </div>
            <p className={s.labNote}>
              <strong>Modulo hashing</strong> maps id → id mod m: memory drops to m rows, but ids sharing a
              residue <em>collide</em> onto one vector (pick two and watch). <strong>Quotient-remainder</strong>
              keeps two small tables — remainder (id mod m) and quotient (id ÷ m) — and combines their rows
              element-wise, so every id gets a <em>unique</em> vector using only (m + ⌈N/m⌉) rows instead of N.
              That&apos;s the trade: modulo is smaller but collides; Q-R stays unique at a √-ish row count.{' '}
              <span style={{ opacity: 0.75 }}>{QR_NOTE}.</span>
            </p>
          </>
        ) : (
          <>
            <svg viewBox="0 0 360 70" className={s.labCanvas} role="img" aria-label="Bytes per embedding row by precision">
              <rect x={90} y={20} width={Math.max(6, bytesPerRow * 3)} height={26} fill="#7a4ab8" />
              <text x={8} y={38} fontSize={9} fill="#555">bytes/row</text>
              <text x={96 + Math.max(6, bytesPerRow * 3)} y={38} fontSize={9} fill="#555">{bytesPerRow} B</text>
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>precision</span>
              {[32, 16, 8, 4].map(b => (
                <button key={b} type="button" className={`${s.chip} ${bits === b ? s.chipOn : ''}`} aria-label={`bits ${b}`} onClick={() => setBits(b)}>
                  {b === 32 ? 'fp32' : b === 16 ? 'fp16' : `int${b}`}
                </button>
              ))}
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>mode <span className={s.labStatValue}>{bits === 32 ? 'fp32' : bits === 16 ? 'fp16' : `int${bits}`}</span></span>
            </div>
            <p className={s.labNote}>
              <strong>Row-wise quantization</strong> stores each row in low precision with one (scale, bias)
              pair per row — that&apos;s the +6 bytes you see below int8. Pure int4 is 8×; the per-row scale+bias
              trims it to ~7×. <span style={{ opacity: 0.75 }}>{QUANT_NOTE[bits]}.</span> These are the paper&apos;s
              reported numbers on Terabyte Criteo, not measured here — and note every compression method reports
              on its <em>own</em> benchmark, so the ratios aren&apos;t directly comparable.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes.** Trace the defaults by hand if a test fails: N=48, m=8 → Q-R rows 8+6=14; ids 3,11 collide under mod (3), resolve under QR ((r3,q0) vs (r3,q1)). Pin any differing leaf string. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/dlrm/CollisionLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Collision Explorer: real modulo vs quotient-remainder + row quantization

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Interaction Orders Lab (module 6)

**Files:**
- Create: `src/components/courses/dlrm/InteractionOrdersLab.tsx`
- Modify: `src/components/courses/dlrm/dlrmLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `InteractionOrdersLab` — registered as `interaction-orders` in Task 9. Real 2^L combinatorics: DLRM fixed order-2 vs Wukong's layer-i-reaches-2^i.

- [ ] **Step 1: Append the failing test**

```tsx
import InteractionOrdersLab from './InteractionOrdersLab'

describe('InteractionOrdersLab', () => {
  it('Wukong reaches interaction order 2^layers', () => {
    render(<InteractionOrdersLab />)
    const layers = screen.getByLabelText(/layers/i)
    fireEvent.change(layers, { target: { value: '5' } })
    expect(screen.getByText(/order 32/)).toBeDefined() // 2^5
  })

  it('contrasts DLRM fixed pairwise (order 2)', () => {
    render(<InteractionOrdersLab />)
    expect(screen.getByText(/order 2/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails** → FAIL (no `./InteractionOrdersLab`).

- [ ] **Step 3: Implement InteractionOrdersLab**

Create `src/components/courses/dlrm/InteractionOrdersLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// Wukong (spec ledger): layer i captures feature-interaction orders up to 2^i
// via stacked FMB+LCB blocks — vs DLRM's single fixed pairwise (order-2) dot.
export default function InteractionOrdersLab() {
  const [layers, setLayers] = useState(3)
  const wukongOrder = Math.pow(2, layers)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Interaction Orders</span>
        <span className={s.widgetHint}>sparse scaling → dense scaling</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 360 120" className={s.labCanvas} role="img" aria-label="Interaction order reachable by DLRM versus Wukong layers">
          {/* DLRM: fixed order 2 */}
          <text x={10} y={20} fontSize={9} fontWeight="bold" fill="#c86018">DLRM (fixed pairwise)</text>
          <rect x={10} y={26} width={40} height={20} fill="#ffe9d6" stroke="#c86018" />
          <text x={30} y={40} textAnchor="middle" fontSize={9} fill="#8a3a0a">order 2</text>
          {/* Wukong: stacked layers, order 2^i */}
          <text x={10} y={70} fontSize={9} fontWeight="bold" fill="#7a4ab8">Wukong ({layers} layers)</text>
          {Array.from({ length: layers }, (_, i) => (
            <g key={i}>
              <rect x={10 + i * 56} y={76} width={50} height={20} fill="#efe9f8" stroke="#7a4ab8" />
              <text x={35 + i * 56} y={90} textAnchor="middle" fontSize={8} fill="#4a2a6a">2^{i + 1}={Math.pow(2, i + 1)}</text>
            </g>
          ))}
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>Wukong layers <strong>{layers}</strong></span>
          <input type="range" min={1} max={6} step={1} value={layers} aria-label="layers" className={s.slider} onChange={e => setLayers(Number(e.target.value))} />
          <span className={s.labStat}>DLRM reaches <span className={s.labStatValue}>order 2</span></span>
          <span className={s.labStat}>Wukong reaches <span className={s.labStatValue}>order {wukongOrder}</span></span>
        </div>
        <p className={s.labNote}>
          Classic DLRM computes one fixed round of <strong>pairwise</strong> (order-2) dot-product interactions.
          Wukong stacks identical blocks so layer <em>i</em> reaches interaction order <strong>2^i</strong> — by
          binary exponentiation, a handful of layers captures very high-order feature crosses, and the model
          scales by adding <strong>compute</strong> (dense scaling) rather than only growing tables (sparse
          scaling). Wukong reports an LLM-style scaling law past 100 GFLOP/example — yet{' '}
          <strong>627B of its 637B parameters are still embeddings</strong>. The interaction core is being
          reinvented; the table isn&apos;t going anywhere.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the full lab file** → `npx vitest run src/components/courses/dlrm/dlrmLabs.test.tsx` — all six labs green. Then full suite vs baseline: `npx vitest run 2>&1 | tail -3` — no new failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/dlrm/InteractionOrdersLab.tsx src/components/courses/dlrm/dlrmLabs.test.tsx
git commit -m "Add Interaction Orders lab: DLRM pairwise vs Wukong order-2^i scaling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Course content — modules 1–3

**Files:**
- Create: `src/components/courses/dlrm/content.tsx`

**Interfaces:**
- Produces: `export const MODULES: CourseModule[]`, `export const COURSE_TITLE`, `export const COURSE_TAGLINE` — Task 8 appends modules 4–6; Task 9 imports them. Quiz ids `d1-q*`, `d2-q*`, `d3-q*`. All facts per the spec verification ledger — do not paraphrase numbers.

- [ ] **Step 1: Create the file with the header and modules 1–3**

Create `src/components/courses/dlrm/content.tsx`:

```tsx
import { ReactNode } from 'react'
import type { CourseModule } from '../engine/types'

function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export const COURSE_TITLE = 'Recommenders at Scale'
export const COURSE_TAGLINE = 'Why a recommendation model is mostly a giant lookup table — and what that costs'

export const MODULES: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'why-tables',
    navLabel: '1. Why embedding tables',
    title: 'Why embedding tables exist',
    subtitle: 'A categorical value has no arithmetic — so it gets a learned row',
    minutes: 7,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              A recommender predicts an outcome — will you click, watch, buy — from features about a{' '}
              <strong>user</strong>, an <strong>item</strong>, and the <strong>context</strong>. Some features are{' '}
              <strong>dense</strong>: age, price, time-of-day — real numbers you can feed straight into a network.
              But most of the signal is <strong>categorical</strong>: user id, item id, ad id, device, zip code.
              A user id of 4.2 billion possible values isn&apos;t a magnitude — user 3 000 000 isn&apos;t &quot;more&quot;
              than user 5. You cannot do arithmetic on it.
            </p>
            <p>
              The fix is the <strong>embedding table</strong>: give every value of a categorical feature its own
              learned vector — a <em>row</em>. Looking one up is mathematically a one-hot vector times a matrix,{' '}
              <strong>wᵢᵀ = eᵢᵀW</strong>, which just selects row <em>i</em>. That is the entire trick, and it is
              the same one the <A href="/learn/attention-mechanisms">Attention course</A> uses for token
              embeddings — except a language model&apos;s vocabulary is ~50 000 tokens, and a recommender&apos;s is
              billions of ids.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'lookup' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The canonical <A href="https://arxiv.org/abs/1906.00091">DLRM</A> (Naumov et al., 2019) wires this
              into one model: dense features go through a <strong>bottom MLP</strong>; every categorical feature
              indexes its <strong>own embedding table</strong>; the model then takes <strong>dot products between
              all pairs</strong> of embedding vectors (and the processed dense vector) as explicit second-order
              feature interactions, concatenates them with the dense vector, and passes everything through a{' '}
              <strong>top MLP</strong> into a sigmoid — a click probability. Multi-hot features (a movie with
              several genres) pool several rows into one vector.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🗂️',
        title: 'The table is where the model remembers',
        body: (
          <>
            Every categorical feature &quot;lives&quot; in its table — the model&apos;s memory of who and what.
            The MLPs are small and do the reasoning; the tables are enormous and do the remembering. Hold that
            split — it is the entire rest of this course.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd1-q1',
            prompt: 'Why can\'t a user id just be fed to the network as a number?',
            options: [
              { text: 'Ids are too large to fit in a float', explain: 'Not the issue — the problem is semantic, not numeric range.' },
              { text: 'The ordering and magnitude of ids are meaningless — user 5M isn\'t "more" than user 3 — so arithmetic on them is nonsense; each value needs its own learned vector', correct: true, explain: 'Categorical values have no metric. The embedding row is how the model gives each value a position it can actually learn.' },
              { text: 'Because ids change over time', explain: 'Churn is a real issue elsewhere, but the fundamental reason is that a categorical id has no meaningful arithmetic.' },
            ],
          },
          {
            id: 'd1-q2',
            prompt: 'An embedding lookup wᵢᵀ = eᵢᵀW is equivalent to…',
            options: [
              { text: 'a matrix inverse', explain: 'No inversion — it\'s a selection.' },
              { text: 'selecting row i of the table W (a one-hot vector times the matrix)', correct: true, explain: 'The one-hot eᵢ picks exactly one row. Multi-hot pools several. That\'s the whole operation.' },
              { text: 'a convolution over the table', explain: 'No sliding kernel — a single row gather.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Deep Learning Recommendation Model (DLRM) — Naumov et al. (2019)', href: 'https://arxiv.org/abs/1906.00091', note: 'the canonical architecture; §2.1 formalizes the lookup' },
          { label: 'DLRM open-source implementation — Facebook Research', href: 'https://github.com/facebookresearch/dlrm' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'asymmetry',
    navLabel: '2. Params vs FLOPs',
    title: 'The asymmetry: parameters aren\'t compute',
    subtitle: 'A DLRM has trillions of parameters and almost no arithmetic',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Here is the property that makes recommenders their own engineering discipline. In a transformer,
              parameters and FLOPs rise together — a bigger model costs proportionally more compute, which is the
              whole premise of scaling laws in the Attention course. A DLRM <strong>breaks that coupling</strong>.
              Embedding lookups are O(1) gathers: they add parameters (memory) but essentially no arithmetic. The
              MLPs hold almost all the FLOPs but are tiny in memory.
            </p>
            <p>
              The numbers are stark. Meta&apos;s <A href="https://arxiv.org/abs/2104.05158">production systems
              paper</A> reports three deployed DLRMs spanning <strong>332 billion to 12 trillion parameters — at
              only 5 to 638 MFLOPs per sample</strong>. The 12-trillion-parameter model runs at <em>5</em> MFLOPs
              per sample; nearly all of it is table. Embeddings &quot;contribute the majority of the
              parameters&quot;; the MLPs are &quot;smaller in memory but translate into sizeable amounts of
              compute&quot;.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'param-flop' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              This wasn&apos;t a niche workload. As of 2019, recommendation models consumed <strong>more than 72%
              of all AI inference cycles</strong> in Facebook&apos;s datacenters, and DLRMs were the company&apos;s
              single largest AI application by infrastructure demand. Every instinct from compute-bound deep
              learning — buy more FLOPs, the model is compute-bound — inverts here.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '⚖️',
        title: 'Attention computes; a DLRM remembers',
        body: (
          <>
            The Attention course&apos;s models are bound by matmuls. A DLRM is bound by <em>memory</em> — capacity
            to hold the tables and bandwidth to gather rows. Same field, opposite bottleneck. Keep this contrast;
            modules 3 and 4 are its consequences.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd2-q1',
            prompt: 'A 12-trillion-parameter DLRM runs at ~5 MFLOPs/sample. What does that tell you?',
            options: [
              { text: 'The model is under-trained', explain: 'FLOPs/sample is an architectural property, not a training-progress signal.' },
              { text: 'Almost all those parameters are embedding rows that are gathered (O(1)), not multiplied — the model is memory-bound, not compute-bound', correct: true, explain: 'Parameters ≠ compute for DLRMs. The tables dominate memory; the MLPs dominate the (tiny) FLOP count.' },
              { text: 'It must be a sparse mixture-of-experts', explain: 'MoE routes compute among experts; this asymmetry comes from embedding lookups, a different mechanism.' },
            ],
          },
          {
            id: 'd2-q2',
            prompt: 'Which slider in the lab moves FLOPs — and why only that one?',
            options: [
              { text: 'Rows per table — more rows, more compute', explain: 'More rows add memory, not arithmetic; a lookup is O(1) regardless of table height.' },
              { text: 'MLP width — because only the dense MLPs do matrix multiplies; the tables are gathered, not multiplied', correct: true, explain: 'Exactly the asymmetry: table size is pure memory, MLP width is the compute knob.' },
              { text: 'Embedding dim — it changes the dot-product cost dominantly', explain: 'Dim nudges interaction cost slightly, but the dominant FLOPs are the MLP matmuls — table growth is free of compute.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Understanding Training Efficiency of DL Recommendation Models at Scale — Meta (ISCA 2022)', href: 'https://arxiv.org/abs/2104.05158', note: 'the 332B–12T params @ 5–638 MFLOPS figures' },
          { label: 'The Architectural Implications of Facebook\'s DNN-based Personalized Recommendation — Gupta et al. (2019)', href: 'https://arxiv.org/abs/1906.03109', note: 'fleet share; serving is memory-bound' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'scale',
    navLabel: '3. How big it gets',
    title: 'How big the table gets',
    subtitle: 'Geometry, memory tiers, the bandwidth roofline, and locality',
    minutes: 10,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Table memory is just geometry: <strong>rows × dim × bytes × number of tables</strong>. A single
              production table runs ~1 million rows; a real model has 8 to 64 (later hundreds) of them, landing in
              tens to hundreds of GB — and the biggest models reach multiple terabytes. That is far past any single
              accelerator&apos;s on-chip memory, so tables spill down a hierarchy: <strong>HBM</strong> (on-GPU,
              fast, ~80 GB on one A100/H100), <strong>DRAM</strong> (host, big, ~1.5 TB/node, slower), then{' '}
              <strong>SSD or distributed</strong> storage. Size the table below and watch which tier it falls into.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'table-sizer' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Because the arithmetic is trivial, serving is <strong>memory-bandwidth-bound</strong>: the
              gather-reduce embedding ops (SparseLengthsSum and kin) take <strong>37–74% of inference latency</strong>
              and run within ~35% of the theoretical memory-bandwidth roofline. And the access pattern is
              awkward — <strong>temporal locality yes, spatial locality no</strong>. Popular ids recur (an 8–64 MB
              cache hits 20–60% versus under 5% on random access), but neighboring rows are unrelated, so hit rate
              actually <em>falls</em> as the cacheline grows. Caching hot rows works; prefetching contiguous ones
              doesn&apos;t.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🧱',
        title: 'Why you can\'t just buy a bigger GPU',
        body: (
          <>
            A faster GPU buys FLOPs — the thing DLRMs don&apos;t need. What they need is <em>capacity</em> to hold
            the table and <em>bandwidth</em> to gather rows. That&apos;s a different axis of hardware, and it&apos;s
            why the next module has to split the table across many devices.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd3-q1',
            prompt: 'Embedding serving is bottlenecked on…',
            options: [
              { text: 'floating-point throughput', explain: 'FLOPs are trivial here — the gather-reduce ops are the cost.' },
              { text: 'memory bandwidth — the SparseLengthsSum gathers are 37–74% of latency, near the memory roofline', correct: true, explain: 'Moving rows out of memory, not multiplying them, is the wall.' },
              { text: 'network latency to the user', explain: 'A serving-request concern, not the on-device embedding bottleneck.' },
            ],
          },
          {
            id: 'd3-q2',
            prompt: 'Why does a bigger cacheline HURT embedding cache hit rate?',
            options: [
              { text: 'Embedding rows have temporal but almost no spatial locality — the neighbors dragged in by a wide line are unrelated ids, wasting the cache', correct: true, explain: 'Popular rows recur (temporal), but adjacent rows aren\'t co-accessed (no spatial locality), so fat cachelines pull in dead weight.' },
              { text: 'Larger cachelines are slower to fetch', explain: 'The fetch cost isn\'t the issue — it\'s that the extra bytes are useless rows.' },
              { text: 'It doesn\'t — bigger lines always help', explain: 'The RecNMP traces show the opposite for embeddings, precisely because of the missing spatial locality.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'The Architectural Implications of Facebook\'s Recommendation (RecNMP context) — Gupta et al. (2019)', href: 'https://arxiv.org/abs/1906.03109', note: 'SLS latency share, roofline, cache-locality traces' },
          { label: 'Software-Hardware Co-design for Fast and Scalable Training of DLRMs (Neo/ZionEX) — Mudigere et al. (2021)', href: 'https://arxiv.org/abs/2104.05158', note: 'memory tiers and node geometry' },
        ],
      },
    ],
  },
]
```

- [ ] **Step 2: Type-check and lint** — `npx tsc --noEmit && npx eslint src/components/courses/dlrm/content.tsx` (file not yet imported — that's Task 9). Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/dlrm/content.tsx
git commit -m "Add DLRM course content: modules 1-3 (why tables, asymmetry, scale)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Course content — modules 4–6

**Files:**
- Modify: `src/components/courses/dlrm/content.tsx` (insert three module objects before the closing `]` of `MODULES`, after the `scale` module)

**Interfaces:**
- Consumes: the `A` helper and `MODULES` array from Task 7.
- Produces: modules `distribute`, `shrink`, `pivot` referencing widgets `shard-shuffle`, `qr-collide`, `interaction-orders`. Quiz ids `d4-q*`, `d5-q*`, `d6-q*`. Module 5 prose MUST include the apples-to-oranges caveat; all compression numbers are the papers' reported figures on their own benchmarks.

- [ ] **Step 1: Append the three modules**

Insert before the closing `]` of `MODULES`:

```tsx
  // ------------------------------------------------------------------
  {
    id: 'distribute',
    navLabel: '4. Distributing the table',
    title: 'Distributing the table',
    subtitle: 'Hybrid parallelism, and why communication becomes the wall',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              No single device holds a multi-terabyte table, so DLRMs use <strong>hybrid parallelism</strong>,
              introduced by the DLRM paper and generalized by Meta&apos;s Neo/ZionEX: the huge tables are{' '}
              <strong>model-parallel sharded</strong> across GPUs (each holds a slice), while the small MLP is{' '}
              <strong>data-parallel replicated</strong> on every GPU. But a sample&apos;s categorical rows may live
              on a different GPU than the one running its MLP — so every step needs a personalized{' '}
              <strong>all-to-all</strong> exchange to route rows to where they&apos;re consumed, plus an allreduce
              to sync MLP gradients.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'shard-shuffle' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Neo/ZionEX trained production DLRMs up to <strong>12 trillion parameters at ~1.7 million QPS on 128
              A100 GPUs</strong>, a 40× speedup over the prior CPU parameter-server platform. But at scale the
              all-to-all becomes the bottleneck: a 2025 Meta preprint reports that on a ~2 TB, 4000-plus-table
              model at <strong>1 000 GPUs the all-to-all exceeds 600 ms — over 3× the embedding compute</strong>.
              The newest fix layers data parallelism back on top of the sharded tables (4D / 2D-sparse sharding) to
              cut the communication.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🔀',
        title: 'The wall is communication, not compute',
        body: (
          <>
            The Attention course&apos;s efficiency story is about moving less <em>memory</em> (KV caches,
            FlashAttention). The DLRM story is about moving less <em>across the network</em> — the all-to-all
            shuffle. Different layer of the stack, same lesson: at scale, data movement dominates arithmetic.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd4-q1',
            prompt: 'In DLRM hybrid parallelism, what is sharded vs replicated?',
            options: [
              { text: 'MLP sharded, tables replicated', explain: 'Backwards — the tables are far too big to replicate; the MLP is the small, replicable part.' },
              { text: 'Embedding tables model-parallel sharded across GPUs; the MLP data-parallel replicated on each', correct: true, explain: 'Tables are too large to copy, so they\'re split; the small MLP is copied everywhere and its gradients allreduced.' },
              { text: 'Both fully replicated', explain: 'A terabyte table can\'t be replicated per GPU — that\'s the whole reason for sharding.' },
            ],
          },
          {
            id: 'd4-q2',
            prompt: 'Why does the all-to-all exchange exist at all?',
            options: [
              { text: 'To synchronize MLP gradients', explain: 'That\'s the allreduce; the all-to-all does something else — it moves embedding rows.' },
              { text: 'A sample\'s rows may live on a different GPU than the one running its MLP, so rows must be routed to where they\'re consumed', correct: true, explain: 'Sharding scatters rows by table; the personalized all-to-all gathers each sample\'s rows onto its compute GPU.' },
              { text: 'To load-balance the SSD tier', explain: 'Storage tiering is separate; the all-to-all is a per-step GPU-to-GPU row exchange.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Software-Hardware Co-design for Fast and Scalable Training of DLRMs (Neo/ZionEX) — Mudigere et al. (2021)', href: 'https://arxiv.org/abs/2104.05158', note: '12T params, 1.7M QPS, 128 A100s, hybrid parallelism' },
          { label: 'Deep Learning Recommendation Model (DLRM) — Naumov et al. (2019)', href: 'https://arxiv.org/abs/1906.00091', note: 'introduced the sharded-embeddings + replicated-MLP scheme' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'shrink',
    navLabel: '5. Shrinking the table',
    title: 'Shrinking the table',
    subtitle: 'Five families of compression — and no free lunch',
    minutes: 11,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              If the table is the problem, the obvious move is to make it smaller. There are five families, and
              every one trades something. <strong>(A) Share rows.</strong> The <A href="https://arxiv.org/abs/0902.2206">hashing
              trick</A> maps ids into a fixed <em>m</em>-row space (storage O(d)→O(m)) — but ids that hash together{' '}
              <em>collide</em> onto one vector. <A href="https://arxiv.org/abs/1909.02107">Quotient-remainder</A>{' '}
              (Shi et al., 2020) keeps two small tables — one indexed by <strong>id mod m</strong>, one by{' '}
              <strong>id ÷ m</strong> — and combines their rows element-wise, giving every id a unique vector at
              roughly √-memory. <A href="https://arxiv.org/abs/2108.02191">ROBE</A> (MLSys 2022) generalizes this to
              a single shared circular array of blocks, reporting <strong>~1000× less embedding memory (100 MB vs
              100 GB) at the MLPerf CriteoTB AUC target</strong>.
            </p>
            <p>
              <strong>(B) Factorize.</strong> <A href="https://arxiv.org/abs/2101.11714">TT-Rec</A> (MLSys 2021)
              tensor-train-decomposes each table into a few small cores; a lookup becomes a product of core slices.
              It reports <strong>112× compression on Criteo Terabyte with no accuracy loss</strong> (12.57 GB →
              0.11 GB), at ~14% more training time. <strong>(C) Shrink each row.</strong> Row-wise{' '}
              <strong>int8/int4 quantization</strong> stores low-precision rows with one (scale, bias) pair each —
              ~7–8× smaller, log-loss-neutral on Terabyte Criteo (a deployed Meta model hit 13.9% of FP32 size).{' '}
              <strong>(D) Manage lifecycle.</strong> Frequency/importance pruning drops rarely-useful embeddings
              during training. And the outlier, <strong>(E) eliminate the table</strong>:{' '}
              <A href="https://arxiv.org/abs/2010.10784">DHE</A> (KDD 2021) replaces it with hash functions plus a
              trainable MLP that <em>computes</em> the embedding on demand — parameter count independent of
              vocabulary — but only ~4× smaller at parity. Try the two cleanest knobs below.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'qr-collide' },
      {
        kind: 'callout',
        icon: '🍎',
        title: 'These numbers are not directly comparable',
        body: (
          <>
            Every headline ratio is self-reported on a <em>different</em> benchmark and metric — DHE&apos;s ~4× on
            MovieLens/Amazon AUC, ROBE&apos;s 1000× on CriteoTB AUC, TT-Rec&apos;s 112× on Criteo Terabyte
            accuracy, quotient-remainder&apos;s 4–15× on Criteo Kaggle BCE, quantization&apos;s ~7–8× on Terabyte
            log-loss. Read each as &quot;its paper reports X on its benchmark,&quot; never as a head-to-head
            ranking. The real lesson is the shape of the trade: memory vs collisions vs accuracy vs compute — you
            choose which axis to spend, and there is no free lunch.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd5-q1',
            prompt: 'How does quotient-remainder keep every id unique while using far fewer rows than a full table?',
            options: [
              { text: 'It stores each id\'s vector once in a compressed column format', explain: 'No compression codec — it\'s a factorization of the index space.' },
              { text: 'Two small tables indexed by id mod m and id ÷ m, combined element-wise — the (remainder, quotient) pair is unique per id, so the combined vector is too', correct: true, explain: 'Every id maps to a distinct (r, q) pair, so element-wise combining two shared rows yields a unique vector at (m + ⌈N/m⌉) rows instead of N.' },
              { text: 'It hashes ids and accepts the collisions', explain: 'That\'s plain modulo hashing; Q-R\'s point is to AVOID collisions while still shrinking.' },
            ],
          },
          {
            id: 'd5-q2',
            prompt: 'A colleague says "ROBE gets 1000× and TT-Rec gets 112×, so ROBE is 9× better." What\'s wrong?',
            options: [
              { text: 'Nothing — the ratios are directly comparable', explain: 'They aren\'t: each is measured on a different dataset and metric.' },
              { text: 'The ratios come from different papers on different benchmarks and metrics (CriteoTB AUC vs Criteo Terabyte accuracy), so they can\'t be ranked head-to-head', correct: true, explain: 'The apples-to-oranges trap: compression numbers are only meaningful against their own reported benchmark and quality target.' },
              { text: 'ROBE\'s number is fabricated', explain: 'It\'s a real reported result — the error is comparing it directly to a number from a different protocol.' },
            ],
          },
          {
            id: 'd5-q3',
            prompt: 'DHE is described as "eliminating the table." What replaces it, and what\'s the catch?',
            options: [
              { text: 'A bigger table with fewer rows', explain: 'DHE has no embedding table at all — that\'s the point.' },
              { text: 'Hash functions produce a dense id vector fed to a trainable MLP that computes the embedding on the fly; params are independent of vocabulary size, but the compression is modest (~4×)', correct: true, explain: 'Storage moves from an O(n·d) table into a fixed-size decoder — elegant, vocabulary-independent, but only ~4× at parity, far below TT-Rec/ROBE.' },
              { text: 'A cache of the most frequent embeddings', explain: 'That\'s a tiering/lifecycle idea; DHE instead synthesizes each embedding from hashes via an MLP.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Compositional Embeddings Using Complementary Partitions (Quotient-Remainder) — Shi et al. (KDD 2020)', href: 'https://arxiv.org/abs/1909.02107' },
          { label: 'Random Offset Block Embedding (ROBE) — Desai et al. (MLSys 2022)', href: 'https://arxiv.org/abs/2108.02191', note: '~1000× on CriteoTB' },
          { label: 'TT-Rec: Tensor Train Compression for DLRM Embedding Tables — Yin et al. (MLSys 2021)', href: 'https://arxiv.org/abs/2101.11714', note: '112× on Criteo Terabyte, no loss' },
          { label: 'Learning to Embed Categorical Features without Embedding Tables (DHE) — Kang et al. (KDD 2021)', href: 'https://arxiv.org/abs/2010.10784' },
          { label: 'The Hashing Trick (Feature Hashing) — Weinberger et al. (ICML 2009)', href: 'https://arxiv.org/abs/0902.2206', note: 'the shared-row baseline' },
          { label: 'Post-Training 4-bit Quantization of Embedding Tables — Guan et al. (2019)', href: 'https://arxiv.org/abs/1911.02079', note: 'row-wise scale+bias' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'pivot',
    navLabel: '6. Does the table survive?',
    title: 'The pivot — does the table survive?',
    subtitle: 'Dense scaling, generative recommenders, and what persists',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              For years recommenders scaled by <strong>sparse scaling</strong> — growing embedding tables to
              trillions of parameters. Meta&apos;s <A href="https://arxiv.org/abs/2403.02545">Wukong</A> (ICML 2024)
              argues this diverges from hardware trends (next-gen accelerators add <em>compute</em>, not capacity)
              and pivots to <strong>dense scaling</strong>: a stack of identical interaction blocks where layer{' '}
              <em>i</em> captures feature-interaction orders up to <strong>2^i</strong> — versus DLRM&apos;s single
              fixed pairwise round. Wukong reports an <strong>LLM-style scaling law past 100 GFLOP/example</strong>.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'interaction-orders' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The generative turn goes further: sequential/generative recommenders (HSTU-style) reframe
              recommendation as next-item prediction, and MLPerf&apos;s 2026 benchmark refresh replaced the classic
              DLRM interaction core with a 5-layer generative model. But notice what <em>doesn&apos;t</em> change:
              Wukong is still <strong>627 billion of its 637 billion parameters in embeddings</strong>, and even
              the new generative benchmark <strong>keeps a 1-billion-row embedding table</strong>. The interaction
              architecture is being reinvented; the categorical-feature vocabulary — the table — persists. The
              problem this course is about doesn&apos;t disappear. It moves.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🎓',
        title: 'The through-line',
        body: (
          <>
            Categorical features need learned rows (1); those rows dominate parameters but not compute (2); that
            makes recommenders memory- and communication-bound (3–4); so the field&apos;s engineering is table
            compression and distribution (5); and even as architectures go generative, the table stays (6). If you
            took the <A href="/learn/attention-mechanisms">Attention</A> and{' '}
            <A href="/learn/graph-foundation-models">Graph Foundation Models</A> courses, this is the third corner:
            the world where the model is mostly memory.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'd6-q1',
            prompt: 'What distinguishes Wukong\'s "dense scaling" from classic DLRM scaling?',
            options: [
              { text: 'It grows the embedding tables faster', explain: 'That\'s sparse scaling — the thing Wukong argues away from.' },
              { text: 'It scales by adding interaction compute (stacked blocks reaching order 2^i) rather than only enlarging tables, tracking compute-oriented hardware trends', correct: true, explain: 'Dense scaling spends FLOPs on higher-order interactions instead of only spending memory on bigger tables.' },
              { text: 'It removes embeddings entirely', explain: 'No — 627B of Wukong\'s 637B params are still embeddings.' },
            ],
          },
          {
            id: 'd6-q2',
            prompt: 'Generative recommenders (HSTU / the 2026 MLPerf refresh) are displacing DLRM interaction cores. What happens to the embedding table?',
            options: [
              { text: 'It disappears — generative models don\'t need it', explain: 'The evidence is the opposite: the new benchmark keeps a 1B-row table.' },
              { text: 'It persists — the interaction architecture changes, but categorical ids still need learned rows; even DLRMv3 retains a 1B-row table', correct: true, explain: 'The vocabulary problem is orthogonal to the interaction architecture, so the table survives the generative turn.' },
              { text: 'It becomes the MLP', explain: 'Tables and MLPs stay distinct; generative cores replace the interaction step, not the embedding storage.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Wukong: Towards a Scaling Law for Large-Scale Recommendation — Zhang et al. (ICML 2024)', href: 'https://arxiv.org/abs/2403.02545', note: 'dense scaling; 627B/637B params in embeddings' },
          { label: 'Actions Speak Louder than Words (HSTU generative recommenders) — Zhai et al. (ICML 2024)', href: 'https://arxiv.org/abs/2402.17152' },
          { label: 'MLPerf Inference — MLCommons', href: 'https://mlcommons.org/benchmarks/inference-datacenter/', note: 'the DLRMv3 generative benchmark refresh (2026)' },
        ],
      },
    ],
  },
```

- [ ] **Step 2: Type-check and lint** — `npx tsc --noEmit && npx eslint src/components/courses/dlrm/content.tsx`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/dlrm/content.tsx
git commit -m "Add DLRM course content: modules 4-6 (distribute, shrink, pivot)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Wire the course — definition, registration, catalog, art, shell test

**Files:**
- Create: `src/components/courses/dlrm/index.tsx`
- Modify: `src/components/learn/courses.tsx` (register definition + art)
- Modify: `src/lib/courseCatalog.ts` (new entry)
- Create: `src/components/courses/dlrm/DlrmStudyGuide.test.tsx`

**Interfaces:**
- Consumes: `MODULES`/`COURSE_TITLE`/`COURSE_TAGLINE` (Tasks 7–8), the six lab components (Tasks 1–6).
- Produces: the live course at `/learn/dlrm-embedding-tables`. `courseCatalog.test.ts` (untouched) enforces: minutes sum over modules = catalog entry (7+9+10+9+11+9 = **55**); every referenced widget registered; quiz ids globally unique across all three courses; a definition + art per catalog slug.

- [ ] **Step 1: Write the shell test first (failing)**

Create `src/components/courses/dlrm/DlrmStudyGuide.test.tsx` (mirror `gfm/GfmStudyGuide.test.tsx`'s localStorage stub):

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CourseShell from '../engine/CourseShell'
import { dlrmCourse } from './index'
import { MODULES } from './content'
import { invalidateCourseProgressCaches } from '../engine/progress'

beforeEach(() => {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    },
  })
  invalidateCourseProgressCaches()
})

describe('DLRM course through CourseShell', () => {
  it('renders module 1 and lists all six modules in the sidebar', () => {
    render(<CourseShell course={dlrmCourse} />)
    expect(screen.getByRole('heading', { name: 'Why embedding tables exist' })).toBeDefined()
    const nav = screen.getByRole('navigation')
    for (const m of MODULES) expect(within(nav).getByText(m.navLabel)).toBeDefined()
    expect(screen.getByText('0% complete')).toBeDefined()
  })

  it('navigates to a module and renders its widget', () => {
    render(<CourseShell course={dlrmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /5\. Shrinking the table/ }))
    expect(screen.getByRole('heading', { name: 'Shrinking the table' })).toBeDefined()
    expect(screen.getByText('Collision Explorer')).toBeDefined()
  })

  it('marks a module complete and advances the progress bar', () => {
    render(<CourseShell course={dlrmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByText(`${Math.round(100 / MODULES.length)}% complete`)).toBeDefined()
  })
})
```

Run: `npx vitest run src/components/courses/dlrm/DlrmStudyGuide.test.tsx` → FAIL (no `./index`).

- [ ] **Step 2: Create the course definition**

Create `src/components/courses/dlrm/index.tsx`:

```tsx
import type { CourseDefinition } from '../engine/types'
import { MODULES, COURSE_TITLE, COURSE_TAGLINE } from './content'
import LookupLab from './LookupLab'
import ParamFlopLab from './ParamFlopLab'
import TableSizerLab from './TableSizerLab'
import ShardShuffleLab from './ShardShuffleLab'
import CollisionLab from './CollisionLab'
import InteractionOrdersLab from './InteractionOrdersLab'

export const dlrmCourse: CourseDefinition = {
  id: 'dlrm-embedding-tables',
  title: COURSE_TITLE,
  tagline: COURSE_TAGLINE,
  storageKey: 'dlrm-course-progress-v1',
  modules: MODULES,
  widgets: {
    'lookup': LookupLab,
    'param-flop': ParamFlopLab,
    'table-sizer': TableSizerLab,
    'shard-shuffle': ShardShuffleLab,
    'qr-collide': CollisionLab,
    'interaction-orders': InteractionOrdersLab,
  },
}
```

- [ ] **Step 3: Register the definition and cover art in `src/components/learn/courses.tsx`**

Add the import and the `COURSE_DEFINITIONS` entry:

```tsx
import { dlrmCourse } from '@/components/courses/dlrm'
```
```tsx
  [dlrmCourse.id]: dlrmCourse,
```

Add a `COURSE_ART` entry (a table/lookup-row motif in the hand-drawn style — a grid with one highlighted row and a routed arrow):

```tsx
  'dlrm-embedding-tables': (
    <svg viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(r => (
        <rect key={r} x={26} y={12 + r * 12} width={120} height={10}
          fill={r === 3 ? '#f0d98c' : '#26307a'} opacity={r === 3 ? 0.95 : 0.4 + 0.06 * r}
          stroke="#0a0d33" strokeWidth={0.5} />
      ))}
      <text x={150} y={52} fontSize={9} fill="#8cacf8" fontFamily="Tahoma">row i</text>
      <line x1="146" y1="48" x2="176" y2="48" stroke="#f0d98c" strokeWidth="2" />
      <circle cx="200" cy="34" r="7" fill="#8cf0a0" stroke="#0a0d33" />
      <circle cx="212" cy="60" r="6" fill="#8cd8f0" stroke="#0a0d33" />
      <text x="206" y="84" fontSize="24" fill="rgba(255,255,255,0.35)" fontFamily="Trebuchet MS" fontWeight="bold">R</text>
    </svg>
  ),
```

- [ ] **Step 4: Count referenced sources, then add the catalog entry in `src/lib/courseCatalog.ts`**

Run: `grep -o "label: '" src/components/courses/dlrm/content.tsx | wc -l` → call it N. Append to `COURSE_CATALOG`:

```ts
  {
    slug: 'dlrm-embedding-tables',
    title: 'Recommenders at Scale',
    subtitle: 'Why a recommendation model is mostly a giant lookup table',
    description:
      'An interactive course on Deep Learning Recommendation Models and the embedding-table problem: why categorical features need learned rows, the parameter-vs-FLOP asymmetry, terabyte-scale tables and the memory roofline, distributing the table across GPUs, compression (hashing, quotient-remainder, TT-Rec, quantization, DHE), and whether the table survives the generative turn.',
    modules: 6,
    minutes: 55,
    highlights: `6 interactive labs · ${'{N}'} referenced sources`,
  },
```

(Substitute the literal N — do NOT ship the `{N}` placeholder. If unique-href dedup matters, count distinct hrefs; state which you used in the report.)

- [ ] **Step 5: Run the shell + catalog + lab tests**

Run: `npx vitest run src/components/courses/dlrm/ src/lib/__tests__/courseCatalog.test.ts`
Expected: PASS. If the minutes assertion fails, re-check the sum (7+9+10+9+11+9 = 55).

- [ ] **Step 6: Full suite vs baseline** — `npx vitest run 2>&1 | tail -3` — failure count equals the Task 1 baseline.

- [ ] **Step 7: Commit**

```bash
git add src/components/courses/dlrm/index.tsx src/components/learn/courses.tsx src/lib/courseCatalog.ts src/components/courses/dlrm/DlrmStudyGuide.test.tsx
git commit -m "Register DLRM course: definition, catalog entry, cover art, shell tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Fact-check gate (blocking)

Fresh eyes re-audit the assembled content against the spec ledger — implementers transcribe plan errors faithfully.

- [ ] **Step 1: Dispatch two review subagents (Agent tool, parallel)**

Reviewer A — claims audit: read `content.tsx`, all six lab components, and the spec's verification ledger; check EVERY number, formula, model name, and attribution (332B–12T @ 5–638 MFLOPS; 72% fleet share; 37–74% SLS; 20–60% vs <5% cache; 12T/1.7M QPS/128 A100; >600ms/3× at 1K GPUs; ROBE 1000×/100MB-vs-100GB; TT-Rec 112×; Q-R memory formula and 0.3%/0.7% deltas; quant ~7–8× and 13.9%; DHE ~4×; Wukong 627B/637B and order-2^i; DLRMv3 1B-row table). Flag anything not in the ledger as UNSUPPORTED. Confirm the **apples-to-oranges caveat is present** in module 5 and that no **refuted** claim appears (3.2T/5TB/98%; multi-TB-vs-32-80GB phrasing; Sum/Dot/Cat switchable ops; ROBE-beats-baseline-on-6-Kaggle; DHE k=1024/m=10⁶). Return `file:line — claim — CONFIRMED | CONTRADICTS-LEDGER | UNSUPPORTED`.

Reviewer B — quiz + honest-math audit: verify each quiz question has exactly one `correct: true`, the correct answer is right per the ledger, and each distractor's `explain` is accurate; verify each lab's core arithmetic is real (Lookup selects the right row; ParamFlop's FLOPs are width-only; TableSizer's GB = rows×dim×bytes×tables and tier thresholds; CollisionLab's `id % m` / `id ÷ m` / `(m+⌈N/m⌉)` are correct; InteractionOrders' 2^layers) and that reported accuracy/compression numbers are shown as paper chips, not computed. Return per-item findings.

- [ ] **Step 2: Fix every finding.** UNSUPPORTED claims get a ledger-backed rewrite or deletion — never a plausible patch. Re-run `npx vitest run src/components/courses/dlrm/` — no new failures.

- [ ] **Step 3: Commit** (skip if zero findings, note it in the log)

```bash
git add src/components/courses/dlrm/
git commit -m "Apply fact-check review findings to DLRM course content

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Full suite + lint + types**

Run: `npx vitest run 2>&1 | tail -3` — failure count equals the Task 1 baseline.
Run: `npx eslint src/components/courses/dlrm/ src/lib/courseCatalog.ts src/components/learn/courses.tsx` — clean.
Run: `npx tsc --noEmit` — no new errors (the ~6 pre-existing errors are in navigation/Window test files only).

- [ ] **Step 2: Drive the real site** (project `verify` skill or scratchpad-Playwright fallback; build → `npx serve out` → headless Chrome). Checklist:
- `/learn/dlrm-embedding-tables` loads; library card shows the course; sidebar lists modules 1–6.
- Each module renders its lab; exercise each once (pick a category in Lookup; drag rows/MLP sliders in ParamFlops and confirm FLOPs move only on MLP width; cross a memory tier in TableSizer and open the cache tab; grow GPUs in Shard & Shuffle to "communication-bound"; in Collision Explorer pick two colliding ids and switch modulo→Q-R to resolve them, then open the quantization tab; grow Wukong layers to order 2^L).
- Progress % advances on "Mark complete"; kicker reads "Module N of 6".
- No console errors. Screenshot each module.

- [ ] **Step 3: Final tidy.** `git status` shows no unintended files (sitemap untouched). Report baseline-vs-final test numbers and screenshot paths.

---

## Plan self-review (author-completed)

1. **Spec coverage:** six modules (Tasks 7–8) + six labs (Tasks 1–6) + registration/catalog/art/shell test (Task 9) + fact-check gate (Task 10) + verify (Task 11). Attention/GFM cross-links present in modules 1, 2, 4, 6. Apples-to-oranges caveat mandated in module 5 content and re-checked in Task 10. Refuted-claim exclusion checked in Task 10.
2. **Placeholder scan:** the one intentional `{N}` (referenced sources) carries an explicit DO-NOT-SHIP instruction.
3. **Type consistency:** widget default exports and keys match between Tasks 1–6 and Task 9's registration; `MODULES`/`COURSE_TITLE`/`COURSE_TAGLINE` names match across Tasks 7–9; module ids and widget keys match the Global Constraints list; minutes 7+9+10+9+11+9 = 55 = catalog entry; storageKey `dlrm-course-progress-v1` consistent.






