# MLA Deep-Dive: new subchapter 3.2 + interactive MLA Lab

**Date:** 2026-07-11
**Course:** Attention Mechanisms → Module 3 (Efficiency)
**Goal:** Multi-head Latent Attention is currently one chip in the Head Sharing Lab and one bullet of prose. It is the most conceptually loaded scheme in the subchapter (compression + the absorption trick + the RoPE-decoupling wrinkle) and warrants its own subchapter with a richer explanation and a purpose-built interactive visualization.

---

## Section A — Placement & content restructure

### A1. New subchapter, renumber downstream

MLA gets a dedicated subchapter inserted **after** 3.1, so Module 3's efficiency subchapters become:

| # | navLabel | id | status |
|---|----------|-----|--------|
| 3.1 | Shrink the cache | `efficiency-kv-sharing` | edited (MLA de-emphasized, points forward) |
| **3.2** | **Cache the latent (MLA)** | **`efficiency-mla`** | **NEW** |
| 3.3 | FlashAttention | `efficiency-flash` | renumbered from 3.2 |
| 3.4 | Score fewer pairs | `efficiency-sparse` | renumbered from 3.3 |

`id`s never change (they anchor progress/URLs); only `navLabel` numbering shifts for Flash and Sparse.

### A2. Cross-reference renumber sites

Every "3.2"/"3.3" that points at FlashAttention or the sparse family must shift. Known sites (implementation plan will re-grep the whole `courses/` tree to catch any missed):

- `efficiencySubchapters.tsx` navLabels: `3.2 FlashAttention` → `3.3 FlashAttention`; `3.3 Score fewer pairs` → `3.4 Score fewer pairs`.
- `efficiencySubchapters.tsx` two quiz explanations referencing "(subchapter 3.3)" / "subchapter 3.3's 'score fewer pairs'" → `3.4`.
- `content.tsx` Module-3 intro bullet list (currently three bullets `3.1/3.2/3.3`) → four bullets; MLA promoted from a sub-clause of the 3.1 bullet to its own **3.2** bullet, Flash → 3.3, Sparse → 3.4.
- Any `module 5` / graph-module back-references to "3.3" sparse → `3.4`.

### A3. Edits to 3.1 (`efficiency-kv-sharing`)

3.1 keeps the clean **MHA → GQA → MQA sharing** story:

- **Prose:** the MLA bullet shrinks to a one-liner teaser — "a third path, *compression*, is different enough to get its own subchapter (3.2)" — instead of explaining the mechanism inline.
- **HeadShareLab widget:** *unchanged*. The MLA chip stays as the cache-comparison endpoint — it's the visceral "cache drops below even MQA, independent of head count" punchline and completing the comparison there is correct. The deep mechanism lives in 3.2.
- **Quiz:** `am3-1-q1` ("MLA caches neither K nor V…") **moves to 3.2** (it's a mechanism question). 3.1 keeps `am3-q2` (what GQA shares) and `am3-1-q2` (why queries stay private). Quiz `id`s are preserved on move so progress/analytics keep resolving.

### A4. Content arc of 3.2 (`efficiency-mla`)

Ordered blocks:

1. **prose** — the setup. GQA/MQA save by *sharing* K/V heads; MLA saves by *compressing*. Introduce the pipeline in words: hidden state → down-project to a small latent `c_t` (the *only* thing cached) → up-project per-head K and V from `c_t` on the fly. Name the two ideas the lab will make concrete: (a) the **absorption trick** — you never actually materialize the per-head keys, you fold the up-projections into the query and output matrices and attend *in latent space*; (b) the **RoPE wrinkle** — position-dependent rotation refuses to be absorbed, forcing a small decoupled rotary key.
2. **widget** `mla-lab` — the 4-act MLA Lab (Section B).
3. **callout** (icon 🧮, "Why compression beats sharing here") — decoding is memory-bound, so spending up-projection FLOPs to shrink cached bytes is a strictly good trade; MLA reaches GQA-class cache at MHA-class quality because the latent preserves per-head diversity that MQA/GQA throw away.
4. **quiz** — three questions:
   - `am3-1-q1` (moved from 3.1): MLA caches neither K nor V — what does it cache and what's the cost.
   - NEW `am3-2-mla-q1`: the absorption trick — why up-projected content keys never need to be materialized (answer: `W_UK` folds into the query path / `W_UV` into the output path, so attention runs against the latent directly).
   - NEW `am3-2-mla-q2`: why a separate decoupled RoPE key exists (answer: RoPE's position-dependent rotation sits between the projections and can't be precomputed into one fixed absorbed matrix, so position rides a small separate key instead).

   **Quiz-id stability:** ids are opaque anchors, not display numbers — they do **not** track navLabel numbering. `am3-1-q1` keeps its id when it moves to 3.2; FlashAttention's existing `am3-2-q1`/`am3-2-q2` keep theirs even though Flash becomes 3.3. The new ids are deliberately suffixed `-mla-` to avoid colliding with those existing `am3-2-*` ids. Do not renumber any quiz id.
5. **refs** — DeepSeek-V2 (arXiv 2405.04434, §2.1) as primary; RoPE (Su et al., 2104.09864) for the rotation the wrinkle turns on; a pointer back to the KV-cache lab (module 3 intro) for the memory-bound premise.

---

## Section B — The MLA Lab widget (`MlaLab.tsx`)

One widget, four **acts** selected by a chip row (same idiom as PositionLab's tabs / FlashTilingLab's mode chips). A single running example — one token's hidden vector, consistent colors for latent `c` (gold), content path (blue), rotary path (orange) — flows through all four acts. **Two acts are interactive** (where interaction is load-bearing); two are annotated static diagrams with live readouts. Widget key: `mla-lab`.

### Act ① — Compress & cache *(static diagram + readout)*
Left-to-right data path for one token:
`h_t → [W_DKV] → c_t (latent, d_c) → [W_UK]→ k^C per head, [W_UV]→ v^C per head`.
The latent `c_t` box is highlighted as **the only thing cached**; the per-head K/V boxes are drawn faded/dashed as "reconstructed on demand, never stored." A readout states cache = `d_c` values/token/layer vs MHA's `2·n_h·d_head`. No interaction — the point is structural recognition.

### Act ② — The absorption trick *(interactive: one toggle)*
A **naïve ↔ absorbed** toggle.
- *Naïve:* score path shows `q^C = W_UQ c_q`, `k^C = W_UK c_kv`, then `q^C · k^C` — the per-head keys are explicitly built.
- *Absorbed:* the two up-projections visibly collapse — `q^C · k^C = c_q^T (W_UQ^T W_UK) c_kv` — with `W_UQ^T W_UK` boxed as a **single precomputed matrix**, and an annotation "attention now runs directly on the cached latent `c` — the per-head keys never exist." Mirror note that `W_UV` folds into `W_O` on the output side.
This is the one toggle that carries the "why MLA is cheap at inference, not just in storage" insight, so it stays interactive.

### Act ③ — RoPE breaks it *(interactive: one position slider — the centerpiece)*
**Visual + algebra, in sync.**
- **Canvas (geometry):** RoPE as literal 2D rotation. A position slider `Δ = n − m` drives two side-by-side little diagrams of the *same* content vector: **rotate-then-project** vs **project-then-rotate**. As Δ moves off 0 the two results visibly diverge — non-commutativity made physical. At Δ = 0 they coincide (the position-free case absorption relies on).
- **Algebra panel (in sync below):** the content score with RoPE inserted —
  `q^C·k^C = c_q^T (W_UQ^T R_Δ W_UK) c_kv` —
  with the **middle matrix `W_UQ^T R_Δ W_UK` highlighted** and annotated "depends on Δ = n − m → a *different* matrix for every query–key distance → nothing to precompute." Contrast against Act ②'s fixed `W_UQ^T W_UK`. The slider is load-bearing (it *is* the demonstration that the absorbable matrix stops being fixed), so it stays.

### Act ④ — The decoupled-key fix *(static diagram + readout)*
The resolution: split each key into two lanes.
- **Content lane** (blue): position-*free*, up-projected from `c_t`, stays absorbable (Act ②'s trick still works).
- **Rotary lane** (orange): a small **decoupled key** `k^R = RoPE(W_KR h_t)`, dimension `d_R`, **shared across heads**, carrying *all* the position. Final score = `q^C·k^C + q^R·k^R`.
Readout: cache = `d_c + d_R` values/token/layer, with DeepSeek-V2's real numbers (`d_c = 512`, `d_R = 64` → 576/token/layer) shown against MHA's `2·n_h·d_head`. A `labNote` ties it back: the content path pays no position tax and stays cheap to absorb; position rides one small shared key — the whole reason MLA gets compression *and* RoPE.

### Widget conventions (match existing labs)
- `'use client'`, `useState` only, imports `s from '../engine/course.module.css'`.
- Chip row → `s.chip`/`s.chipOn`; slider → `s.slider`/`s.sliderLabel`; toggle → chip pair; stats → `s.labStat`/`s.labStatValue`; explanatory feedback → `s.feedback`/`s.feedbackCorrect`; closing paragraph → `s.labNote`.
- Every `<svg>` gets `className={s.labCanvas}`, `role="img"`, and an `aria-label`. Fills/strokes reuse the course palette already in HeadShareLab/PositionLab (latent gold `#f6ecd8`/`#b8860b`, content blue `#cfe0f5`/`#2b6fd0`, rotary orange `#c86018`).
- Math shown as inline text/tspans (the course renders formulas as styled text, not KaTeX — consistent with PositionLab).

---

## Section C — Architecture, files, testing, gates

### C1. Files

**New**
- `src/components/courses/attention/MlaLab.tsx` — the widget (~4 act-panels in one component; sub-panels as local function components like PositionLab's `RopePanel`/`AlibiPanel`).

**Edited**
- `src/components/courses/attention/index.tsx` — import `MlaLab`, register `'mla-lab': MlaLab` in `widgets`.
- `src/components/courses/attention/efficiencySubchapters.tsx` — insert the `efficiency-mla` module object between `efficiency-kv-sharing` and `efficiency-flash`; edit 3.1's MLA prose + move quiz `am3-1-q1`; renumber Flash/Sparse navLabels + their cross-ref quiz explanations.
- `src/components/courses/attention/content.tsx` — Module-3 intro bullets 3.1–3.4.
- `public/sitemap.xml` — regenerate if subchapter routes are enumerated there (already dirty in the tree; confirm during impl).

### C2. Testing

- **New test file** `src/components/courses/attention/MlaLab.test.tsx` (separate file avoids the concurrent-session contention noted in memory — do **not** append to `subchapterLabs.test.tsx`). Cover: renders all four act chips; act ② toggle flips naïve↔absorbed text; act ③ slider changes the displayed Δ and the divergence readout; act ④ shows the `d_c + d_R` cache readout.
- **`attentionCourse.test.tsx` / structural tests** — update any count-based assertions (module counts, subchapter counts, quiz-id coverage) to include `efficiency-mla` and the moved/added quiz ids.
- Follow the repo's existing RTL patterns; assert on visible text, not implementation details.

### C3. Fact-check gate (per `course-content-fact-check` memory)

The prose and formulas in this spec are the *plan* — they must be independently fact-checked before/at implementation, because implementers transcribe plan errors faithfully. Specific claims to verify against DeepSeek-V2 §2.1 and the RoPE paper:

- Down/up-projection structure: `c_t^{KV} = W_DKV h_t`; `k^C = W_UK c_t^{KV}`, `v^C = W_UV c_t^{KV}`.
- Absorption: `q^C·k^C = c_q^T (W_UQ^T W_UK) c_kv`; `W_UV` folds into `W_O`.
- RoPE non-commutativity making the absorbed matrix position-dependent: `W_UQ^T R_Δ W_UK`, Δ = relative position.
- Decoupled key `k^R = RoPE(W_KR h_t)`, dimension `d_R`, shared across heads; final score is the sum of content and rotary dot-products.
- Real numbers: `d_c = 512`, `d_R = 64` (→ 576 cached values/token/layer) for DeepSeek-V2; MHA baseline `2·n_h·d_head`. **Any explicit "×N reduction" ratio must be verified, not asserted** — prefer showing both numbers and letting the readout compute the ratio.

### C4. Verification (per verification-before-completion)

- `npm test` (or the repo's runner) green for the new + updated tests; baseline pre-existing failures (per `test-env-quirks` memory: ~12 known vitest failures) are not regressions — diff against baseline, don't blame new code.
- `/verify` skill: build the static export and drive the course in a real browser — navigate to 3.2, exercise all four acts (toggle, slider), confirm no console errors and the SVGs render.
- Stage commits by explicit path (per `concurrent-sessions` memory), never `git add -A`.

### C5. Non-goals (YAGNI)

- No KaTeX/MathJax — formulas stay as styled inline text like the rest of the course.
- No animation/transitions beyond React state swaps.
- No changes to the HeadShareLab widget itself.
- No new course-engine capabilities — `subchapters` nesting already exists and is used.
