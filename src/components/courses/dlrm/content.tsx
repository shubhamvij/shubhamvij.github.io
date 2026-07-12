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
              the same one the {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/learn/attention-mechanisms">Attention course</a> uses for token
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
            took the {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/attention-mechanisms">Attention</a> and{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/graph-foundation-models">Graph Foundation Models</a> courses, this is the third corner:
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
]
