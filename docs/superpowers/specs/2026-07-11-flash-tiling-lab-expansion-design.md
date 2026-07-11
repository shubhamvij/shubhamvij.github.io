# Flash Tiling Lab expansion: guided 3-act walkthrough with live memory meters

Date: 2026-07-11
Status: Approved (design approved interactively; depth = memory traffic AND
qualitative online-softmax; structure = guided 3-act tour)

## Goal

The Flash Tiling Lab (`FlashTilingLab.tsx`, subchapter 3.2 of the
attention-mechanisms course) asserts FlashAttention's lesson instead of
demonstrating it:

1. **Naive mode is static** — one orange matrix, nothing to step through.
   The user never *sees* the write-S / read-S / write-P / read-P round
   trips that the prose describes.
2. **The HBM/SRAM panel is static text** — memory occupancy and traffic
   never change as the algorithm runs, so "the bottleneck was memory
   movement" is words, not an experience.
3. **No quantified payoff** — how many bytes each approach moves, what
   that costs in time, and why identical FLOPs can differ several-fold in
   wall clock is never shown.
4. **The online softmax** — the trick that makes tiling exact — lives in a
   footnote below the widget.

Rebuild the lab as a guided three-act walkthrough that walks the user
step-by-step through both algorithms with live per-step memory
accounting, ending in an engineered aha moment: *same FLOPs, ~27× fewer
bytes, that's the whole speedup*.

## Non-goals

- No changes to the subchapter's opening prose, callout, refs, or quiz
  structure (one quiz explain-string reword only, see Content touches).
- No autoplay for Acts 1 and 3 (fast-forward exists only for Act 2's
  remaining tiles).
- No GPU-model presets, no draggable tiles, no persistence of lab
  progress, no engine changes.

## Framing device: toy visual, real meters

- The score-matrix visual stays a toy **16×16 with 4×4 tiles** (readable
  at widget size).
- All meters run at **real scale: n = 4096, d_head = 64, bf16 (2 bytes),
  one head, one layer** — declared on screen at Act 1 step 1 ("we draw
  16×16 so you can see it; the meters use a real context length").
- Two persistent instruments appear on every step:
  - **Traffic odometer** — cumulative MB moved between HBM and SRAM.
  - **Occupancy meters** — what currently lives in HBM and in SRAM
    (SRAM has a hard 20 MB scale).
- Every step has a one-to-two-sentence narration caption (the
  hand-holding), rendered in the existing `.feedback` box with
  `aria-live="polite"`.

## Hardware constants (single source of truth in `flashTilingScript.ts`)

A100-80GB anchors, matching the subchapter's existing prose claims:

| constant | value |
| --- | --- |
| N_REAL | 4096 |
| D_HEAD | 64 |
| BYTES | 2 (bf16) |
| SRAM_MB | 20 |
| HBM_BW | 2 TB/s |
| SRAM_BW | 19 TB/s |
| MATMUL_TFLOPS | 312 (bf16 tensor cores) |

Derived anchors: S = 4096² × 2 B ≈ 33.6 MB; Q/K/V/O ≈ 0.5 MB each;
attention FLOPs = 2·2·n²·d ≈ 4.3 GFLOP.

**Fact-check flag:** every constant and derived figure above, the 4n²
round-trip accounting, the "2–4× measured, 7.6× on GPT-2" speedup
citations, and the linear-memory claim must get an independent
fact-check pass against Dao et al. 2022 (and FA-2 where relevant) during
planning — course numbers get verified, not trusted.

## Act 1 — naive attention (~7 steps, next/back)

Teaches the honest mechanism the current lab omits: naive attention is
**three separate kernels**, and each kernel boundary forces an HBM round
trip because a kernel reads its inputs from and writes its outputs to
HBM.

1. **Meet the hardware** — HBM box (tens of GB, ~2 TB/s) holding Q, K, V;
   SRAM box (~20 MB, ~19 TB/s) empty; caption: compute units can only
   touch SRAM. Real-scale disclaimer shown here.
2. **Kernel 1 loads** — Q, K stream into SRAM (odometer +~1 MB, SRAM
   meter blips, animated load arrows).
3. **Kernel 1 computes & spills** — toy matrix fills orange; caption:
   S is 33.6 MB — bigger than SRAM itself, and the kernel is ending —
   so S is written to HBM (odometer +33.6 MB; an "S" block lands in the
   HBM box). "16.8M numbers written to slow memory — the original sin."
4. **Kernel 2 re-reads S** (+33.6 MB) — "the same numbers, re-read
   moments after being written — a kernel boundary forces the trip."
5. **Kernel 2 softmax, writes P** (+33.6 MB) — row-sweep highlight.
6. **Kernel 3 reads P and V, writes O** (+~35 MB: 33.6 + 0.5 + 0.5).
7. **Act 1 verdict** — odometer ≈ **136 MB**, ~134 MB of it S/P traffic
   the output never needed. First time bar: memory 136 MB ÷ 2 TB/s
   ≈ 68 µs vs math 4.3 GFLOP ÷ 312 TFLOP/s ≈ 14 µs — "the GPU spends
   ~80% of this waiting, not multiplying."

## Act 2 — FlashAttention (fine grain × 2 tiles, then fast-forward)

One kernel, no boundaries. SRAM box gains labeled slots: Q-block,
K/V-block, score tile, running stats (m, ℓ), O-block. **Key visual
inversion: Act 1's score cells appeared in the HBM box; in Act 2 the
only score cells that ever exist appear inside the SRAM box.**

Per-tile fine steps (first two tiles):

1. **Load tile inputs** — Q-row block + K/V-col block into SRAM
   (odometer +fractions of MB).
2. **Compute score tile** — gold 4×4 tile appears inside SRAM.
   Odometer: **+0**.
3. **Online softmax update** — one tracked row shows running max m and
   denominator ℓ as small readouts; when the tile raises m, the O-block
   pulses/shrinks. Caption: "earlier tiles' contribution just got
   rescaled — this identity is why tiling stays exact." Qualitative
   (readouts + pulse), not full arithmetic.
4. **Accumulate & discard** — tile folds into O-block and dissolves;
   "it never existed in HBM."

Then the button becomes **"process remaining tiles ▸"**: animates the
remaining 14 tiles at per-tile grain (setInterval-driven); when a
Q-row-block completes, its O-block writes back to HBM; K/V visibly
re-stream per Q-row-block and the odometer counts those re-reads
honestly.

**Act 2 verdict** — odometer ≈ **5.0 MB** (Q blocks once = 0.5, K/V
re-streamed once per Q-row-block = 4 × 1.0, O written once = 0.5).
Caption notes real kernels use larger blocks so re-reads shrink
further.

## Act 3 — the verdict (the aha)

Three panels, shown together on one screen:

1. **Bytes bar** — 136 MB vs 5.0 MB on a *linear* scale; flash renders
   as a sliver and the sliver being barely visible is the point (~27×
   less traffic under this schedule).
2. **Time bars** — naive ≈ 68 µs (memory-bound) vs flash ≈ 14 µs
   (compute-bound), stamped: "FLOPs: 4.3 G — identical. Bytes:
   136 MB → 5.0 MB. You didn't do less math; you stopped commuting."
   Honest footnote: measured end-to-end speedups are 2–4× (7.6× on
   GPT-2 patterns) because real kernels overlap compute with IO.
3. **What it means** — this was one head, one layer; an 8B-class model
   runs ~1,000 of these per forward pass. Peak score memory fell from
   n² to one tile — kept as a visible counter (the quiz references the
   lab's peak-memory counter, so it must survive).

## Architecture

Two files, following the `blockFlow.ts` + `TransformerBlockDiagram.tsx`
precedent:

### `flashTilingScript.ts` (new, pure logic, no React)

- Exports the hardware constants table above.
- `Step` type: `{ act, caption, hbmDelta, sramState, hbmContents,
  visual }` where `visual` is a discriminated union the SVG switches on
  (matrix fill fraction, active tile, row sweep, rescale pulse, verdict
  panels).
- Builder functions generate the three act step-arrays plus derived
  totals: cumulative odometer per step, time estimates, traffic ratio.
- All arithmetic lives here; testable without a DOM.

### `FlashTilingLab.tsx` (rewrite, presentation only)

- State: `{ act, stepIdx }` + a fast-forward flag. Step index clamped;
  switching acts resets that act to step 0; act breadcrumb tabs always
  clickable (reuse `.chip`/`.chipOn`).
- Renders: SVG canvas (toy matrix + HBM/SRAM boxes + animated
  load/store arrows), meters reusing KvCacheLab's
  `.gapTrack`/`.gapFill` bars, narration `.feedback` box
  (`aria-live="polite"`), back/next/restart `.btn` controls.
- Fast-forward: `setInterval` driven by React state, cleaned up on
  unmount; `prefers-reduced-motion` jumps straight to the final state.
- No `Date`/`random`; `'use client'` like sibling labs.
- New CSS kept to a couple of small additions appended to
  `course.module.css` (SRAM slot styling, odometer emphasis); everything
  else reuses existing classes.

## Content touches outside the component

1. The lab's bottom prose note (the online-softmax paragraph in
   `FlashTilingLab.tsx`) shrinks to one line — Act 2 now teaches it
   in-step.
2. Quiz `am3-2-q2` explain string in `efficiencySubchapters.tsx`:
   "the lab's second counter" → "the lab's peak-memory counter" (robust
   to the new layout). No other quiz/prose/refs changes.

## Testing

- **`flashTilingScript.test.ts` (new file):** naive total equals the
  closed form (4·n²·BYTES + Q/K/V/O terms); flash total matches the
  tile schedule; odometer monotonically non-decreasing; SRAM occupancy
  never exceeds 20 MB at any step; FLOPs identical across acts; traffic
  ratio derived from the closed forms (≈27×), not hardcoded; every step
  has a non-empty caption.
- **`FlashTilingLab.test.tsx` (new file):** renders Act 1 step 0;
  next/back advance and clamp; act tabs switch and reset; fast-forward
  reaches Act 2's verdict; Act 3 shows the 136 MB / 5.0 MB figures;
  peak-memory counter present.
- New test files deliberately: `blockFlow.test.ts` and
  `attentionCourse.test.tsx` are modified by a concurrent session, and
  the vitest baseline has 12 pre-existing failures — measure the
  baseline before/after.
- Final verification via the `/verify` skill: build the static export
  and walk all three acts in a real browser.

## Error handling

Stateless client widget; no IO. Step indices clamped, interval cleaned
up on unmount, reduced-motion respected. Nothing else can fail.
