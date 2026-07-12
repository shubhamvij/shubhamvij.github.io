import type { CourseModule } from '../engine/types'

export const EFFICIENCY_SUBCHAPTERS: CourseModule[] = [
  // ------------------------------------------------------------------
  {
    id: 'efficiency-kv-sharing',
    navLabel: '3.1 Shrink the cache',
    title: 'Shrink the KV cache: MQA, GQA, MLA',
    subtitle: 'Share K/V heads across queries — or cache a compressed latent',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Module 3 established the pain: every past token&apos;s K and V sit in memory, and every generated token
              re-reads all of them. Notice what does <em>not</em> need caching: queries. A query is used once, by
              the token being generated, then never again — so the memory bill is entirely K/V heads × d_head ×
              layers × context. That makes the K/V head count the one dial that matters, and three designs turn
              it down:
            </p>
            <ul>
              <li><strong>MQA</strong> (2019) — keep all query heads, share <em>one</em> K/V head. 8× smaller cache here; quality and training stability pay a real price.</li>
              <li><strong>GQA</strong> (2023) — the interpolation: a few K/V heads, each serving a <em>group</em> of query heads. Llama-2/3&apos;s choice — most of the saving, almost none of the loss.</li>
              <li><strong>MLA</strong> (DeepSeek-V2, 2024) — stop sharing, start <em>compressing</em>: cache one low-rank latent vector per token and up-project per-head K/V from it when needed (a small decoupled key carries RoPE, which doesn&apos;t commute with the compression). GQA-class memory at MHA-class quality.</li>
            </ul>
          </>
        ),
      },
      { kind: 'widget', widget: 'head-sharing' },
      {
        kind: 'callout',
        icon: '💾',
        title: 'Why this dial and not others',
        body: (
          <>
            Shrinking d_head or layer count would shrink the cache too — and the model with it. Sharing/compressing
            K/V is surgical: query-side capacity (where the &quot;what am I looking for&quot; expressivity lives) is
            untouched, and the cache drops by the sharing factor. That asymmetry — queries private, K/V communal —
            is the entire design space of this subchapter.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-q2',
            prompt: 'GQA (grouped-query attention) sits between multi-head and multi-query attention. What exactly is being shared?',
            options: [
              { text: 'Key/value heads — several query heads share each K/V head, shrinking the KV cache', correct: true, explain: 'MHA: every query head has its own K/V. MQA: all queries share one. GQA: an intermediate number of K/V heads, each serving a group — most of MQA\'s memory win with less quality loss.' },
              { text: 'The feed-forward networks between layers', explain: 'FFNs are untouched — the entire MQA/GQA/MLA line is about the attention K/V tensors.' },
              { text: 'Token embeddings between similar tokens', explain: 'Embeddings aren\'t involved; the KV cache is what\'s being shrunk.' },
            ],
          },
          {
            id: 'am3-1-q1',
            prompt: 'MLA caches neither K nor V. What does it cache, and what\'s the cost of that choice?',
            options: [
              { text: 'A low-rank latent vector per token, up-projected to per-head K/V at use time — trading a little extra compute for a much smaller cache', correct: true, explain: 'Decoding is memory-bound, so spending FLOPs (up-projections) to save bytes is a good trade. The wrinkle: RoPE doesn\'t commute with the down-projection, hence the small decoupled RoPE key cached alongside.' },
              { text: 'Nothing — it recomputes everything from scratch', explain: 'That would be the no-cache baseline whose O(t²) waste module 3\'s lab counts.' },
              { text: 'The attention weights from previous steps', explain: 'Attention weights are never cached by any scheme — they\'re cheap to recompute from Q and K.' },
            ],
          },
          {
            id: 'am3-1-q2',
            prompt: 'Why do queries get to stay private (one per head) in ALL of these schemes?',
            options: [
              { text: 'Queries are used once by the current token and never stored, so they cost no cache memory — sharing them would sacrifice expressivity for nothing', correct: true, explain: 'The cache holds only what future steps must re-read: K and V. Q is consumed at the step that computes it — which is why the K/V side is where all the surgery happens.' },
              { text: 'Queries are smaller vectors than keys', explain: 'Q, K, V have identical shapes per head — the difference is lifetime, not size.' },
              { text: 'The softmax requires unique queries', explain: 'Softmax normalizes scores per query row regardless of how projections are shared.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Fast Transformer Decoding (MQA) — Shazeer (2019)', href: 'https://arxiv.org/abs/1911.02150' },
          { label: 'GQA: Grouped-Query Attention — Ainslie et al. (EMNLP 2023)', href: 'https://arxiv.org/abs/2305.13245' },
          { label: 'DeepSeek-V2 (Multi-head Latent Attention) — DeepSeek-AI (2024)', href: 'https://arxiv.org/abs/2405.04434', note: '§2.1 is this subchapter' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'efficiency-flash',
    navLabel: '3.2 FlashAttention',
    title: 'Compute the same thing, smarter: FlashAttention',
    subtitle: 'The bottleneck was memory movement, not FLOPs',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              First, the hardware fact this subchapter turns on. A GPU has two memories: <strong>HBM</strong> —
              the tens-of-gigabytes &quot;main memory&quot; quoted on the spec sheet, moving ~2 TB/s — and{' '}
              <strong>on-chip SRAM</strong> — a few dozen megabytes right next to the compute units, roughly 10×
              faster. Matrix multiplies are so optimized that for attention-sized workloads the arithmetic
              isn&apos;t the wait — <em>moving data between HBM and SRAM is</em>. Naive attention is a worst case:
              compute all of S = QKᵀ (n² numbers), write it to HBM, read it back for softmax, write P, read P
              again to multiply by V. For n = 4096 that&apos;s hundreds of megabytes of round-trips per head per
              layer, none of which the final output actually needs.
            </p>
            <p>
              FlashAttention&apos;s move: <strong>never let S exist in HBM</strong>. Stream tile-sized blocks of Q
              and K through SRAM, compute each score tile there, fold it straight into the output, discard it.
              The obstacle is softmax — it wants the whole row before normalizing — and the fix is the{' '}
              <strong>online softmax</strong>: keep a running row-max and running denominator, rescaling what
              you&apos;ve already accumulated whenever a later tile raises the max. Exactly the same output, no
              approximation. Step through it:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'flash-tiling' },
      {
        kind: 'callout',
        icon: '⚡',
        title: 'Why "IO-aware" became the whole field\'s lens',
        body: (
          <>
            FlashAttention changed no math and beat every &quot;efficient attention&quot; approximation of its era at
            exact attention. The durable lesson: count bytes moved, not FLOPs — the same lens that explains why
            the KV cache (module 3) dominates decoding and why MLA happily spends compute to shrink bytes.
            FlashAttention-2/3 are further scheduling refinements of the same idea, now the default kernel in
            every serious stack.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-q1',
            prompt: 'FlashAttention makes attention several times faster while computing the exact same result. How?',
            options: [
              { text: 'It approximates the softmax with a cheaper function', explain: 'No approximation — "exact attention" is the headline claim. The trick is elsewhere.' },
              { text: 'It tiles the computation to minimize reads/writes to GPU main memory, never materializing the n×n matrix', correct: true, explain: 'IO-awareness: attention was bottlenecked on memory bandwidth between HBM and on-chip SRAM, not on arithmetic. Restructure the loops, keep tiles on-chip, win.' },
              { text: 'It skips attention for unimportant tokens', explain: 'That\'s the sparse-mask family (subchapter 3.3). FlashAttention computes every pair — just with drastically less memory traffic.' },
            ],
          },
          {
            id: 'am3-2-q1',
            prompt: 'Softmax needs a full row of scores to normalize. How does tiling get away with never having one?',
            options: [
              { text: 'The online softmax keeps a running max and running denominator per row, rescaling already-accumulated output when a new tile raises the max — algebraically identical to the full-row softmax', correct: true, explain: 'This identity (Milakov & Gimelshein 2018) is the enabling trick: without it, tiling would change the result; with it, tiles can stream and die in SRAM.' },
              { text: 'It normalizes each tile independently', explain: 'That would change the output — weights would sum to 1 per tile instead of per row.' },
              { text: 'It skips normalization entirely', explain: 'Then weights wouldn\'t sum to 1 at all — the output would be wrong everywhere.' },
            ],
          },
          {
            id: 'am3-2-q2',
            prompt: 'What does FlashAttention NOT reduce?',
            options: [
              { text: 'FLOPs — every one of the n² pairs is still scored; only the memory traffic (and wall-clock time) drops', correct: true, explain: 'It\'s still exact, still quadratic compute. If n² arithmetic itself is your problem, you need subchapter 3.3\'s "score fewer pairs" family instead.' },
              { text: 'Reads and writes to HBM', explain: 'That\'s precisely what it reduces — S never round-trips through HBM.' },
              { text: 'Peak memory for the score matrix', explain: 'Reduced from n² to one tile — the lab\'s peak-memory counter.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'FlashAttention — Dao et al. (NeurIPS 2022)', href: 'https://arxiv.org/abs/2205.14135' },
          { label: 'FlashAttention-2 — Dao (ICLR 2024)', href: 'https://arxiv.org/abs/2307.08691', note: 'better work partitioning, ~2× again' },
          { label: 'Online normalizer calculation for softmax — Milakov & Gimelshein (2018)', href: 'https://arxiv.org/abs/1805.02867', note: 'the running-max trick' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'efficiency-sparse',
    navLabel: '3.3 Score fewer pairs',
    title: 'Score fewer pairs: sparse and linear attention',
    subtitle: 'If n² pairs is the problem, stop scoring all of them',
    minutes: 6,
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              3.1 shrank the cache and 3.2 moved fewer bytes — but both still <em>score every pair</em>. The last
              family attacks n² itself by declaring most pairs not worth scoring. <strong>Longformer</strong> and{' '}
              <strong>BigBird</strong> keep a sliding window around each token plus a handful of{' '}
              <strong>global tokens</strong> that everyone may attend to — hubs that keep any two tokens within
              two hops even though almost no pairs are scored directly (BigBird adds random links and proves the
              construction loses no expressive power in the limit). <strong>Mistral-7B</strong> shipped the
              production version: a plain 4096-token sliding window, relying on depth to relay longer-range
              information (the quiz below walks the receptive-field arithmetic), with a rolling KV cache
              buffer as the memory bonus — evict everything outside the window.
            </p>
            <p>
              <strong>Linear attention</strong> is the radical cousin: replace softmax with a kernel feature map
              φ so the computation reorders from (QKᵀ)V — the n×n matrix — to Q(KᵀV), a d×d summary computed
              once. O(n) exactly, and the recurrent form even turns a transformer into an RNN at decode time. The
              price is fidelity: that d×d summary is a lossy bottleneck compared to exact pairwise softmax, and
              quality gaps show up on recall-heavy tasks — the reason the 2024-25 wave (Mamba, RWKV, hybrid
              layers) mixes linear-time layers <em>with</em> a few full-attention ones rather than replacing them.
            </p>
            <p>Play with what &quot;fewer pairs&quot; looks like — the counter is the whole argument:</p>
          </>
        ),
      },
      { kind: 'widget', widget: 'mask-lab-efficiency' },
      {
        kind: 'callout',
        icon: '🕸️',
        title: 'Remember this shape',
        body: (
          <>
            Window + a few hub nodes + a sprinkle of random links — that&apos;s a <em>graph</em> design, chosen for
            short path lengths at low edge count. Module 5 makes the connection explicit: every one of these
            &quot;efficient attention patterns&quot; is an adjacency structure, and choosing one is graph construction.
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-q3',
            prompt: 'With sliding-window attention (window w), a token can\'t directly see tokens beyond w positions back. How do such models still use long context?',
            options: [
              { text: 'They can\'t — information outside the window is lost', explain: 'Direct attention is lost per layer, but the network is deep…' },
              { text: 'Stacked layers relay information: each layer extends effective reach by w, like a receptive field growing with depth', correct: true, explain: 'Layer 1 sees w back; layer 2 sees information that already traveled w, reaching 2w; and so on. If that sounds exactly like message passing hops in a GNN — module 5 is waiting.' },
              { text: 'They secretly fall back to full attention on long inputs', explain: 'The whole point is *not* paying O(n²); the window stays fixed, depth does the relaying.' },
            ],
          },
          {
            id: 'am3-3-q1',
            prompt: 'Longformer/BigBird add a few GLOBAL tokens to the sliding window. What do they buy?',
            options: [
              { text: 'Hub connectivity: any token reaches any other in ≤2 hops through a global token, so long-range dependencies survive even though almost no pairs are directly scored', correct: true, explain: 'A star topology stapled onto a path: linear edge count, short path lengths. (BigBird\'s random extra links serve the same small-world purpose.)' },
              { text: 'Extra positional precision', explain: 'Global tokens carry no special positional role — they\'re about connectivity.' },
              { text: 'A bigger vocabulary', explain: 'Global tokens are ordinary tokens (often [CLS] or task tokens) given wider wiring, not new vocabulary.' },
            ],
          },
          {
            id: 'am3-3-q2',
            prompt: 'Linear attention computes Q(KᵀV) instead of (QKᵀ)V. What does the reordering buy, and what does it cost?',
            options: [
              { text: 'Buys O(n): KᵀV is a fixed d×d summary so no n×n matrix ever forms. Costs fidelity: softmax\'s exact pairwise weighting is replaced by a lossy kernel approximation', correct: true, explain: 'Associativity does the work — and the d×d bottleneck is why quality gaps appear on recall-heavy tasks, pushing modern designs toward hybrids (a few exact-attention layers among linear ones).' },
              { text: 'Buys exactness, costs memory', explain: 'Backwards: it\'s the approximate one; memory is what it saves.' },
              { text: 'It\'s pure notation — the same computation either way', explain: 'With softmax in between, the two orderings aren\'t even equal; removing/replacing softmax is precisely the (consequential) trick.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Longformer — Beltagy et al. (2020)', href: 'https://arxiv.org/abs/2004.05150' },
          { label: 'Big Bird — Zaheer et al. (NeurIPS 2020)', href: 'https://arxiv.org/abs/2007.14062', note: 'window + global + random; provably universal' },
          { label: 'Mistral 7B — Jiang et al. (2023)', href: 'https://arxiv.org/abs/2310.06825', note: 'sliding window + rolling KV buffer in production' },
          { label: 'Transformers are RNNs (linear attention) — Katharopoulos et al. (ICML 2020)', href: 'https://arxiv.org/abs/2006.16236' },
        ],
      },
    ],
  },
]
