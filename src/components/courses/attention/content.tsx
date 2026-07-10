import { ReactNode } from 'react'
import type { CourseModule } from '../engine/types'
import { BLOCK_SUBCHAPTERS } from './subchapters'
import { EFFICIENCY_SUBCHAPTERS } from './efficiencySubchapters'

function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export const COURSE_TITLE = 'Attention, Everywhere'
export const COURSE_TAGLINE = 'One mechanism from transformers to vision to graph transformers'

export const MODULES: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'attention',
    navLabel: '1. Attention itself',
    title: 'Attention, from scratch',
    subtitle: 'Queries, keys, values — context as a weighted average',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Here is the problem attention solves. The word &quot;it&quot; means nothing by itself — in{' '}
              <em>&quot;The animal didn&apos;t cross the street because it was too tired&quot;</em>, &quot;it&quot; means{' '}
              <em>the animal</em>. A model processing &quot;it&quot; needs a way to reach back and pull in the right
              context. Older architectures squeezed the whole sentence through a fixed-size bottleneck;{' '}
              <strong>attention</strong> instead lets every token look at every other token directly and decide,
              per pair, how much to care.
            </p>
            <p>The mechanism is three learned projections of each token&apos;s vector, with a job each:</p>
            <ul>
              <li><strong>Query</strong> — &quot;what am I looking for?&quot; (for &quot;it&quot;: <em>something a pronoun could refer to</em>)</li>
              <li><strong>Key</strong> — &quot;what do I offer?&quot; (for &quot;animal&quot;: <em>I&apos;m a concrete noun, a good referent</em>)</li>
              <li><strong>Value</strong> — &quot;what do I actually hand over if you pick me?&quot;</li>
            </ul>
            <p>
              Score every query against every key with a dot product, scale by 1/√d so the numbers stay tame,
              softmax each row into weights that sum to 1, and output the weighted average of the values. That
              single formula — <code>softmax(QKᵀ/√d)·V</code> — is the whole thing. Try it:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'attention-lab' },
      {
        kind: 'callout',
        icon: '🎚️',
        title: 'What the temperature slider is really showing',
        body: (
          <>
            Softmax is a knob between &quot;hard lookup&quot; and &quot;uniform blur&quot;. Sharp attention behaves like a
            dictionary lookup (one token gets ~all the weight); soft attention blends broadly. Real models learn
            where on that spectrum each head should sit — and the 1/√d scaling in the formula exists precisely to
            keep the softmax out of the razor-sharp regime early in training.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am1-q1',
            prompt: 'In attention, the output vector for a token is…',
            options: [
              { text: 'the value vector of the single most relevant token', explain: 'That would be a hard lookup. Softmax gives a *soft* selection — every token contributes, weighted.' },
              { text: 'a weighted average of all tokens\' value vectors, with weights from softmax(query·keys)', correct: true, explain: 'Exactly the formula: scores → softmax weights (summing to 1) → blend of values. Context as a weighted average.' },
              { text: 'the sum of the query and key vectors', explain: 'Queries and keys only produce the *scores*; what flows to the output is values.' },
            ],
          },
          {
            id: 'am1-q2',
            prompt: 'Why divide the dot products by √d before the softmax?',
            options: [
              { text: 'To make the math run faster', explain: 'A scalar divide is computationally free either way — the reason is numerical, not speed.' },
              { text: 'Because large-dimension dot products grow large, pushing softmax into a near-one-hot regime with vanishing gradients', correct: true, explain: 'With d-dimensional random vectors the dot products scale like √d; unscaled, softmax saturates and gradients die. The paper introduced the scaling for exactly this.' },
              { text: 'To keep weights positive', explain: 'Softmax already guarantees positive weights summing to 1, at any scale.' },
            ],
          },
          {
            id: 'am1-q3',
            prompt: 'Turn on the causal mask with "it" selected. What changed, and what model family did you just build?',
            options: [
              { text: 'Nothing changes — the mask only matters during training', explain: 'The mask changes the forward pass itself: try a query early in the sentence and watch the future weights vanish.' },
              { text: 'Future tokens get zero weight and the rest renormalize — this is GPT-style decoding, where each position may only see the past', correct: true, explain: 'Causal masking is the one-line difference between a bidirectional encoder (BERT) and an autoregressive decoder (GPT). Hold on to "masking changes the model family" — it becomes the main theme in module 5.' },
              { text: 'The weights stop summing to 1', explain: 'Softmax renormalizes over the surviving (past) tokens — the sum is still exactly 1.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Attention Is All You Need — Vaswani et al. (NeurIPS 2017)', href: 'https://arxiv.org/abs/1706.03762', note: 'the original; §3.2 is this module' },
          { label: 'The Illustrated Transformer — Jay Alammar (2018)', href: 'https://jalammar.github.io/illustrated-transformer/', note: 'the classic visual walkthrough (source of this sentence example)' },
          { label: 'Attention in transformers, step-by-step — 3Blue1Brown (2024)', href: 'https://www.3blue1brown.com/lessons/attention', note: 'the best animated intuition for Q/K/V' },
          { label: 'Transformer Explainer — Polo Club, Georgia Tech (2024)', href: 'https://poloclub.github.io/transformer-explainer/', note: 'runs a live GPT-2 in your browser' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'block',
    navLabel: '2. The transformer block',
    title: 'Multi-head attention & the block',
    subtitle: 'Heads specialize; residuals make it stackable',
    minutes: 10,
    subchapters: BLOCK_SUBCHAPTERS,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              One attention pattern per layer is a bottleneck: &quot;it&quot; needs its referent, but it <em>also</em>{' '}
              needs the previous word for syntax and its neighbors for phrasing — different relationships,
              simultaneously. So the transformer runs several <strong>heads</strong> in parallel, each with its own
              learned Q/K/V projections in a lower-dimensional subspace, each free to specialize. Flip between
              these three (all attending for the same query):
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'multi-head' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Heads&apos; outputs are concatenated and mixed by one output projection — cheap, and interpretability
              work keeps finding real heads with exactly these kinds of specialties (previous-token heads, and the
              famous <em>induction heads</em> that drive in-context learning).
            </p>
            <p>
              Attention alone isn&apos;t a model, though. The full <strong>transformer block</strong> wraps it with
              three pieces of glue that make 100-layer stacks trainable. Click around — and when a component
              hooks you, it has its own deep dive: <strong>2.1</strong> embeddings &amp; positions,{' '}
              <strong>2.2</strong> inside multi-head, <strong>2.3</strong> residuals &amp; norms,{' '}
              <strong>2.4</strong> the FFN (in the sidebar, right under this module):
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'block-diagram' },
      {
        kind: 'callout',
        icon: '🧠',
        title: 'The division of labor to remember',
        body: (
          <>
            <strong>Attention communicates; the FFN computes.</strong> Attention is the only place tokens exchange
            information; the feed-forward network (≈2/3 of the parameters) then processes each token privately.
            And because attention is order-blind by construction, position must be injected — added embeddings
            originally; rotations of Q/K (RoPE) or distance-penalties on scores (ALiBi) in modern LLMs.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am2-q1',
            prompt: 'What does each attention head have that the others don\'t?',
            options: [
              { text: 'Its own learned Q/K/V projection matrices (its own subspace)', correct: true, explain: 'Same mechanism, different learned projections — which is why heads specialize into different relationship-detectors.' },
              { text: 'Its own feed-forward network', explain: 'The FFN sits after attention and is shared by the whole layer — heads differ only in their projections.' },
              { text: 'Its own vocabulary', explain: 'All heads read the same token representations; nothing about the vocabulary changes per head.' },
            ],
          },
          {
            id: 'am2-q2',
            prompt: 'Why are residual connections (the ⊕ adds) so important?',
            options: [
              { text: 'They reduce the parameter count', explain: 'Residuals add no parameters and remove none — they change the *shape of the computation*, not its size.' },
              { text: 'Each sublayer ADDS a small edit to an untouched copy of its input, so signals and gradients flow through deep stacks — layers compose edits instead of replacing information', correct: true, explain: 'The "residual stream" highway is what makes 96-layer GPTs trainable, and it\'s why output shape = input shape and blocks stack like LEGO.' },
              { text: 'They make attention faster', explain: 'Speed is unchanged — an add is negligible. Trainability at depth is the win.' },
            ],
          },
          {
            id: 'am2-q3',
            prompt: 'Shuffle a sentence\'s words and feed it to attention with NO positional information. What happens?',
            options: [
              { text: 'The model errors out', explain: 'It runs fine — that\'s the problem. Nothing in QKᵀ knows about order.' },
              { text: 'Attention produces the same set of outputs — it\'s order-blind, which is why positions must be injected (embeddings, RoPE, ALiBi)', correct: true, explain: 'Attention treats input as a *set*. Word order is real information, so every transformer smuggles position in somehow — added embeddings, rotated Q/K (RoPE), or score biases (ALiBi).' },
              { text: 'Attention automatically infers the correct order', explain: 'There\'s nothing to infer from — the mechanism literally cannot see index information without positional encoding.' },
            ],
          },
          {
            id: 'am2-q4',
            prompt: 'Where do most of a transformer\'s parameters live?',
            options: [
              { text: 'In the attention projections', explain: 'Attention matrices are substantial but not the majority.' },
              { text: 'In the feed-forward networks (~2/3 of parameters)', correct: true, explain: 'The FFN expands to ~4× the model width and back, twice per block — that\'s where the bulk of parameters (and much of the stored knowledge) sits.' },
              { text: 'In the positional encodings', explain: 'Positional information is nearly free — a tiny table, or zero parameters for RoPE/ALiBi.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'The Annotated Transformer — Harvard NLP (2018, refreshed 2022)', href: 'https://nlp.seas.harvard.edu/annotated-transformer/', note: 'the paper, implemented line by line' },
          { label: 'RoFormer: Rotary Position Embedding (RoPE) — Su et al. (2021)', href: 'https://arxiv.org/abs/2104.09864', note: 'positions as rotations of Q/K — the LLM default' },
          { label: 'Train Short, Test Long (ALiBi) — Press et al. (ICLR 2022)', href: 'https://arxiv.org/abs/2108.12409', note: 'positions as linear score penalties; length extrapolation' },
          { label: 'A Mathematical Framework for Transformer Circuits — Elhage et al., Anthropic (2021)', href: 'https://transformer-circuits.pub/2021/framework/index.html', note: 'residual-stream view; introduces induction heads' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'efficiency',
    navLabel: '3. Taming the n²',
    title: 'The quadratic problem and its fixes',
    subtitle: 'KV caches, fewer heads, smarter kernels, sparser masks',
    minutes: 9,
    subchapters: EFFICIENCY_SUBCHAPTERS,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Full attention scores every pair: n tokens → n² work. Double your context, quadruple the compute —
              and at generation time there&apos;s a second tax: to avoid recomputing keys and values for the whole
              history at every step, decoders cache them (the <strong>KV cache</strong>), which for long contexts
              becomes gigabytes of memory traffic per token. The modern fixes attack from three directions:
            </p>
            <ul>
              <li>
                <strong>Shrink the KV cache.</strong> <A href="https://arxiv.org/abs/1911.02150">Multi-Query
                Attention</A> shares one K/V head across all query heads;{' '}
                <A href="https://arxiv.org/abs/2305.13245">GQA</A> interpolates — a few K/V heads shared by
                groups of query heads (Llama-style);{' '}
                <A href="https://arxiv.org/abs/2405.04434">Multi-head Latent Attention</A> (DeepSeek-V2) goes
                further and compresses the whole cache into a low-rank latent vector.
              </li>
              <li>
                <strong>Compute the same thing, smarter.</strong>{' '}
                <A href="https://arxiv.org/abs/2205.14135">FlashAttention</A> changes no math at all: it&apos;s an
                IO-aware kernel that tiles the computation so the n×n matrix never materializes in GPU main
                memory (HBM) — exact attention, several times faster. The lesson: the bottleneck was memory
                movement, not FLOPs.
              </li>
              <li>
                <strong>Score fewer pairs.</strong> <A href="https://arxiv.org/abs/2004.05150">Longformer</A> and{' '}
                <A href="https://arxiv.org/abs/2007.14062">BigBird</A> use windows + a few global tokens;{' '}
                <A href="https://arxiv.org/abs/2310.06825">Mistral</A> ships sliding-window attention in
                production; <A href="https://arxiv.org/abs/2006.16236">linear attention</A> reorders the math to
                dodge n² entirely (with quality trade-offs). Play with what &quot;fewer pairs&quot; looks like:
              </li>
            </ul>
          </>
        ),
      },
      { kind: 'widget', widget: 'mask-lab-efficiency' },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-q1',
            prompt: 'FlashAttention makes attention several times faster while computing the exact same result. How?',
            options: [
              { text: 'It approximates the softmax with a cheaper function', explain: 'No approximation — "exact attention" is the headline claim. The trick is elsewhere.' },
              { text: 'It tiles the computation to minimize reads/writes to GPU main memory, never materializing the n×n matrix', correct: true, explain: 'IO-awareness: attention was bottlenecked on memory bandwidth between HBM and on-chip SRAM, not on arithmetic. Restructure the loops, keep tiles on-chip, win.' },
              { text: 'It skips attention for unimportant tokens', explain: 'That\'s the sparse-mask family (Longformer/BigBird). FlashAttention computes every pair — just with drastically less memory traffic.' },
            ],
          },
          {
            id: 'am3-q3',
            prompt: 'With sliding-window attention (window w), a token can\'t directly see tokens beyond w positions back. How do such models still use long context?',
            options: [
              { text: 'They can\'t — information outside the window is lost', explain: 'Direct attention is lost per layer, but the network is deep…' },
              { text: 'Stacked layers relay information: each layer extends effective reach by w, like a receptive field growing with depth', correct: true, explain: 'Layer 1 sees w back; layer 2 sees information that already traveled w, reaching 2w; and so on. If that sounds exactly like message passing hops in a GNN — module 5 is waiting.' },
              { text: 'They secretly fall back to full attention on long inputs', explain: 'The whole point is *not* paying O(n²); the window stays fixed, depth does the relaying.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'FlashAttention — Dao et al. (NeurIPS 2022)', href: 'https://arxiv.org/abs/2205.14135', note: 'plus FlashAttention-2 (ICLR 2024): arxiv.org/abs/2307.08691' },
          { label: 'GQA: Grouped-Query Attention — Ainslie et al. (EMNLP 2023)', href: 'https://arxiv.org/abs/2305.13245' },
          { label: 'Fast Transformer Decoding (Multi-Query Attention) — Shazeer (2019)', href: 'https://arxiv.org/abs/1911.02150' },
          { label: 'DeepSeek-V2 (Multi-head Latent Attention) — DeepSeek-AI (2024)', href: 'https://arxiv.org/abs/2405.04434', note: 'KV cache compressed into a latent vector' },
          { label: 'Longformer — Beltagy et al. (2020)', href: 'https://arxiv.org/abs/2004.05150' },
          { label: 'Big Bird — Zaheer et al. (NeurIPS 2020)', href: 'https://arxiv.org/abs/2007.14062', note: 'window + global + random; provably universal' },
          { label: 'Transformers are RNNs (linear attention) — Katharopoulos et al. (ICML 2020)', href: 'https://arxiv.org/abs/2006.16236' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'vision',
    navLabel: '4. Vision Transformers',
    title: 'Images become token sequences',
    subtitle: 'Patchify, add [CLS], reuse the exact same block',
    minutes: 9,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              For a decade, vision belonged to convolutions — architectures hand-built around locality and
              translation. The <strong>Vision Transformer</strong> (ViT) asked: what if we change <em>nothing</em>{' '}
              about the transformer and instead change the data to fit it? Cut the image into fixed patches
              (16×16 in the paper — &quot;an image is worth 16×16 words&quot;), flatten each patch, project it linearly
              to a token vector, add position embeddings, prepend a learnable <code>[CLS]</code> token whose final
              state becomes the image representation — and feed it all to module 2&apos;s block, unmodified.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'patchify' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              The catch: by throwing away convolution, ViT throws away built-in locality — and has to{' '}
              <em>learn</em> that nearby pixels matter. With ImageNet-scale data it underperforms CNNs; with
              hundreds of millions of images, it wins — the foundation-model trade of inductive bias for scale.
              The lineage that follows patches the gaps:
            </p>
            <ul>
              <li><strong>DeiT</strong> — trains ViT on ImageNet-1k alone by distilling from a CNN teacher through a dedicated distillation token.</li>
              <li><strong>Swin</strong> — computes attention in local windows, <em>shifted</em> between layers so windows overlap over depth; linear cost in image size, hierarchical features. (Module 3&apos;s masks, in 2D.)</li>
              <li><strong>MAE</strong> — self-supervised pretraining by masking ~75% of patches and reconstructing them; the encoder only ever sees the visible quarter, so it&apos;s cheap.</li>
              <li><strong>DINOv3 / SigLIP 2</strong> (2025) — today&apos;s frontier: self-supervised and language-aligned ViT backbones whose frozen features transfer everywhere.</li>
            </ul>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🔍',
        title: 'Notice the pattern forming',
        body: (
          <>
            Text: tokens in a sequence. Images: patches in a grid. In both cases the transformer block never
            changed — only the <em>tokenization</em> and the <em>attention wiring</em> (full vs. windowed) did.
            Keep asking &quot;what are the tokens, what is the wiring?&quot; — it&apos;s about to become the whole story.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am4-q1',
            prompt: 'How does a ViT turn an image into transformer input?',
            options: [
              { text: 'It runs a CNN first and feeds the feature map to attention', explain: 'Hybrid variants exist, but the pure ViT\'s point was no convolution at all.' },
              { text: 'Fixed-size patches, each flattened and linearly projected to a vector, plus position embeddings and a [CLS] token', correct: true, explain: 'Patchify → linear projection → positions → [CLS] → the standard block stack. The model is the same; the data was reshaped.' },
              { text: 'One token per pixel', explain: 'A 224×224 image would be 50k tokens → 2.5B attention pairs per layer. Patches exist precisely to avoid this (see the pair-counter in the lab).' },
            ],
          },
          {
            id: 'am4-q2',
            prompt: 'In the lab, switching 8×8 patches to 2×2 patches makes the picture crisper for the model. What\'s the price?',
            options: [
              { text: 'Tokens go 5 → 65, and attention pairs go 25 → 4,225: quadratic blowup', correct: true, explain: 'Finer patches = longer sequences = n² pain. This is module 3\'s problem wearing a vision costume — and why Swin\'s windowed attention exists.' },
              { text: 'The image loses color information', explain: 'Color is preserved either way; only the granularity of tokenization changes.' },
              { text: 'The [CLS] token stops working', explain: '[CLS] is agnostic to patch count — cost is the issue.' },
            ],
          },
          {
            id: 'am4-q3',
            prompt: 'Why does a plain ViT need much more training data than a CNN to match it?',
            options: [
              { text: 'Transformers have fewer parameters', explain: 'Usually the opposite — and parameter count isn\'t the mechanism here.' },
              { text: 'CNNs bake in locality and translation-equivariance; ViT must learn those regularities from data', correct: true, explain: 'Convolution is a hard-coded prior about images. Attention starts from zero priors — costly at small scale, liberating at large scale. (The same inductive-bias-vs-scale trade shows up for graphs in the companion GFM course.)' },
              { text: 'Images are larger files than text', explain: 'File size is irrelevant; the gap is about inductive bias.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'An Image is Worth 16x16 Words (ViT) — Dosovitskiy et al. (ICLR 2021)', href: 'https://arxiv.org/abs/2010.11929' },
          { label: 'DeiT: data-efficient image transformers — Touvron et al. (ICML 2021)', href: 'https://arxiv.org/abs/2012.12877', note: 'distillation token' },
          { label: 'Swin Transformer — Liu et al. (ICCV 2021, best paper)', href: 'https://arxiv.org/abs/2103.14030', note: 'shifted windows; linear complexity' },
          { label: 'Masked Autoencoders (MAE) — He et al. (CVPR 2022)', href: 'https://arxiv.org/abs/2111.06377', note: 'mask 75% of patches, reconstruct' },
          { label: 'DINOv3 — Siméoni et al., Meta (2025)', href: 'https://arxiv.org/abs/2508.10104' },
          { label: 'SigLIP 2 — Tschannen et al., Google DeepMind (2025)', href: 'https://arxiv.org/abs/2502.14786' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'graphs',
    navLabel: '5. Attention is a graph',
    title: 'Attention is a graph',
    subtitle: 'The mask is the adjacency matrix — the course\'s one big punchline',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Line up what you&apos;ve seen. Module 1: a causal mask decides who can attend to whom. Module 3:
              sliding windows and sparse patterns restrict which pairs get scored. Module 4: Swin confines
              attention to local windows. Every one of these is the same object: a rule for which token pairs are
              connected. There&apos;s a name for &quot;a set of things plus which pairs are connected&quot; — <strong>a
              graph</strong>. The attention matrix is a weighted adjacency matrix; the mask is its edge set.
            </p>
            <p>Flip through the modes and read both panels — they&apos;re the same information twice:</p>
          </>
        ),
      },
      { kind: 'widget', widget: 'mask-lab-graphs' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Once you see it, the equivalences fall out. A transformer is message passing on the{' '}
              <em>complete</em> graph of tokens, with attention as the learned aggregation.{' '}
              <A href="https://arxiv.org/abs/1710.10903">GAT</A> (2018) is literally attention restricted to a
              graph&apos;s real edges — it cites the transformer as inspiration. Depth relays information across the
              graph exactly like sliding-window layers relay context: k layers = k hops of reach. Over-smoothing
              in deep GNNs and washed-out uniform attention are the same failure in two dialects.
            </p>
            <p>
              The equivalence is also a warning in both directions. Full attention ignores structure you know is
              real (and pays n² for the privilege); a hard graph mask trusts structure that might be wrong or
              incomplete. Which pairs <em>should</em> be connected is a modeling decision — the same
              &quot;graph construction is a choice&quot; lesson the GFM world learned the hard way.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🔗',
        title: 'One sentence to keep',
        body: (
          <>
            <strong>Transformers are GNNs on the complete token graph; GNNs are transformers with an opinionated
            mask.</strong> (Chaitanya Joshi&apos;s essay of almost this name is the canonical writeup — and its 2025
            update adds a twist: full attention won partly because dense matrix multiplies fit GPUs, a{' '}
            <em>hardware</em> lottery, not just a modeling one.)
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am5-q1',
            prompt: 'In graph terms, standard full self-attention over n tokens is message passing on…',
            options: [
              { text: 'a path graph connecting consecutive tokens', explain: 'That\'s roughly what a sliding window of w=1 would be — full attention is far denser.' },
              { text: 'the complete graph: every token adjacent to every token, with learned edge weights', correct: true, explain: 'All n² pairs are scored; softmax assigns the edge weights. The transformer never had to *find* structure because it connects everything and lets weights decide.' },
              { text: 'a random graph resampled each layer', explain: 'The wiring is deterministic (complete); only the *weights* change with content.' },
            ],
          },
          {
            id: 'am5-q2',
            prompt: 'GAT computes attention only over each node\'s neighbors. In mask language, GAT is…',
            options: [
              { text: 'full attention with extra positional encodings', explain: 'No — most pairs are simply never scored in GAT.' },
              { text: 'a transformer layer whose attention mask is the graph\'s adjacency (plus self-loops)', correct: true, explain: 'Exactly what the lab\'s "graph mask" mode shows: same softmax attention, edge set supplied by the data instead of assumed complete.' },
              { text: 'a completely unrelated mechanism', explain: 'The GAT paper itself credits transformer self-attention — it\'s the same mechanism, masked.' },
            ],
          },
          {
            id: 'am5-q3',
            prompt: 'Sliding-window attention needs depth to move information beyond the window; GNNs need depth to reach beyond k hops. This shared behavior is because…',
            options: [
              { text: 'both use the same learning rate schedules', explain: 'Optimization settings have nothing to do with it.' },
              { text: 'both are local message passing on a sparse graph, so reach grows one "hop" per layer — receptive fields are a wiring property, not a modality property', correct: true, explain: 'Same math, different graphs: a path-like token graph vs. an arbitrary data graph. This is the deep reason the two literatures keep reinventing each other\'s tricks.' },
              { text: 'it\'s a coincidence', explain: 'It\'s structural: locality in the wiring implies per-layer reach limits, in any modality.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Graph Attention Networks — Veličković et al. (ICLR 2018)', href: 'https://arxiv.org/abs/1710.10903', note: 'attention over neighborhoods' },
          { label: 'Transformers are Graph Neural Networks — Joshi, The Gradient (2020)', href: 'https://thegradient.pub/transformers-are-graph-neural-networks/', note: 'the essay behind this module' },
          { label: 'Transformers are Graph Neural Networks (technical version) — Joshi (2025)', href: 'https://arxiv.org/abs/2506.22084', note: 'adds the hardware-lottery argument' },
          { label: 'Attention Is All You Need — Vaswani et al. (2017)', href: 'https://arxiv.org/abs/1706.03762', note: 'reread §3.2 with graph eyes' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'graph-transformers',
    navLabel: '6. Graph transformer blocks',
    title: 'Graph transformer blocks',
    subtitle: 'Structure as bias, hybrids, and typed attention at billion scale',
    minutes: 11,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              If attention is a graph, you can run it on actual graphs two ways. The mask way (module 5) is
              strict: only real edges. The <strong>bias</strong> way keeps full attention but tells it about the
              graph: <A href="https://arxiv.org/abs/2106.05234">Graphormer</A> adds three structural signals —
              node centrality added to features, shortest-path distances as attention biases, and edge-feature
              terms — and its entry (ensembled with ExpC) won the OGB-LSC molecular property track at KDD Cup
              2021. <A href="https://arxiv.org/abs/2106.03893">SAN</A> gets positional information from the graph
              Laplacian&apos;s spectrum instead. The practical recipe,{' '}
              <A href="https://arxiv.org/abs/2205.12454">GraphGPS</A>, hybridizes: a local message-passing layer
              and a global attention layer side by side in every block — local wiring you trust, global reach
              when it matters — with <A href="https://arxiv.org/abs/2303.06147">Exphormer</A> supplying a sparse
              near-equivalent of the global half via expander graphs (module 3&apos;s trick, on graphs).
            </p>
            <p>
              Then reality adds types. Enterprise graphs aren&apos;t sets of identical nodes — users, items, and shops
              connected by <em>bought</em>, <em>viewed</em>, <em>sold-by</em> mean different things per relation.
              Making one attention serve all of them wastes capacity; giving each relation its own attention is
              the idea behind heterogeneous graph transformers:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'typed-attention' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              <A href="https://arxiv.org/abs/2003.01332">HGT</A> (WWW 2020) parameterizes attention by the{' '}
              <strong>meta-relation</strong> ⟨source type, edge type, target type⟩ — per-node-type Q/K/V
              projections with per-edge-type interaction matrices (its predecessor{' '}
              <A href="https://arxiv.org/abs/1903.07293">HAN</A> did it with hand-picked meta-paths and two levels
              of attention). And at the frontier,{' '}
              <A href="https://arxiv.org/abs/2602.04768">GraphBFF</A> (Meta, 2026) scales exactly this design to
              1.4B parameters: <strong>TCA</strong>, type-conditioned attention with a separate sparse softmax per
              edge-type subset (~85% of all parameters), fused with <strong>TAA</strong>, a type-agnostic shared
              attention over sampled neighborhoods — with a proof that the pair is strictly more expressive than
              either alone, and clean scaling laws once data hits billions of edges.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🧬',
        title: 'The arc, completed',
        body: (
          <>
            Multi-head attention (module 2) gave one sequence several <em>learned</em> relationship-detectors.
            Typed attention gives a graph one attention per <em>declared</em> relationship. Same instinct —
            relationships deserve their own subspaces — first discovered by the optimizer, then written into the
            architecture by the schema.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am6-q1',
            prompt: 'Graphormer keeps FULL attention over all node pairs. How does the graph structure get in?',
            options: [
              { text: 'It doesn\'t — Graphormer ignores the edges', explain: 'It very much uses them — just not as a hard mask.' },
              { text: 'As learned biases: centrality added to node features, shortest-path distance biasing each attention score, edge features contributing along paths', correct: true, explain: 'Structure-as-bias instead of structure-as-mask: every pair is scored, but the graph tilts the scores. Soft trust in the edges rather than hard.' },
              { text: 'By converting the graph to text first', explain: 'That\'s an LLM-for-graphs strategy — Graphormer is a native graph transformer.' },
            ],
          },
          {
            id: 'am6-q2',
            prompt: 'GraphGPS puts an MPNN layer AND a global attention layer in every block. What failure of each half is the other covering?',
            options: [
              { text: 'MPNN is local (k-hop reach, over-smoothing risk); full attention is structure-blind and O(n²) — each supplies what the other lacks', correct: true, explain: 'Local wiring captures the graph you trust; the global channel carries long-range dependencies the edges miss. Best-of-both is the current default recipe.' },
              { text: 'MPNN can\'t use node features; attention can\'t use edges', explain: 'Both halves consume features, and both can be edge-aware — the split is local vs. global reach.' },
              { text: 'It\'s redundancy for fault tolerance', explain: 'Nothing is redundant — the two channels see genuinely different information.' },
            ],
          },
          {
            id: 'am6-q3',
            prompt: 'In the lab, switching to type-conditioned attention changed the softmax. What\'s the HGT/GraphBFF argument for a softmax PER edge type?',
            options: [
              { text: 'It\'s numerically more stable', explain: 'Stability isn\'t the motivation — semantics is.' },
              { text: '"viewed" and "bought" edges shouldn\'t compete through shared weights in one distribution — separate projections and softmaxes let each relation learn its own meaning', correct: true, explain: 'HGT indexes parameters by ⟨source type, edge type, target type⟩; GraphBFF\'s TCA runs a sparse softmax per edge-type subset. The typed structure of the data becomes typed structure in the attention.' },
              { text: 'It reduces parameters', explain: 'The opposite — per-type parameters are ~85% of GraphBFF\'s 1.4B. The bet is that heterogeneous capacity is worth it.' },
            ],
          },
          {
            id: 'am6-q4',
            prompt: 'Why does GraphBFF pair TCA (per-type attention) with TAA (one shared attention)?',
            options: [
              { text: 'TAA is a fallback in case TCA crashes', explain: 'Both run in every layer and are fused — it\'s architecture, not error handling.' },
              { text: 'Pure per-type attention silos information within relations; the shared channel lets everything interact in one latent space — and the paper proves the combination strictly more expressive than either alone', correct: true, explain: 'Type-conditioned capacity + type-agnostic mixing, fused by a learned FFN. Their Theorem 4.1 formalizes that you need both.' },
              { text: 'TAA handles text features specifically', explain: 'TAA is type-agnostic attention over sampled neighbors, not a text module.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Graphormer — Ying et al. (NeurIPS 2021)', href: 'https://arxiv.org/abs/2106.05234', note: 'centrality / spatial / edge encodings' },
          { label: 'SAN: Spectral Attention — Kreuzer et al. (NeurIPS 2021)', href: 'https://arxiv.org/abs/2106.03893' },
          { label: 'GraphGPS — Rampášek et al. (NeurIPS 2022)', href: 'https://arxiv.org/abs/2205.12454', note: 'the MPNN + attention hybrid recipe' },
          { label: 'Exphormer — Shirzad et al. (ICML 2023)', href: 'https://arxiv.org/abs/2303.06147', note: 'sparse attention via expander graphs' },
          { label: 'Heterogeneous Graph Transformer (HGT) — Hu et al. (WWW 2020)', href: 'https://arxiv.org/abs/2003.01332', note: 'meta-relation ⟨τ(s), φ(e), τ(t)⟩ attention' },
          { label: 'Heterogeneous Graph Attention Network (HAN) — Wang et al. (WWW 2019)', href: 'https://arxiv.org/abs/1903.07293' },
          { label: 'Billion-Scale Graph Foundation Models (GraphBFF) — Bechler-Speicher et al., Meta (2026)', href: 'https://arxiv.org/abs/2602.04768', note: 'TCA + TAA at 1.4B parameters' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'synthesis',
    navLabel: '7. One mental model',
    title: 'One mental model',
    subtitle: 'Tokens + wiring + one block — choosing attention for your data',
    minutes: 8,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>Every architecture in this course was three decisions wearing different clothes:</p>
            <ul>
              <li><strong>What are the tokens?</strong> Subwords (GPT) · image patches (ViT) · nodes and their features (graph transformers) · rows of a database (relational transformers).</li>
              <li><strong>What is the wiring?</strong> Complete graph (BERT/ViT) · causal DAG (GPT) · local windows (Mistral, Swin) · the data&apos;s own edges (GAT, HGT) · edges-as-bias over full attention (Graphormer) · hybrid local+global (GraphGPS) · typed edges with typed parameters (HGT, GraphBFF).</li>
              <li><strong>The block itself?</strong> Never changed. Attention communicates, the FFN computes, residuals + norms keep it trainable — from module 2 onward, everything was tokenization and wiring.</li>
            </ul>
            <p>
              Read architectures this way and the field stops looking like a zoo. &quot;New efficient LLM attention&quot;
              = sparser token wiring. &quot;New graph transformer&quot; = different trust level in the data&apos;s edges.
              &quot;Multimodal model&quot; = several tokenizers, one wiring. And when data has typed relationships at
              scale, the attention itself goes typed — which is where this course meets the{' '}
              {/* Full-page navigation is intentional: the XP window manager re-initializes from the URL. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/learn/graph-foundation-models">Graph Foundation Models course</a>: GraphBFF&apos;s typed
              transformer is bet #4 in that course&apos;s zoo, and its scaling laws are that course&apos;s module 6.
            </p>
          </>
        ),
      },
      {
        kind: 'callout',
        icon: '🎓',
        title: 'A reading path that works',
        body: (
          <>
            (1) The Illustrated Transformer, then the Annotated Transformer with code → (2) 3Blue1Brown&apos;s
            attention chapter for intuition → (3) FlashAttention + GQA to understand production LLMs → (4) ViT +
            Swin → (5) Joshi&apos;s &quot;Transformers are GNNs&quot; → (6) GraphGPS, HGT, then GraphBFF — and the GFM course
            next door for where graph-side attention is heading.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am7-q1',
            prompt: 'Capstone: rank these by how much of the n×n pair budget they actually compute — full attention, sliding window (w≪n), graph mask on a sparse graph.',
            options: [
              { text: 'Full > sliding window ≈ graph mask — full pays n², the sparse two pay per-edge', correct: true, explain: 'Full: all n² pairs. Window: n·w. Sparse graph: |E|, often ~linear in n. The mask IS the cost model.' },
              { text: 'They all compute the same pairs, just in different order', explain: 'The entire point of masks/windows is computing *fewer* pairs, not reordering them.' },
              { text: 'Graph mask is always the most expensive', explain: 'Only if the graph were near-complete — real graphs are sparse, so it\'s usually the cheapest.' },
            ],
          },
          {
            id: 'am7-q2',
            prompt: 'Capstone: which pairing is WRONG?',
            options: [
              { text: 'Swin → windowed attention with shifted windows', explain: 'That pairing is right — it\'s Swin\'s namesake trick.' },
              { text: 'Graphormer → hard mask restricting attention to graph edges', correct: true, explain: 'Wrong, so it\'s the answer: Graphormer keeps FULL attention and injects structure as biases (centrality, shortest-path, edge terms). The hard-mask description fits GAT.' },
              { text: 'MLA (DeepSeek-V2) → compressing the KV cache into a latent vector', explain: 'That pairing is right — it\'s what the name says.' },
            ],
          },
          {
            id: 'am7-q3',
            prompt: 'Capstone: a colleague must model a payment network (users, merchants, devices; transfers, logins, shared-card edges) and asks which attention to use. Your best first recommendation?',
            options: [
              { text: 'A plain GPT-style causal transformer over a serialized list of transactions', explain: 'Serializing throws away the graph and imposes a fake ordering; token-graph wiring should follow the data\'s real structure.' },
              { text: 'Typed graph attention — per-relation parameters (HGT-style meta-relations; GraphBFF\'s TCA+TAA at scale), since the edges are real, sparse, and semantically distinct', correct: true, explain: 'The data is a sparse typed graph: trust its edges (mask), respect its types (per-relation parameters), and add a shared channel so types interact. That\'s modules 5 and 6 doing actual work.' },
              { text: 'Full attention over all entities — let the model figure everything out', explain: 'Millions of entities → n² is instantly hopeless, and you\'d discard known, meaningful structure to boot.' },
            ],
          },
          {
            id: 'am7-q4',
            prompt: 'Capstone: multi-head attention and typed (per-relation) attention express the same underlying instinct. Which statement captures it?',
            options: [
              { text: 'More parameters always help', explain: 'Neither idea is about raw capacity — it\'s about *structured* capacity.' },
              { text: 'Different relationships deserve their own projection subspaces — heads discover them from data; typed attention assigns them from the schema', correct: true, explain: 'Module 2\'s heads specialize by optimization; module 6\'s types specialize by declaration. Same principle, discovered vs. designed.' },
              { text: 'Attention should always be sparse', explain: 'Sparsity is a separate (wiring) axis — heads and types are about parameterization.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'The Illustrated Transformer — Alammar', href: 'https://jalammar.github.io/illustrated-transformer/' },
          { label: 'The Annotated Transformer — Harvard NLP', href: 'https://nlp.seas.harvard.edu/annotated-transformer/' },
          { label: 'Attention, step-by-step — 3Blue1Brown', href: 'https://www.3blue1brown.com/lessons/attention' },
          { label: 'Transformer Explainer — Polo Club', href: 'https://poloclub.github.io/transformer-explainer/' },
          { label: 'Transformers are Graph Neural Networks — Joshi', href: 'https://thegradient.pub/transformers-are-graph-neural-networks/' },
          { label: 'Graph Foundation Models — the companion course on this site', href: '/learn/graph-foundation-models', note: 'where graph attention goes next' },
        ],
      },
    ],
  },
]
