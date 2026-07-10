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
]
