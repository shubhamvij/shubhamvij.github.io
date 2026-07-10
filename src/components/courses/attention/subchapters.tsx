import type { CourseModule } from '../engine/types'

export const BLOCK_SUBCHAPTERS: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'block-embeddings',
    navLabel: '2.1 Embeddings & positions',
    title: 'Token embeddings & positional encodings',
    subtitle: 'How symbols become vectors, and how order sneaks back in',
    minutes: 7,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Before any attention happens, tokens must become vectors. The <strong>embedding matrix</strong> is a
              learned V×d lookup table — token id 4,242 means &quot;fetch row 4,242&quot;, nothing deeper. Those rows are
              ordinary weights, trained end-to-end, and they become the model&apos;s <em>interface</em> between
              discrete symbols and the continuous residual stream that every block edits. (Many models reuse the
              same matrix at the output to turn final vectors back into token logits — &quot;tied embeddings&quot;.)
            </p>
            <p>
              But there&apos;s a hole. Module 2 said attention is order-blind; here is the proof, running live:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'order-blind' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              So position must be <em>injected</em>. Every scheme answers two questions: <strong>where</strong>{' '}
              does position enter (added to embeddings once at the input, or applied inside attention at every
              layer?) and <strong>what</strong> does it encode (my absolute index, or my distance to you?).
              The four classic answers:
            </p>
            <ul>
              <li><strong>Sinusoidal</strong> (Transformer, 2017) — fixed sin/cos barcode added at the input. Absolute, zero parameters, defined for any length.</li>
              <li><strong>Learned absolute</strong> (GPT-2, BERT) — a trainable row per position, added at the input. Absolute, simple, cannot represent positions past the training length.</li>
              <li><strong>RoPE</strong> (2021; Llama, Qwen, DeepSeek) — rotate each Q/K dimension-pair by position×θ, inside attention, every layer. Scores depend only on relative offset.</li>
              <li><strong>ALiBi</strong> (2022) — no vectors at all: subtract slope×distance from each attention score. Relative, parameter-free, extrapolates well.</li>
            </ul>
          </>
        ),
      },
      { kind: 'widget', widget: 'position-lab' },
      {
        kind: 'callout',
        icon: '🧭',
        title: 'What today\'s stacks actually use',
        body: (
          <>
            RoPE won the LLM default slot: relative behavior, no extra parameters, and it composes with
            KV caches and FlashAttention. Its θ base has become the long-context tuning knob — scale it
            (NTK-aware scaling, YaRN) and a 4k-trained model stretches to 128k. ViTs mostly still use learned
            absolute embeddings (images are fixed-size grids), which is why ViTs (module 4) interpolate their
            position tables when image resolution changes.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am2-1-q1',
            prompt: 'Why does a transformer need positional information injected at all?',
            options: [
              { text: 'Because tokenizers output tokens in random order', explain: 'Tokenizers preserve order fine — the *attention mechanism* is what ignores it.' },
              { text: 'Because attention is permutation-equivariant: shuffle the inputs and the outputs shuffle identically, so word order carries zero information', correct: true, explain: 'Exactly what the Order-Blindness Lab shows — softmax(QKᵀ)V contains no index anywhere. Order must be smuggled in as data.' },
              { text: 'To make the softmax numerically stable', explain: 'That\'s the 1/√d scaling\'s job (module 1) — unrelated to position.' },
            ],
          },
          {
            id: 'am2-1-q2',
            prompt: 'A GPT-2-style model (learned absolute PEs, max length 1024) is fed 1500 tokens. What is the fundamental problem?',
            options: [
              { text: 'Positions 1024–1499 have no embedding row — the representation simply doesn\'t exist for them', correct: true, explain: 'A lookup table has exactly the rows it was built with. This is the extrapolation failure the Learned tab visualizes with "?" rows — and a core motivation for RoPE/ALiBi.' },
              { text: 'The KV cache overflows', explain: 'Memory is a real but separate concern (module 3) — the position table is the *representational* wall.' },
              { text: 'Attention becomes quadratically slow', explain: 'True at any length, and it degrades gracefully — unlike the missing rows, which are a hard failure.' },
            ],
          },
          {
            id: 'am2-1-q3',
            prompt: 'In the RoPE tab, "shift both +5" leaves the score untouched. What property is that, mechanically?',
            options: [
              { text: 'Q and K are rotated by angles proportional to their positions, so the angle between them — and hence their dot product — depends only on the relative offset m−n', correct: true, explain: 'Rotate both arrows by the same extra amount and the angle between them can\'t change. That\'s the entire trick: absolute positions in, relative positions out.' },
              { text: 'RoPE adds the same learned vector to both tokens', explain: 'RoPE adds nothing — it *rotates* Q and K inside attention. No position vectors exist anywhere in the model.' },
              { text: 'The softmax renormalizes away the shift', explain: 'The invariance is in the raw scores, before any softmax.' },
            ],
          },
          {
            id: 'am2-1-q4',
            prompt: 'ALiBi injects position by…',
            options: [
              { text: 'rotating value vectors', explain: 'Nothing rotates in ALiBi, and values are never touched by any PE scheme.' },
              { text: 'adding a learned embedding at the input', explain: 'ALiBi\'s headline is that it adds *no* embeddings at all.' },
              { text: 'subtracting slope × distance directly from each attention score, with a different slope per head', correct: true, explain: 'Pure score bias: near tokens are favored, far ones penalized, and the geometric slopes give heads different reaches. Because the rule is the same at any length, it extrapolates — "train short, test long".' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Attention Is All You Need §3.5 — Vaswani et al. (2017)', href: 'https://arxiv.org/abs/1706.03762', note: 'the sinusoidal original' },
          { label: 'Self-Attention with Relative Position Representations — Shaw et al. (2018)', href: 'https://arxiv.org/abs/1803.02155', note: 'the first relative-PE transformer' },
          { label: 'RoFormer: Rotary Position Embedding — Su et al. (2021)', href: 'https://arxiv.org/abs/2104.09864', note: 'RoPE — the LLM default' },
          { label: 'Train Short, Test Long (ALiBi) — Press et al. (ICLR 2022)', href: 'https://arxiv.org/abs/2108.12409' },
          { label: 'YaRN: Efficient Context Window Extension — Peng et al. (2023)', href: 'https://arxiv.org/abs/2309.00071', note: 'stretching RoPE to 128k' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'block-heads',
    navLabel: '2.2 Inside multi-head',
    title: 'Inside multi-head attention',
    subtitle: 'Heads are a slicing, W_O is the mixer, K/V is the cache',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Module 2 showed heads <em>specializing</em>; here&apos;s what they are mechanically. &quot;8 heads&quot; does not
              mean eight separate attention networks — it means the layer&apos;s W_Q, W_K, W_V matrices (each d×d)
              are <strong>sliced</strong> into 8 subspaces of d/8 dimensions each. Every head runs the identical
              softmax(QKᵀ/√d)·V, just inside its own low-rank slice. Then the head outputs are concatenated and
              multiplied by one more matrix, <strong>W_O</strong> — the unsung piece that lets heads&apos; writes mix
              into shared directions of the residual stream instead of living in sealed compartments.
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'head-matrix' },
      {
        kind: 'callout',
        icon: '🔬',
        title: 'The circuits view',
        body: (
          <>
            Interpretability work treats each head as a reader/writer on the residual stream: W_Q/W_K decide{' '}
            <em>where to look</em> (the QK circuit), W_V/W_O decide <em>what to copy and where to write it</em>{' '}
            (the OV circuit). Famous specimens found in real models: previous-token heads, induction heads that
            implement in-context copying, and heads you can ablate with almost no loss — many heads are
            redundant, which is part of why GQA-style K/V sharing works at all.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am2-2-q1',
            prompt: 'Doubling the head count h (holding d_model fixed) changes the attention parameter count how?',
            options: [
              { text: 'Doubles it — twice the heads, twice the weights', explain: 'The four projection matrices stay d×d regardless — watch the counter in the lab not move.' },
              { text: 'Not at all: the same four d×d matrices are just sliced into more, smaller subspaces (d_head halves)', correct: true, explain: 'Heads trade subspace dimension for pattern count at constant cost — the design axis is "how many relationships in parallel", not "how much capacity".' },
              { text: 'Halves it', explain: 'Nothing shrinks — the slicing is a reshape, not a reduction.' },
            ],
          },
          {
            id: 'am2-2-q2',
            prompt: 'What breaks if you delete W_O (just concatenate head outputs)?',
            options: [
              { text: 'Nothing — concatenation already has the right shape', explain: 'The shape is right (n×d), but each head\'s output would be locked to its own fixed 1/h-th of the residual stream — no cross-head mixing.' },
              { text: 'Heads can no longer write to overlapping directions of the residual stream, so their edits can\'t combine or interact', correct: true, explain: 'W_O is a learned change of basis from "head-slot coordinates" to the shared stream. It\'s also half of the OV circuit interpretability studies.' },
              { text: 'The softmax stops summing to 1', explain: 'Softmax happens per-head, well before concatenation.' },
            ],
          },
          {
            id: 'am2-2-q3',
            prompt: 'The KV cache a decoder drags around scales with…',
            options: [
              { text: 'the number of K/V heads × d_head (× layers × context) — which is exactly the dial GQA turns down', correct: true, explain: 'Per past token you store K and V for every K/V head. Query heads are free (recomputed each step); K/V heads are the memory. Module 3\'s MQA/GQA/MLA all attack this number.' },
              { text: 'the vocabulary size', explain: 'Vocabulary touches embeddings and logits, never the cache.' },
              { text: 'd_ff, the FFN width', explain: 'FFN activations aren\'t cached across steps — only attention\'s K and V are.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'The Annotated Transformer — Harvard NLP', href: 'https://nlp.seas.harvard.edu/annotated-transformer/', note: 'the slicing, in code' },
          { label: 'A Mathematical Framework for Transformer Circuits — Elhage et al. (2021)', href: 'https://transformer-circuits.pub/2021/framework/index.html', note: 'QK/OV circuits, residual-stream heads' },
          { label: 'Are Sixteen Heads Really Better than One? — Michel et al. (NeurIPS 2019)', href: 'https://arxiv.org/abs/1905.10650', note: 'most heads are prunable' },
          { label: 'GQA — Ainslie et al. (2023)', href: 'https://arxiv.org/abs/2305.13245', note: 'where the K/V-heads dial goes next (module 3)' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'block-residuals',
    navLabel: '2.3 Residuals & LayerNorm',
    title: 'Residuals & LayerNorm',
    subtitle: 'The glue: an identity highway plus a thermostat',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Strip the block to its skeleton and what remains is x → x + attention(x) → x + FFN(x): every
              sublayer <strong>adds an edit to an untouched copy</strong>. That untouched copy, flowing top to
              bottom, is the <strong>residual stream</strong> — think of it as the layer-to-layer memory bus that
              attention and FFNs read from and write small deltas back to. The payoff is gradient flow: the +x
              term contributes an identity to the Jacobian, so even a 96-layer GPT has an unobstructed gradient
              path from loss to layer 1. Watch what happens without it:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'residual-stream' },
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Normalization is the other half of the glue. <strong>LayerNorm</strong> standardizes each token&apos;s
              vector across its d features (mean 0, variance 1, then a learned scale/shift) — per token, so
              batch composition never matters, unlike BatchNorm. <strong>Where</strong> it sits changed history:
              the 2017 paper normalized <em>after</em> the add (post-norm), which interrupts the identity path
              and needs learning-rate warmup to train deep; GPT-2 moved it <em>inside</em> the branch
              (pre-norm: x + f(LN(x))), leaving the highway untouched — that&apos;s the modern default.{' '}
              <strong>RMSNorm</strong> drops the mean-subtraction and just rescales by the root-mean-square —
              measurably cheaper, equally effective, standard in Llama-class models.
            </p>
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am2-3-q1',
            prompt: 'Mechanically, why do residual connections let very deep transformers train?',
            options: [
              { text: 'They add parameters that absorb extra gradient', explain: 'Residuals add zero parameters — the effect is purely structural.' },
              { text: 'The +x term puts an identity in each layer\'s Jacobian, so gradients reach early layers without being squeezed through every transform', correct: true, explain: 'Composed contractive transforms decay signals geometrically (the lab\'s orange bars); the identity path sidesteps the product entirely.' },
              { text: 'They normalize activations', explain: 'That\'s LayerNorm\'s job — residuals and norms are two different pieces of glue.' },
            ],
          },
          {
            id: 'am2-3-q2',
            prompt: 'Pre-norm vs post-norm — what actually differs?',
            options: [
              { text: 'Pre-norm normalizes inside the branch (x + f(LN(x))), keeping the skip path pure; post-norm normalizes the sum (LN(x + f(x))), interrupting the identity highway', correct: true, explain: 'Which is why post-norm at depth needs warmup and careful tuning, and why GPT-2 onward went pre-norm. Same ingredients, one placement decision.' },
              { text: 'Pre-norm uses BatchNorm, post-norm uses LayerNorm', explain: 'Both use LayerNorm (or RMSNorm) — only the placement differs.' },
              { text: 'Post-norm skips normalization on even layers', explain: 'Placement is uniform across layers in both schemes.' },
            ],
          },
          {
            id: 'am2-3-q3',
            prompt: 'LayerNorm computes its mean and variance over…',
            options: [
              { text: 'the batch dimension, like BatchNorm', explain: 'That dependence on batch composition is exactly what LayerNorm exists to avoid.' },
              { text: 'each token\'s feature dimension independently — one token, one normalization, regardless of batch or sequence', correct: true, explain: 'Which makes it deterministic per token, friendly to variable-length sequences and batch-of-one inference.' },
              { text: 'the whole sequence at once', explain: 'Tokens never share statistics — each is normalized alone.' },
            ],
          },
          {
            id: 'am2-3-q4',
            prompt: 'RMSNorm differs from LayerNorm by…',
            options: [
              { text: 'dropping the mean-subtraction (and bias) — only rescaling by the root-mean-square, cheaper with matching quality', correct: true, explain: 'Zhang & Sennrich\'s ablation: re-centering barely matters, re-scaling is the active ingredient. Llama-class models ship it.' },
              { text: 'normalizing over the batch instead', explain: 'RMSNorm keeps LayerNorm\'s per-token axis — it removes an operation, not the axis.' },
              { text: 'adding a second learned matrix', explain: 'It *removes* parameters (the bias), rather than adding any.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Deep Residual Learning — He et al. (CVPR 2016)', href: 'https://arxiv.org/abs/1512.03385', note: 'where the skip connection entered deep learning' },
          { label: 'Layer Normalization — Ba, Kiros & Hinton (2016)', href: 'https://arxiv.org/abs/1607.06450' },
          { label: 'On Layer Normalization in the Transformer Architecture — Xiong et al. (ICML 2020)', href: 'https://arxiv.org/abs/2002.04745', note: 'the pre-norm vs post-norm analysis' },
          { label: 'Root Mean Square Layer Normalization — Zhang & Sennrich (NeurIPS 2019)', href: 'https://arxiv.org/abs/1910.07467' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'block-ffn',
    navLabel: '2.4 The FFN',
    title: 'The feed-forward network',
    subtitle: 'Two-thirds of the parameters, and where the knowledge lives',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              After attention gathers context, each token visits the FFN <strong>alone</strong>: up-project to
              d_ff (≈4×d), nonlinearity, down-project back — applied identically and independently to every
              position. No token-to-token communication happens here; that asymmetry is the block&apos;s division of
              labor. What the width buys is storage. The <strong>key–value memory</strong> reading (Geva et al.):
              each row of W_in is a <em>key</em> — a pattern detector over the residual stream; its activation
              gates the corresponding column of W_out, a <em>value</em> written back to the stream. Thousands of
              detect→write micro-rules per layer is a compelling account of where facts live — and editing those
              weights directly (ROME) can literally relocate the Eiffel Tower.
            </p>
            <p>
              Two modern turns. <strong>Gating</strong>: SwiGLU replaces the plain MLP with
              (xW_gate ⊙ xW_in)W_out — three matrices, d_ff shrunk to ~⅔·4d to keep parameters equal, and
              reliably better — the Llama default. <strong>Sparsity</strong>: Mixture-of-Experts replaces{' '}
              <em>one</em> FFN with many and routes each token through the top-k — parameters scale with expert
              count while per-token compute stays near-constant:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'param-budget' },
      {
        kind: 'callout',
        icon: '⚖️',
        title: 'Attention communicates, the FFN computes — now with numbers',
        body: (
          <>
            Per layer: attention ≈ 4d², FFN ≈ 8d² (both classic 4× MLP and 3-matrix SwiGLU) — the FFN&apos;s ⅔
            share isn&apos;t folklore, it&apos;s arithmetic. And it&apos;s why MoE targets the FFN and why so much of
            interpretability&apos;s &quot;where is X stored?&quot; work digs there.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am2-4-q1',
            prompt: 'Which is TRUE of the FFN sublayer?',
            options: [
              { text: 'It lets distant tokens exchange information efficiently', explain: 'It exchanges nothing — attention is the block\'s only communication step.' },
              { text: 'It processes every token independently with the same weights — per-token computation, zero cross-token flow', correct: true, explain: 'The same two (or three) matrices hit every position separately. Communication and computation are cleanly separated in the block.' },
              { text: 'It has its own attention mask', explain: 'Masks live in attention; the FFN doesn\'t even know other tokens exist.' },
            ],
          },
          {
            id: 'am2-4-q2',
            prompt: 'In the key–value memory view of the FFN…',
            options: [
              { text: 'W_in rows act as pattern detectors (keys) whose activations gate W_out columns (values) written back to the residual stream', correct: true, explain: 'Geva et al.\'s reading, backed by editing results like ROME: change the right value vector and the model\'s "fact" changes.' },
              { text: 'the FFN caches previous tokens\' keys and values', explain: 'That\'s the attention KV cache — same words, entirely different mechanism.' },
              { text: 'keys and values refer to attention heads inside the FFN', explain: 'The FFN has no heads and no attention — the metaphor maps onto its two weight matrices.' },
            ],
          },
          {
            id: 'am2-4-q3',
            prompt: 'SwiGLU uses three matrices instead of two, yet doesn\'t increase the FFN budget. How?',
            options: [
              { text: 'The third matrix is tied to the first', explain: 'All three are independent — the saving comes from width, not tying.' },
              { text: 'd_ff is shrunk to about two-thirds of the classic 4×d so 3 matrices ≈ the old 2-matrix budget', correct: true, explain: 'E.g. Llama-2-7B: d_ff = 11008 ≈ (2/3)·4·4096. (Llama-3 adds a further width multiplier on top.) Gating wins at equal parameters, which is why it became the default.' },
              { text: 'It quantizes the weights to 8-bit', explain: 'Quantization is orthogonal — the budget balance is architectural.' },
            ],
          },
          {
            id: 'am2-4-q4',
            prompt: 'A mixture-of-experts model advertises "520M total, 180M active". What does that mean?',
            options: [
              { text: 'The model prunes itself to 180M after training', explain: 'Nothing is pruned — all experts stay resident and trainable.' },
              { text: 'All experts\' weights exist (520M), but each token is routed through only the top-k experts, so per-token compute touches 180M', correct: true, explain: 'Parameters scale with expert count; FLOPs scale with k. That decoupling is the entire MoE bet (Mixtral, DeepSeek-V3) — and it targets the FFN because that\'s where the parameters are.' },
              { text: '340M of the parameters are frozen', explain: 'Everything trains; "active" counts per-token routing, not trainability.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'GLU Variants Improve Transformer — Shazeer (2020)', href: 'https://arxiv.org/abs/2002.05202', note: 'SwiGLU and friends' },
          { label: 'Transformer Feed-Forward Layers Are Key-Value Memories — Geva et al. (EMNLP 2021)', href: 'https://arxiv.org/abs/2012.14913' },
          { label: 'Locating and Editing Factual Associations (ROME) — Meng et al. (NeurIPS 2022)', href: 'https://arxiv.org/abs/2202.05262', note: 'editing facts in FFN weights' },
          { label: 'Mixtral of Experts — Jiang et al. (2024)', href: 'https://arxiv.org/abs/2401.04088', note: 'open MoE at production quality' },
        ],
      },
    ],
  },
]
