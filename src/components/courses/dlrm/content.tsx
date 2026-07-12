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
]
