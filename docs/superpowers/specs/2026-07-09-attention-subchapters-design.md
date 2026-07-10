# Deep-dive subchapters for "Attention, Everywhere" module 2

Date: 2026-07-09
Status: Approved (design approved interactively; scope and nav decided by user)

## Goal

Module 2 ("The transformer block") names its components — token embeddings +
positions, multi-head attention, LayerNorm, residual adds, the FFN — but only
gives each a blurb in the block-diagram widget. Add four interactive deep-dive
**subchapters** under module 2, one per distinct component, with 2.1
(embeddings & positional encodings: types of PEs, how learned PEs are
injected, what RoPE actually does) as the explicitly requested star. The
course engine gains one level of module nesting to host them.

## Non-goals

- No deep-dive subchapters for modules 1 or 3–7 (future work; the engine
  support built here enables them).
- No click-through from block-diagram parts to subchapters (would couple a
  widget to shell navigation); the diagram blurbs get a plain-text
  "deep dive: 2.x" pointer instead.
- No collapsible tree in the sidebar — subchapters render always-expanded.
- No changes to the GFM course, `progress.ts` storage format, or the attention
  course `storageKey` (existing reader progress must survive).

## Approach decision

**Chosen: real one-level nesting in the course engine** (`subchapters?:
CourseModule[]` on `CourseModule`), rendered as an indented tree in the
sidebar — Encarta/Windows-help TOC style, which fits the courseware chrome.

- *Flat modules labeled "2.1 …"* was rejected: no engine change, but the
  sidebar numbering fights the "Module 3 of 11" kicker, the catalog's
  "7 modules" card becomes wrong, and every future deep-dive compounds the
  mess.
- *Accordion sections inside module 2's lesson pane* was rejected: no
  per-subchapter progress ticks, no time estimates, no resume-where-you-left,
  and a very long scroll.

## Engine changes (`src/components/courses/engine/`)

`types.ts` — `CourseModule` gains optional `subchapters?: CourseModule[]`.
One level deep by convention (subchapters do not themselves have
subchapters).

`CourseShell.tsx`:

- **Flat reading order** `[1, 2, 2.1, 2.2, 2.3, 2.4, 3, …, 7]` computed by
  flat-mapping modules with their subchapters. Prev/next footer nav, "Mark
  complete & continue", progress %, and the completion banner all operate on
  this flat list. Subchapters are mainline content: they count toward the %,
  and the course-complete banner still fires on the last flat item (module 7).
- **Sidebar** renders top-level modules as today; each subchapter renders
  indented beneath its parent with the same completion tick and minutes.
- **Kicker**: top-level modules keep "Module N of 7 · ~M min" (count =
  top-level count). Subchapters show "Module 2 · Deep dive K of 4 · ~M min" —
  derived from structure, no new fields.
- **Narrow-viewport `<select>`** options get an indent prefix for
  subchapters.
- Resume logic (`lastModuleId`) works unchanged — subchapter ids are module
  ids in the same flat lookup.

`progress.ts` — untouched.

## Content (`src/components/courses/attention/`)

New file `subchapters.tsx` exports the four modules; `content.tsx` imports
and attaches them to module 2's `subchapters`. Each follows the house
pattern (prose → widget(s) → callout → quiz → refs), expert-level depth.
Module ids: `block-embeddings`, `block-heads`, `block-residuals`,
`block-ffn`. Quiz ids: `am2-1-q*` … `am2-4-q*`.

### 2.1 Embeddings & positions (~7 min) — `block-embeddings`

Prose: the embedding matrix as a learned V×d lookup (the interface between
discrete symbols and the residual stream); attention's permutation
equivariance ("cat sat" = "sat cat"); the injection taxonomy — WHERE
(added once at the input vs. inside attention at every layer) × WHAT
(absolute index vs. relative offset). Callout: the modern stack — RoPE as
the LLM default (Llama/Qwen/DeepSeek), θ-scaling/YaRN for long context in a
sentence.

Widget `order-blind` — **Order-Blindness Lab**: a real tiny attention head
computed live in JS (≈5 tokens, small d, seeded constant weights). With
positions OFF, a shuffle button permutes the sentence and the per-token
output vectors are identical up to the same permutation — shown, not
asserted. Toggle positions ON → outputs genuinely change.

Widget `position-lab` — **Position Lab**, tabbed:

- *Sinusoidal*: position × dimension heatmap, geometric-frequency stripes,
  hover for values; "every position gets a unique barcode".
- *Learned absolute* (GPT-2/BERT): the same grid framed as a trainable
  lookup table added to token embeddings at the input; rows beyond the
  trained max length render "?" — the extrapolation failure made visible.
- *RoPE* (centerpiece): one 2D dimension-pair on a unit circle; q of token m
  and k of token n drawn as arrows rotated by m·θ and n·θ; position sliders
  and a live dot-product readout; a **"shift both +k" button leaves the
  score visibly unchanged** (relative invariance you can press). A frequency
  selector shows slow vs. fast "clock hands" (dimension pairs at different
  θ_i = 10000^(−2i/d)).
- *ALiBi*: score matrix with per-head linear distance penalties and a slope
  control; extrapolation story.

Refs: Vaswani §3.5, RoFormer (RoPE), ALiBi, Shaw et al. 2018 (relative PEs),
YaRN.

### 2.2 Inside multi-head attention (~6 min) — `block-heads`

Prose: tensor mechanics (d_model → h heads × d_head; per-head projections as
slices of the big weight matrices; concat → W_O mixes head outputs); heads
as residual-stream readers/writers (circuits framing); the 4·d² attention
parameter budget per layer.

Widget `head-matrix` — **Head Matrix Lab**: interactive tensor-shape flow
([n×d] → per-head Q/K/V → scores → concat → W_O); click any tensor for
shape and role; a head-count slider (d_model fixed ⇒ d_head = d_model/h)
with a live parameter counter and a KV-cache size readout per config —
foreshadows module 3's GQA.

Refs: Annotated Transformer, Anthropic circuits framework, Michel et al.
"Are Sixteen Heads Really Better than One?".

### 2.3 Residuals & LayerNorm (~6 min) — `block-residuals`

Prose: the residual stream as a shared communication bus (sublayers read,
compute an edit, add it back); why identity paths keep 100-layer stacks
trainable; post-norm (original) vs. pre-norm (modern default) and why;
LayerNorm mechanics (per-token, across features — contrast BatchNorm);
RMSNorm as the cheaper modern variant.

Widget `residual-stream` — **Residual Stream Lab**: toy N-layer stack with a
depth slider; residuals ON/OFF toggle shows per-layer signal/gradient
magnitude bars (off → vanishing, on → stable); pre-norm vs. post-norm
placement toggle.

Refs: ResNet (He 2015), LayerNorm (Ba 2016), RMSNorm (Zhang & Sennrich
2019), Xiong et al. 2020 (pre-norm analysis).

### 2.4 The FFN (~6 min) — `block-ffn`

Prose: two matrices (d→4d→d) applied per-token — no communication; the
key-value-memory view (Geva et al.) — W_in rows detect patterns, W_out
columns write to the residual stream; where facts live; ReLU → GELU → SwiGLU
(gated, three matrices, Llama default); MoE = many expert FFNs + router —
scale parameters, not FLOPs (Mixtral, DeepSeek-V3).

Widget `param-budget` — **Parameter Budget Lab**: d_model/d_ff/layer sliders
with real-model presets (GPT-2 small, Llama-3-8B) showing where parameters
live (attention vs. FFN vs. embeddings) — the "~2/3 in the FFN" claim made
manipulable; an MoE toggle contrasts total vs. active parameters.

Refs: Shazeer (GLU variants), Geva et al. (key-value memories), Mixtral.

## Integration

- `content.tsx` module 2: one-sentence pointer after the block-diagram
  widget ("each component gets its own deep dive — 2.1 through 2.4");
  `TransformerBlockDiagram.tsx` part blurbs gain a short "deep dive: 2.x"
  suffix (embed→2.1, mha→2.2, ln1/add1/ln2/add2→2.3, ffn→2.4).
- `attention/index.tsx` registers the five new widgets:
  `order-blind`, `position-lab`, `head-matrix`, `residual-stream`,
  `param-budget` — one component file each (2.1 uses two of them).
- `courseCatalog.ts`: `modules` stays 7 (top-level count); `minutes`
  64 → 89 (+7+6+6+6); `highlights` "6 interactive labs" → "10 interactive
  labs".

## Testing

- Update flatten-aware tests: widget-registry checks (attention course test
  + catalog sync test) iterate modules **and** subchapters; catalog minutes
  test sums the flat list; module-count test compares top-level count only.
- New engine test coverage: sidebar shows indented subchapters; navigating
  to 2.1 renders its title; flat prev/next order passes through 2.1–2.4;
  progress % counts subchapters.
- New widget tests: RoPE "shift both" leaves the score readout unchanged;
  Position Lab tab switching; Head Matrix Lab parameter counter responds to
  the head slider; Residual Lab toggle changes the rendered bars; Parameter
  Budget Lab presets update the split.
- Do not touch `CoursewareShell.tsx`, `CoursewareShell.test.tsx`,
  `HomeClient.tsx`, or `content/settings.yaml` (modified by a concurrent
  session); stage commits by explicit path.

## Risks

- `CourseShell.tsx` is the one shared-engine file both courses render
  through — the flattening must leave a subchapter-free course (GFM)
  pixel-identical. Guard: run both courses' existing tests unmodified except
  where flattening is explicit.
- Widget honesty: the Order-Blindness and RoPE labs compute real attention /
  real rotations (no faked numbers), so the demos stay truthful under any
  slider setting.
