# Block-diagram data-flow redesign: ⊕ position, Q/K/V stepper, add-vs-concat

Date: 2026-07-10
Status: Approved (design approved interactively; MHA layout and head depth
chosen by user: mini-stepper, 2 real heads)

## Goal

The "Anatomy of a Transformer Block" widget (`TransformerBlockDiagram.tsx`,
module 2 of the attention-mechanisms course) shows real numbers flowing
through each clicked component, but three things confuse readers:

1. The **embed** stage jumps from token symbols straight to the already-summed
   "embedding + position" grid — the addition itself is invisible.
2. The **multi-head attention** stage uses 4 tokens × 4 dims, so activations
   `[4×4]` and the attention pattern `[4×4]` (token×token) are visually
   indistinguishable, and Q/K/V are computed internally but never shown.
3. The **residual adds** never address why sublayer outputs are *added*
   rather than *concatenated* — even though head outputs ARE concatenated
   inside the same block.

Fix all three while keeping the widget's shape: SVG diagram on top, click a
component, numbers below.

## Non-goals

- No changes to the SVG block diagram itself (boxes, highway, labels stay).
- No changes to MultiHeadLab, HeadMatrixLab, or the engine.
- No new widget: the MHA stepper lives inside the existing flow panel.
- 2.2's parameter-count/slicing/KV-cache angle stays in 2.2 — the stepper
  shows the *computation*, not the cost model.

## Shared change: dimensions become n=4, d=6, 2 heads × d_head=3, d_ff=24

One forward pass (`blockForward()`) feeds all seven stages, so the dimension
change is global to the widget:

- Tokens stay `['The', 'cat', 'sat', 'here']`.
- Activation grids are `[4×6]`; attention patterns are `[4×4]` — the two
  kinds of matrix are no longer the same shape anywhere.
- `d_ff = 24` makes the FFN caption `4×6 → 4×24 → 4×6`, matching the
  existing prose claim "usually 4× wider than the model dimension"
  (currently d_ff=8 = 2×, a quiet inconsistency).
- Attention is computed **per head** (2 heads, slices of 3 dims):
  `scores_h = Q_h·K_hᵀ/√3`, softmax per row, `out_h = weights_h·V_h`,
  concat → `[4×6]` → W_O. The single-head `/2` scaling disappears.
- Position vectors become a proper mini-sinusoidal: 3 (sin, cos) frequency
  pairs across the 6 dims, amplitude-scaled (~0.5) so cell colors stay in
  range.

### Weights

New fixed weights (W_Q, W_K, W_V, W_O: 6×6; W1: 24×6; W2: 6×24) are
generated at module load from a small seeded PRNG (e.g. mulberry32) — no
~400-value literal blobs. Deterministic: pure function of hardcoded seeds,
stable across runs/tests.

**Constraint:** the two heads' attention patterns in step 2 must be visibly
different (that is the payoff of showing two heads). Implementation may
search seeds and/or lightly hand-tune the Q/K slices until the two `[4×4]`
patterns differ clearly (e.g. different argmax structure, non-uniform rows).
If seed search cannot produce a clean contrast, fall back to hand-authored
literals for W_Q/W_K chosen to produce two distinct, non-degenerate patterns
— visual pedagogy outranks weight-generation elegance.

## Cross-cutting: axis labels on every grid

Generalize `VecGrid`:

- Optional **column headers**: `d₁…d₆` on activation grids; token names on
  attention patterns (rows = query token, columns = key token).
- Optional **row-label override**: defaults to token names; the position
  grid uses `pos 0…3`.
- Optional **per-column tint groups** for the head split (columns 1–3 vs
  4–6): a colored 2px top border per column group plus a matching tiny
  head label — NOT background tints, since cell backgrounds already encode
  values via `flowColor`.
- Existing value-shading (`flowColor`) unchanged.

All seven stages get correct axis labels; shape captions update from
`[4×4]` to `[4×6]` and notes are re-checked (e.g. LN note: "each ROW — one
token's 6 numbers — rescaled to mean 0, variance 1").

## Stage redesign 1: embed — show the ⊕

Clicking "token embeddings + positions" shows three `[4×6]` grids joined by
operators (flex row, wraps on narrow viewports):

```
token embedding (lookup row)  ⊕  position vector (sinusoidal)  =  what enters the block
rows: The/cat/sat/here           rows: pos 0…3                    rows: The/cat/sat/here
```

- The middle grid's `pos 0…3` row labels make the point that the position
  vector depends only on the seat, not who sits in it.
- Drop the old "before: token symbols" grid (redundant — row labels carry
  the tokens); keep the shape line `tokens [4] → vectors [4×6]`.
- Note text (≈2 sentences): the same token elsewhere fetches the SAME
  embedding row; only the position vector differs — after the ⊕,
  "cat at position 1" ≠ "cat at position 3", which is how order sneaks in
  (deep dive 2.1 for RoPE/ALiBi, which inject position inside attention
  instead).

## Stage redesign 2: mha — 3-step stepper, 2 real heads

Clicking "multi-head attention" replaces the single before/weights/after row
with a mini-stepper: three step chips (`s.chip`/`s.chipOn` style, like the
lab chip rows) — `1 · make Q,K,V`, `2 · score + softmax`, `3 · mix +
combine` — plus the per-step grids, shape line, and note. State:
`useState` step index, defaults to step 1 on selection.

**Step 1 — make Q, K, V.** Input `x` (normalized, `[4×6]`) → three grids
Q, K, V (`[4×6]`), columns tinted by head (3+3). Role captions under each:
Q "what am I looking for?", K "what do I advertise?", V "what I hand over
if you attend to me". Note: three learned matrix multiplies (W_Q, W_K,
W_V); the 6 columns are already sliced into 2 heads × 3 dims — heads are a
reshape of the same matrices, not extra networks.

**Step 2 — score + softmax.** Two `[4×4]` attention patterns side by side,
"head 1's pattern" and "head 2's pattern": rows = query token, columns =
key token (token-name headers), weight-shaded, rows sum to 1. Shape line:
`Q_h·K_hᵀ/√3 → softmax rows → [4×4] per head`. Note: each head compares
its own 3-dim Q slice with its own 3-dim K slice — two learned lenses on
the same sentence, two different patterns; this token×token grid is a
different kind of matrix from the `[4×6]` activations.

**Step 3 — mix + combine.** Two `[4×3]` head outputs (`weights_h·V_h`,
tinted) → concatenated `[4×6]` → W_O → final `[4×6]` output, labeled "the
edit written to the residual stream". Note: concatenation happens here at
fixed, planned width (2×3 = 6) and W_O immediately mixes the heads' writes
into shared directions (echo of 2.2) — without it heads would live in
sealed compartments.

The mha entry keeps a compact overall shape line
(`[4×6] → [4×6], attention pattern [4×4] per head`) so the stage still
reads as shape-preserving.

## Change 3: residual add-vs-concat intuition

**(a) `add1` blurb** (diagram click): append one sentence — "Why add rather
than concatenate? Concat would double the width at every sublayer, so
nothing would stack; see 2.3."

**(b) New callout in subchapter 2.3** (`subchapters.tsx`, block-residuals),
placed after the residual-stream widget, icon ⚖️ (or similar), titled "Why
add, not concatenate?" — three beats:

1. **Stackability.** Concat grows width every sublayer (d → 2d → 4d → …);
   after 96 blocks (192 sublayers) nothing fits, and every layer would need
   different-shaped weights. Add keeps output shape = input shape — the
   LEGO property the whole architecture depends on.
2. **Shared coordinates = editable memory.** Adding writes the update into
   the same feature space, so a later layer can strengthen, refine, or
   cancel an earlier layer's write. Concat is append-only: earlier features
   sit frozen in their own columns; nothing can ever be amended.
3. **Concat where it belongs.** This block already concatenates — the head
   outputs — but at fixed, planned width, once, immediately mixed by W_O.
   And `W·[x; f(x)] = W₁x + W₂f(x)`: concat-then-mix IS a learned add; the
   residual connection is the special case with the mix frozen to identity
   — and that frozen identity is exactly the unobstructed gradient path the
   residual exists to provide (making it learnable would let training break
   the property you built it for).

**(c) Fifth quiz question in 2.3** reinforcing the callout. Correct answer
covers fixed width/stackability + composable edits in shared coordinates;
distractors: "concat would be too slow to compute" (it's cheap — shape, not
speed, is the problem), "softmax requires equal widths" (unrelated).

## Testing & verification

- `attentionCourse.test.tsx` / `subchapterLabs.test.tsx`: update anything
  asserting on the old 4×4 flow; add assertions — per-head weight rows sum
  to 1; stepper renders 3 steps and switches content; embed stage renders
  the ⊕ operand grids (embedding grid, `pos 0` label, sum grid); 2.3 quiz
  has 5 questions.
- Known baseline: 12 pre-existing vitest failures + jsdom localStorage
  quirk — do not chase them.
- End-to-end: `/verify` skill (build + drive the static export in a real
  browser); check the widget at desktop and narrow widths (grids wrap via
  existing flex-wrap).
- Independent fact-check pass on all new prose (role captions, sinusoidal
  claim, add-vs-concat callout, quiz wording) — course prose errors have
  slipped through implementers before.

## Addendum (2026-07-11): embedding lookup + size-match clarity

User feedback after the initial ship: (a) it is unclear that the position
vector MUST match the embedding width, and (b) it is unclear where the token
embedding comes from — the table lookup is invisible to a new practitioner.

Changes to the embed stage (user approved the table-sketch option over a
compact id column):

- New `EmbTable` visual as the stage's first item: the embedding table E
  drawn as a tall table — faded ⋮ filler rows between the four fetched rows,
  each row labeled `id <n>` on the left and tagged `→ <token>` on the right,
  values heat-shaded like the other grids. Rows appear in **id order**
  (table order ≠ sentence order — deliberately part of the lesson). Caption:
  "embedding table E — V×6, learned (V ≈ 50k; ids from the GPT-2 tokenizer)".
- Real ids, verified by executing the GPT-2 tokenizer (js-tiktoken):
  "The cat sat here" → [464, 3797, 3332, 994], one token per word.
  `TOKEN_IDS` exported from `blockFlow.ts` and locked by a test.
- Stage items become: EmbTable → (op "fetch 4 rows →") → fetched-rows grid
  (sentence order) ⊕ position grid = sum grid.
- Size-match constraint made explicit: the position grid label gains
  "also 6-dim", and the note states that elementwise ⊕ forces the position
  vector to the embedding width (a concatenated position code would dodge
  the constraint but grow the width — 2.3's add-vs-concat trade-off;
  RoPE/ALiBi need no position vector at all).
- Shape line: `ids [4] → fetch rows of E [V×6] → [4×6] ⊕ [4×6] = [4×6]`.
- The embed PART blurb prepends the lookup ("each token id fetches a row of
  a learned V×d embedding table").
- `StageItem` union gains `{ custom: 'emb-table' }`; tests assert the table
  caption, an id row, a fetch tag, and the new shape line.
- Fact-check: the only new empirical claim (the ids) is verified by running
  the tokenizer; the remaining statements repeat claims confirmed in the
  Task-5 review, so no second review pass is dispatched.

## Rejected alternatives

- **Static all-at-once MHA panel** (no stepper): everything visible but ~6
  dense number grids at 8.5px — rejected by user in favor of stepper.
- **Single head + "see 2.2" pointer**: simpler, but the box is literally
  labeled "multi-head" and would keep showing one pattern — rejected by
  user in favor of 2 real heads.
- **Putting the Q/K/V walkthrough in subchapter 2.2 instead**: user wants
  the anatomy widget itself to be clearer; 2.2 keeps its slicing/cost
  angle.
- **d=3 (smaller than n)**: compact, but a 3-col vs 4-col difference reads
  poorly and `d < n` is atypical; d=6 also enables the 2×3 head split.
