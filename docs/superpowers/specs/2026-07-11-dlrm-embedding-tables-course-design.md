# A course on DLRMs and the embedding-table problem

Date: 2026-07-11
Status: Approved (6-module flat structure and lab lineup approved
interactively; grounded in two fact-checked deep-research passes,
workflows `waf6yteji` + `w2wcfix78`)

## Goal

A third interactive course for the site (alongside Attention and Graph
Foundation Models): a small, expert-level course on **Deep Learning
Recommendation Models and why their embedding tables are the whole
engineering problem**. Six flat modules — no subchapters — each with one
interactive lab, following the exact house pattern (prose → widget →
callout → quiz → refs). Target ~55 min. Cross-links into the Attention
course where the contrast is illuminating (embeddings-as-lookup ↔ its
token-embedding deep dive 2.1; the params-vs-FLOP asymmetry ↔ transformers).

## Audience & voice

Same as the other two courses: a reader who works in ML systems / graph ML
(the site owner's domain). Assume comfort with matrix multiplies, MLPs,
softmax, GPUs, and the attention course's material. Lead with mechanism and
real numbers, vendor-flag the self-reported ones, never hand-wave.

## Non-goals

- No engine changes — the course engine, `CourseModule`/`CourseDefinition`
  types, `CourseShell`, and `course.module.css` are reused as-is. (If a lab
  needs a genuinely new shared CSS class, append it; do not restructure.)
- No subchapters (the engine supports them; this course doesn't use them).
- Not a recommender-systems-from-scratch course — no collaborative
  filtering history, no ranking-metrics deep dive, no training-loop
  tutorial. The lens is specifically **the embedding table**: why it
  exists, why it dominates, how it's distributed, how it's shrunk, and
  whether it survives the generative turn.
- No changes to the Attention or GFM courses beyond (optionally) a
  reciprocal "see also" link if it falls out naturally — decide at
  implementation time, don't force it.
- No sitemap hand-edits (`public/sitemap.xml` is generated and dirty from a
  concurrent session; the build regenerates it).

## Research grounding (two verified passes, 2026-07-11)

Pass 1 (`waf6yteji`, 107 agents) verified DLRM architecture, the
parameter-vs-FLOP asymmetry, and production scale. Pass 2 (`w2wcfix78`, 106
agents) verified the compression taxonomy against primary papers. The
**verification ledger** below is authoritative for course facts; anything
not in it must be independently fact-checked at implementation time (a
blocking gate, as in the GFM course) or cut.

### Verification ledger — CONFIRMED (teach as stated)

**Architecture (DLRM, Naumov et al. 2019, arXiv 1906.00091 + official
repo):**
- Two input paths: dense continuous features → **bottom MLP**; each
  categorical feature is a list of sparse indices into its **own per-feature
  embedding table**. Second-order interactions = explicit **dot products
  between all pairs** of embedding vectors + processed dense features,
  concatenated with the dense vector, through a **top MLP** → sigmoid → CTR.
- Embedding lookup IS a one-hot × matrix: `wᵢᵀ = eᵢᵀW` (§2.1.1, verbatim
  "each embedding lookup may be interpreted as using a one-hot vector eᵢ…
  to obtain the corresponding row"). Multi-hot = pooled (EmbeddingBag);
  mini-batch = sparse-matrix product `S = AᵀW`.
- DO NOT claim the repo exposes Sum/Dot/Cat as three switchable interaction
  ops (REFUTED — verify against actual code before any such statement).

**The asymmetry (central concept; 1906.00091 + ISCA 2022, arXiv 2104.05158):**
- Embeddings hold the **majority-to-~98%+ of parameters** and multiple GB
  each; MLPs are small in memory but hold nearly all the FLOPs. Verbatim:
  embeddings "contribute the majority of the parameters… each requiring in
  excess of multiple GBs"; MLP params "translate into sizeable amounts of
  compute".
- Three production models spanned **332B–12T parameters at only 5–638
  MFLOPS/sample** (Table 3: model-A 793B@638, model-I 332B@60, model-F
  12T@5). The 12T model runs at 5 MFLOPS/sample. DLRMs were Meta's single
  largest AI application by infra demand (as of ~2022).
- Fleet share (2019): recommendation ≈ **>72% of Facebook AI inference
  cycles** (RM1 >30%, RM2 >25%); companion papers up to ~79%.

**Scale & systems (1906.03109 RecNMP, 2104.05158, 2108.xxxx Neo/ZionEX):**
- 2019 inference models (RM1/RM2): **8–64 tables of ~1M rows**, pooling
  20–80, tens–hundreds of GB, needing 100GB+ (DRAM, not HBM/SRAM,
  economically).
- Serving is **memory-bandwidth-bound**: SLS gather-reduce ops =
  **37.2–73.5%** of inference time, within **35.1%** of the memory roofline;
  parallel SLS saturates >67% of 76.8 GB/s DDR4-2400 at batch 256. (2019
  CPU-serving era — time-scope it.)
- Locality: **temporal yes, spatial no** — 8–64 MB LRU cache gives **20–60%**
  hit rate vs **<5%** random; hit rate FALLS as cacheline grows 64B→512B;
  rows are 64B–256B.
- **Hybrid parallelism** is DLRM-native: embeddings model-parallel sharded,
  MLPs data-parallel replicated; embedding outputs exchanged via
  personalized **all-to-all**, MLP grads via allreduce. Neo/ZionEX trained
  up to **12T params at ~1.7M QPS on 128 A100s (16 nodes)**, 40× over the
  prior CPU parameter-server platform. ZionEX node: 8×A100 (320 GB HBM @
  12.4 TB/s) + 1.5 TB DDR @ 320 GB/s.
- At **1K GPUs the all-to-all (>600ms) exceeds 3× the embedding compute
  (100–200ms)** on a ~2TB, 4000+-table foundation model (single Aug-2025
  Meta preprint — vendor/single-source; the phenomenon is multi-source, the
  exact number isn't).

**The pivot (Wukong ICML 2024, arXiv 2403.02545; MLPerf DLRMv3):**
- "Sparse scaling" (grow tables to trillions) vs "dense scaling" (grow
  compute) — Wukong's own framing. Wukong = embedding layer + **Interaction
  Stack** of identical layers, each a Factorization-Machine Block + Linear
  Compress Block with residual+LayerNorm; layer *i* captures interaction
  orders **1…2^i** (binary exponentiation) vs DLRM's fixed pairwise.
- Wukong holds an **LLM-style scaling law** past 100 GFLOP/example on 146B
  examples/720 features, ~0.2% LogLoss over baselines; **627B of its 637B
  params are embeddings**. (Self-reported, peer-reviewed, not independently
  replicated — attribute.)
- MLPerf Inference **DLRMv3** (announced 2026-02-10, shipped v6.0
  2026-04-01) replaces the interaction core with a **5-layer HSTU
  generative/sequential** model — but **keeps a 1B-row embedding table**.
  The "displacement" is of the benchmark reference workload (2-1 vote;
  MLCommons frames it as continuity) — the table persists.

**Compression taxonomy (pass 2 — the 4 buckets + eliminate):**

*(A) Share rows cleverly:*
- **Hashing trick** (Weinberger et al., ICML 2009, arXiv 0902.2206): map
  sparse input into fixed ℝ^m via a hash, storage **O(d)→O(m)**, preserves
  sparsity, no projection-matrix overhead. (The signed-hash unbiasedness
  theory and the spam-dataset numbers did NOT verify — teach the mechanism,
  not the theory/empirics.)
- **Quotient-Remainder / compositional** (Shi et al., KDD 2020, arXiv
  1909.02107): two small tables indexed by **remainder j = i mod m** and
  **quotient k = i ÷ m**, rows combined **element-wise**, every category
  still unique. Memory **O(|S|/m·D + m·D)**; k complementary partitions →
  **O(k·|S|^(1/k)·D)**. On Criteo Kaggle (BCE): ~4× (≤4 collisions) within
  **0.3% (DCN) / 0.7% (DLRM)** of baseline; ~15× smaller at 60 collisions
  near-parity.
- **ROBE** (Desai et al., MLSys 2022, arXiv 2108.02191): ALL tables → one
  shared **circular array**; embeddings split into blocks located by
  universal hashes. On CriteoTB MLPerf, **100 MB array vs 100 GB reference
  = ~1000×**, ~3.1× faster inference, meeting the ≥0.8025 AUC target
  (needs ~1.89 epochs vs ~1 — a training-cost caveat). DO NOT claim it
  matches/beats baseline AUC across 6 Kaggle models (REFUTED).

*(B) Factorize the table:*
- **TT-Rec** (Yin et al., MLSys 2021, arXiv 2101.11714): tensor-train
  decomposition — factor M=∏mₖ, N=∏nₖ, store **d=3 4-D TT-cores** of shape
  (R_{k-1}, mₖ, nₖ, Rₖ), lookup = product of core slices, storage
  **O(MN)→O(d·R²·max(m,n)²)**, ranks {8,16,32,64}. Criteo Kaggle **4–221×**
  at 0.03–0.3% accuracy loss; Criteo Terabyte **112× (12.57 GB→0.11 GB)
  with NO loss** (even beats baseline). Cost: **+13.9%** avg training time.
  (Metric = test accuracy / BCE, NOT AUC.)

*(C) Shrink each row:*
- **Row-wise quantization** (Guan et al. 2019 arXiv 1911.02079; Deng et al.
  2021 arXiv 2105.12676, Meta): low-precision rows with **one (scale, bias)
  pair per row** stored adjacent; Meta uses an FP bias (=Xmin) not an int
  zero-point to cut dequant compute. 4-bit greedy-uniform + codebook/k-means
  variants. On Terabyte Criteo (log loss): greedy → **13.3–25% of FP32
  (~7.5×)** negligible loss; k-means → **18.5–37.5% with NO loss**; a
  deployed FB model → **13.89% (~7.2×)** quality-neutral. Pure 4-bit = 8×;
  the extra bytes are the per-row scale+bias.

*(D) Manage lifecycle & tiers:*
- **FIITED** (arXiv 2401.04408, medium confidence, 2-1 vote): in-training
  per-dimension pruning by frequency/importance, up to **93.75–99.75%**
  pruned without significant loss (Criteo Kaggle 99%, Avazu 95%, CriteoTB
  99.75%, ML-20M 81.25%). NOTE: this is a stand-in — **Monolith's**
  collisionless cuckoo hashmap + expirable/frequency-admitted embeddings did
  NOT verify and must be independently checked before teaching.

*(Eliminate the table):*
- **DHE** (Kang et al., KDD 2021, arXiv 2010.10784): **table-free** —
  deterministic storage-free multi-hash encoder → dense identifier vector →
  **trainable MLP decoder** computes the embedding on the fly; parameter
  count **independent of vocabulary size** (all params in the fixed decoder,
  O(n·d)→decoder-only). Trade-off is **modest**: ~**4×** at AUC parity on
  MovieLens-20M / Amazon Books — far below TT-Rec/ROBE. DO NOT cite k=1024 /
  m=10⁶ (REFUTED hyperparams) — cite the mechanism.

**APPLES-TO-ORANGES WARNING (must appear in Module 5 prose):** every
headline ratio is self-reported on a **different benchmark/metric** (DHE ~4×
on ML/Amazon AUC; ROBE 1000× on CriteoTB AUC; TT-Rec 112× on Terabyte
accuracy; Q-R 4–15× on Kaggle BCE; quant ~7–8× on Terabyte log loss). The
course must NOT rank them head-to-head as if measured under one protocol —
present each as "its paper reports X on its benchmark."

### NOT verified — cut, attribute, or fact-check at implementation

Mixed/adaptive-dimension embeddings (Ginart 2021); row-wise Adagrad
optimizer-state memory math; caching/tiering systems (HugeCTR HPS, UGache
SOSP'23, Bandana SSD); semantic IDs / RQ-VAE (TIGER, NeurIPS'23); MTIA
v1/v2 hardware; DCN-v2 cross-layer mechanics; Monolith production specifics.
Where the arc needs one of these (e.g., Module 3 wants a hardware line,
Module 5 wants a lifecycle example beyond FIITED), a targeted third
fact-check runs during implementation; if it doesn't land, the point is cut
or stated as "reported by X, not independently verified here."

### Refuted — must NOT appear

"Meta's largest 2025 DLRM = 3.2T params / >5TB / >98%" (use 12T/ZionEX and
627B-of-637B Wukong instead); "multi-TB models vs 32–80GB GPUs" as phrased;
DLRM repo exposing Sum/Dot/Cat switchable ops; ROBE beating baseline AUC on
6 Kaggle models; DHE k=1024/m=10⁶.

## Course structure — six flat modules

Course id `dlrm-embedding-tables`, storageKey
`dlrm-course-progress-v1`, title "Recommenders at Scale" (working;
finalize in the plan), tagline "Why a recommendation model is mostly a
giant lookup table — and what that costs". Files under
`src/components/courses/dlrm/`.

### Module 1 — Why embedding tables (~7 min) — `why-tables`

Prose: the recommendation problem (predict click/engagement from user +
item + context features); dense vs **categorical** features; why a
categorical value (user id 4.2B-cardinality, item id, ad id) can't be a
scalar and one-hot × learned matrix = a **row lookup** (`wᵢᵀ = eᵢᵀW`); the
DLRM anatomy (bottom MLP, per-feature tables, pairwise dot interactions,
top MLP → CTR). Callout: the table is where every categorical feature
"lives"; multi-hot pooling in one line. Cross-link: embeddings as lookup ↔
Attention course deep dive 2.1 (token embeddings are the same trick over a
50K vocab; here the vocab is billions).

Lab `lookup` — **Lookup Lab**: pick a categorical value from a small
vocab (e.g., movie genres or a tiny user set); show the one-hot vector, the
V×d matrix, and the multiply collapsing to a single highlighted row; a
"multi-hot" toggle sums two rows (pooling). Real arithmetic on a small W.
Stat: "params in this toy table: V×d"; extrapolation note to billions.

### Module 2 — The asymmetry (~9 min) — `asymmetry`

Prose: the defining property — params ≠ FLOPs. Embeddings = lookups (O(1)
gather, huge memory); MLPs = matmuls (small memory, the compute). Real
production points (332B–12T params @ 5–638 MFLOPS/sample); contrast with a
transformer where params and FLOPs scale together. Why this inverts every
assumption from the attention course (there, bigger model = more compute;
here, bigger model = more memory, ~same compute). Fleet-share motivation
(>72% of inference cycles). Callout: "attention communicates and computes;
a DLRM mostly *remembers*."

Lab `param-flop` — **Params vs FLOPs**: log-log scatter of real models
(DLRM 332B/793B/12T at their MFLOPS; a couple of transformers for
contrast), plus sliders for #tables / rows / dim / MLP width that move a
"your model" point — params balloon along one axis while FLOPs barely move.
Honest formulas (embedding params = Σ rows×dim; MLP FLOPs from widths).

### Module 3 — How big it gets (~10 min) — `scale`

Prose: table geometry (rows × dim × bytes × #tables → GB/TB); the memory
hierarchy (HBM fast/small, DRAM big/slower, SSD huge/slowest) and which
tier a table lands in; the **bandwidth roofline** (serving is
memory-bound, SLS = 37–74% of latency); **locality** (temporal yes,
spatial no — the falling-hit-rate-vs-cacheline curve). Callout: why you
can't just buy a bigger GPU (capacity AND bandwidth, not FLOPs).

Lab `table-sizer` — **Table Sizer & Roofline**: sliders (rows, dim,
bytes/elt, #tables) → total GB, with HBM / DRAM / SSD tier thresholds
lighting up as you cross them; a second view: cache-size vs hit-rate curve
(8–64 MB → 20–60% vs <5% random) and the counterintuitive
hit-rate-drops-as-cacheline-grows plot. Real numbers from the ledger.

### Module 4 — Distributing the table (~9 min) — `distribute`

Prose: no single device holds the table, so **hybrid parallelism** —
embeddings model-parallel sharded across GPUs, MLP data-parallel
replicated; the forward pass needs a personalized **all-to-all** to route
each sample's rows to the GPU doing its MLP; MLP grads use allreduce. The
scaling wall: at 1K GPUs the all-to-all (>600ms) dwarfs embedding compute
(>3×); the newest fix re-adds data parallelism on top (4D/2D-sparse
sharding). Callout: communication, not compute, is the DLRM training wall —
mirror of the attention course's KV-cache/memory-movement lesson.

Lab `shard-shuffle` — **Shard & Shuffle**: a few GPUs each holding a slice
of the tables; pick a batch, watch each sample's needed rows get routed via
all-to-all to its MLP GPU (animated), MLP replicated everywhere; a
GPU-count slider grows the all-to-all bar past the compute bar at scale.
Deterministic animation, honest latency-vs-N curve shape.

### Module 5 — Shrinking the table (~11 min) — `shrink`

The heart. Prose: five ways to fit an N-row table in less memory, grouped —
**(A) share rows** (hashing → collisions; **Q-R** two-table
quotient/remainder combine; **ROBE** one circular block-hashed array,
~1000× on CriteoTB); **(B) factorize** (**TT-Rec** tensor-train cores, 112×
on Terabyte with no loss); **(C) shrink each row** (int8/int4 **row-wise
quantization**, ~7–8×, one scale+bias per row); **(D) manage lifecycle**
(frequency/importance **pruning**); and the outlier — **(E) eliminate the
table** (**DHE**: hashes + an MLP decoder draw the embedding on demand,
params independent of vocab, but only ~4×). The **apples-to-oranges**
paragraph is mandatory. Callout: the universal trade — memory vs collisions
vs accuracy vs compute; there's no free lunch, only which axis you spend.

Lab `qr-collide` — **Collision Explorer** (the star): an ID space mapping
into rows. Toggle **modulo hashing** (IDs collide into m buckets — show
which IDs now share a vector, and the memory saved) vs **Q-R** (two small
tables, remainder + quotient, element-wise combined → every ID unique
again at √-ish memory). A single **m slider** drives both the memory
readout (O(N·d) → O(N/m·d + m·d)) and a collision count; a small honest
"accuracy proxy" note (collisions degrade, Q-R recovers uniqueness) tied to
the verified Criteo deltas, labeled as the paper's reported numbers.
Optional second tab: **row quantization** bit-width slider (fp32→int8→int4)
moving bytes/row and a reported-log-loss chip together. (Q-R and
quantization are the two best single-knob labs per the research; ROBE/TT-Rec
get diagrams in prose, not their own labs, to keep the course small.)

### Module 6 — Does the table survive? (~9 min) — `pivot`

Prose: the 2024–26 turn. Wukong's **dense scaling** (interaction orders
1→2^i per layer, an LLM-style scaling law, but still 627B/637B params in
embeddings); generative recommenders (**HSTU**) and MLPerf's **DLRMv3**
adopting a generative core — yet DLRMv3 **keeps a 1B-row table**. The
honest conclusion: the interaction/architecture is being reinvented, but
the embedding table (the categorical-feature vocabulary) persists; the
problem this course is about doesn't go away, it moves. Callout: capstone —
tie back to modules 1–5. Cross-link both companion courses (attention =
the compute-scaling world; GFM = the other place categorical/relational
features meet foundation models).

Lab `interaction-orders` — **Interaction Orders**: DLRM's fixed pairwise
(order-2) dot interactions vs Wukong's stacked layers reaching order 2^i;
a "layers" slider shows the reachable interaction order growing
exponentially, with a params-vs-compute readout illustrating the sparse→
dense-scaling pivot. Honest combinatorics (orders reachable), scaling-law
curve shape attributed to Wukong.

## Catalog, art, registration

- New entry in `src/lib/courseCatalog.ts` (`dlrm-embedding-tables`): title,
  subtitle, description (mention the arc + embedding-table lens), modules
  6, minutes (sum of the six), highlights "6 interactive labs · N
  referenced sources" (N counted from shipped refs).
- New `COURSE_ART` SVG in `src/components/learn/courses.tsx` (a
  table/grid-with-lookup-row motif, matching the hand-drawn style of the
  other two) and register `dlrmCourse` in `COURSE_DEFINITIONS`.
- `src/components/courses/dlrm/index.tsx` exports `dlrmCourse:
  CourseDefinition` with the six widgets registered; `content.tsx` holds
  `MODULES`; one component file per lab (`LookupLab`, `ParamFlopLab`,
  `TableSizerLab`, `ShardShuffleLab`, `CollisionLab`, `InteractionOrdersLab`).
- The catalog sync test (`courseCatalog.test.ts`) already iterates all
  courses — the new course must satisfy widget-registration, minutes-sum,
  and globally-unique-quiz-id checks. Quiz ids namespaced `d1-q*`…`d6-q*`.

## Widget-honesty rules (same as prior courses)

Every lab computes real numbers in plain JS/SVG/HTML: real one-hot×W in
Lookup; real Σrows×dim params and MLP FLOP formulas in Params-vs-FLOPs;
real GB math and the real memory formulas O(N·d)/O(N/m·d+m·d) in the sizers
and Collision Explorer; real modulo + quotient/remainder index math (an ID
genuinely collides or resolves). No `Math.random()`/`Date.now()`
(deterministic renders). Reported accuracy numbers are shown as
paper-reported chips, never as if computed live.

## Testing

- Per-lab tests (a `dlrmLabs.test.tsx` mirroring `subchapterLabs`/`zooLabs`):
  each lab's core interaction asserts real computed output (Lookup selects
  the right row; Params-vs-FLOPs point moves on the right axis; Table Sizer
  crosses a tier threshold at the right GB; Collision Explorer: an ID pair
  that collides under modulo resolves under Q-R; the m-slider moves the
  memory readout by the real formula; Interaction Orders reaches 2^layers).
- A `DlrmStudyGuide.test.tsx` mirroring the GFM course test: renders through
  `CourseShell`, sidebar lists all six modules, navigation renders a
  module's widget, progress %/persistence work.
- Catalog-sync test passes with the new course (minutes, widgets, unique
  quiz ids).
- Baseline: the 12 pre-existing vitest failures are known — compare against
  baseline, not zero.

## Fact-check gate (blocking, before merge)

A dedicated pass verifies every architectural claim, number, formula, name,
and quiz answer against the ledger and primary papers — REQUIRED for any
Module 5 number restated in prose/labs, the Module 2/3 production figures,
and any of the NOT-verified topics that survived into the text. The
apples-to-oranges caveat must be present. Refuted claims must be absent.
Vendor-reported numbers (Wukong, Neo/ZionEX QPS, the 600ms all-to-all, all
Module-5 compression ratios) must carry their attribution in the shipped
copy.

## Risks

- **Module 5 numeric density** — many self-reported ratios on different
  benchmarks. Mitigation: the mandatory apples-to-oranges paragraph, chips
  labeled with each paper's benchmark, and the fact-check gate.
- **Systems facts age fast** — RecNMP is 2019 CPU-era, the 600ms figure is a
  single 2025 preprint. Mitigation: time-scope each in prose ("as of 2019
  CPU serving…", "a 2025 Meta preprint reports…").
- **Non-Meta thinness** — the verified base is Meta-heavy. Mitigation: keep
  claims to what's verified; don't manufacture Google/Alibaba/ByteDance
  specifics the research couldn't anchor (DCN-v2, Monolith stay as named
  pointers unless a third pass verifies them).
- **Concurrent sessions** — stage by explicit path; don't touch
  `public/sitemap.xml`; scratchpad-Playwright fallback if the browser is
  held.
