# Position Lab injection map — design

**Date:** 2026-07-11
**Course:** Attention Everywhere — section 2.1 "Embeddings & positions"
**Files touched:** `src/components/courses/attention/PositionLab.tsx`, `src/components/courses/attention/subchapters.tsx`, `src/components/courses/attention/subchapterLabs.test.tsx`

## Problem

Section 2.1 teaches, via the Order-Blindness Lab, one concrete mental model: *position is a
vector added to the token embedding at the input* (`x = emb + pe(slot)`, the "positions ON"
toggle). The Position Lab's Sinusoidal and Learned tabs extend that model — their heatmaps show
the thing that gets added. But the RoPE and ALiBi tabs silently switch to a different injection
point entirely: RoPE rotates Q/K **after the W_Q/W_K projections, inside attention, at every
layer**; ALiBi adds a bias **to the QKᵀ scores just before the softmax**. The tabs only show
downstream consequences (unit-circle invariance, the bias matrix), so readers can't place either
scheme inside the transformer block — even though the Anatomy of a Transformer Block widget has
already given them the exact pipeline vocabulary (embed ⊕ positions → make Q,K,V → score +
softmax → mix).

## Goal

Make *where each scheme plugs into the block* visible at a glance inside the Position Lab, and
make the surrounding 2.1 prose reinforce the same two-family structure. Scope: the lab widget
plus the prose block between the two widgets. Quiz, refs, callout, Order-Blindness Lab, and the
Anatomy widget are untouched.

## Approach (chosen: injection-point strip)

Considered:

- **A. Injection-point strip (chosen)** — persistent mini-pipeline diagram in the lab, same on
  all four tabs, with the active scheme's hook highlighted. Small footprint, no new math,
  existing panels stay.
- **B. Real-number step-through** — rebuild RoPE/ALiBi panels as blockFlow-style live-number
  data flows. Most concrete but heavier UI and partially duplicates the Anatomy MHA stepper.
- **C. Prose-only bridge** — regroup bullets, add anchor sentences, lab untouched. Cheapest but
  leaves the visual gap that caused the problem.

A was selected (with C's prose restructure folded in, since scope includes prose).

## Design

### 1. `InjectionMap` component (inside `PositionLab.tsx`)

A new internal component `InjectionMap({ tab }: { tab: Tab })`, rendered between the tab chips
and the tab panel. No new file; no new dependencies.

**SVG strip** (~480×110 viewBox, `s.labCanvas` conventions) drawing the pipeline as 8 small
nodes:

```
embed → [⊕ pos] → make Q,K,V → [↻ rotate Q,K] → QKᵀ/√d → [+ dist bias] → softmax → ·V
└── at the input · once ──┘└──────── inside attention · every layer ×N ─────────────┘
```

- **Two tinted regions** with brace labels beneath the nodes: "at the input — once" tinted
  `#d8e3f5` (the Anatomy diagram's embed-box color) spanning `embed` and `⊕ pos`; "inside
  attention — every layer ×N" tinted `#cfe0f5` (its MHA-box color) spanning the rest. The
  where-axis and the how-often-axis become geography, in the visual language of the block
  diagram the reader just clicked through.
- **Three injection-slot nodes** — `⊕ pos`, `↻ rotate Q,K`, `+ dist bias` — are the only
  "hook" nodes:
  - Active slot (per tab): bold `#0a246a` stroke (the Anatomy diagram's selected-part color),
    warm fill `#fff7e0`.
  - Inactive slots: dashed `#b0a898` stroke, `#f6f4ec` fill, `#a09880` text — readable as
    *unused hooks that exist* (e.g. on the RoPE tab the input ⊕ sits there visibly unused).
  - Non-slot nodes: plain boxes, gray stroke.
- **Tab → slot mapping:** Sinusoidal and Learned both light `⊕ pos` (different captions);
  RoPE lights `↻ rotate Q,K`; ALiBi lights `+ dist bias`. Switching tabs moves the highlight —
  the "same pipeline, different insertion point" moment.

**Caption line** (HTML `<p>` below the SVG — wraps well, assertable in tests), one per tab:

| Tab | Caption (intent, final wording may be polished) |
|---|---|
| Sinusoidal | sin/cos barcode ⊕-added to the token embedding — once, at the input; the layers above never see position again |
| Learned | trained table row ⊕-added to the token embedding — once, at the input — the same ⊕ the Order-Blindness Lab's positions toggle flips |
| RoPE | nothing added at the input — Q and K are rotated right after their projections, inside attention, at every layer |
| ALiBi | no position vectors anywhere — −slope·distance joins the scores between QKᵀ and softmax, at every layer |

**Config shape:**

```ts
const INJECTION: Record<Tab, { slot: 'add' | 'rotate' | 'bias'; caption: ReactNode }> = { … }
```

**Accessibility:** SVG `role="img"` with per-tab aria-label ("Injection map: where {scheme}
enters the transformer block"); slot nodes get `<title>` tooltips.

### 2. Tab-note anchors (`PositionLab.tsx`)

- **RoPE note** gains one sentence: "In the block anatomy's attention stepper this sits between
  step 1 (make Q, K, V) and step 2 (score + softmax): project first, rotate, then score — the
  embedding itself is never touched."
- **ALiBi note** gains: "In stepper terms it lives inside step 2 — after QKᵀ, before the
  softmax."
- Sinusoidal/Learned notes: unchanged except minor wording if needed to avoid repeating the new
  captions verbatim.

### 3. Prose restructure (`subchapters.tsx`, block between the two widgets)

Keep the two-questions frame (**where** does position enter / **what** does it encode). The flat
4-bullet list becomes two labeled families with nested bullets:

- **At the input, once — a vector ⊕-added to the token embedding** *(what the positions toggle
  above just did)*:
  - **Sinusoidal** (Transformer, 2017) — fixed sin/cos barcode. Absolute, zero parameters,
    defined for any length.
  - **Learned absolute** (GPT-2, BERT) — a trainable row per position. Absolute, simple, cannot
    represent positions past the training length.
- **Inside attention, at every layer — no position vectors at all**:
  - **RoPE** (2021; Llama, Qwen, DeepSeek) — rotate each Q/K dimension-pair by position×θ,
    right after the Q/K projections. Scores then depend only on relative offset.
  - **ALiBi** (2022) — subtract slope×distance from each score, just before the softmax.
    Relative, parameter-free, extrapolates well.

Lead-in gains one pointer at the strip: "the map at the top of the lab shows each scheme's hook
into the block you dissected on the module page." The family-1 parenthetical is the explicit
bridge back to the Order-Blindness Lab toggle.

*Fallback:* if nested `<ul>` renders poorly under the course CSS, flatten to two short labeled
groups with flat bullets — same content and grouping.

## Testing

New tests in the existing `PositionLab` describe block (`subchapterLabs.test.tsx`), following
the established caption-string pattern:

1. Default (Sinusoidal) tab: injection caption places the hook at the input, once.
2. Click RoPE: caption asserts `/nothing added at the input/i` and `/every layer/i`.
3. Click ALiBi: caption asserts the between-QKᵀ-and-softmax placement (phrase chosen to sit
   within one text node, or matched with a function matcher).

The four existing PositionLab tests (RoPE score invariance ×2, Learned `?` rows, ALiBi tab
switch) must stay green unchanged — panels are not modified.

**Verification:** attention-course vitest suite (12 pre-existing failures elsewhere in the repo
are baseline, per memory), then the `verify` skill for an end-to-end browser pass: strip renders
on all four tabs, highlight moves, nested bullets render correctly.

## Out of scope / untouched

`OrderBlindLab.tsx`, `TransformerBlockDiagram.tsx`, `blockFlow.ts`, the 2.1 quiz/callout/refs,
the widget registry (`index.tsx`), the course engine, and all other courses.
