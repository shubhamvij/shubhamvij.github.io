import { ReactNode } from 'react'
import type { CourseModule } from '../engine/types'
import { ZOO_SUBCHAPTERS } from './zooSubchapters'

function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export const GUIDE_TITLE = 'Graph Foundation Models'
export const GUIDE_TAGLINE = 'An interactive study guide — from message passing to billion-parameter graph models'

export const MODULES: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'graphs',
    navLabel: '1. Graphs are everywhere',
    title: 'Graphs are everywhere',
    subtitle: 'Nodes, edges, and why half the world\'s data is secretly a graph',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Deep learning&apos;s biggest wins came from data with a regular shape. Text is a <strong>sequence</strong> of
              tokens. An image is a <strong>grid</strong> of pixels. But a huge amount of valuable data has no fixed shape at
              all — it&apos;s a set of <em>things</em> and the <em>relationships</em> between them.
            </p>
            <p>
              That&apos;s a <strong>graph</strong>: a set of <strong>nodes</strong> (entities) connected by{' '}
              <strong>edges</strong> (relationships). Both nodes and edges can carry <strong>features</strong> — numbers,
              categories, text — and both can have <strong>types</strong>. A graph with typed nodes and edges (users,
              merchants, devices; &quot;paid&quot;, &quot;logged-in-from&quot;, &quot;shares-card-with&quot;) is called{' '}
              a <strong>heterogeneous graph</strong>, and it&apos;s what most industrial graphs look like.
            </p>
            <p>Concrete examples you already know:</p>
            <ul>
              <li><strong>Molecules</strong> — atoms are nodes, chemical bonds are edges.</li>
              <li><strong>Social & payment networks</strong> — accounts are nodes; follows, messages, transactions are edges.</li>
              <li><strong>Citation networks</strong> — papers are nodes; citations are edges.</li>
              <li><strong>Knowledge graphs</strong> — entities connected by typed relations: (Einstein, <em>born-in</em>, Ulm).</li>
              <li><strong>Road networks</strong> — intersections and road segments.</li>
              <li><strong>Relational databases</strong> — every row is a node and every foreign key is an edge. Your company&apos;s data warehouse is a giant graph wearing a table costume.</li>
              <li><strong>Computation graphs</strong> — the operations inside a compiled neural network.</li>
            </ul>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '💡',
        title: 'A sneaky observation',
        body: (
          <>
            Sequences and grids are just special-case graphs: a sentence is a path graph, an image is a lattice.
            The 2026 <A href="https://arxiv.org/abs/2602.04768">GraphBFF paper</A> uses exactly this framing — LLMs and
            vision transformers are &quot;graph foundation models&quot; over trivially-shaped graphs. General graphs are the
            hard case because the shape itself varies.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm1-q1',
            prompt: 'In a payment network where accounts send money to merchants, what are the most natural nodes and edges?',
            options: [
              { text: 'Nodes: transactions. Edges: accounts.', explain: 'It\'s the reverse — entities (accounts, merchants) are the "things", and each transaction relates two of them.' },
              { text: 'Nodes: accounts and merchants. Edges: transactions between them.', correct: true, explain: 'Entities become nodes; interactions become (typed, timestamped, feature-rich) edges.' },
              { text: 'Nodes: dollar amounts. Edges: currencies.', explain: 'Amounts and currencies are features attached to transaction edges, not entities in their own right.' },
            ],
          },
          {
            id: 'm1-q2',
            prompt: 'Which of these is NOT naturally modeled as a graph?',
            options: [
              { text: 'A database of customers, orders, and products linked by foreign keys', explain: 'This is naturally a graph — rows are nodes, foreign keys are edges. It\'s the premise of relational deep learning.' },
              { text: 'A single temperature reading from one sensor', correct: true, explain: 'One scalar value has no relational structure — there\'s nothing to connect. (A network of sensors, though, is a graph.)' },
              { text: 'The atoms and bonds of a caffeine molecule', explain: 'A molecule is the textbook example of a graph: atoms as nodes, bonds as edges.' },
            ],
          },
          {
            id: 'm1-q3',
            prompt: 'What makes a graph "heterogeneous"?',
            options: [
              { text: 'It has more than a million nodes', explain: 'Size doesn\'t matter here — heterogeneity is about types, not scale.' },
              { text: 'Its nodes and edges have multiple types (users, items, "clicked", "bought", …)', correct: true, explain: 'Typed nodes and edges are what make a graph heterogeneous — and most real enterprise graphs are.' },
              { text: 'Its edges have weights', explain: 'Weighted edges are still a homogeneous graph if everything has one type.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'A Gentle Introduction to Graph Neural Networks — Distill (2021)', href: 'https://distill.pub/2021/gnn-intro/', note: 'interactive; the best first exposure to graphs-as-ML-data' },
          { label: 'Stanford CS224W: Machine Learning with Graphs', href: 'https://web.stanford.edu/class/cs224w/', note: 'the standard university course, lectures on YouTube' },
          { label: 'Geometric Deep Learning proto-book — Bronstein, Bruna, Cohen, Veličković', href: 'https://geometricdeeplearning.com', note: 'grids, groups, graphs: one symmetry-based theory of it all' },
          { label: 'Position: Graph Learning Will Lose Relevance Due To Poor Benchmarks — Bechler-Speicher et al. (ICML 2025)', href: 'https://arxiv.org/abs/2502.14546', note: 'argues the field should focus on high-impact graph domains' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'message-passing',
    navLabel: '2. Learning on graphs',
    title: 'How machines learn on graphs',
    subtitle: 'Message passing, receptive fields, and the GNN family tree',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              A neural network for graphs faces an odd constraint: a graph has no natural order. Node #7 isn&apos;t
              &quot;before&quot; node #12; if you shuffle the node numbering it&apos;s still the same graph, and the network&apos;s
              answer shouldn&apos;t change. So graph neural networks (GNNs) are built from an operation that only ever
              looks at a node&apos;s <em>neighborhood</em>, never the numbering: <strong>message passing</strong>.
            </p>
            <p>One round (one GNN layer) has three steps for every node, in parallel:</p>
            <ol>
              <li><strong>Collect</strong> — grab your neighbors&apos; current feature vectors (the &quot;messages&quot;).</li>
              <li><strong>Aggregate</strong> — squash them into one vector with an order-blind operation: mean, sum, or max.</li>
              <li><strong>Update</strong> — combine the aggregate with your own vector through a small neural network.</li>
            </ol>
            <p>
              Stack <em>k</em> layers and information flows <em>k</em> hops. Try it below — the node colors are feature
              vectors, and one click runs one layer.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'message-passing' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Two things you just saw matter for everything that follows. First, a node&apos;s{' '}
              <strong>receptive field</strong> after <em>k</em> layers is exactly its <em>k</em>-hop neighborhood —
              GNNs are local by construction. Second, stacking many layers makes every node&apos;s vector converge to the
              same mush: <strong>over-smoothing</strong>. Real GNNs are typically 2–4 layers deep, which is one reason
              (we&apos;ll see later) that graph models don&apos;t scale the way transformers do.
            </p>
            <p>The classic family tree, in one line each:</p>
            <ul>
              <li><strong>GCN</strong> (2016) — average your neighbors, then apply shared weights.</li>
              <li><strong>GraphSAGE</strong> (2017) — <em>sample</em> a fixed number of neighbors, so it scales and works on nodes never seen in training (inductive).</li>
              <li><strong>GAT</strong> (2018) — learn <em>attention</em> weights so important neighbors count more.</li>
              <li><strong>GIN</strong> (2019) — use sum aggregation tuned for maximum expressiveness: provably as powerful as the Weisfeiler-Lehman graph-isomorphism test.</li>
              <li><strong>Graph transformers</strong> (2020s) — let every node attend to every node, with structure injected as positional encodings or attention masks.</li>
            </ul>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🔁',
        title: 'The key weight-sharing trick',
        body: (
          <>
            One GNN layer&apos;s weights are shared by <em>all</em> nodes — like a convolution filter slid across an image,
            generalized to irregular neighborhoods. That&apos;s why a trained GNN can, in principle, run on a different
            graph… as long as the input features line up. Hold that thought.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm2-q1',
            prompt: 'After 2 GNN layers, which nodes can influence node X\'s representation?',
            options: [
              { text: 'Only X\'s direct neighbors', explain: 'That\'s the reach after one layer. Each additional layer extends the reach by one hop.' },
              { text: 'Every node within 2 hops of X', correct: true, explain: 'k layers = k-hop receptive field. Information travels one hop per round of message passing.' },
              { text: 'Every node in the graph', explain: 'Only if the graph\'s diameter is ≤ 2. Message passing is strictly local per layer.' },
            ],
          },
          {
            id: 'm2-q2',
            prompt: 'In the lab, running 8 layers turned every node the same muddy color. What is this phenomenon called, and why is it a problem?',
            options: [
              { text: 'Over-smoothing — node representations become indistinguishable, so the model can\'t tell nodes apart', correct: true, explain: 'Repeated neighborhood averaging is a diffusion process; run it long enough and everything converges. This limits GNN depth in practice.' },
              { text: 'Overfitting — the model memorized the training graph', explain: 'Overfitting is about train/test generalization. The color collapse happens with no training at all — it\'s a property of repeated averaging.' },
              { text: 'Gradient vanishing — gradients shrink through deep networks', explain: 'Related in spirit (both are depth problems) but distinct: over-smoothing collapses the *representations* themselves, even in the forward pass.' },
            ],
          },
          {
            id: 'm2-q3',
            prompt: 'GraphSAGE is called "inductive" because…',
            options: [
              { text: 'it learns one embedding vector per node in the training graph', explain: 'That\'s the *transductive* setup (e.g., classic DeepWalk/node2vec) — useless for nodes that didn\'t exist at training time.' },
              { text: 'it learns aggregation functions that can be applied to any node\'s sampled neighborhood, including brand-new nodes', correct: true, explain: 'Learning functions-of-neighborhoods rather than per-node vectors is what lets it generalize to unseen nodes — a tiny first step toward foundation-model thinking.' },
              { text: 'it uses attention over neighbors', explain: 'That\'s GAT. GraphSAGE\'s contributions are neighbor sampling and learned aggregators.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Semi-Supervised Classification with Graph Convolutional Networks — Kipf & Welling (ICLR 2017)', href: 'https://arxiv.org/abs/1609.02907' },
          { label: 'Inductive Representation Learning on Large Graphs (GraphSAGE) — Hamilton et al. (NeurIPS 2017)', href: 'https://arxiv.org/abs/1706.02216' },
          { label: 'Graph Attention Networks — Veličković et al. (ICLR 2018)', href: 'https://arxiv.org/abs/1710.10903' },
          { label: 'How Powerful are Graph Neural Networks? (GIN) — Xu et al. (ICLR 2019)', href: 'https://arxiv.org/abs/1810.00826', note: 'the expressiveness / WL-test paper' },
          { label: 'Understanding Convolutions on Graphs — Distill (2021)', href: 'https://distill.pub/2021/understanding-gnns/', note: 'interactive companion to this module' },
          { label: 'GNN 101: Visual Learning of Graph Neural Networks in Your Web Browser', href: 'https://arxiv.org/abs/2411.17849', note: 'in-browser layer-by-layer GNN visualization' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'recipe',
    navLabel: '3. The FM recipe',
    title: 'The foundation-model recipe',
    subtitle: 'What actually made LLMs work — as a checklist',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Before 2018, NLP looked like graph learning does now: one bespoke model per task. Then the field
              switched to a different economic model — train <em>one</em> enormous model on broad data, and adapt it
              cheaply to everything. A <strong>foundation model</strong>, in the Stanford report&apos;s definition, is
              exactly that: a model trained on broad data that can be <em>adapted</em> to a wide range of downstream
              tasks.
            </p>
            <p>It&apos;s worth being precise about the ingredients, because we&apos;re about to ask which ones graphs are missing:</p>
            <ol>
              <li><strong>A shared vocabulary.</strong> Every English document is made of the same ~50K subword tokens. Every image is patches of RGB pixels. One input space fits all data.</li>
              <li><strong>A self-supervised objective.</strong> Predict the next token / the masked patch — no labels needed, so all data is training data.</li>
              <li><strong>A scalable architecture.</strong> The transformer eats sequences of tokens from any domain.</li>
              <li><strong>Scaling laws.</strong> Loss falls as a smooth power law in model size and data — so you can forecast the return on a $100M training run before spending it.</li>
              <li><strong>Oceans of public data.</strong> The web: ~10<sup>13</sup> tokens of text, billions of images.</li>
            </ol>
            <p>
              The payoff compounds: at sufficient scale, LLMs develop <strong>in-context learning</strong> — show GPT-3
              a few examples <em>in the prompt</em> and it performs the task with zero weight updates. Adaptation
              becomes an inference-time operation.
            </p>
            <p>
              Play with the power law below. The exponents are real — they&apos;re fitted from graph pretraining runs in a
              2026 paper we&apos;ll meet properly in module 6 — but the shape is the same one Kaplan et al. found for
              language in 2020.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'scaling-laws' },
      {
        kind: 'callout',
        icon: '📉',
        title: 'How to read that chart',
        body: (
          <>
            The blue curve is loss vs. model size <em>at your current data budget</em>. Notice the dashed floor: past
            a certain size, a bigger model buys nothing — you&apos;re <strong>data-bottlenecked</strong>, and only more
            data lowers the floor. Balanced growth of both is the whole game (this is also the &quot;Chinchilla&quot; lesson
            from LLM training).
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm3-q1',
            prompt: 'What makes a model a "foundation model"?',
            options: [
              { text: 'It has more than a billion parameters', explain: 'Size alone isn\'t the definition. A 22M-parameter model that transfers zero-shot across datasets (like the Relational Transformer) is more "foundational" than a huge single-task model.' },
              { text: 'It\'s pretrained on broad data and cheaply adaptable to many downstream tasks', correct: true, explain: 'Broad pretraining + lightweight adaptation (fine-tuning, prompting, in-context learning) is the definition from the Stanford report that coined the term.' },
              { text: 'It uses the transformer architecture', explain: 'Architecture is incidental — foundation models exist for proteins, code, and (as we\'ll see) graphs, with varied architectures.' },
            ],
          },
          {
            id: 'm3-q2',
            prompt: 'In-context learning means the model…',
            options: [
              { text: 'is fine-tuned on a small labeled dataset', explain: 'Fine-tuning updates weights. In-context learning is the surprising alternative: no updates at all.' },
              { text: 'adapts to a new task purely from examples in its input, with no weight updates', correct: true, explain: 'The examples live in the prompt/context; the forward pass itself does the "learning". GPT-3 made this famous; TabPFN showed it works for tabular prediction; graph models now chase it too.' },
              { text: 'memorizes its training data', explain: 'Memorization is a training-time phenomenon and mostly a bug; ICL is an inference-time capability.' },
            ],
          },
          {
            id: 'm3-q3',
            prompt: 'You double your model size and loss barely moves. The scaling-law view says you are most likely…',
            options: [
              { text: 'data-bottlenecked — the data term dominates, so add training data', correct: true, explain: 'When (Dc/D)^αD is the bigger term, model growth can\'t help. This exact regime shows up in graph pretraining, where public data runs out fast.' },
              { text: 'model-bottlenecked — keep adding parameters', explain: 'If the model term dominated, doubling parameters would visibly cut loss. A flat response means the other term is the floor.' },
              { text: 'done — the model has learned everything', explain: 'The irreducible-loss asymptote exists, but hitting the *data* floor long before it is the common (and fixable) case.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'On the Opportunities and Risks of Foundation Models — Bommasani et al. (2021)', href: 'https://arxiv.org/abs/2108.07258', note: 'coined the term' },
          { label: 'Language Models are Few-Shot Learners (GPT-3) — Brown et al. (NeurIPS 2020)', href: 'https://arxiv.org/abs/2005.14165', note: 'in-context learning' },
          { label: 'Scaling Laws for Neural Language Models — Kaplan et al. (2020)', href: 'https://arxiv.org/abs/2001.08361' },
          { label: 'TabPFN: A Transformer That Solves Small Tabular Classification Problems in a Second — Hollmann et al. (ICLR 2023)', href: 'https://arxiv.org/abs/2207.01848', note: 'in-context learning beyond text — the seed of several graph FMs' },
          { label: 'Foundation Models in Graph & Geometric Deep Learning — Galkin & Bronstein (2024)', href: 'https://towardsdatascience.com/foundation-models-in-graph-geometric-deep-learning-f363e2576f58/', note: 'the blog overview that inspired this module\'s framing' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'heterogeneity',
    navLabel: '4. Why graphs break it',
    title: 'Why graphs break the recipe',
    subtitle: 'The heterogeneity trilemma: features, structure, tasks',
    minutes: 12,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Run the checklist from module 3 against graphs and two ingredients fail immediately. Ingredient 5 —
              oceans of public data — we&apos;ll cover in module 6. This module is about ingredient 1: graphs have{' '}
              <strong>no shared vocabulary</strong>. The GFM surveys break this into three axes of heterogeneity,
              and the related-work section of the GraphBFF paper (the excerpt that seeded this guide) uses exactly
              this decomposition. Let&apos;s feel each one.
            </p>
            <p>
              <strong>Axis 1: feature heterogeneity.</strong> Every text model shares a token vocabulary. But a
              citation network describes its nodes with 768-dim text embeddings, a molecule with 121-dim atom
              encodings, a payment network with 4 mixed-type columns. Try feeding all three to one pretrained model:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'feature-space' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Note where it failed: at the <em>first matrix multiply</em>. This isn&apos;t a subtle distribution-shift
              problem — the model literally cannot run. And zero-padding doesn&apos;t fix it, because dimension 5 means
              &quot;carbon&quot; in one dataset and &quot;the 6th embedding coordinate&quot; in another. Same shape, different
              semantics.
            </p>
            <p>
              <strong>Axis 2: structural heterogeneity.</strong> Even with features aligned, graphs differ in their
              wiring statistics. The big one is <strong>homophily</strong> — do connected nodes tend to share labels?
              Citation networks: strongly yes (papers cite their own field). Dating networks or fraud graphs:
              often the opposite (<strong>heterophily</strong>). Message passing averages neighbors, which quietly
              bakes in &quot;my neighbors look like me&quot;:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'homophily' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Degree distributions, clustering, motif frequencies — they all vary the same way across domains. A model
              pretrained on one wiring regime carries assumptions that can be flatly wrong in another. (It gets
              worse: the same underlying data can yield a homophilic or heterophilic graph depending on how you
              choose to construct it — and graph construction is a human modeling decision.)
            </p>
            <p>
              <strong>Axis 3: task heterogeneity.</strong> Language unified every task as next-token prediction.
              Graph tasks live at three different granularities, wanting different readouts and different inductive
              biases. Sort these:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'task-matcher' },
      {
        kind: 'callout',
        icon: '📖',
        title: 'The vocabulary problem, stated once',
        body: (
          <>
            Mao et al.&apos;s ICML 2024 position paper compresses all three axes into one question: what is the{' '}
            <strong>graph vocabulary</strong> — the basic transferable units, playing the role words play for text?
            Candidates must respect graph invariances (they ground this in network analysis, expressiveness theory,
            and stability). Nobody has found a universal one yet; every model family in the next module is a
            different bet on what the vocabulary should be.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm4-q1',
            prompt: 'A GNN pretrained on citation networks (768-d text-embedding features) is handed a molecule dataset (121-d atom features). What happens first?',
            options: [
              { text: 'It runs but generalizes poorly because molecules are structurally different', explain: 'Structure would be the *next* problem — but we never get there. The input dimensions don\'t match, so the first layer can\'t even execute.' },
              { text: 'The forward pass fails at the first weight matrix: shape mismatch', correct: true, explain: 'Feature heterogeneity bites before any learning question arises. This mechanical incompatibility is why so much GFM machinery targets the input layer.' },
              { text: 'It works fine — GNN weights are shared across nodes', explain: 'Weight sharing helps across *nodes of the same graph*; it does nothing about a different feature schema. That\'s the trap in module 2\'s callout.' },
            ],
          },
          {
            id: 'm4-q2',
            prompt: 'Which graph is most likely heterophilic (connected nodes have different labels)?',
            options: [
              { text: 'A citation network labeled by research field', explain: 'Papers overwhelmingly cite their own field — the classic homophilic example.' },
              { text: 'A fraud graph where fraudsters transact with victims', correct: true, explain: 'Fraudsters connect to normal users, not to each other — labels anti-correlate across edges. Naive neighbor-averaging actively hurts here.' },
              { text: 'A social network labeled by language spoken', explain: 'People mostly befriend speakers of their own language — homophilic.' },
            ],
          },
          {
            id: 'm4-q3',
            prompt: 'In the Homophily Lab at 0% homophily, "copy your neighbors" scores ~0%. Is the graph structure useless there?',
            options: [
              { text: 'Yes — 0% accuracy means no signal', explain: 'Look again: 0% is as far from random (50%) as 100% is! The structure is perfectly informative; the *rule* is inverted.' },
              { text: 'No — "predict the opposite of your neighbors" would score ~100%; the danger is assuming one regime and transferring it', correct: true, explain: 'Exactly. Heterophily isn\'t absence of signal, it\'s a different signal. A foundation model must infer the regime per graph rather than bake one in.' },
              { text: 'The question is unanswerable without node features', explain: 'The lab\'s classifier uses no features at all — labels of neighbors alone score 100% under the inverted rule.' },
            ],
          },
          {
            id: 'm4-q4',
            prompt: 'The three heterogeneity axes named by the GFM surveys (and the GraphBFF related-work excerpt) are:',
            options: [
              { text: 'Feature, structural, and task heterogeneity', correct: true, explain: 'The trilemma this whole module walked through — and the axes any GFM design must answer for.' },
              { text: 'Node, edge, and graph heterogeneity', explain: 'Node/edge/graph is the *task-level* split — just one of the three axes.' },
              { text: 'Small, medium, and large graphs', explain: 'Scale matters (module 6!) but it isn\'t one of the heterogeneity axes.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Position: Graph Foundation Models Are Already Here — Mao et al. (ICML 2024)', href: 'https://arxiv.org/abs/2402.02216', note: 'the graph-vocabulary argument' },
          { label: 'Graph Foundation Models: A Comprehensive Survey — Wang et al. (2025)', href: 'https://arxiv.org/abs/2505.15116', note: 'source of the three-axis decomposition' },
          { label: 'Beyond Homophily in Graph Neural Networks — Zhu et al. (NeurIPS 2020)', href: 'https://arxiv.org/abs/2006.11468', note: 'why homophily assumptions fail, and designs that survive heterophily' },
          { label: 'Graph Foundation Models: Concepts, Opportunities and Challenges — Liu et al. (TPAMI 2025)', href: 'https://arxiv.org/abs/2310.11829', note: 'the other major survey (originally "Towards Graph Foundation Models", 2023)' },
          { label: 'Billion-Scale Graph Foundation Models — Bechler-Speicher et al. (2026)', href: 'https://arxiv.org/abs/2602.04768', note: 'the anchor paper whose related-work section this module unpacks' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zoo',
    navLabel: '5. The GFM zoo',
    title: 'The GFM zoo: five bets on a vocabulary',
    subtitle: 'Five families, five answers to "what is the transferable unit?" — each with its own deep dive',
    minutes: 9,
    subchapters: ZOO_SUBCHAPTERS,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              There is no consensus GFM recipe yet. What exists is a zoo of models, each dodging module 4&apos;s
              heterogeneity trilemma by betting on a different <strong>vocabulary</strong> — a different answer
              to &quot;what is the basic transferable unit?&quot;. Five bets cover essentially everything, and
              each gets an architecture deep dive below this module in the sidebar.
            </p>
            <p>
              <strong>Bet 1: stay inside one domain — where a vocabulary already exists.</strong> Chemistry
              tokenizes <em>atoms</em> — an element plus a 3D position — and models like{' '}
              <A href="https://arxiv.org/abs/2310.16802">JMP</A> and Meta&apos;s{' '}
              <A href="https://arxiv.org/abs/2506.23971">UMA</A> transfer across chemistry with per-dataset
              heads or task conditioning absorbing the label mismatches. Knowledge graphs seemed harder — every
              KG invents its own relations — until <A href="https://arxiv.org/abs/2310.04562">ULTRA</A>{' '}
              represented each relation by <em>how it interacts with other relations</em>: a vocabulary computed
              from the data, never learned. One pretrained ULTRA does zero-shot link prediction on 57 KGs.{' '}
              <em>→ deep dive 5.1</em>
            </p>
            <p>
              <strong>Bet 2: make everything text.</strong> Describe nodes and edges in English, embed with a
              language model, and feature spaces align by construction —{' '}
              <A href="https://arxiv.org/abs/2310.00149">One-for-All</A>,{' '}
              <A href="https://arxiv.org/abs/2310.13023">GraphGPT</A>,{' '}
              <A href="https://arxiv.org/abs/2402.08170">LLaGA</A>, and{' '}
              <A href="https://arxiv.org/abs/2402.13630">UniGraph</A> share the bet but are four different
              machines: who predicts (GNN or LLM), whether a graph encoder exists at all, and what actually
              trains. The shared ceiling: text-attributed graphs only. <em>→ deep dive 5.2</em>
            </p>
            <p>
              <strong>Bet 3: bet on structure + in-context learning.</strong> Throw away feature identity and
              lean on what every graph has. <A href="https://arxiv.org/abs/2405.20445">GraphAny</A> solves five
              closed-form spectral filters on the target graph&apos;s own labels and learns only a
              dimension-independent attention over their predictions — trained on one graph (120 labeled nodes
              of Wisconsin), it classifies on 30 unseen graphs.{' '}
              <A href="https://arxiv.org/abs/2305.12600">PRODIGY</A> wires few-shot examples into a prompt
              graph; <A href="https://arxiv.org/abs/2508.20906">G2T-FM</A> and{' '}
              <A href="https://arxiv.org/abs/2509.21489">GraphPFN</A> import TabPFN&apos;s prior-fitted trick —
              GraphPFN pretrains on 1.6M synthetic graphs. <em>→ deep dive 5.3</em>
            </p>
            <p>
              <strong>Bet 4: type-aware attention at industrial scale.</strong> Enterprise graphs aren&apos;t
              text and aren&apos;t one domain, but they have a fixed set of node and relation <em>types</em>.{' '}
              <A href="https://arxiv.org/abs/2602.04768">GraphBFF</A> gives each node type its own input
              projection and each relation-type set its own sparse attention (TCA, ~85% of its 1.4B parameters),
              fused with a shared attention (TAA) that is provably necessary — pretrained with masked link
              prediction on ~50B nodes and edges. The related feature-grouping wing (
              <A href="https://arxiv.org/abs/2508.20906">G2T-FM</A>,{' '}
              <A href="https://arxiv.org/abs/2506.14291">Finkelshtein et al.</A>) trades expressivity for
              unseen-schema compatibility — an open question. <em>→ deep dive 5.4</em>
            </p>
            <p>
              <strong>Bet 5: the row under a schema.</strong> The newest family treats the relational database
              itself as the domain: <A href="https://arxiv.org/abs/2604.12596">KumoRFM-2</A> injects in-context
              labels directly into the input tables and runs hierarchical attention within tables, across
              foreign keys, and across context examples — fully frozen at inference. Its rivals answer the same
              question with label propagation (Griffin, RT<sub>zero</sub>) or flatten-then-TabPFN pipelines
              (RDBLearn). <em>→ deep dive 5.5</em>
            </p>
            <p>Compare any two inhabitants of the zoo on the five axes that actually differ:</p>
          </>
        ),
      },
      { kind: 'widget', widget: 'zoo-map' },
      {
        kind: 'callout',
        icon: '🧭',
        title: 'One map to hold onto',
        body: (
          <>
            Ask of any GFM paper: <em>what does it treat as the vocabulary?</em> Atoms (JMP, UMA),
            relation-interaction patterns (ULTRA), English words (OFA and kin), structural statistics + labeled
            examples in context (GraphAny, GraphPFN), typed nodes at scale (GraphBFF), or rows under a schema
            (KumoRFM-2). Every strength and every limitation flows from that one choice — and per Mao et al.,
            the vocabulary needn&apos;t be a literal tokenizer: sometimes it is a <em>model</em> that maps
            graphs into a shared space.
          </>
        ),
      },
      { kind: 'widget', widget: 'paper-shelf' },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm5-q5',
            prompt: 'A 2026 paper\'s transferable unit is "a row under a database schema, with in-context labels as data." Which bet is it making?',
            options: [
              { text: 'The relational bet (KumoRFM-2\'s family)', correct: true, explain: 'Rows-under-schemas are the fifth vocabulary — the newest family in the zoo, with three competing architectures for it.' },
              { text: 'Text as glue', explain: 'No language model or text description is involved — the labels enter as table data.' },
              { text: 'A domain vocabulary like ULTRA\'s', explain: 'ULTRA\'s unit is the relation (via interactions), not the row — though both are domain-scoped bets.' },
            ],
          },
          {
            id: 'm5-q6',
            prompt: 'Your payment network has no meaningful text on nodes or edges. Which bet is structurally unable to help?',
            options: [
              { text: 'Bet 2 — text as glue: its vocabulary is borrowed from English, so text-free graphs get nothing', correct: true, explain: 'OFA/GraphGPT/LLaGA/UniGraph all require meaningful node text. Bets 3, 4, and 5 are exactly the families built for graphs like yours.' },
              { text: 'Bet 3 — structure + in-context', explain: 'Structure + labels exist in every graph — this bet is schema-free by design.' },
              { text: 'Bet 4 — typed attention at scale', explain: 'GraphBFF\'s natural habitat is precisely the text-free enterprise graph.' },
            ],
          },
          {
            id: 'm5-q7',
            prompt: 'GraphGPT and LLaGA agree on "the LLM predicts" and "only a projector trains." On the Zoo Map, which axis separates them?',
            options: [
              { text: 'How graph structure reaches the LLM: GraphGPT uses a pretrained graph encoder; LLaGA uses parameter-free templates — no graph encoder at all', correct: true, explain: 'Same family, same locus, same frozen/trained split — the encoder-presence axis is the whole difference, which is why the Zoo Map dims their matching rows.' },
              { text: 'The pretraining corpus size', explain: 'Data scale isn\'t one of the five architecture axes on the map.' },
              { text: 'Whether attention is used', explain: 'Both run transformer LLMs — attention is everywhere in this zoo.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Position: Graph Foundation Models Are Already Here — Mao et al. (ICML 2024)', href: 'https://arxiv.org/abs/2402.02216', note: 'the graph-vocabulary argument this module is built on' },
          { label: 'Graph Foundation Models: A Comprehensive Survey — Wang et al. (2025)', href: 'https://arxiv.org/abs/2505.15116', note: 'orthogonal cut: universal / domain-specific / task-specific' },
          { label: 'Foundation Models in Graph & Geometric Deep Learning — Galkin & Bronstein (2024)', href: 'https://towardsdatascience.com/foundation-models-in-graph-geometric-deep-learning-f363e2576f58/', note: 'the landscape read' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'scale',
    navLabel: '6. Billion-scale frontier',
    title: 'The billion-scale frontier',
    subtitle: 'Data scarcity, GraphBFF, and why relational databases may be the unlock',
    minutes: 11,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Now the missing ingredient we postponed: <strong>data</strong>. LLMs had the public web. Graph learning&apos;s
              public datasets top out around 10<sup>9</sup>–10<sup>10</sup> edges (MAG240M, IGB) — and most academic
              work still runs on graphs ten thousand times smaller. Meanwhile the genuinely enormous graphs — social
              networks, payment systems, product catalogs — sit inside companies. Flip to the second tab:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'data-gap' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              This is the scarcity argument from Bechler-Speicher et al.&apos;s position paper — and in 2026 the same
              first author published the paper this guide is anchored on, showing what happens when someone{' '}
              <em>with</em> the data actually runs the recipe.
            </p>
            <p>
              <strong><A href="https://arxiv.org/abs/2602.04768">Billion-Scale Graph Foundation Models</A></strong>{' '}
              (GraphBFF, Meta, 2026) pretrains a <strong>1.4-billion-parameter</strong> graph transformer on an
              enterprise graph of roughly <strong>50 billion nodes and edges</strong> (12 node types, 20 relation
              types). The recipe, in plain terms:
            </p>
            <ul>
              <li><strong>Objective:</strong> masked link prediction — hide edges, predict them. That&apos;s it. The bet is that scale substitutes for clever inductive bias, exactly like next-token prediction.</li>
              <li><strong>Architecture:</strong> transformer blocks whose attention is graph-aware twice over: <em>type-conditioned attention</em> (separate sparse attention per relation type — ~85% of all parameters) fused with <em>type-agnostic attention</em> (one shared attention over sampled neighborhoods). They prove the pair is strictly more expressive than either alone.</li>
              <li><strong>Data engineering:</strong> batching strategies (KL-divergence-based cluster packing; round-robin over edge types) so rare relation types aren’t starved during training — the unglamorous part that matters at 50B scale.</li>
              <li><strong>Result:</strong> a frozen pretrained model probed with a tiny head beats task-specific GNNs (HGT, HAN, GraphGPS) on <strong>10 out of 10</strong> unseen downstream tasks, by up to <strong>+31 PRAUC</strong> points — including few-shot with as little as 1–10 labels per class. Pretraining: ≤12 hours on 64 GPUs.</li>
              <li><strong>And the headline:</strong> loss follows clean power laws in model size and data (the exponents in module 3&apos;s lab), with the same &quot;grow both together&quot; dynamics as language models.</li>
            </ul>
            <p>
              One paper on private data doesn&apos;t settle the field — scaling-law results on <em>public</em> graph
              corpora are messier (self-supervised loss scales, but downstream gains don&apos;t always follow; depth
              changes the law). But it&apos;s the strongest evidence yet that the LLM playbook runs on graphs when the
              data exists.
            </p>
            <p>
              <strong>So where would public-scale graph data come from?</strong> The field&apos;s current best answer:{' '}
              <strong>relational databases</strong>. Every business runs on multi-table databases, and every database
              is a temporal heterogeneous graph (rows = nodes, foreign keys = edges). That observation produced{' '}
              <A href="https://arxiv.org/abs/2312.04615">Relational Deep Learning</A>, the{' '}
              <A href="https://arxiv.org/abs/2407.20060">RelBench</A> benchmark, and a 2025–26 wave of relational
              foundation models: <A href="https://kumo.ai/research/kumo_relational_foundation_model.pdf">KumoRFM</A>{' '}
              (in-context predictions on any database, no task-specific training),{' '}
              <A href="https://arxiv.org/abs/2510.06377">Relational Transformer</A> (zero-shot ≈94% of supervised
              AUROC at 22M params), Google&apos;s{' '}
              <A href="https://research.google/blog/graph-foundation-models-for-relational-data/">internal GFM for
              relational data</A> (3×–40× average-precision gains), and{' '}
              <A href="https://arxiv.org/abs/2604.12596">KumoRFM-2</A> (billion-scale, few-shot beating supervised).
              If GFMs get their &quot;web-scale moment&quot;, it likely looks like this.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🏭',
        title: 'Why enterprise graphs are the natural habitat',
        body: (
          <>
            They&apos;re the one place all three heterogeneity axes and scale coexist <em>with supervision for free</em>:
            the database&apos;s own timeline generates labels (did the user churn? was the transaction reversed?)
            retroactively, no annotators needed. Compare module 3&apos;s checklist — that&apos;s ingredients 2 and 5 solved
            in one move.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm6-q1',
            prompt: 'What is GraphBFF\'s only pretraining objective?',
            options: [
              { text: 'Next-node prediction over random walks', explain: 'Random-walk objectives power older embedding methods (DeepWalk-era), not GraphBFF.' },
              { text: 'Masked link prediction: hide edges and predict them', correct: true, explain: 'Deliberately simple, in the spirit of next-token prediction — the paper\'s bet is that scale, not objective engineering, does the heavy lifting.' },
              { text: 'Contrastive learning between graph augmentations', explain: 'A popular graph-SSL family, but not what GraphBFF uses — and notably one where scaling laws have been shown to break down downstream.' },
            ],
          },
          {
            id: 'm6-q2',
            prompt: 'Why do relational databases look like the most promising data source for general-purpose GFMs?',
            options: [
              { text: 'They\'re smaller and easier to train on', explain: 'The opposite — their appeal is that they\'re enormous and everywhere.' },
              { text: 'They\'re ubiquitous, naturally heterogeneous temporal graphs, and their timelines generate supervision labels for free', correct: true, explain: 'Rows=nodes, foreign keys=edges, timestamps=temporal structure, and historical outcomes = labels without annotation. Scale + heterogeneity + supervision in one package.' },
              { text: 'They contain only numerical features, avoiding feature heterogeneity', explain: 'They\'re full of mixed types — that\'s precisely why type-aware architectures (Bet 4) matter for them.' },
            ],
          },
          {
            id: 'm6-q3',
            prompt: 'A frozen GraphBFF beat task-specific GNNs on all 10 downstream tasks using only a small probing head. Why is "frozen" the important word?',
            options: [
              { text: 'It means the model is smaller', explain: 'Freezing doesn\'t shrink the model — it constrains how it\'s used.' },
              { text: 'It shows the pretrained representations themselves carry the value — adaptation is cheap, the foundation-model economic property', correct: true, explain: 'If beating specialists required full fine-tuning, you\'d still pay per-task training costs. Frozen + tiny probe means one pretraining run amortizes across every downstream task — the whole point of a foundation model.' },
              { text: 'Frozen models can\'t overfit', explain: 'The probe can still overfit; that\'s not the significance here.' },
            ],
          },
          {
            id: 'm6-q4',
            prompt: 'What caution do public-data scaling studies add to GraphBFF\'s clean power laws?',
            options: [
              { text: 'Scaling laws are mathematically impossible on graphs', explain: 'GraphBFF (and GNoME in materials) demonstrate they\'re possible — the caution is subtler.' },
              { text: 'On public graph corpora, self-supervised loss can scale while downstream performance doesn\'t, and depth changes the law', correct: true, explain: 'Ma et al. (LoG 2024) found existing graph-SSL objectives don\'t translate loss gains downstream; Liu et al. found graph scaling depends on depth unlike NLP/vision. Objective and architecture choices still matter more than in text.' },
              { text: 'Graphs scale better than language, so no caution is needed', explain: 'No study supports that reading.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Billion-Scale Graph Foundation Models (GraphBFF) — Bechler-Speicher et al., Meta (2026)', href: 'https://arxiv.org/abs/2602.04768', note: 'the anchor paper' },
          { label: 'Position: Graph Learning Will Lose Relevance Due To Poor Benchmarks — Bechler-Speicher et al. (ICML 2025)', href: 'https://arxiv.org/abs/2502.14546', note: 'the data-scarcity argument' },
          { label: 'RelBench: A Benchmark for Deep Learning on Relational Databases — Robinson et al. (NeurIPS 2024)', href: 'https://arxiv.org/abs/2407.20060', note: 'relbench.stanford.edu' },
          { label: 'KumoRFM: A Foundation Model for In-Context Learning on Relational Data (2025)', href: 'https://kumo.ai/research/kumo_relational_foundation_model.pdf' },
          { label: 'Graph foundation models for relational data — Google Research blog (2025)', href: 'https://research.google/blog/graph-foundation-models-for-relational-data/' },
          { label: 'Towards Neural Scaling Laws on Graphs — Liu et al. (2024)', href: 'https://arxiv.org/abs/2402.02054' },
          { label: 'Do Neural Scaling Laws Exist on Graph Self-Supervised Learning? — Ma et al. (LoG 2024)', href: 'https://arxiv.org/abs/2408.11243', note: 'the cautionary negative result' },
          { label: 'OGB-LSC: A Large-Scale Challenge for ML on Graphs — Hu et al. (2021)', href: 'https://arxiv.org/abs/2103.09430' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'frontier',
    navLabel: '7. Open problems',
    title: 'Open problems & going further',
    subtitle: 'What\'s unsolved, and your reading path from here',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              You now have the full arc: graphs are everywhere (1), message passing learns on them (2), foundation
              models follow a specific recipe (3), graphs break its vocabulary ingredient three ways (4), the field
              is running four competing bets to fix that (5), and the data ingredient is being unlocked at industrial
              scale (6). Here&apos;s what remains genuinely open — each of these is a live research problem:
            </p>
            <ul>
              <li>
                <strong>The vocabulary question.</strong> Still no graph analogue of subword tokens. Every current
                answer (relation interactions, text, computation trees, typed feature groups) trades generality for
                something. Is a universal one even possible, or are domain vocabularies the end state?
              </li>
              <li>
                <strong>Feature grouping granularity.</strong> The GraphBFF excerpt&apos;s parting open question: grouping
                features enables unseen schemas but caps expressivity, and choosing the grouping is currently craft,
                not science.
              </li>
              <li>
                <strong>What&apos;s the pretraining universe?</strong> &quot;Train on the web&quot; had an obvious meaning for
                text. Which graphs, mixed how, define a general graph prior? (GraphBFF punts on cross-<em>company</em>{' '}
                transfer; molecular graphs are explicitly out of scope of its recipe.)
              </li>
              <li>
                <strong>Evaluation.</strong> If pretraining data is private, how does anyone compare GFMs? The
                benchmark-reform position paper argues this is the field&apos;s bottleneck; RelBench is the current
                best answer for relational data.
              </li>
              <li>
                <strong>Compute-optimal training on graphs.</strong> Chinchilla-style budgeting assumes cost scales
                with tokens; on graphs, per-example cost depends on neighborhood sampling, so the optimal
                model/data split is graph-dependent. Nobody has the general answer.
              </li>
              <li>
                <strong>Emergence.</strong> LLMs surprised everyone with in-context learning. Relational FMs
                (KumoRFM) are showing early ICL on databases. What else emerges at 10× current scale?
              </li>
            </ul>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🎓',
        title: 'A reading path that works',
        body: (
          <>
            (1) Distill&apos;s GNN intro for foundations → (2) Mao et al.&apos;s position paper for the problem statement →
            (3) Galkin &amp; Bronstein&apos;s blog for the model landscape → (4) ULTRA + GraphAny papers as case studies →
            (5) GraphBFF for the scale frontier → (6) RelBench hands-on to actually build something. Then follow the
            LoG conference and the awesome-lists for the current wave.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'm7-q1',
            prompt: 'Capstone: a colleague says "GFMs failed — there\'s still no GPT for graphs." What\'s the most accurate correction?',
            options: [
              { text: 'They\'re right; nothing transfers across graphs', explain: 'Demonstrably false — ULTRA transfers across 57 KGs, GraphAny across 30+ graphs, KumoRFM across databases, GraphBFF across 10 industrial tasks.' },
              { text: 'Domain-scoped GFMs already work (KGs, molecules, relational data), scaling laws hold when data exists, and the open problem is a universal vocabulary — not existence', correct: true, explain: 'The precise state of the field: foundation-model behavior is proven within domains; cross-domain universality is the frontier.' },
              { text: 'GPT-4 already solves all graph tasks, so GFMs are unnecessary', explain: 'LLMs on serialized graphs need orders of magnitude more parameters to match graph-native models, and benchmark studies (GraphArena) show them hallucinating on large instances.' },
            ],
          },
          {
            id: 'm7-q2',
            prompt: 'Capstone: why does the compute-optimal ("Chinchilla") question have no clean answer for graphs yet?',
            options: [
              { text: 'Graph GPUs are slower', explain: 'Hardware isn\'t the issue — accounting is.' },
              { text: 'Per-example training cost depends on sampled neighborhood size, which varies by graph — so the model-vs-data trade-off is graph-conditional', correct: true, explain: 'The N-vs-D budgeting math assumes uniform per-token cost. On graphs, one "example" might expand a 10-node or 10,000-node neighborhood — GraphBFF flags this as an open problem.' },
              { text: 'Scaling laws don\'t exist for graphs', explain: 'They\'ve now been demonstrated (GraphBFF, GNoME) — what\'s missing is the *optimal allocation* rule, not the laws.' },
            ],
          },
          {
            id: 'm7-q3',
            prompt: 'Capstone: which pairing of "vocabulary bet" → exemplar model is WRONG?',
            options: [
              { text: 'Relation-interaction structure → ULTRA', explain: 'That pairing is right — it\'s ULTRA\'s core trick.' },
              { text: 'Everything as text → One-for-All', explain: 'That pairing is right — OFA embeds text descriptions of all nodes/edges.' },
              { text: 'Typed feature groups at scale → PRODIGY', correct: true, explain: 'Wrong pairing, so it\'s the answer: PRODIGY\'s bet is in-context learning via prompt graphs. Typed-feature-group models are FT-Transformer descendants like G2T-FM and GraphBFF.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Foundation Models in Graph & Geometric Deep Learning — Galkin & Bronstein (2024)', href: 'https://towardsdatascience.com/foundation-models-in-graph-geometric-deep-learning-f363e2576f58/', note: 'the survey blog to read first' },
          { label: 'Graph & Geometric ML in 2024 (Part I) — Galkin (2024)', href: 'https://towardsdatascience.com/graph-geometric-ml-in-2024-where-we-are-and-whats-next-part-i-theory-architectures-3af5d38376e1/', note: 'yearly state of the field' },
          { label: 'Learning on Graphs (LoG) conference', href: 'https://logconference.org/', note: 'the field\'s dedicated venue; talks free online' },
          { label: 'Awesome-Foundation-Models-on-Graphs — companion repo to the Wang et al. survey', href: 'https://github.com/Zehong-Wang/Awesome-Foundation-Models-on-Graphs', note: 'continuously updated paper list' },
          { label: 'GFMPapers — companion repo to the Liu et al. survey', href: 'https://github.com/BUPT-GAMMA/GFMPapers' },
          { label: 'RelBench tutorials — build a relational GNN in ~1 hour', href: 'https://relbench.stanford.edu/' },
          { label: 'Stanford CS224W: Machine Learning with Graphs', href: 'https://web.stanford.edu/class/cs224w/' },
        ],
      },
    ],
  },
]
