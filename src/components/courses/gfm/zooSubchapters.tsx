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
          { label: 'ULTRA: Towards Foundation Models for Knowledge Graph Reasoning — Galkin et al. (ICLR 2024)', href: 'https://arxiv.org/abs/2310.04562' },
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
]
