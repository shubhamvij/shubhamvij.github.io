import { ReactNode } from 'react'
import type { CourseModule } from '../engine/types'

function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export const ZOO_SUBCHAPTERS: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'zoo-ultra',
    navLabel: '5.1 ULTRA: relations',
    title: 'A vocabulary of relations — ULTRA',
    subtitle: 'Represent a relation by how it interacts with other relations, and transfer follows',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Knowledge-graph reasoning is link prediction: given a query (head, relation, ?), rank the tails.
              The classic recipe learns an <strong>embedding per relation</strong> — and that is exactly what
              kills transfer. A new KG arrives with relations your table has never seen (&quot;composed_by&quot;,
              &quot;side_effect_of&quot;), and a model whose parameters are keyed to relation identities has
              nothing to say. Relation embeddings are a vocabulary — a <em>closed</em> one.
            </p>
            <p>
              <A href="https://arxiv.org/abs/2310.04562">ULTRA</A>&apos;s move: stop asking <em>what a relation
              is</em> and represent <em>how it interacts with other relations</em>. Any two relations can meet in
              exactly four ways, by sharing entities in their head or tail slots: <strong>head-to-head</strong>{' '}
              (some entity heads both), <strong>tail-to-tail</strong>, <strong>head-to-tail</strong>, and{' '}
              <strong>tail-to-head</strong>. Scan the KG once and you get a <strong>graph of relations</strong>:
              relations as nodes, the four interaction types as edges. It is <em>computed from</em> the data —
              never learned, never tied to names. Build it yourself:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'relation-graph' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Two GNNs then run in sequence, and neither owns a relation vocabulary. The first message-passes
              over the <em>relation graph</em> to produce a representation for every relation —{' '}
              <strong>conditioned on the query relation</strong> (it is initialized as the distinguished node).
              The second is a modified <A href="https://arxiv.org/abs/2106.06935">NBFNet</A> over the{' '}
              <em>entity graph</em>: <strong>conditional message passing</strong> that learns pairwise
              representations conditioned on the head entity and query relation — the head is marked before
              propagation (the <strong>labeling trick</strong> you stepped through above), so the same graph
              answers differently for different queries. The result is{' '}
              <strong>double permutation-equivariance</strong>: rename every entity <em>and every relation</em>{' '}
              and the predictions rename with them. Nothing to re-learn on a new KG — which is how one
              pretrained ULTRA does zero-shot link prediction on 57 KGs, often beating models trained on each.
            </p>
            <p>
              What transfers: both GNNs&apos; weights. What is recomputed per graph: the relation graph itself.
              That split — <em>shared machinery, per-graph vocabulary construction</em> — is the cleanest
              existing answer to module 4&apos;s vocabulary question, and it works because ULTRA stays inside one
              domain where structure alone carries the signal.
            </p>
            <p>
              The other domain with a ready-made vocabulary is chemistry — with a twist worth being precise
              about. Models like <A href="https://arxiv.org/abs/2310.16802">JMP</A> (pretrained on ~120M
              DFT-labeled structures), <A href="https://arxiv.org/abs/2401.00096">MACE-MP-0</A>, and Meta&apos;s{' '}
              <A href="https://arxiv.org/abs/2506.23971">UMA</A> tokenize <strong>atoms — an element plus a 3D
              position</strong> — with neighborhoods defined by a distance cutoff, not bonds. And transfer
              across chemistry is <em>engineered</em>, not free: JMP pretrains multi-task with a separate output
              head per source dataset; UMA conditions on charge, spin, and the DFT task at the input and routes
              a mixture of linear experts with them. The periodic table gives you tokens; the labels still
              disagree across datasets, and the architecture has to absorb that.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🧩',
        title: 'Why this transfers when nothing else in the zoo quite does',
        body: (
          <>
            ULTRA&apos;s parameters never mention a relation by name — they operate on interaction{' '}
            <em>patterns</em> that exist in every KG. When the test graph is genuinely new, the model&apos;s
            first act is to rebuild its vocabulary from scratch, on the spot. Prelim if you skipped it: message
            passing and receptive fields are module 2 of this course.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-q1',
            prompt: 'ULTRA transfers to knowledge graphs with completely unseen relation types. What makes that possible?',
            options: [
              { text: 'It represents relations by their interaction structure (shared heads/tails) instead of learned per-relation embeddings', correct: true, explain: 'No vocabulary-tied parameters exist, so nothing needs re-learning on a new KG — the "graph of relations" is computable for any KG.' },
              { text: 'It\'s trained on every public knowledge graph', explain: 'It\'s pretrained on only 3 KGs (more in later variants) — coverage isn\'t the trick; representation invariance is.' },
              { text: 'It converts relations to text and embeds them with an LLM', explain: 'That\'s the deep-dive-5.2 approach. ULTRA never looks at names — it\'s deliberately text-free.' },
            ],
          },
          {
            id: 'm5-1-q1',
            prompt: 'In a KG with edges (Ada, authored, P1) and (P1, cites, P2), which interaction edge appears in the graph of relations?',
            options: [
              { text: 'authored —t2h→ cites: P1 is the tail of an authored edge and the head of a cites edge', correct: true, explain: 'P1 sits in authored\'s tail slot and cites\' head slot — a tail-to-head meeting. The four interaction types are exactly these slot-sharing patterns.' },
              { text: 'authored —h2h→ cites: they share Ada as a head', explain: 'Ada heads authored, but Ada heads no cites edge here — h2h needs one entity heading BOTH relations.' },
              { text: 'No edge — the relations never co-occur on one triple', explain: 'Interaction edges come from sharing an entity across two edges\' slots, not from appearing in the same triple.' },
            ],
          },
          {
            id: 'm5-1-q2',
            prompt: 'You hand a pretrained ULTRA a brand-new knowledge graph. What happens before it can answer queries?',
            options: [
              { text: 'It recomputes the graph of relations from the new KG; the two GNNs\' weights are reused as-is', correct: true, explain: 'Shared machinery, per-graph vocabulary construction: the relation graph is data, not parameters.' },
              { text: 'It fine-tunes new relation embeddings for the unseen relations', explain: 'There are no relation embeddings anywhere in ULTRA — that\'s the whole point.' },
              { text: 'It maps new relation names onto its training relations by string similarity', explain: 'ULTRA never reads names — only interaction structure.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Towards Foundation Models for Knowledge Graph Reasoning (ULTRA) — Galkin et al. (ICLR 2024)', href: 'https://arxiv.org/abs/2310.04562' },
          { label: 'Neural Bellman-Ford Networks (NBFNet) — Zhu et al. (NeurIPS 2021)', href: 'https://arxiv.org/abs/2106.06935', note: 'the conditional message passing ULTRA builds on' },
          { label: 'ULTRA explained by its author — Galkin (blog, 2023)', href: 'https://towardsdatascience.com/ultra-foundation-models-for-knowledge-graph-reasoning-9f8f4a0d7f09/' },
          { label: 'From Molecules to Materials (JMP) — Shoghi et al. (ICLR 2024)', href: 'https://arxiv.org/abs/2310.16802', note: '~120M structures, per-dataset heads' },
          { label: 'UMA: A Family of Universal Models for Atoms — Meta FAIR (2025)', href: 'https://arxiv.org/abs/2506.23971', note: 'task/charge/spin conditioning + mixture of linear experts' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zoo-text-glue',
    navLabel: '5.2 Text as glue',
    title: 'Text as glue: four ways to wire an LLM to a graph',
    subtitle: 'One bet, four machines — who predicts, and what actually trains?',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The bet: if nodes and edges have names and descriptions, write everything out in English and let a
              language model&apos;s embedding space BE the shared feature space. Feature heterogeneity — module
              4&apos;s first axis — dissolves by construction: a citation-network node and a molecule caption land
              in the same vector space because the same encoder read both.
            </p>
            <p>
              But &quot;use text&quot; is a vocabulary decision, not an architecture. The four landmark systems
              that share this bet are four genuinely different machines, and the differences are exactly the axes
              on the Zoo Map: <strong>who predicts</strong>, <strong>whether a graph encoder exists</strong>, and{' '}
              <strong>what actually trains</strong>. Switch between them:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'text-glue' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              <strong><A href="https://arxiv.org/abs/2310.00149">One-for-All</A> — GNN predicts.</strong> A{' '}
              <em>frozen</em> LM (they evaluate sentence transformers, e5, Llama2-7b/13b) embeds every node and
              edge description; a <em>trained</em> edge-type-aware GNN does the reasoning. The elegant part is
              the task interface: OFA appends a <strong>prompt node</strong> (carrying the task description) and
              one <strong>class node</strong> per label to the input graph itself, then reads out
              P[node-of-interest ∈ class i] = σ(MLP(h_class_i)). Node classification, link prediction, and graph
              classification all become the same operation — conditioning by graph surgery, not by prompt text.
            </p>
            <p>
              <strong><A href="https://arxiv.org/abs/2310.13023">GraphGPT</A> — LLM predicts, projector
              trains.</strong> A pre-aligned graph encoder (frozen) produces node embeddings; a projector —{' '}
              <em>as simple as one linear layer, and the only thing instruction tuning updates</em> — maps them
              into the LLM&apos;s token space; the frozen LLM reads {'{<graph_begin>, <graph_token>_1..n, <graph_end>}'}{' '}
              spliced into the instruction where a <code>&lt;graph&gt;</code> placeholder sat, and generates the
              answer. Training is staged: contrastive text–graph grounding first, then two rounds of instruction
              tuning (self-supervised graph matching, then task tuning).
            </p>
            <p>
              <strong><A href="https://arxiv.org/abs/2402.08170">LLaGA</A> — LLM predicts, no graph encoder at
              all.</strong> LLaGA&apos;s bet-within-the-bet: you don&apos;t need a graph network. Two{' '}
              <em>parameter-free templates</em> turn a node&apos;s neighborhood into a token sequence — a
              fixed-shape sampled tree flattened level by level (plus Laplacian position embeddings), or one
              mean-pooled embedding per hop. Frozen text encoder, frozen Vicuna, one trained MLP projector.
              Structure survives as <em>token order</em>.
            </p>
            <p>
              <strong><A href="https://arxiv.org/abs/2402.13630">UniGraph</A> — train the thing end to
              end.</strong> The contrarian corner: a DeBERTa→GAT cascade trained <em>jointly</em> with masked
              graph modeling on text-attributed graphs (a Llama enters only later, LoRA-tuned, for instruction
              following). Where OFA freezes the LM and GraphGPT/LLaGA freeze nearly everything, UniGraph pays
              full pretraining cost to make the text encoder graph-aware.
            </p>
            <p>
              The survey vocabulary for the first split is worth knowing:{' '}
              <A href="https://arxiv.org/abs/2310.11829">Liu et al.</A> call these{' '}
              <strong>GNN-centric</strong> (OFA), <strong>LLM-centric</strong> (GraphGPT, and LLaGA&apos;s
              encoder-free variant of it), and <strong>symmetric</strong> (aligned dual encoders — GLEM, PATTON)
              methods. And the family&apos;s shared ceiling stands regardless of wiring: no meaningful node text,
              no vocabulary. A payment network or a sensor mesh gets nothing from this bet.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '📎',
        title: 'Prelims from the Attention course',
        body: (
          <>
            The right half of every wiring above is a transformer. If token embeddings, tied embeddings, or why
            a &quot;projector into token space&quot; is even possible are fuzzy, take the{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/attention-mechanisms">Attention course</a> — module 2 (the transformer block) and
            deep dive 2.1 (embeddings &amp; positions) are the exact prerequisites for this page.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-q2',
            prompt: 'What\'s the main limitation of the "make everything text" strategy (OFA, GraphGPT, LLaGA)?',
            options: [
              { text: 'Text embeddings are too small', explain: 'Dimensionality isn\'t the issue — alignment is achieved. The issue is which graphs get to play at all.' },
              { text: 'It only applies to graphs whose nodes/edges have meaningful text descriptions', correct: true, explain: 'Citation networks and product graphs qualify; payment networks, sensor meshes, and most enterprise graphs don\'t. The vocabulary is borrowed, so only text-shaped data can use it.' },
              { text: 'LLMs cannot process graph structure at all', explain: 'Too strong — with alignment projectors and structure-aware templates they can, to a degree. The binding constraint is the text requirement.' },
            ],
          },
          {
            id: 'm5-2-q1',
            prompt: 'Which wiring trains NEITHER a graph encoder NOR the LLM?',
            options: [
              { text: 'LLaGA — parameter-free templates feed a small trained projector; text encoder and LLM stay frozen', correct: true, explain: 'The templates have zero parameters by design; the MLP projector is the only trained component in the whole stack.' },
              { text: 'UniGraph — it\'s fully frozen', explain: 'The opposite: UniGraph trains its LM→GNN cascade end to end.' },
              { text: 'One-for-All — everything is frozen', explain: 'OFA\'s GNN (and class-node MLP) train — only the LM featurizer is frozen.' },
            ],
          },
          {
            id: 'm5-2-q2',
            prompt: 'How does a task reach One-for-All at inference time?',
            options: [
              { text: 'As graph structure: a prompt node and class nodes, with their own text features, are appended to the input graph', correct: true, explain: 'Conditioning by graph surgery — the GNN then treats "which class node lights up" as the readout. No LLM instruction, no learned prompt vectors.' },
              { text: 'As an instruction string prepended to the LLM prompt', explain: 'That\'s the GraphGPT/LLaGA style. OFA\'s LM only ever featurizes descriptions; it never sees an instruction.' },
              { text: 'By fine-tuning a per-task head', explain: 'The class-node design exists precisely to avoid per-task heads — any number of classes, same machinery.' },
            ],
          },
          {
            id: 'm5-2-q3',
            prompt: 'UniGraph trains its LM and GNN jointly, where OFA freezes the LM. What does the joint cascade buy?',
            options: [
              { text: 'The text encoder itself becomes graph-aware — its embeddings are shaped by message passing during pretraining, not just consumed by it', correct: true, explain: 'Masked graph modeling backpropagates through DeBERTa via the GAT, so the LM learns representations that anticipate propagation. The price: full pretraining compute.' },
              { text: 'It removes the need for text attributes', explain: 'No — UniGraph is emphatically a text-as-glue model; it even textualizes molecules.' },
              { text: 'It makes inference cheaper than OFA\'s', explain: 'Inference cost is comparable; the difference is where representation quality comes from.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'One for All: Towards Training One Graph Model for All Classification Tasks — Liu et al. (ICLR 2024)', href: 'https://arxiv.org/abs/2310.00149' },
          { label: 'GraphGPT: Graph Instruction Tuning for LLMs — Tang et al. (SIGIR 2024)', href: 'https://arxiv.org/abs/2310.13023' },
          { label: 'LLaGA: Large Language and Graph Assistant — Chen et al. (ICML 2024)', href: 'https://arxiv.org/abs/2402.08170' },
          { label: 'UniGraph: Learning a Unified Cross-Domain Foundation Model for TAGs — He & Hooi (KDD 2025)', href: 'https://arxiv.org/abs/2402.13630' },
          { label: 'Graph Foundation Models: Concepts, Opportunities and Challenges — Liu et al. (TPAMI 2025)', href: 'https://arxiv.org/abs/2310.11829', note: 'source of the GNN-centric / symmetric / LLM-centric split' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zoo-in-context',
    navLabel: '5.3 Structure + in-context',
    title: 'No features, no problem — structure + in-context learning',
    subtitle: 'GraphAny\'s five filters, PRODIGY\'s prompt graphs, and the PFN line',
    minutes: 7,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The third bet abandons feature identity entirely. Whatever a graph&apos;s columns mean, some
              quantities always exist: the adjacency structure, and — at prediction time — a handful of{' '}
              <em>labeled examples</em>. Build the model out of those and no schema can surprise you.
            </p>
            <p>
              <strong><A href="https://arxiv.org/abs/2405.20445">GraphAny</A></strong> is the purest version.
              It runs <strong>five LinearGNN channels</strong> — X, ĀX, Ā²X, (I−Ā)X, (I−Ā)²X over the
              row-normalized adjacency: identity, low-pass, and high-pass spectral filters — and solves each one{' '}
              <em>in closed form</em> on the target graph&apos;s own labeled nodes (least squares via the
              pseudo-inverse, W* = F<sub>L</sub><sup>+</sup>Y<sub>L</sub>: &quot;requires no training&quot;).
              The <em>only learned component</em> is an MLP that assigns attention over the five channels — and
              it never sees your features. It sees the t(t−1) <strong>entropy-normalized pairwise distances
              between the channels&apos; predictions</strong>: permutation-invariant by construction, and
              independent of the feature dimension d and label count c. Trained once on a single graph — 120
              labeled nodes of Wisconsin — it generalizes to 30 unseen graphs at 67.26% average accuracy,
              beating transductive baselines trained on each graph separately.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'channel-ensemble' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              <strong><A href="https://arxiv.org/abs/2305.12600">PRODIGY</A></strong> makes the in-context part
              literal. Few-shot examples become a <strong>prompt graph</strong>: each example contributes its
              sampled k-hop data graph, every class contributes a <strong>label node</strong>, and example
              nodes connect to label nodes with true/false edge attributes. A second GNN message-passes over
              this task graph — label nodes absorb the examples — and a query is classified by{' '}
              <em>cosine similarity to the label-node embeddings</em>. Adaptation &quot;without optimizing any
              parameters&quot;: the forward pass is the few-shot learner (it works because the GNN was
              pretrained on MAG240M and Wiki with exactly this kind of task — neighbor matching and multi-task
              classification).
            </p>
            <p>
              The 2025 line imports the <A href="https://arxiv.org/abs/2207.01848">TabPFN</A> trick.{' '}
              <strong><A href="https://arxiv.org/abs/2508.20906">G2T-FM</A></strong> turns each node into a
              table row — original features, plus per-feature neighbor aggregates (mean/max/min), plus
              structural encodings (degree, PageRank, Laplacian eigenvectors, learnable PEARL embeddings) — and
              hands the table to a tabular foundation model (TabPFNv2), run in-context or fine-tuned.{' '}
              <strong><A href="https://arxiv.org/abs/2509.21489">GraphPFN</A></strong> goes further and bakes
              the graph into the PFN itself: starting from the LimiX tabular FM, it adds an{' '}
              <strong>adjacency-masked sparse attention adapter to every transformer block</strong>, then
              pretrains on <strong>1.6 million synthetic attributed graphs</strong> sampled from a hand-designed
              prior (multi-level stochastic block models plus preferential attachment for structure; graph-aware
              structural causal models for features). Labeled nodes are the context, unlabeled nodes are
              queries, one forward pass answers.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '📎',
        title: 'Prelims',
        body: (
          <>
            The attention GraphAny learns over its channels — and the context/query attention inside every PFN —
            is scaled dot-product attention, module 1 of the{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/attention-mechanisms">Attention course</a>. In-context learning as an inference-time
            operation is module 3 of this course.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-q3',
            prompt: 'GraphAny was trained on a single graph, using only 120 labeled nodes (Wisconsin) — yet classifies nodes on any unseen graph. Which design makes the feature dimension irrelevant?',
            options: [
              { text: 'It zero-pads all features to a maximum dimension', explain: 'Padding still ties parameters to positions with inconsistent meanings — module 4\'s trap.' },
              { text: 'Its learnable part only sees (entropy-normalized) distances between predictions of closed-form LinearGNNs, which are permutation-invariant and independent of feature/label dimensions', correct: true, explain: 'The LinearGNNs are solved analytically per-graph (no learned input weights); the learned attention operates on invariant quantities, so nothing depends on the training graph\'s schema.' },
              { text: 'It uses a bigger transformer', explain: 'There\'s no transformer here at all — it\'s the invariance of the learned component that does the work.' },
            ],
          },
          {
            id: 'm5-3-q1',
            prompt: 'In the lab, the low-pass channels (ĀX, Ā²X) bottom out near 50% homophily — then recover at 0%. Why?',
            options: [
              { text: 'Near 50% a node\'s neighbors are an even class mix, so neighbor averages carry no signal; at 0% neighbors are reliably the OTHER class — an inverted rule the closed-form solve learns just as easily', correct: true, explain: 'Module 4\'s lesson in a working model: heterophily is a different signal, not an absent one — mixing is what kills a filter. GraphAny\'s attention reads the regime off the channel predictions, per graph.' },
              { text: 'The closed-form solver overfits at low homophily', explain: 'The solve is exact least squares either way — at 0% it simply learns the flip, and low-pass becomes perfectly informative again.' },
              { text: 'High-pass filters only work when homophily is exactly zero', explain: 'Identity/high-pass channels win across the whole MIXED regime — the dip is around 50%, not only at 0%.' },
            ],
          },
          {
            id: 'm5-3-q2',
            prompt: 'GraphPFN pretrains on 1.6M SYNTHETIC graphs from a hand-designed prior. What is the bet, in TabPFN terms?',
            options: [
              { text: 'If the prior spans realistic graph-generating processes, one pretrained network can approximate posterior inference in-context on any real graph drawn from a similar process', correct: true, explain: 'Prior-fitted networks amortize Bayesian inference: pretraining IS the prior, inference IS the posterior. The graph-aware prior (SBMs + preferential attachment + graph SCMs) is the hand-crafted part — and the open risk.' },
              { text: 'Synthetic graphs are higher quality than real ones', explain: 'Quality isn\'t the claim — coverage of the generative process space is.' },
              { text: 'It avoids needing any labels at inference time', explain: 'The opposite: labeled context nodes are exactly what conditions the forward pass.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'GraphAny / Fully-inductive Node Classification on Arbitrary Graphs — Zhao et al. (ICLR 2025)', href: 'https://arxiv.org/abs/2405.20445' },
          { label: 'PRODIGY: Enabling In-context Learning Over Graphs — Huang et al. (NeurIPS 2023)', href: 'https://arxiv.org/abs/2305.12600' },
          { label: 'Turning Tabular Foundation Models into Graph Foundation Models (G2T-FM) — Eremeev et al. (NeurIPS 2025 workshop)', href: 'https://arxiv.org/abs/2508.20906' },
          { label: 'GraphPFN: A Prior-Data Fitted Graph Foundation Model — (2025)', href: 'https://arxiv.org/abs/2509.21489' },
          { label: 'TabPFN — Hollmann et al. (ICLR 2023)', href: 'https://arxiv.org/abs/2207.01848', note: 'the prior-fitted-network trick this family imports' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zoo-graphbff',
    navLabel: '5.4 GraphBFF: typed attention',
    title: 'Typed attention at industrial scale — GraphBFF',
    subtitle: 'TCA + TAA, fused by a learned Φ, trained on 50 billion nodes and edges',
    minutes: 7,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The fourth bet: for enterprise graphs — no text, no single domain — make the{' '}
              <em>architecture</em> type-aware and let scale do the rest.{' '}
              <A href="https://arxiv.org/abs/2602.04768">GraphBFF</A> (Meta, 2026) is the existence proof:
              a 1.4B-parameter graph transformer pretrained on an enterprise graph of roughly 50 billion nodes
              and edges (12 node types, 20 relation types), whose frozen representations plus a small probe beat
              task-specific heterogeneous graph transformers (HGT, HAN, GraphGPS) on 10 of 10 downstream tasks.
              Module 6 covers the scale story; this page is about the block.
            </p>
            <p>
              <strong>Inputs.</strong> Each node type carries its own feature vector, and each type gets its own
              learned linear projection W<sub>τ</sub> into the shared hidden dimension (an edge encoder handles
              edge features). Note what this is <em>not</em>: it is not the &quot;partition features into
              numerical/categorical/text groups with one shared transform per group&quot; scheme of the
              TabFM lineage (G2T-FM, <A href="https://arxiv.org/abs/2506.14291">Finkelshtein et al.</A>&apos;s
              equivariance recipe). GraphBFF&apos;s paper describes that line as related work, credits it with
              making unseen schemas usable, and flags its cost — forcing semantically distinct features through
              the same transformation can limit expressivity, and choosing the grouping &quot;remains an open
              question&quot;. GraphBFF sidesteps it by fixing the node-type schema of one enormous graph.
            </p>
            <p>Now the block — step through one forward pass:</p>
          </>
        ),
      },
      { kind: 'widget', widget: 'bff-anatomy' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              <strong>TCA — type-conditioned attention</strong> — extends HGT&apos;s type-specific
              transformations with one crucial change: a <em>sparse softmax per edge-type set</em>, normalized
              only within that subset of neighbors, each set with its own W_Q/W_K/W_V and edge-bias parameters,
              outputs summed. A &quot;viewed&quot; edge never competes with a &quot;paid&quot; edge inside one
              softmax. This is the capacity: <strong>about 85% of all parameters</strong> live in TCA.{' '}
              <strong>TAA — type-agnostic attention</strong> — is the cheap counterpart: one shared attention
              over a sampled neighborhood (two hops, up to ten per hop), so information still crosses type
              boundaries. A learned FFN <strong>Φ(h_tca, h_taa)</strong> fuses the two inside an otherwise
              standard post-norm transformer block — and Theorem 4.1 proves the pair is{' '}
              <em>strictly more expressive</em> than either alone: TCA&apos;s per-subset softmax masks relative
              neighbor-set sizes, TAA&apos;s shared parameters are blind to type distinctions; together they
              realize functions neither can.
            </p>
            <p>
              <strong>Objective:</strong> masked link prediction, nothing else — sample positive edges, remove
              them from the input graph, score each candidate pair by concatenating the two node embeddings
              through a two-layer MLP, binary cross-entropy against 1:1 uniform negatives. One billion
              supervision edges; at most 12 hours on 64 GPUs. The bet is the same as next-token prediction:
              a simple objective plus scale beats objective engineering.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '📎',
        title: 'Prelims from the Attention course',
        body: (
          <>
            The {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/attention-mechanisms">Attention course</a> builds every primitive this block
            uses: module 6&apos;s Typed Attention Lab is literally the TCA-vs-shared-softmax intuition on a toy
            graph; deep dive 2.2 covers heads and W_O; module 3 covers why attention over sampled neighborhoods
            is what makes 50B-scale affordable.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-q4',
            prompt: 'The GraphBFF excerpt says feature-grouping approaches "can limit expressivity by forcing semantically distinct features through the same transformation." What trade-off is being described?',
            options: [
              { text: 'Speed vs. accuracy', explain: 'The concern isn\'t compute cost — it\'s what the shared transform can represent.' },
              { text: 'Compatibility vs. expressivity: shared per-group transforms make unseen schemas usable, but "age" and "transaction amount" may deserve different treatment', correct: true, explain: 'Grouping is what makes a pretrained model run on new node types at all — the price is squeezing distinct semantics through one function. And the grouping itself is a design choice with no principled answer yet.' },
              { text: 'Memory vs. depth', explain: 'Not the axis in question — the excerpt is about representational capacity under shared transformations.' },
            ],
          },
          {
            id: 'm5-4-q1',
            prompt: 'Why does GraphBFF run TCA and TAA together, when TCA alone holds ~85% of the parameters?',
            options: [
              { text: 'Each has a provable blind spot: TCA\'s per-subset softmax hides relative neighbor-set sizes, TAA\'s shared weights can\'t distinguish types — Theorem 4.1 exhibits a function only the pair realizes', correct: true, explain: 'Strictly more expressive together: the fusion FFN Φ gets both views. The ablation agrees — removing TCA costs 17–30 PRAUC points.' },
              { text: 'TAA is a fallback for nodes with no typed edges', explain: 'TAA runs for every node, every layer — it\'s a parallel component, not a fallback.' },
              { text: 'To halve the parameter count', explain: 'TAA ADDS (few) parameters; the motivation is expressiveness, not savings.' },
            ],
          },
          {
            id: 'm5-4-q2',
            prompt: 'GraphBFF\'s only pretraining objective is masked link prediction. Mechanically, that means…',
            options: [
              { text: 'sampled true edges are removed from the input graph, and a 2-layer MLP scores concatenated node-pair embeddings with BCE against 1:1 random negatives', correct: true, explain: 'Hide it, predict it — deliberately simple, so that scale (1B supervision edges) does the heavy lifting, mirroring next-token prediction economics.' },
              { text: 'node features are masked and reconstructed', explain: 'That\'s masked-feature modeling (UniGraph territory) — GraphBFF masks EDGES.' },
              { text: 'contrastive views of the graph are pulled together', explain: 'Graph contrastive learning is a different SSL family — and one where public-data scaling has notably broken down (module 6).' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Billion-Scale Graph Foundation Models (GraphBFF) — Bechler-Speicher et al., Meta (2026)', href: 'https://arxiv.org/abs/2602.04768', note: 'the anchor paper — §4 is this page' },
          { label: 'Heterogeneous Graph Transformer (HGT) — Hu et al. (WWW 2020)', href: 'https://arxiv.org/abs/2003.01332', note: 'the type-specific attention TCA builds on' },
          { label: 'Equivariance Everywhere All At Once — Finkelshtein et al. (2025)', href: 'https://arxiv.org/abs/2506.14291', note: 'the feature-grouping wing\'s theory backstop' },
          { label: 'FT-Transformer / Revisiting Deep Learning Models for Tabular Data — Gorishniy et al. (NeurIPS 2021)', href: 'https://arxiv.org/abs/2106.11959', note: 'where per-feature tokenizers come from' },
          { label: 'Attention, Everywhere — module 6: typed graph attention', href: '/learn/attention-mechanisms', note: 'companion course; the TCA-vs-shared softmax lab' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zoo-relational',
    navLabel: '5.5 The relational bet',
    title: 'The relational bet — foundation models for databases',
    subtitle: 'Three architectures compete for the newest family in the zoo',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Module 6 argues the data unlock for GFMs is the relational database — rows are nodes, foreign keys
              are edges, timestamps give labels for free. This page asks the architecture question that follows:{' '}
              <em>what do you actually build on a database whose schema you&apos;ve never seen?</em> The
              vocabulary bet here is the <strong>row under a schema</strong>, and as of 2026 three architectures
              are competing for it.
            </p>
            <p>
              <strong>1 · Label-propagation in-context learning</strong> (Griffin, RT<sub>zero</sub>): treat the
              context examples&apos; labels as node features and let message passing spread them. Simple and
              schema-free — but Kumo&apos;s benchmark run reports these models underperforming on RelBenchV1,
              with predictions that often collapse toward the historical mean (vendor-reported; the
              comparison comes from a competitor&apos;s paper).
            </p>
            <p>
              <strong>2 · Flatten, then reuse a tabular FM</strong> (RDBLearn ≈ deep feature synthesis +
              TabPFN-2.5; G2T-FM&apos;s relational cousin): collapse each entity&apos;s neighborhood into one
              wide row of pre-computed aggregates, then run a tabular foundation model in-context. The reported
              catch is <em>expressivity</em>: the aggregation columns are fixed before anyone knows the task, so
              task-dependent extraction is impossible — Kumo&apos;s purpose-built adversarial example has fixed
              column-wise encoders at AUROC 0.5 where task-conditioned extraction scores 1.0 (again:
              vendor-constructed, flag it as such).
            </p>
            <p>
              <strong>3 · Task-conditioned hierarchical attention</strong> —{' '}
              <A href="https://arxiv.org/abs/2604.12596">KumoRFM-2</A> (2026). The signature move: in-context
              example <strong>labels are injected directly into the input tables</strong> as data, before any
              network runs — the earliest conditioning of any model in this zoo. A lightweight network then
              alternates <strong>column- and row-wise attention within each table</strong>, producing
              task-conditioned row embeddings; a larger network runs <strong>graph attention over
              primary/foreign-key edges plus cross-sample attention across the context examples</strong>. No
              quadratic all-cell attention; inference is fully frozen — pure in-context learning. Step through
              it:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'label-injection' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The reported result: with at most 10k context examples (as little as 0.2% of available training
              data) and zero task-specific training, KumoRFM-2 reaches 79.60 average AUROC on RelBenchV1 binary
              classification — 1.54 points above the best supervised relational model (RelGNN) — which the
              authors call the first time a few-shot foundation model has surpassed supervised approaches on
              these benchmarks. Read it with eyes open: this is Kumo&apos;s own paper, its authors overlap with
              RelBench&apos;s creators, the numbers are self-reported and about three months old, and the
              expressivity demo is synthetic. What is architecturally solid regardless: label injection at the
              input, two-stage hierarchical attention, and frozen-weights ICL are a genuinely different answer
              to the vocabulary question than anything in deep dives 5.1–5.4.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '📎',
        title: 'Prelims & the module-6 hand-off',
        body: (
          <>
            Cross-sample attention IS retrieval: a query row soft-looks-up the context rows — that&apos;s module
            1 of the {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/learn/attention-mechanisms">Attention course</a> (and deep dive 2.2 for
            multi-head). In-context learning is module 3 of this course; RelBench and the where-does-the-data-
            come-from story are module 6.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-5-q1',
            prompt: 'Where does task conditioning enter KumoRFM-2, and how does that compare to OFA and GraphGPT?',
            options: [
              { text: 'Into the raw input tables as label columns — before any network runs; OFA conditions by appending nodes to the graph, GraphGPT by splicing tokens into the LLM prompt', correct: true, explain: 'Earliest, earlier, late: the three families answer "where does the task enter" at the data, the graph, and the prompt respectively — the Zoo Map\'s conditioning axis in one question.' },
              { text: 'Through a fine-tuned task head', explain: 'KumoRFM-2 is frozen at inference — no fine-tuning anywhere in the loop.' },
              { text: 'Through a natural-language task description', explain: 'No LLM is involved; the task is communicated by example labels, not prose.' },
            ],
          },
          {
            id: 'm5-5-q2',
            prompt: 'Why does the flatten-to-one-row pipeline hit an expressivity wall?',
            options: [
              { text: 'Its aggregation columns are computed before the task is known, so no task-dependent extraction from the neighborhood is possible', correct: true, explain: 'Whatever DFS didn\'t pre-compute is gone by the time the tabular FM runs. KumoRFM-2\'s label injection exists precisely so extraction can condition on the task — the 0.5-vs-1.0 synthetic (vendor-built) dramatizes the gap.' },
              { text: 'Tabular FMs cannot handle more than 100 columns', explain: 'Column-count limits are practical, not the fundamental issue named here.' },
              { text: 'Flattening loses the node labels', explain: 'Labels survive flattening fine — task-conditioned FEATURE extraction is what\'s lost.' },
            ],
          },
          {
            id: 'm5-5-q3',
            prompt: 'KumoRFM-2 runs fully frozen at inference. Economically, why does that matter (echoing module 6\'s frozen-probe lesson)?',
            options: [
              { text: 'One pretraining run amortizes across every downstream task and schema — adaptation costs one forward pass, the defining foundation-model property', correct: true, explain: 'If every new database needed training, you\'d pay per-task costs forever. Frozen ICL means the marginal task is nearly free — same logic as GraphBFF\'s frozen probe, pushed all the way to zero updates.' },
              { text: 'Frozen models are more accurate', explain: 'Not inherently — the claim is economic, not statistical.' },
              { text: 'It prevents data leakage', explain: 'Leakage control comes from temporal splits, not frozen weights.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'KumoRFM-2 — Kumo (2026)', href: 'https://arxiv.org/abs/2604.12596', note: 'task-conditioned hierarchical attention; vendor paper — numbers self-reported' },
          { label: 'KumoRFM: A Foundation Model for In-Context Learning on Relational Data (2025)', href: 'https://kumo.ai/research/kumo_relational_foundation_model.pdf', note: 'the v1 whitepaper' },
          { label: 'RelBench: A Benchmark for Deep Learning on Relational Databases — Robinson et al. (NeurIPS 2024)', href: 'https://arxiv.org/abs/2407.20060' },
          { label: 'Relational Deep Learning — Fey et al. (2023)', href: 'https://arxiv.org/abs/2312.04615', note: 'databases as temporal heterogeneous graphs' },
          { label: 'The Relational Transformer — (2025)', href: 'https://arxiv.org/abs/2510.06377', note: 'its zero-shot evaluation appears as RT_zero in KumoRFM-2\'s comparisons' },
        ],
      },
    ],
  },
]
