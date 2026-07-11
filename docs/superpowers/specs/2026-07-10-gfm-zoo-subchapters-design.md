# Deep-dive subchapters for the GFM course module 5 ("The GFM Zoo")

Date: 2026-07-10
Status: Approved (organization and viz shape decided interactively; grounded
in a fact-checked deep-research pass, workflow `wp6505hmf`)

## Goal

Module 5 ("The GFM zoo: four bets on a vocabulary") names the model families
but covers all of them in one dense prose block. Add **five architecture
deep-dive subchapters** under module 5 — one per vocabulary bet, including a
new fifth bet for relational-database foundation models — each anatomizing
the family's flagship architecture(s) with a bespoke interactive lab, plus a
cross-family **Zoo Map** comparator widget in the parent module. Where a deep
dive needs transformer prelims, point readers at the companion Attention
course rather than re-teaching.

## Research grounding (deep-research pass, 2026-07-10)

106-agent verified sweep over primary papers and the three major surveys.
Findings that shape this design:

- **The four-bets framing survives contact with the literature.** Wang et
  al. 2025 (generalization scope), Liu et al. TPAMI 2025 (GNN/LLM reliance),
  and Mao et al. ICML 2024 (transferability) each slice on a different,
  non-architectural axis; Mao's "graph vocabulary" position explicitly
  licenses organizing by transferable unit. Keep the bets as the spine.
- **One genuinely new family since the module was written:**
  relational-database FMs (KumoRFM-2, April 2026), with an internal
  three-way architecture competition (label-propagation ICL vs
  flatten-then-tabular-FM vs task-conditioned hierarchical attention).
  Becomes bet 5 / deep dive 5.5. Module 6 keeps the *data* story.
- **"Text as glue" is four architecturally different machines** (verified
  per paper): OFA, GraphGPT, LLaGA, UniGraph differ on prediction locus,
  encoder presence, and frozen-vs-trained split. Deep dive 5.2 teaches the
  family through those axes.
- **Graph transformers are a backbone option inside families, not a missing
  family** (Liu et al. house them inside GNN-based GFMs).
- **The five cross-model contrasts worth visualizing** (all
  verbatim-verified): what the "token" is · backbone propagation
  (adjacency-constrained vs all-pairs) · where conditioning enters · what is
  frozen vs trained · where prediction happens. These are the Zoo Map's rows.

### Verification ledger (what the implementation may assert vs must check)

Verified 3-0 against primary sources this pass — safe to teach as stated:

- **ULTRA**: modified-NBFNet MPNN; conditional message passing (pairwise
  representations conditioned on head entity + query relation via labeling
  trick); graph-of-relations with four interaction edge types
  (h2h, h2t, t2h, t2t); double permutation-equivariance (entities AND
  relation types).
- **OFA**: every domain → text-attributed graph; frozen LM text encoders
  (sentence transformer, e5-large-v2, Llama2-7b/13b evaluated) → one shared
  embedding space; prediction by a separate **trained** edge-type-aware GNN;
  task conditioning appended AS GRAPH STRUCTURE (NOI prompt node + class
  nodes via relations r_t2p/r_p2t); readout P[NOI ∈ class i] =
  σ(MLP(h_ci)).
- **GraphGPT**: base LLM and graph encoder both frozen; sole trained part is
  a lightweight projector (can be a single linear layer); n graph tokens
  splice into the instruction as {<graph_begin>, <graph_token>_1..n,
  <graph_end>}; training = contrastive text-graph grounding, then dual-stage
  instruction tuning (self-supervised graph matching → task tuning). Encoder
  nominally encoder-agnostic; default a graph transformer.
- **LLaGA**: NO graph encoder — two parameter-free templates
  (Neighborhood-Detail: fixed-shape sampled computational tree, level-order
  flattened, Laplacian PEs [this template only]; Hop-Field: per-hop
  parameter-free mean aggregation); node features from frozen text encoders
  (SimTeG default); frozen Vicuna-7B-v1.5-16K; MLP projector is the only
  trained parameter set.
- **UniGraph**: cascaded DeBERTa-base → GAT backbone trained **jointly**;
  pretraining = self-supervised Masked Graph Modeling (Graph Siamese MAE) on
  TAGs; textualizes even molecule graphs; LoRA Llama-7B only for later
  instruction tuning. ("First TAG SSL pretraining" is the authors' claim —
  GIANT 2021 / Patton 2023 are contestable priors; attribute, don't assert.)
- **KumoRFM-2 architecture**: two-stage hierarchical attention — stage 1
  alternates column- and row-wise attention within individual tables
  producing task-conditioned row embeddings, with in-context example labels
  injected directly into the input tables (earliest conditioning in the
  zoo); stage 2 applies graph attention over PK-FK edges plus cross-sample
  attention across context examples; avoids quadratic all-cell attention;
  inference is fully frozen, pure ICL.
- **Liu et al. prediction-locus sub-taxonomy**: GNN-centric (OFA) /
  symmetric (GLEM, PATTON) / LLM-centric (GraphGPT); LLaGA self-describes as
  encoder-free vs GraphGPT's pretrained-encoder conditioning.

Vendor-reported (teach only with an explicit "Kumo-reported" flag):
KumoRFM-2 79.60 avg AUROC on RelBenchV1 binary classification vs RelGNN
78.06 (2-1 verification vote); Griffin/RT_zero label-propagation ICL
underperformance and "reduces to historical mean"; the AUROC 0.5-vs-1.0
column-encoder expressivity demo (purpose-built synthetic).

Verified 2026-07-11 (four-agent pass against the primary papers; verbatim
quotes in the session record):

- **GraphAny**: five LinearGNN channels X/ĀX/Ā²X/(I−Ā)X/(I−Ā)²X
  (row-normalized Ā); closed-form W* = F_L⁺Y_L on the target graph's
  labeled nodes; learned MLP over t(t−1) entropy-normalized pairwise
  distance features → attention over channels; permutation invariance
  proved, attention module verbatim "independent to feature dimension d
  and label dimension c". CORRECTION to shipped text: trained on one graph
  using 120 LABELED nodes of Wisconsin (251-node graph), evaluated on 30
  new graphs at 67.26% avg. Heterophilic graphs prefer "LinearHGC1, Linear
  or LinearSGC1" — identity/high-pass, not exclusively high-pass.
- **PRODIGY**: prompt graph = data graphs + per-class label nodes;
  examples→label-node edges carry true/false attributes; second GNN
  message-passes; readout = cosine similarity to label-node embeddings;
  no parameter updates; pretrained on MAG240M + Wiki (neighbor matching +
  multi-task).
- **G2T-FM**: row = original features + neighbor mean/max/min (numerical)
  / mean one-hot (categorical) + degree, PageRank, Laplacian eigenvectors,
  PEARL learnable encodings (NO RWSE); backbone TabPFNv2 (also
  TabPFN-2.5/LimiX in the current revision); both ICL (frozen) and
  fine-tuned regimes, FT stronger.
- **GraphPFN**: LimiX-based PFN with adjacency-masked sparse multi-head
  attention adapters after every block; context/query attention masking;
  pretrained on 1,600,000 synthetic datasets (multi-level degree-corrected
  SBM + preferential attachment; graph-aware SCMs with MLP+GNN neurons).
- **GraphBFF**: per-NODE-TYPE input projections W_τ + edge encoder (the
  numerical/categorical/text feature-GROUPING scheme is related work it
  critiques, not its own input stage — REFUTED as a GraphBFF description);
  TCA = independent masked attention per edge-type set S with own
  W_Q/W_K/W_V + edge bias, softmax within the S-restricted subset, outputs
  summed, "about 85%" of parameters; TAA = per-node-type projection then
  shared Q/K/V over sampled 2-hop ≤10/hop neighborhoods; fusion = learned
  FFN Φ(h_tca, h_taa) inside a standard residual+LN+FFN block; Theorem 4.1
  strictly-more-expressive (witness function); masked link prediction with
  1:1 uniform negatives, concat + 2-layer MLP scorer, BCE, supervised
  edges removed from the input graph; ~50B nodes+edges combined, 12 node
  types / 20 relation types, 1B supervision edges, ≤12h on 64 B200 GPUs;
  KL-Batching (cluster packing by ascending KL vs global type
  distribution) + Round-Robin Batching over supervision-edge types.
  Baselines are "task-specific heterogeneous graph transformers"
  (HGT/HAN/GraphGPS), not "GNNs".

- **Molecular wing (JMP / UMA / MACE-MP-0)**: JMP pretrained on ~120M
  DFT-labeled systems (OC20 100M + OC22 8M + ANI-1x 2M + Transition-1x
  10M), backbone GemNet-OC — call it a "geometric MPNN", NOT "equivariant"
  (its internal features are invariant scalars; reserve "equivariant" for
  eSEN/MACE); pretraining = supervised multi-task energy+force regression
  with per-dataset heads. UMA: eSEN equivariant GNN + MoLE (mixture of
  linear experts routed on global features only — charge, spin, DFT task,
  composition — so experts collapse to one dense matrix per system:
  UMA-M 1.4B total / ~50M active params); ~half-billion structures, >30B
  atoms; single shared energy head. MACE-MP-0: ACE-style high-body-order
  equivariant message passing (4-body, 2 layers), trained on MPtrj (~1.5M
  Materials Project configs); "out of the box" claim carries the paper's
  own fine-tuning caveat. CORRECTION to shipped teaser text: inputs are
  atomic numbers + 3D positions with radius-based neighbor graphs — NOT
  "atoms and bonds"; and cross-domain transfer is engineered (per-dataset
  heads / task conditioning), not automatic.

Still to fact-check during implementation: Finkelshtein et al.
equivariance-recipe phrasing, and the assembled Zoo Map cell strings as a
whole.

Refuted 1-2 (do NOT teach without re-verification): that Wang et al.'s
universal-GFM category subdivides into "graph models as predictors / language
models as predictors / graph-language co-training".

## Non-goals

- No engine changes — one-level `subchapters` nesting shipped with the
  attention course and is reused as-is.
- No deep dives for other GFM modules (1–4, 6, 7).
- No changes to the attention course (its module-7 link to this course
  already exists and stays as-is).
- No programmatic navigation from widgets to subchapters (widgets are
  prop-less; Zoo Map cards carry a plain-text "deep dive 5.x" pointer, same
  as the attention course's diagram blurbs).
- No changes to `progress.ts`, the course `storageKey`, or existing quiz-id
  strings (existing reader progress must survive).
- No sitemap edits (`public/sitemap.xml` is dirty from a concurrent session;
  course URLs don't change).

## Parent module 5 rewrite (~9 min, id `zoo` unchanged)

Keep the title frame but count to five: **"The GFM zoo: five bets on a
vocabulary"**. New structure:

- Opening prose: recap the vocabulary question (module 4 hand-off), then
  one compact teaser paragraph per bet, each ending with a pointer to its
  deep dive ("deep dive 5.1", … — attention-course module-3 pattern:
  "each with its own deep dive below this module in the sidebar").
- New widget `zoo-map` (below).
- "One map to hold onto" callout updated to five vocabularies: atoms /
  relation-interaction patterns (ULTRA), English words (OFA and kin),
  structural statistics + labeled examples in context (GraphAny, GraphPFN),
  typed feature groups (GraphBFF), table rows under a schema (KumoRFM-2).
- `paper-shelf` widget stays.
- Slimmed parent quiz: three NEW taxonomy-level questions (ids `m5-q5`,
  `m5-q6`, `m5-q7` — q1..q4 ids are reserved by the moved questions):
  match-the-bet-to-the-model; which bet requires text-attributed graphs;
  which contrast axis distinguishes two given models.
- Existing detail questions redistribute, keeping their id strings so saved
  answers stay valid: `m5-q1` (ULTRA) → 5.1, `m5-q2` (text-glue limitation)
  → 5.2, `m5-q3` (GraphAny invariance) → 5.3, `m5-q4` (feature-grouping
  trade-off) → 5.4.
- Parent refs slim to the survey/position papers; module 5's current model
  papers move into their deep dives. Cross-module duplication is fine where
  load-bearing (module 6 already lists KumoRFM/RelBench and keeps them; the
  attention course duplicates GQA across 2.2 and module 3 the same way).

## Widget `zoo-map` — **Zoo Map** (parent module 5)

The cross-family comparator implementing the five verified contrast axes.

- ~10 model cards, color-coded by family: ULTRA, JMP (molecular sidebar),
  OFA, GraphGPT, LLaGA, UniGraph, GraphAny, GraphPFN, GraphBFF, KumoRFM-2.
- Each card: model name, year, family chip, "deep dive 5.x" pointer.
- Interaction: select any TWO cards → side-by-side anatomy table over the
  five axes (token · backbone · conditioning entry · frozen vs trained ·
  prediction locus), with rows where the two models differ highlighted.
  Default selection ULTRA vs GraphBFF (maximally contrasting).
- Axis values are short fixed strings (data table in the component, ~10
  models × 5 axes), reviewed in the fact-check pass.
- Note under the table restating Mao et al.'s caution: a vocabulary need not
  be a literal tokenizer — some of these "tokens" are models, not symbols.

## Content (`src/components/courses/gfm/`)

New file `zooSubchapters.tsx` exports `ZOO_SUBCHAPTERS: CourseModule[]`;
`content.tsx` imports and attaches to module 5's `subchapters`. House
pattern per subchapter: prose → widget → callout → quiz → refs. Module ids
`zoo-ultra`, `zoo-text-glue`, `zoo-in-context`, `zoo-graphbff`,
`zoo-relational`. New quiz ids `m5-1-q*` … `m5-5-q*` (plus the four moved
ids noted above).

### 5.1 A vocabulary of relations — ULTRA (~8 min) — `zoo-ultra`

Prose: KG link prediction and why per-relation embeddings are
vocabulary-tied (new KG = new relations = cold start); ULTRA's move —
represent a relation by how it INTERACTS with other relations; the
graph-of-relations with the four interaction edge types (h2h/h2t/t2h/t2t);
double permutation-equivariance; conditional message passing inherited from
NBFNet (labeling trick: representations conditioned on the (head, query
relation) pair — this is what "query conditioning inside message passing"
means on the Zoo Map). What transfers (both GNNs' weights) vs what is
recomputed per KG (the relation graph itself). Closing sidebar paragraph:
the molecular wing (JMP/UMA) as the other domain vocabulary — the periodic
table as token set, where a "token" is an atom = element + 3D position
(radius neighbor graphs, not bonds), and transfer across chemistry is
engineered via per-dataset heads (JMP) or input-side task/charge/spin
conditioning (UMA); kept brief, no lab.

Widget `relation-graph` — **Relation-Graph Builder**, two linked panels:

- Left: a fixed mini-KG (~7 entities, 4 relation types, ~9 typed edges).
- Right: the graph-of-relations (4 relation nodes), initially edgeless.
- Four toggle chips (h2h, h2t, t2h, t2t): toggling one ON draws the
  interaction edges it induces on the right, with the witnessing entity
  pair(s) flashing on the left — the relation graph is COMPUTED from the
  entity graph, not learned.
- Then a query selector (h, r, ?): the head entity lights up with the query
  relation's vector (labeling trick), a "step" button propagates conditional
  messages hop by hop on the left panel, candidate tails ranked live.
- Stat row: "relation vocabulary: 0 learned embeddings" — the point.

Callout: why this transfers to 57 unseen KGs — nothing in the parameters
names any relation. Prelim pointer: message passing basics → module 2 of
this course (no attention-course dependency here).

Quiz: moved `m5-q1` + new `m5-1-q1` (identify an interaction edge type
from an example — the shipped example is t2h: P1 tails `authored`, heads
`cites`; planning shorthand here previously said h2t),
`m5-1-q2` (what is recomputed on a new KG vs what transfers).

Refs: ULTRA (Galkin et al. ICLR 2024), NBFNet (Zhu et al. 2021), Galkin's
ULTRA blog, JMP (Shoghi et al.), UMA (Meta 2025).

### 5.2 Text as glue — four wirings of an LLM and a graph (~8 min) — `zoo-text-glue`

Prose: the shared bet (describe nodes/edges in English → one embedding
space by construction) and then the family split along two verified axes:
WHO PREDICTS (GNN vs LLM) × WHAT IS TRAINED. The four wirings, one short
section each (facts per the verification ledger): OFA (frozen LM
featurizes; trained typed GNN predicts; tasks arrive as prompt/class NODES
appended to the graph — "conditioning by graph surgery"); GraphGPT (frozen
encoder + frozen LLM; a projector is the only thing that learns; graph
tokens spliced into the prompt); LLaGA (no encoder at all — parameter-free
structure templates feed text embeddings straight through a projector);
UniGraph (LM→GNN cascade trained end-to-end with masked graph modeling —
the "actually train the thing" corner). Close with the family's shared
ceiling (text-attributed graphs only) and Liu et al.'s
GNN-centric/symmetric/LLM-centric naming.

Widget `text-glue` — **Wiring Switcher**:

- A horizontal pipeline diagram with fixed slot positions: [node text] →
  [text encoder] → [graph encoder?] → [projector?] → [predictor] →
  [answer].
- Four tabs: OFA / GraphGPT / LLaGA / UniGraph. Switching re-wires which
  slots exist, what fills them, and the styling: FROZEN components in an
  "iced" style (cool fill, ❄), TRAINED components "hot" (warm fill, 🔥).
- Per-tab readouts: "trained here: GNN" / "trained here: 1 projector";
  prediction-locus badge (GNN predicts / LLM predicts); a one-line
  conditioning note (prompt nodes vs token splice vs template sequence vs
  none-at-pretrain).
- Clicking any slot shows a two-line explanation of that component in this
  wiring.

Callout: prelims — "the right-hand half of this diagram is the Attention
course: token embeddings and tied embeddings (deep dive 2.1), the
transformer block (module 2)" with `/learn/attention-mechanisms` link.

Quiz: moved `m5-q2` + new `m5-2-q1` (which wiring trains NO graph encoder
and NO LLM — LLaGA's projector-only answer), `m5-2-q2` (where OFA's task
conditioning enters — graph structure, not prompt text), `m5-2-q3`
(UniGraph vs OFA: what "jointly trained cascade" changes).

Refs: OFA, GraphGPT, LLaGA, UniGraph, Liu et al. TPAMI survey (the
sub-taxonomy source).

### 5.3 No features, no problem — structure + in-context (~7 min) — `zoo-in-context`

Prose (verified against the primary papers, 2026-07-11 agent pass): the
bet — abandon feature identity; lean on quantities every graph has, plus
labeled examples at inference. GraphAny as the pure case: FIVE closed-form
LinearGNN channels — X, ĀX, Ā²X, (I−Ā)X, (I−Ā)²X with Ā the row-normalized
adjacency ("identical, low-pass and high-pass spectral filters") — each
solved analytically on the target graph's own labeled nodes via the
pseudo-inverse (W* = F_L⁺Y_L; "requires no training"), and a learned MLP
attention over the CHANNELS' PREDICTIONS, fed t(t−1) entropy-normalized
pairwise squared-distance features (permutation-invariant by proof;
verbatim "independent to feature dimension d and label dimension c").
Training-setup fact: trained on ONE graph using Wisconsin's 120 LABELED
nodes (the graph has 251 nodes — the currently shipped "120-node graph"
phrasing is wrong and gets corrected when m5-q3 moves here), generalizing
to 30 new graphs at 67.26% average accuracy. PRODIGY: few-shot examples
wired into a prompt graph — data graphs (sampled k-hop neighborhoods) plus
one LABEL NODE per class, examples connected to label nodes with true/false
edge attributes — a second GNN message-passes over it and the prediction is
cosine similarity between query and label-node embeddings; "without
optimizing any parameters"; pretrained on MAG240M + Wiki with neighbor
matching + multi-task objectives. The PFN line: G2T-FM turns each node
into a table row (original features + per-feature neighbor mean/max/min
aggregates + structural encodings: degree, PageRank, Laplacian
eigenvectors, learnable PEARL embeddings) for a tabular FM (TabPFNv2
primarily), used in-context or fine-tuned; GraphPFN instead BAKES the
graph in — it starts from the LimiX tabular FM and adds adjacency-masked
sparse attention adapters to every block, pretrained on 1.6M synthetic
attributed graphs from a hand-designed prior (multi-level stochastic block
models + preferential attachment; graph-aware structural causal models for
attributes).

Widget `channel-ensemble` — **Channel Ensemble Lab** (GraphAny):

- A ~14-node two-community graph with a homophily slider (rewires
  cross-community edges live; distinct implementation from module 4's
  HomophilyLab — that one scores a copy-your-neighbors rule; this one runs
  real least-squares LinearGNN channels).
- Small-multiple panels, one per channel — all FIVE, matching the paper:
  X, ĀX, Ā²X, (I−Ā)X, (I−Ā)²X (row-normalized Ā), labeled Linear /
  LinearSGC1 / LinearSGC2 / LinearHGC1 / LinearHGC2: per-node predicted
  class shown as node fill; per-channel accuracy chip. Each channel solved
  by real least squares (pseudo-inverse) on the toy graph's labeled nodes.
- A bar row: the attention weights over channels (computed live from the
  channel predictions' held-out accuracy plus mean score margin — a
  continuous, honest stand-in for the learned attention, labeled as such;
  margin added 2026-07-11 because accuracy alone over a tiny held-out set
  ties and the tie-break silently favored the first channel).
- Drag homophily 1.0 → 0.0 and the honest math shows a U-SHAPE (design
  corrected 2026-07-11): low-pass wins at 100% (averaging denoises), dies
  near ~50% (neighbor composition ≈ mixed, so neighbor averages carry no
  class signal) where identity/high-pass take over, and RESURRECTS at 0%
  (a clean bipartite toy makes ĀX a perfect community-flip detector, and
  the closed-form solve happily learns the inverted rule — module 4's own
  "0% is as far from random as 100%" lesson, now visible in a working
  model). Attention bars cross twice. "It doesn't learn your features; it
  learns which filter to trust, per graph." (Paper wording preserved:
  heterophilic graphs prefer LinearHGC1, Linear or LinearSGC1.)

Callout: prelims — "the attention over channel predictions is exactly
scaled dot-product attention over a 5-token sequence: Attention course
module 1"; ICL framing → module 3 of this course.

Quiz: moved `m5-q3` + new `m5-3-q1` (why entropy-normalized distances make
the learned part schema-free), `m5-3-q2` (PFN framing: what "the prior is
synthetic graphs" buys).

Refs: GraphAny, PRODIGY, G2T-FM, GraphPFN, TabPFN.

### 5.4 Typed attention at industrial scale — GraphBFF (~7 min) — `zoo-graphbff`

Prose (verified against arXiv 2602.04768v2, 2026-07-11 agent pass): the
bet — make the ARCHITECTURE type-aware and let scale do the rest. Input
stage: each node type carries its own feature vector and a per-NODE-TYPE
learned linear projection W_τ into the shared hidden dimension, plus an
edge encoder (NOT per-modality group encoders — see below). The GraphBFF
block: TCA (type-conditioned attention — an independent masked attention
with its own W_Q/W_K/W_V and edge-bias per edge-type SET S ⊆ relation
types, softmax normalized only within each S-restricted neighbor subset;
singleton sets recover strict per-relation attention; set outputs summed;
"about 85%" of the 1.4B parameters live here) FUSED with TAA
(type-agnostic attention: per-node-type input projection, then one shared
Q/K/V attention over a sampled neighborhood — 2 hops, ≤10 per hop in the
paper) — fusion is a learned FFN Φ(h_tca, h_taa), then the standard
residual + LayerNorm + block-FFN wrapper. Theorem 4.1: the pair is
strictly more expressive than either alone (witness function neither
realizes). Objective: masked link prediction — sampled positive edges
removed from the input graph, 1:1 uniform negatives, concat + 2-layer MLP
scorer, BCE; 1B supervision edges.

The feature-GROUPING idea (partition features into numerical/categorical/
text groups with a shared transformation per group — the FT-Transformer /
TabFM lineage: G2T-FM, Finkelshtein et al.) is the OTHER wing of this bet:
GraphBFF's related-work section describes it, credits it with making
unseen schemas usable, and critiques its cost — "they can limit
expressivity by forcing semantically distinct features through the same
transformation"; grouping is a practitioner-driven open question. GraphBFF
itself does NOT adopt it (its own inputs are per-node-type projections);
the paper states its framework is compatible with any of those methods.
Keep the honest-cost paragraph but attribute the grouping scheme to the
TabFM-lineage models, never to GraphBFF's own input stage. Finkelshtein et
al.'s equivariance recipe stays as the theory backstop for the family.
Baseline naming: HGT/HAN/GraphGPS are "task-specific heterogeneous graph
transformers" (the paper's framing), not "GNNs".

Explicit division of labor with the attention course: its module 6 ("Graph
transformer blocks") built the WHY of typed softmax (Typed Attention Lab);
this deep dive assembles the full industrial model around that primitive —
link back rather than repeat.

Widget `bff-anatomy` — **BFF Block Anatomy**, a 5-step forward-pass
stepper on a small heterogeneous graph (3 node types, 3 relation types):

1. Per-node-type input projections: each node type's differently-sized raw
   feature vector (e.g., user 4-dim, merchant 6-dim, device 3-dim) passes
   through its OWN W_τ into the same hidden d (columns visibly align into
   one matrix). Caption notes the alternative feature-grouping wing and
   its trade-off in one line.
2. TCA: per-relation-type attention masks light up as separate sparse
   softmaxes, each with its own parameter chip (reuses the visual grammar
   of the attention course's typed lab, one softmax per color; caption
   notes the general form is per edge-type SET).
3. TAA: one shared attention over the sampled 2-hop neighborhood (all
   edge colors, one softmax; "sampled ≤10/hop" note).
4. Fusion: h_tca and h_taa enter a small FFN Φ box → the node update
   (labeled "learned combination", not a sum).
5. Masked-link head: one edge hidden from the input, concat + MLP scores
   candidates, ranked live.

- Persistent parameter meter: where the 1.4B parameters live (TCA share
  highlighted), so the "~85%" claim is a picture.

Callout: prelims — Attention course module 6 (typed attention: the
TCA-vs-shared intuition), deep dive 2.2 (heads/W_O), module 3 (why sampled
sparse attention — cost).

Quiz: moved `m5-q4` + new `m5-4-q1` (what fuses in TCA+TAA and why both —
expressiveness), `m5-4-q2` (why the masked-link objective mirrors
next-token prediction economically).

Refs: GraphBFF, FT-Transformer, Finkelshtein et al., HGT (lineage),
attention-course cross-link.

### 5.5 The relational bet — foundation models for databases (~8 min) — `zoo-relational`

Prose: the newest family. Setup sentence linking module 6 ("module 6 asks
where graph-scale data comes from — databases; this deep dive asks what you
build on them"). Every schema is different, so the vocabulary bet is the
ROW-UNDER-A-SCHEMA. Three competing architectures, presented as a live
argument (per the verification ledger; performance claims flagged
Kumo-reported):

1. Label-propagation ICL (Griffin, RT_zero): context labels ride message
   passing; reported to collapse toward historical means on RelBenchV1.
2. Flatten-then-tabular-FM (RDBLearn ≈ DFS + TabPFN-2.5; G2T-FM's cousin):
   flatten each entity's neighborhood into one wide row, hand to a tabular
   FM; the reported expressivity gap — fixed column-wise encoders can't do
   task-dependent extraction (0.5-vs-1.0 synthetic demo, flagged as
   purpose-built).
3. KumoRFM-2: two-stage hierarchical attention — in-context labels injected
   directly INTO the input tables (the earliest conditioning anywhere in
   this zoo), alternating column↔row attention within tables → PK-FK graph
   attention + cross-sample attention across context examples; frozen at
   inference, pure ICL; sidesteps quadratic all-cell attention.

Vendor caveat woven in plainly: Kumo's own paper, authors overlap RelBench;
numbers self-reported, roughly three months old.

Widget `label-injection` — **Label-Injection Stepper** (KumoRFM-2):

- A mini database drawn as three table grids (users, orders, items) with
  PK-FK arrows; task banner "will user U churn?".
- Step 1: context users' known labels WRITE INTO the users table as a new
  column (cells flash in) — conditioning before any model runs.
- Step 2: column↔row attention inside each table (row and column highlight
  sweeps within the grid).
- Step 3: PK-FK attention hops across tables (arrows pulse; the query
  user's row gathers from their orders).
- Step 4: cross-sample attention — the query row attends over context rows
  (attention arcs with weights).
- Step 5: prediction pops out; a "weights updated: 0" stat drives the
  frozen-ICL point home.
- Toggle "flatten instead": collapses the query user's neighborhood to one
  wide row feeding a generic tabular FM, with a one-line note on what
  task-conditioned extraction just got lost — the family's internal
  argument, interactive.

Callout: prelims — Attention course module 1 (attention as soft lookup —
"cross-sample attention IS retrieval"), deep dive 2.2 (multi-head); GFM
module 3 (ICL) and module 6 (RelBench, the data story).

Quiz: new `m5-5-q1` (where KumoRFM-2's conditioning enters vs OFA's and
GraphGPT's — earliest-injection contrast), `m5-5-q2` (why flatten-to-row
loses task-dependence), `m5-5-q3` (what "frozen at inference" buys —
foundation-model economics, echoes m6-q3).

Refs: KumoRFM-2, KumoRFM (v1 whitepaper), RelBench, Relational Deep
Learning position paper, Griffin, Relational Transformer.

## Integration

- `zooSubchapters.tsx` new; `content.tsx` module 5 rewritten as above and
  gains `subchapters: ZOO_SUBCHAPTERS`.
- `index.tsx` registers six new widgets: `zoo-map`, `relation-graph`,
  `text-glue`, `channel-ensemble`, `bff-anatomy`, `label-injection` — one
  component file each: `ZooMapLab.tsx`, `RelationGraphLab.tsx`,
  `TextGlueLab.tsx`, `ChannelEnsembleLab.tsx`, `BffAnatomyLab.tsx`,
  `LabelInjectionLab.tsx`.
- `courseCatalog.ts` (GFM entry): `modules` stays 7 (top-level count);
  `minutes` 66 → 101 (module 5: 12→9, subchapters +8+8+7+7+8);
  `highlights` "46 referenced papers" → "12 interactive labs · 5 deep
  dives · N referenced papers" (both counts verified against the shipped
  content at implementation time); `description` gains a deep-dive mention
  (ULTRA, text-as-glue, in-context, GraphBFF, relational FMs).
- Existing GFM labs untouched; existing module ids and `storageKey`
  untouched.

## Testing

- Extend `GfmStudyGuide.test.tsx` mirroring the attention course's
  subchapter coverage: sidebar shows the five indented deep dives;
  navigating to 5.1 renders its title and widget; flat prev/next passes
  through 5 → 5.1 → … → 5.5 → 6; progress % counts 12 flat entries;
  moved quiz ids still recorded through the shared store.
- New widget tests (a `zooLabs.test.tsx`, mirroring
  `subchapterLabs.test.tsx`): Zoo Map pair-selection updates the anatomy
  table and highlights differing rows; Relation-Graph Builder chips add
  relation-graph edges; Wiring Switcher tab flips frozen/trained readouts
  and prediction-locus badge; Channel Ensemble homophily slider crosses the
  attention bars; BFF Anatomy stepper advances through the five stages and
  the param meter shows the TCA share; Label-Injection stepper writes the
  label column at step 1 and shows "weights updated: 0" at step 5.
- Catalog-sync tests: whatever `courseCatalog.test.ts` /
  library-card assertions derive must keep passing with the new minutes /
  highlights (they iterate modules and subchapters since the attention
  work).
- Baseline: 12 pre-existing vitest failures + jsdom localStorage quirk are
  known — compare against baseline before blaming new code.

## Fact-check gate (blocking, before merge)

A dedicated review pass verifies every architectural claim, formula, name,
number, and quiz answer in the new prose against the primary papers —
REQUIRED for the 5.3 and 5.4 material (not covered by the research pass)
and for the Zoo Map's 50 axis cells; the 5.1/5.2/5.5 material checks
against the verification ledger above. Vendor-reported numbers must carry
their flag in the shipped text. The refuted Wang-et-al. sub-split must not
appear.

## Risks

- **Zoo Map cell honesty**: 10 models × 5 axes = 50 short claims in one
  widget — the densest fact surface in the course. Mitigation: the cells
  are a reviewable data table in the component; fact-check gate covers
  them; anything unverifiable gets cut from the card rather than guessed.
- **Widget honesty**: Channel Ensemble runs real closed-form least-squares
  channels on the toy graph (no faked accuracies); Relation-Graph Builder
  computes interaction edges from the drawn KG; steppers animate real
  small-matrix computations where numbers are shown. Same standard as the
  attention labs.
- **KumoRFM-2 recency**: three months old, vendor paper, fast-moving
  subfield — the prose frames its numbers as Kumo-reported and the family
  as "the newest bet", so the text ages gracefully.
- **Concurrent sessions**: stage commits by explicit path; don't touch
  `public/sitemap.xml`; if Playwright verification is needed, use the
  scratchpad-playwright fallback if the browser is held.
