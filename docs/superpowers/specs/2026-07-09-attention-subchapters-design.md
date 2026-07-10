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

- No deep-dive subchapters for modules 1, 4, 5, 6, 7 (future work; the
  engine support built here enables them). Module 3 IS in scope — see the
  "Module 3" section added 2026-07-09.
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

## Module 3 rework: prelim context + technique subchapters (user addition, 2026-07-09)

Module 3 currently assumes the reader already knows what a KV cache is and
why memory movement matters. Fix in two parts:

**Main module 3 (rewritten, ~8 min).** Teach the prerequisites in order:
(a) prefill pays n² compute; (b) the decoding loop generates one token at a
time, and each new token's query must score against every past token's K/V —
recomputing those every step is O(t²) wasted work, so decoders cache them:
that is the **KV cache**; (c) the cache's size formula
(2 × layers × K/V heads × d_head × context × bytes) and why long-context
decoding becomes memory-bound, not compute-bound. New widget `kv-cache` —
**KV Cache Lab**: a decoding stepper (generate token by token) with a
cache ON/off toggle showing K/V projections computed so far (t cached vs
t(t+1)/2 recomputed), plus a real-config sizer (model preset chips + context
slider → cache GB vs an 80 GB HBM bar). Main module ends with a map of the
three attack directions pointing at 3.1/3.2/3.3. New quiz ids am3-q4..q6
(why cache K/V but not Q; what the cache scales with; recompute counts).

**3.1 Shrink the cache (`efficiency-kv-sharing`, ~6 min).** MQA / GQA / MLA.
Widget `head-sharing` — **Head Sharing Lab**: 8 query heads wired to
8/4/2/1 K/V heads (MHA/GQA-4/GQA-2/MQA mode chips) with arrow diagram,
cache-per-token readout, and a qualitative quality indicator per mode; MLA
mode replaces K/V heads with one low-rank latent vector (plus the decoupled
RoPE key), cache between MQA and GQA sizes at ~MHA quality. Moved quiz
am3-q2 (GQA) + new am3-1-q1 (MLA latent), am3-1-q2 (quality/cache
interpolation). Refs: MQA (Shazeer), GQA, DeepSeek-V2.

**3.2 Compute smarter: FlashAttention (`efficiency-flash`, ~6 min).**
Prelim: GPU memory hierarchy (HBM big-but-slow, on-chip SRAM tiny-but-fast);
attention was bottlenecked on HBM traffic, not FLOPs. Widget `flash-tiling`
— **Flash Tiling Lab**: a 16×16 score matrix; naive mode shows the full
matrix materialized in HBM (counters: n² scores written + read back); tiled
mode steps tile-by-tile (load Q/K tiles to SRAM, online-softmax running
max/denominator, accumulate output, discard tile) with counter "scores
materialized in HBM: 0" and an exactness note. Moved quiz am3-q1 + new
am3-2-q1 (why online softmax makes tiling exact), am3-2-q2 (FLOPs unchanged,
traffic reduced). Refs: FlashAttention, FlashAttention-2, online softmax.

**3.3 Score fewer pairs (`efficiency-sparse`, ~6 min).** The existing
`mask-lab-efficiency` widget moves here from main module 3, with expanded
prose: windows + global tokens (Longformer/BigBird), production sliding
window (Mistral), linear attention's reordering trick and its trade-offs.
Moved quiz am3-q3 + new am3-3-q1 (global tokens as hubs), am3-3-q2 (linear
attention: Q(KᵀV) associativity, O(n), quality cost). Refs: Longformer,
BigBird, Mistral-7B, linear attention.

Catalog effects: minutes 89 → 106 (module 3: 9→8, +18 subchapters);
highlights → "13 interactive labs · 7 deep dives". Moved quiz ids keep
their original strings so existing readers' saved answers stay valid.

## Data-flow panel in the block diagram (user addition, 2026-07-09)

`TransformerBlockDiagram.tsx` additionally gains a **live data-flow panel**:
a real forward pass through one pre-norm block is computed in-component over
a fixed toy input (4 tokens, d=4, single attention head, d_ff=8, fixed
weights, no biases, γ=1/β=0 norms). Selecting a component shows the actual
numbers **before → after** that component as two color-coded 4×4 vector
grids (token-labelled rows), with shape captions:

- `embed`: tokens [4] → vectors [4×4] (symbols become vectors; the one
  shape-changing step).
- `ln1`/`ln2`: [4×4] → [4×4], rows visibly re-standardized.
- `mha`: [4×4] → [4×4], plus the real 4×4 attention-weight heatmap ("who
  looks at whom").
- `add1`/`add2`: shows the sublayer's edit being added to the untouched
  residual copy.
- `ffn`: shape line "4×4 → 4×8 → 4×4" (expand → nonlinearity → project).

Every stage's output shape equals its input shape — the panel makes the
"blocks stack like LEGO" claim visible in numbers. Small CSS additions to
`course.module.css` for the vector grids.
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
- Widget honesty: the Order-Blindness and RoPE labs and the block diagram's
  data-flow panel compute real attention / real rotations / a real block
  forward pass (no faked numbers), so the demos stay truthful under any
  slider setting.
