/**
 * Server-safe course metadata: route params, SEO metadata, and sitemap entries.
 * The interactive definitions (modules, widgets) live in src/components/courses/<slug>/
 * and are registered in src/components/learn/courses.tsx — keep slugs in sync
 * (courseCatalog.test.ts asserts it).
 */
export interface CourseCatalogEntry {
  slug: string
  title: string
  subtitle: string
  /** SEO/meta description for /learn/<slug> */
  description: string
  modules: number
  minutes: number
  /** Extra meta shown on the library card, e.g. "51 referenced sources" */
  highlights: string
}

export const COURSE_CATALOG: CourseCatalogEntry[] = [
  {
    slug: 'graph-foundation-models',
    title: 'Graph Foundation Models',
    subtitle: 'From message passing to billion-parameter graph models',
    description:
      'An interactive course on Graph Foundation Models: message passing, the heterogeneity trilemma, and the GFM zoo — with architecture deep dives on ULTRA, text-as-glue LLM hybrids, GraphAny and graph PFNs, GraphBFF\'s typed attention, and relational foundation models like KumoRFM-2.',
    modules: 7,
    minutes: 101,
    highlights: '12 interactive labs · 5 deep dives · 51 referenced sources',
  },
  {
    slug: 'attention-mechanisms',
    title: 'Attention, Everywhere',
    subtitle: 'One mechanism from transformers to vision to graph transformers',
    description:
      'An interactive course on attention: scaled dot-product and multi-head attention, the transformer block, vision transformers, efficient attention (GQA, FlashAttention, MLA), and typed graph attention (HGT, GraphBFF) — with interactive labs and quizzes.',
    modules: 7,
    minutes: 113,
    highlights: '15 interactive labs · 8 deep dives',
  },
  {
    slug: 'dlrm-embedding-tables',
    title: 'Recommenders at Scale',
    subtitle: 'Why a recommendation model is mostly a giant lookup table',
    description:
      'An interactive course on Deep Learning Recommendation Models and the embedding-table problem: why categorical features need learned rows, the parameter-vs-FLOP asymmetry, terabyte-scale tables and the memory roofline, distributing the table across GPUs, compression (hashing, quotient-remainder, TT-Rec, quantization, DHE), and whether the table survives the generative turn.',
    modules: 6,
    minutes: 55,
    highlights: '6 interactive labs · 17 referenced sources',
  },
]
