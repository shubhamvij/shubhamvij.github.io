# MLA Deep-Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Multi-head Latent Attention its own subchapter (3.2) in the Attention course's efficiency module, with a purpose-built 4-act interactive `MlaLab` widget that teaches compression → absorption → the RoPE conflict → the decoupled-key fix.

**Architecture:** One new React widget (`MlaLab.tsx`, client component, `useState` only, SVG like the existing labs). One new course module object (`efficiency-mla`) inserted into `EFFICIENCY_SUBCHAPTERS` between 3.1 (sharing) and the old 3.2 (FlashAttention), which renumbers FlashAttention→3.3 and Sparse→3.4. Quiz `am3-1-q1` moves from 3.1 to 3.2. All numeric cross-references and one test assertion update in lockstep.

**Tech Stack:** Next.js static export, React 18, TypeScript, CSS modules (`course.module.css`), Vitest + React Testing Library.

## Global Constraints

- Copy verbatim from spec `docs/superpowers/specs/2026-07-11-mla-deep-dive-design.md`.
- **Course `id`s never change** — only `navLabel` display numbers shift. `efficiency-flash` stays `efficiency-flash` (navLabel 3.2→3.3); `efficiency-sparse` stays `efficiency-sparse` (navLabel 3.3→3.4).
- **Quiz `id`s are opaque anchors, never renumbered.** `am3-1-q1` keeps its id when moved to 3.2. New quiz ids are suffixed `-mla-` to avoid colliding with FlashAttention's existing `am3-2-q1`/`am3-2-q2`.
- Formulas as **styled inline text/unicode** (ᵀ, ᶜ, ᴿ), never KaTeX — matches PositionLab.
- Widget conventions: `'use client'`, `useState` only, `import s from '../engine/course.module.css'`; every `<svg>` gets `className={s.labCanvas}`, `role="img"`, `aria-label`. Palette: latent gold `#f6ecd8`/`#b8860b`, content blue `#cfe0f5`/`#2b6fd0`, rotary orange `#c86018`/`#fbe4d4`, K/V green `#e3f6e3`/`#6a9a6a`.
- Stage commits **by explicit path** (concurrent sessions may hold the repo); never `git add -A`.
- Baseline: ~12 pre-existing vitest failures + jsdom localStorage quirks are NOT regressions — diff against baseline before blaming new code.
- **Do NOT touch** `content.tsx:97` and `content.tsx:508` — their "§3.2" refers to the Vaswani 2017 paper's own Section 3.2, not our subchapters.

---

## Task 1: Fact-check the MLA formulas (gate — no code)

The spec's prose and formulas are the *plan*; implementers transcribe plan errors faithfully, so verify every formula against primary sources **before** encoding them in the widget. This task produces confirmation (or corrections to Tasks 2–3's strings).

**Files:**
- Read only: spec `docs/superpowers/specs/2026-07-11-mla-deep-dive-design.md` §C3.
- Sources: DeepSeek-V2 (arXiv 2405.04434, §2.1); RoFormer/RoPE (arXiv 2104.09864).

- [ ] **Step 1: Verify each claim against the source.** For each row, confirm against DeepSeek-V2 §2.1. If the source disagrees, **the source wins** — edit the corresponding string in Task 2 (`MlaLab.tsx`) and Task 3 (`efficiency-mla` quiz/prose) before implementing.

  | Claim (as used in the widget/quiz) | Expected |
  |---|---|
  | Down-projection to a cached latent | `cₜ^{KV} = W_DKV · h_t`, dim `d_c`; only this (plus the rotary key) is cached |
  | Up-projection of per-head K/V | `kᶜ = W_UK · cₜ^{KV}`, `vᶜ = W_UV · cₜ^{KV}` |
  | Absorption identity | content score `qᶜ·kᶜ = c_qᵀ (W_UQᵀ W_UK) c_kv`; `W_UV` folds into output `W_O` |
  | RoPE non-commutativity | with RoPE, middle matrix is `W_UQᵀ R_Δ W_UK`, `Δ = n − m` (relative position) → not precomputable |
  | Decoupled rotary key | `kᴿ = RoPE(W_KR · h_t)`, dim `d_R`, **shared across heads**; final score `= qᶜ·kᶜ + qᴿ·kᴿ` |
  | DeepSeek-V2 real dims | `d_c = 512`, `d_R = 64`, `n_h = 128`, `d_head = 128` → MLA cache `576`, MHA `2·128·128 = 32768` per token per layer |

- [ ] **Step 2: Confirm no headline percentage is asserted.** The widget shows both numbers (`576` vs `32768`) and computes the ratio (≈1.8%) from them; it must not cite DeepSeek-V2's paper-reported "% reduction" (which uses a different baseline config). Confirm Task 2 code does this.

- [ ] **Step 3: Record the outcome.** In the PR/commit description for Task 2, note "MLA formulas verified against DeepSeek-V2 §2.1 + RoPE" (or list corrections applied). No code commit for this task.

---

## Task 2: Build the `MlaLab` widget

**Files:**
- Create: `src/components/courses/attention/MlaLab.tsx`
- Test: `src/components/courses/attention/MlaLab.test.tsx`

**Interfaces:**
- Consumes: `course.module.css` classes (`widgetBox`, `widgetTitle`, `widgetHint`, `widgetBody`, `chipRow`, `chip`, `chipOn`, `labCanvas`, `labControls`, `labStat`, `labStatValue`, `sliderLabel`, `slider`, `labNote`) — all already exist.
- Produces: `export default function MlaLab()` — a self-contained widget, registered under key `'mla-lab'` in Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/components/courses/attention/MlaLab.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MlaLab from './MlaLab'

describe('MlaLab', () => {
  it('opens on Act ① showing the cached latent and the d_c readout', () => {
    render(<MlaLab />)
    expect(screen.getByText(/cached so far/i)).toBeDefined()
    expect(screen.getByText(/d_c = 256 values/)).toBeDefined()
  })

  it('Act ② toggles between building per-head keys and the absorbed fixed matrix', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /② absorb/ }))
    expect(screen.getByText(/kᶜ = W_UK · c_kv/)).toBeDefined() // naïve default
    fireEvent.click(screen.getByRole('button', { name: /^absorbed$/ }))
    expect(screen.getByText(/W_UQᵀ W_UK — precomputed once/)).toBeDefined()
    expect(screen.getByText(/kᶜ never built/)).toBeDefined()
  })

  it('Act ③ slider: paths commute at Δ=0, diverge otherwise', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /③ RoPE breaks it/ }))
    const slider = screen.getByLabelText(/relative position offset delta/i)
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.getByText(/= fixed matrix ✓/)).toBeDefined()
    fireEvent.change(slider, { target: { value: '6' } })
    expect(screen.getByText(/changes with Δ/)).toBeDefined()
    expect(screen.getByText(/Δ = n − m = 6/)).toBeDefined()
  })

  it('Act ④ shows the two-lane split and the d_c + d_R cache total', () => {
    render(<MlaLab />)
    fireEvent.click(screen.getByRole('button', { name: /④ decouple/ }))
    expect(screen.getByText(/kᴿ = RoPE\(W_KR · h_t\)/)).toBeDefined()
    expect(screen.getByText(/d_c \+ d_R = 256 \+ 32 = 288/)).toBeDefined()
    expect(screen.getByText(/576 vs 32768/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/MlaLab.test.tsx`
Expected: FAIL — `Failed to resolve import "./MlaLab"` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/components/courses/attention/MlaLab.tsx`:

```tsx
'use client'
import { ReactNode, useState } from 'react'
import s from '../engine/course.module.css'

// Toy scale for the drawn readouts — mirrors HeadShareLab's world (8 heads, d_head 64).
const N_H = 8
const D_HEAD = 64
const D_C = 4 * D_HEAD          // 256 — latent width (DeepSeek-V2 uses 512 at d_head=128)
const D_R = D_HEAD / 2          // 32  — decoupled RoPE key width (DeepSeek-V2 uses 64)
const MHA_CACHE = 2 * N_H * D_HEAD  // 1024
const MLA_CACHE = D_C + D_R          // 288

// DeepSeek-V2 real-scale anchors (verified against arXiv 2405.04434 §2.1 in Task 1).
const DS_MLA = 512 + 64              // 576
const DS_MHA = 2 * 128 * 128         // 32768

const ACTS = ['① compress', '② absorb', '③ RoPE breaks it', '④ decouple'] as const
type Act = typeof ACTS[number]

// ---------- Act ① — compress & cache (static) ----------
function PathDiagram() {
  return (
    <>
      <svg viewBox="0 0 480 168" className={s.labCanvas} role="img" aria-label="MLA data path: hidden state down-projected to a latent, then up-projected to per-head keys and values">
        <rect x={6} y={64} width={54} height={30} rx={3} fill="#cfe0f5" stroke="#2b6fd0" />
        <text x={33} y={83} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif">h_t</text>
        <text x={70} y={82} fontSize={12} fill="#999">→</text>
        <text x={86} y={58} fontSize={9} fill="#666">W_DKV</text>
        <rect x={84} y={64} width={40} height={30} rx={3} fill="#eef" stroke="#8898a8" strokeDasharray="3 2" />
        <text x={104} y={83} textAnchor="middle" fontSize={9}>↓ d_c</text>
        <text x={130} y={82} fontSize={12} fill="#999">→</text>
        <rect x={146} y={58} width={96} height={42} rx={4} fill="#f6ecd8" stroke="#b8860b" strokeWidth={2} />
        <text x={194} y={76} textAnchor="middle" fontSize={12} fontWeight="bold" fontFamily="Tahoma, sans-serif">latent cₜ</text>
        <text x={194} y={92} textAnchor="middle" fontSize={9} fill="#7a5c0a">d_c = {D_C} — cached</text>
        <text x={250} y={82} fontSize={12} fill="#999">→</text>
        <text x={286} y={42} fontSize={9} fill="#666">W_UK</text>
        <text x={286} y={126} fontSize={9} fill="#666">W_UV</text>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`k${i}`} x={320 + i * 6} y={30 - i} width={80} height={20} rx={2} fill="#e3f6e3" stroke="#6a9a6a" strokeDasharray="3 2" opacity={0.5 + 0.12 * i} />
        ))}
        <text x={360} y={44} textAnchor="middle" fontSize={9}>kᶜ per head</text>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`v${i}`} x={320 + i * 6} y={116 - i} width={80} height={20} rx={2} fill="#e3f6e3" stroke="#6a9a6a" strokeDasharray="3 2" opacity={0.5 + 0.12 * i} />
        ))}
        <text x={360} y={130} textAnchor="middle" fontSize={9}>vᶜ per head</text>
        <line x1={242} y1={70} x2={318} y2={44} stroke="#6a9a6a" strokeWidth={1} strokeDasharray="3 2" />
        <line x1={242} y1={88} x2={318} y2={120} stroke="#6a9a6a" strokeWidth={1} strokeDasharray="3 2" />
        <text x={360} y={158} textAnchor="middle" fontSize={8.5} fill="#888">dashed = rebuilt each step, never stored</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.labStat}>cached so far <span className={s.labStatValue}>d_c = {D_C} values</span></span>
        <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((D_C / MHA_CACHE) * 100)}%</span></span>
      </div>
      <p className={s.labNote}>
        MLA caches <strong>one low-rank latent cₜ</strong> per token — not keys, not values. The per-head keys
        and values are <strong>up-projected from cₜ on the fly</strong> (W_UK, W_UV) and discarded after the
        step. Storing {D_C} numbers instead of {MHA_CACHE} is the whole memory win — and the next act shows the
        per-head keys never even need to be built.
      </p>
    </>
  )
}

// ---------- Act ② — the absorption trick (one toggle) ----------
function AbsorbPanel() {
  const [absorbed, setAbsorbed] = useState(false)
  return (
    <>
      <div className={s.chipRow}>
        <button type="button" className={`${s.chip} ${!absorbed ? s.chipOn : ''}`} onClick={() => setAbsorbed(false)}>naïve</button>
        <button type="button" className={`${s.chip} ${absorbed ? s.chipOn : ''}`} onClick={() => setAbsorbed(true)}>absorbed</button>
      </div>
      <svg viewBox="0 0 480 150" className={s.labCanvas} role="img" aria-label={absorbed ? 'Absorbed: the two up-projection matrices fold into one precomputed matrix acting on the latent' : 'Naive: per-head content keys are built from the latent, then dotted with the query'}>
        {!absorbed ? (
          <>
            <text x={240} y={26} textAnchor="middle" fontSize={11} fill="#555">build the per-head content key, then score:</text>
            <rect x={40} y={44} width={150} height={30} rx={3} fill="#cfe0f5" stroke="#2b6fd0" />
            <text x={115} y={63} textAnchor="middle" fontSize={11}>qᶜ = W_UQ · c_q</text>
            <rect x={290} y={44} width={150} height={30} rx={3} fill="#e3f6e3" stroke="#6a9a6a" />
            <text x={365} y={63} textAnchor="middle" fontSize={11}>kᶜ = W_UK · c_kv</text>
            <text x={240} y={104} textAnchor="middle" fontSize={13} fontWeight="bold">score = qᶜ · kᶜ</text>
            <text x={240} y={128} textAnchor="middle" fontSize={9} fill="#a33">two up-projections per token, every step</text>
          </>
        ) : (
          <>
            <text x={240} y={26} textAnchor="middle" fontSize={11} fill="#555">fold the up-projections together — one fixed matrix:</text>
            <text x={240} y={62} textAnchor="middle" fontSize={13} fontWeight="bold">score = c_qᵀ · (W_UQᵀ W_UK) · c_kv</text>
            <rect x={150} y={76} width={180} height={30} rx={4} fill="#f6ecd8" stroke="#b8860b" strokeWidth={2} />
            <text x={240} y={95} textAnchor="middle" fontSize={11} fontWeight="bold">W_UQᵀ W_UK — precomputed once</text>
            <text x={240} y={130} textAnchor="middle" fontSize={9} fill="#2f7a2f">attention runs on the cached latent — kᶜ never built</text>
          </>
        )}
      </svg>
      <p className={s.labNote}>
        Because kᶜ = W_UK·c_kv and qᶜ = W_UQ·c_q, the content score qᶜ·kᶜ = c_qᵀ(W_UQᵀ W_UK)c_kv. The middle
        matrix <strong>W_UQᵀ W_UK is constant</strong>, so it is precomputed once and attention operates{' '}
        <strong>directly on the latent cₜ</strong> — the per-head keys of Act ① are never materialized at
        inference. (Symmetrically, W_UV folds into the output projection W_O.) This is why MLA is cheap to{' '}
        <em>run</em>, not merely cheap to <em>store</em>.
      </p>
    </>
  )
}

// ---------- Act ③ — RoPE breaks absorption (one slider; centerpiece) ----------
const THETA0 = 0.19 // radians/unit; ≤ π/16 keeps |sin| monotonic across the ±8 range so the gap widens with |Δ| everywhere
// A fixed shear stands in for the projection W_UQᵀ(…)W_UK: rotation plainly does not commute with it.
const shear = ([x, y]: [number, number]): [number, number] => [x + 0.55 * y, y]
const rot = (a: number, [x, y]: [number, number]): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

function RopeBreakPanel() {
  const [delta, setDelta] = useState(4)
  const a = delta * THETA0
  const v: [number, number] = [0.82, 0.44]
  const pathA = shear(rot(a, v)) // rotate-then-map: position lives INSIDE the projection
  const pathB = rot(a, shear(v)) // map-then-rotate: position OUTSIDE the projection
  const gap = Math.hypot(pathA[0] - pathB[0], pathA[1] - pathB[1])
  const cx = 118, cy = 100, R = 66
  const pt = ([x, y]: [number, number]): [number, number] => [cx + R * x, cy - R * y]
  const arrow = (p: [number, number], color: string, label: string) => {
    const [px, py] = pt(p)
    return (
      <g>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={2.5} />
        <circle cx={px} cy={py} r={3.5} fill={color} />
        <text x={px + (px >= cx ? 6 : -6)} y={py + (py < cy ? -3 : 12)} textAnchor={px >= cx ? 'start' : 'end'} fontSize={9.5} fontWeight="bold" fill={color}>{label}</text>
      </g>
    )
  }
  return (
    <>
      <svg viewBox="0 0 480 200" className={s.labCanvas} role="img" aria-label="Rotate-then-map versus map-then-rotate diverge as the relative position grows, because rotation does not commute with the projection matrix">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#c9c4b4" strokeDasharray="3 3" />
        <line x1={cx - R - 8} y1={cy} x2={cx + R + 8} y2={cy} stroke="#ddd" />
        <line x1={cx} y1={cy - R - 8} x2={cx} y2={cy + R + 8} stroke="#ddd" />
        {arrow(pathB, '#c86018', 'map, then rotate')}
        {arrow(pathA, '#2b6fd0', 'rotate, then map')}
        <text x={244} y={40} fontSize={11} fontFamily="Tahoma, sans-serif">content score with RoPE:</text>
        <text x={244} y={63} fontSize={12} fontWeight="bold">c_qᵀ (W_UQᵀ R_Δ W_UK) c_kv</text>
        <rect x={244} y={73} width={196} height={22} rx={3} fill={delta === 0 ? '#e3f6e3' : '#fbe4d4'} stroke={delta === 0 ? '#6a9a6a' : '#c86018'} />
        <text x={342} y={88} textAnchor="middle" fontSize={9.5} fill="#333">W_UQᵀ R_Δ W_UK {delta === 0 ? '= fixed matrix ✓' : '— changes with Δ ✗'}</text>
        <text x={244} y={118} fontSize={10} fill="#555">Δ = n − m = {delta}</text>
        <text x={244} y={138} fontSize={10} fill="#555">gap between the two paths: <tspan fontWeight="bold" fill={gap < 0.01 ? '#2f7a2f' : '#a33'}>{gap.toFixed(2)}</tspan></text>
        <text x={244} y={170} fontSize={9} fill="#666">{delta === 0
          ? 'at Δ=0 the rotation is identity — the matrix is fixed and absorbable'
          : 'position sits inside the matrix — nothing to precompute'}</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>relative position Δ = n − m</span>
        <input type="range" min={-8} max={8} step={1} value={delta} onChange={e => setDelta(Number(e.target.value))} className={s.slider} aria-label="relative position offset delta" />
        <span className={s.labStat}>Δ = {delta}</span>
      </div>
      <p className={s.labNote}>
        RoPE rotates each key/query by an angle proportional to its position, dropping a{' '}
        <strong>position-dependent rotation R_Δ between W_UQᵀ and W_UK</strong>. Rotation does not commute with
        the projection, so <strong>rotate-then-map ≠ map-then-rotate</strong> for any Δ ≠ 0 — drag the slider and
        the two arrows split, the gap widening as Δ moves away from 0. The absorbed matrix that made Act ② cheap is now a{' '}
        <em>different</em> matrix for every query–key distance, so there is nothing to precompute. At Δ = 0 they
        coincide — the escape hatch the next act uses.
      </p>
    </>
  )
}

// ---------- Act ④ — the decoupled-key fix (static) ----------
function DecouplePanel() {
  const contentW = (D_C / MLA_CACHE) * 300
  const rotaryW = (D_R / MLA_CACHE) * 300
  return (
    <>
      <svg viewBox="0 0 480 176" className={s.labCanvas} role="img" aria-label="Two-lane key: a position-free content lane up-projected from the latent, plus a small shared decoupled rotary key carrying position">
        <rect x={8} y={20} width={230} height={58} rx={4} fill="#eaf1fb" stroke="#2b6fd0" />
        <text x={123} y={38} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#1a4f9c">content lane — position-free</text>
        <text x={123} y={55} textAnchor="middle" fontSize={9.5}>kᶜ = W_UK · cₜ  (up-projected from latent)</text>
        <text x={123} y={70} textAnchor="middle" fontSize={8.5} fill="#2f7a2f">absorbable — Act ②&apos;s trick still works</text>
        <rect x={250} y={20} width={222} height={58} rx={4} fill="#fbe4d4" stroke="#c86018" />
        <text x={361} y={38} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#9a4a12">rotary lane — carries position</text>
        <text x={361} y={55} textAnchor="middle" fontSize={9.5}>kᴿ = RoPE(W_KR · h_t),  shared</text>
        <text x={361} y={70} textAnchor="middle" fontSize={8.5} fill="#9a4a12">small: d_R = {D_R}, one per token (not per head)</text>
        <text x={240} y={104} textAnchor="middle" fontSize={12} fontWeight="bold">score = qᶜ·kᶜ  +  qᴿ·kᴿ</text>
        <text x={240} y={123} textAnchor="middle" fontSize={9} fill="#666">absorbable content term  +  cheap positional term</text>
        <rect x={90} y={138} width={contentW} height={16} fill="#f6ecd8" stroke="#b8860b" />
        <rect x={90 + contentW} y={138} width={rotaryW} height={16} fill="#fbe4d4" stroke="#c86018" />
        <text x={240} y={170} textAnchor="middle" fontSize={9} fill="#666">cache = d_c + d_R = {D_C} + {D_R} = {MLA_CACHE} values / token / layer</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.labStat}>MLA cache <span className={s.labStatValue}>{MLA_CACHE} values</span></span>
        <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((MLA_CACHE / MHA_CACHE) * 100)}%</span></span>
        <span className={s.labStat}>DeepSeek-V2 scale <span className={s.labStatValue}>{DS_MLA} vs {DS_MHA}</span></span>
      </div>
      <p className={s.labNote}>
        The fix: <strong>split the key into two lanes</strong>. The content lane stays position-free, so its
        matrix is still the fixed, absorbable one from Act ②. Position rides a separate <strong>decoupled rotary
        key kᴿ</strong> — RoPE-rotated, <strong>shared across all heads</strong>, and tiny (d_R = {D_R}). The
        score is their sum. Total cache is d_c + d_R = {MLA_CACHE} values — at DeepSeek-V2&apos;s real scale {DS_MLA}{' '}
        vs MHA&apos;s {DS_MHA} ({((DS_MLA / DS_MHA) * 100).toFixed(1)}%): GQA-class memory, MHA-class quality, RoPE
        intact.
      </p>
    </>
  )
}

export default function MlaLab() {
  const [act, setAct] = useState<Act>(ACTS[0])
  const panel: Record<Act, ReactNode> = {
    '① compress': <PathDiagram />,
    '② absorb': <AbsorbPanel />,
    '③ RoPE breaks it': <RopeBreakPanel />,
    '④ decouple': <DecouplePanel />,
  }
  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>MLA Lab</span>
        <span className={s.widgetHint}>compress the cache · absorb the projections · decouple the rotation</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {ACTS.map(name => (
            <button key={name} type="button" className={`${s.chip} ${act === name ? s.chipOn : ''}`} onClick={() => setAct(name)}>
              {name}
            </button>
          ))}
        </div>
        {panel[act]}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/attention/MlaLab.test.tsx`
Expected: PASS — 4 passing tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `MlaLab.tsx` (pre-existing errors elsewhere, if any, are baseline).

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/attention/MlaLab.tsx src/components/courses/attention/MlaLab.test.tsx
git commit -m "Add MlaLab: 4-act interactive MLA widget (compress/absorb/RoPE/decouple)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Restructure Module 3 — insert subchapter 3.2, renumber, rewire

The renumber and the insertion are entangled (shared bullet list, navLabels, quiz move) and must land together — a reviewer cannot half-accept them. This single task leaves Module 3 coherent: 3.1 sharing, **3.2 MLA (new)**, 3.3 FlashAttention, 3.4 Score fewer pairs.

**Files:**
- Modify: `src/components/courses/attention/efficiencySubchapters.tsx` (insert `efficiency-mla`; edit 3.1; renumber Flash/Sparse navLabels + 2 prose refs)
- Modify: `src/components/courses/attention/content.tsx` (Module-3 intro bullets → four)
- Modify: `src/components/courses/attention/index.tsx` (register `'mla-lab'`)
- Modify: `src/components/courses/attention/KvCacheLab.tsx` (renumber back-reference)
- Modify: `src/components/courses/attention/flashTilingScript.ts` (renumber comment)
- Test: `src/components/courses/attention/attentionCourse.test.tsx` (fix `3.3`→`3.4` click; add a 3.2 test)

**Interfaces:**
- Consumes: `MlaLab` (Task 2), widget key `'mla-lab'`.
- Produces: course module `efficiency-mla` at navLabel `3.2 Cache the latent (MLA)`; quiz ids `am3-1-q1` (moved), `am3-2-mla-q1`, `am3-2-mla-q2`.

- [ ] **Step 1: Register the widget.** In `src/components/courses/attention/index.tsx`, add the import after line 16 (`import KvCacheLab from './KvCacheLab'`):

```tsx
import MlaLab from './MlaLab'
```

and add to the `widgets` map (after the `'head-sharing': HeadShareLab,` line):

```tsx
    'mla-lab': MlaLab,
```

- [ ] **Step 2: Edit subchapter 3.1 (`efficiency-kv-sharing`) to hand MLA off.** In `efficiencySubchapters.tsx`:

Change the title/subtitle (lines 7–9):

```tsx
    navLabel: '3.1 Shrink the cache',
    title: 'Shrink the KV cache: MQA and GQA',
    subtitle: 'Share K/V heads across query heads — the sharing family',
```

Change the intro clause that precedes the bullets. The current text (wrapping across two source lines) reads `and three designs turn` / `it down:`. Replace that clause only — leave the `layers × context. That makes the K/V head count the one dial that matters,` prefix intact — so the full sentence becomes "…the one dial that matters, and two *sharing* designs turn it down (a third, *compression*, is different enough to earn its own subchapter next):". Concretely, replace:

```tsx
              layers × context. That makes the K/V head count the one dial that matters, and three designs turn
              it down:
```

with:

```tsx
              layers × context. That makes the K/V head count the one dial that matters, and two <em>sharing</em> designs
              turn it down (a third, <em>compression</em>, is different enough to earn its own subchapter next):
```

Replace the MLA bullet (line 26) with a forward-pointing teaser:

```tsx
              <li><strong>MLA</strong> (DeepSeek-V2, 2024) — a third path that stops sharing and starts <em>compressing</em>: cache one low-rank latent instead of any K/V heads at all. Different enough in mechanism, and rich enough in payoff, to get its own subchapter — <strong>3.2, next</strong>.</li>
```

- [ ] **Step 3: Remove the moved quiz from 3.1.** In `efficiencySubchapters.tsx`, delete the entire `am3-1-q1` question object (lines 57–65, the `{ id: 'am3-1-q1', … },` block) from the 3.1 quiz. 3.1's quiz keeps `am3-q2` and `am3-1-q2`.

- [ ] **Step 4: Move the DeepSeek ref out of 3.1.** In 3.1's `refs` block, delete the DeepSeek-V2 item (it belongs to 3.2). 3.1's refs become exactly:

```tsx
        items: [
          { label: 'Fast Transformer Decoding (MQA) — Shazeer (2019)', href: 'https://arxiv.org/abs/1911.02150' },
          { label: 'GQA: Grouped-Query Attention — Ainslie et al. (EMNLP 2023)', href: 'https://arxiv.org/abs/2305.13245' },
        ],
```

- [ ] **Step 5: Insert the new `efficiency-mla` module.** In `efficiencySubchapters.tsx`, immediately after the 3.1 module object's closing `},` (the one before the `// ---` separator preceding `efficiency-flash`), insert:

```tsx
  // ------------------------------------------------------------------
  {
    id: 'efficiency-mla',
    navLabel: '3.2 Cache the latent (MLA)',
    title: 'Cache the latent, not the heads: MLA',
    subtitle: 'Compress K/V into one small vector — and still keep RoPE',
    minutes: 7,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              MQA and GQA save memory by <em>sharing</em> K/V heads. DeepSeek-V2&apos;s <strong>Multi-head
              Latent Attention</strong> saves it a different way — by <em>compressing</em>. Instead of caching
              keys and values at all, each token&apos;s hidden state is <strong>down-projected to one small
              latent vector cₜ</strong>, and that latent is the only thing cached. The per-head keys and values
              are <strong>up-projected back out of cₜ</strong> whenever a step needs them, then discarded.
            </p>
            <p>
              Two ideas make this more than a storage trick, and the lab walks each one. First, the{' '}
              <strong>absorption trick</strong>: the up-projection matrices fold into the query and output
              projections, so attention runs <em>directly on the latent</em> and the per-head keys are never
              even built. Second, the <strong>RoPE wrinkle</strong>: position&apos;s rotation refuses to be
              absorbed, forcing a small <strong>decoupled rotary key</strong> to carry position alongside the
              latent. Step through all four acts:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'mla-lab' },
      {
        kind: 'callout',
        icon: '🧮',
        title: 'Why compression beats sharing here',
        body: (
          <>
            Decoding is <strong>memory-bound</strong> — every step streams the whole cache through the compute
            units — so spending a few extra up-projection FLOPs to shrink the cached bytes is a strictly good
            trade. And unlike MQA/GQA, which discard per-head diversity by sharing, MLA keeps every head&apos;s
            own K/V (it just reconstructs them on demand), which is how it reaches GQA-class memory at
            MHA-class quality.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-1-q1',
            prompt: 'MLA caches neither K nor V. What does it cache, and what\'s the cost of that choice?',
            options: [
              { text: 'A low-rank latent vector per token, up-projected to per-head K/V at use time — trading a little extra compute for a much smaller cache', correct: true, explain: 'Decoding is memory-bound, so spending FLOPs (up-projections) to save bytes is a good trade. The wrinkle: RoPE doesn\'t commute with the up-projection (W_UK), so the absorbed W_UQᵀW_UK matrix would depend on relative position — hence the small decoupled RoPE key cached alongside.' },
              { text: 'Nothing — it recomputes everything from scratch', explain: 'That would be the no-cache baseline whose O(t²) waste module 3\'s lab counts.' },
              { text: 'The attention weights from previous steps', explain: 'Attention weights are never cached by any scheme — they\'re cheap to recompute from Q and K.' },
            ],
          },
          {
            id: 'am3-2-mla-q1',
            prompt: 'MLA up-projects per-head keys from the latent — yet at inference it never actually builds them. How?',
            options: [
              { text: 'The up-projection W_UK folds into the query\'s W_UQ (and W_UV into the output W_O), so the content score is c_qᵀ(W_UQᵀW_UK)c_kv — a fixed matrix acting directly on the cached latent', correct: true, explain: 'This "absorption" is why MLA is cheap to run, not just to store: at decode time the per-head keys are a mathematical fiction — attention operates on cₜ itself.' },
              { text: 'It caches the per-head keys the first time and reuses them', explain: 'That would defeat the purpose — caching per-head K is exactly the cost MLA sets out to avoid.' },
              { text: 'It approximates the keys with a smaller matrix', explain: 'No approximation — the absorbed matrix is an exact identity, W_UQᵀW_UK, not a low-rank guess.' },
            ],
          },
          {
            id: 'am3-2-mla-q2',
            prompt: 'Why does MLA need a separate, decoupled RoPE key instead of just rotating the reconstructed keys?',
            options: [
              { text: 'RoPE inserts a position-dependent rotation R_Δ between W_UQ and W_UK, so the absorbed matrix would differ for every query–key distance — nothing to precompute. Splitting position onto a small shared key keeps the content path fixed and absorbable', correct: true, explain: 'Rotation doesn\'t commute with the projection: W_UQᵀR_ΔW_UK depends on Δ = n − m. The decoupled key carries all the position on a tiny (d_R) shared vector so the content term stays cheap.' },
              { text: 'RoPE keys are too large to up-project', explain: 'Size isn\'t the issue — commutativity is. The rotary key is deliberately small (d_R).' },
              { text: 'Decoupling mainly improves extrapolation to longer contexts', explain: 'That may be a side benefit, but the reason it exists is the absorption conflict, not length extrapolation.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'DeepSeek-V2 (Multi-head Latent Attention) — DeepSeek-AI (2024)', href: 'https://arxiv.org/abs/2405.04434', note: '§2.1 — compression, absorption, decoupled RoPE' },
          { label: 'RoFormer (RoPE) — Su et al. (2021)', href: 'https://arxiv.org/abs/2104.09864', note: 'the rotation MLA must decouple' },
        ],
      },
    ],
  },
```

- [ ] **Step 6: Renumber FlashAttention → 3.3.** In `efficiencySubchapters.tsx`, change the `efficiency-flash` navLabel:

```tsx
    navLabel: '3.3 FlashAttention',
```

- [ ] **Step 7: Renumber Sparse → 3.4 and fix its back-references.** In `efficiencySubchapters.tsx`:

`efficiency-sparse` navLabel:

```tsx
    navLabel: '3.4 Score fewer pairs',
```

The intro sentence of `efficiency-sparse` (currently "3.1 shrank the cache and 3.2 moved fewer bytes — but both still <em>score every pair</em>."):

```tsx
              Shrinking the cache (3.1–3.2) and moving fewer bytes (3.3) both still <em>score every pair</em>. The last
```

The two FlashAttention quiz explanations that point at the sparse family both contain the literal substring `subchapter 3.3` — replace both occurrences with `subchapter 3.4` (find/replace scoped to `efficiencySubchapters.tsx`; the sparse navLabel `3.3 Score fewer pairs` was already changed above and does not contain the word "subchapter", so it is unaffected). The two resulting strings read:

- `That's the sparse-mask family (subchapter 3.4). FlashAttention computes every pair — just with drastically less memory traffic.`
- `It's still exact, still quadratic compute. If n² arithmetic itself is your problem, you need subchapter 3.4's "score fewer pairs" family instead.`

- [ ] **Step 8: Fix the four-bullet Module-3 intro.** In `content.tsx`, replace the intro `<p>` + `<ul>` (lines 262–267) with:

```tsx
            <p>With the vocabulary in place, the modern fixes sort into three attack directions — spread across four deep dives below this module in the sidebar:</p>
            <ul>
              <li><strong>3.1 — Shrink the cache (share).</strong> Queries are used once, but K/V are re-read forever: share K/V heads across query heads — MQA and GQA.</li>
              <li><strong>3.2 — Cache the latent (compress).</strong> DeepSeek&apos;s MLA stops sharing and starts compressing: cache one low-rank latent, up-project K/V on the fly, and decouple RoPE onto a small key so it all stays cheap.</li>
              <li><strong>3.3 — Compute the same thing, smarter.</strong> FlashAttention changes zero math: it reorganizes the computation so the n×n matrix never touches GPU main memory. The bottleneck was memory movement, not FLOPs.</li>
              <li><strong>3.4 — Score fewer pairs.</strong> Windows + global tokens (Longformer, BigBird), production sliding windows (Mistral), or linear attention&apos;s reordering that dodges n² entirely — with trade-offs.</li>
            </ul>
```

- [ ] **Step 9: Fix the `KvCacheLab` back-reference.** In `KvCacheLab.tsx` (lines 109–110), change:

```tsx
          is <strong>memory-bound</strong>: the bar above, re-read per token. That number is what modules 3.1–3.2
          (shrink it), 3.3 (move bytes smarter), and 3.4 (score fewer pairs) are all attacking.
```

- [ ] **Step 10: Fix the `flashTilingScript` comment.** In `flashTilingScript.ts` line 5, change `matching subchapter 3.2's` → `matching subchapter 3.3's`:

```ts
// mean something. Hardware anchors are A100-80GB, matching subchapter 3.3's
```

- [ ] **Step 11: Update the structural test click + add a 3.2 test.** In `attentionCourse.test.tsx`:

Change line 60 (the mask-lab navigation) from `3\.3 Score fewer pairs` to `3\.4 Score fewer pairs`:

```tsx
    fireEvent.click(screen.getByRole('button', { name: /3\.4 Score fewer pairs/ }))
```

Add a new test inside the `describe('Attention course through CourseShell', …)` block (e.g. after the `module 2 exposes the four deep-dive subchapters` test):

```tsx
  it('subchapter 3.2 exposes the MLA Lab', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /3\.2 Cache the latent/ }))
    expect(screen.getByText('MLA Lab')).toBeDefined()
  })
```

- [ ] **Step 12: Run the course + widget tests**

Run: `npx vitest run src/components/courses/attention/`
Expected: PASS — including the new `subchapter 3.2 exposes the MLA Lab` test, the updated mask-lab test, the `every widget key used by the content is registered` test (now covers `mla-lab`), and all `MlaLab.test.tsx` tests. HeadShareLab tests still pass (widget unchanged).

- [ ] **Step 13: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 14: Commit**

```bash
git add src/components/courses/attention/efficiencySubchapters.tsx src/components/courses/attention/content.tsx src/components/courses/attention/index.tsx src/components/courses/attention/KvCacheLab.tsx src/components/courses/attention/flashTilingScript.ts src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Add MLA subchapter 3.2; renumber FlashAttention 3.3 and Sparse 3.4

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: Full verification

**Files:** none modified — verification only.

- [ ] **Step 1: Full test suite, diff against baseline.**

Run: `npx vitest run`
Expected: no *new* failures beyond the ~12 known pre-existing ones (test-env quirks). If a failure names an attention-course file changed here, fix it before proceeding.

- [ ] **Step 2: Build the static export.**

Run: `npm run build`
Expected: build succeeds, no type errors, `efficiency-mla` renders in the exported course page.

- [ ] **Step 3: Drive it in a real browser (`/verify` skill).**

Navigate to the Attention course → subchapter **3.2 Cache the latent (MLA)**. Confirm:
  - Sidebar shows 3.1, **3.2 Cache the latent (MLA)**, 3.3 FlashAttention, 3.4 Score fewer pairs (contiguous, no gap).
  - MLA Lab renders; clicking each of the four act chips swaps the panel.
  - Act ② `absorbed` toggle flips the formula to the boxed `W_UQᵀ W_UK`.
  - Act ③ slider moves the two arrows apart as |Δ| grows; at Δ=0 the box reads "= fixed matrix ✓".
  - Act ④ shows the two-lane split and `576 vs 32768`.
  - No console errors; all SVGs render.

- [ ] **Step 4: Report.** Summarize test results (with the baseline diff) and the browser check. If anything failed, report it with the output rather than claiming success.

---

## Notes

- **Sitemap:** subchapters are client-side nav within `/learn/attention-mechanisms`, not separate routes, so no `public/sitemap.xml` entry is needed. (The file is already dirty from another session — leave it be; do not stage it.)
- **HeadShareLab is unchanged** — its MLA chip remains the cache-comparison endpoint in 3.1, and its tests (`subchapterLabs.test.tsx`) stay green.
