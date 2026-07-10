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
  /** Extra meta shown on the library card, e.g. "46 referenced papers" */
  highlights: string
}

export const COURSE_CATALOG: CourseCatalogEntry[] = [
  {
    slug: 'graph-foundation-models',
    title: 'Graph Foundation Models',
    subtitle: 'From message passing to billion-parameter graph models',
    description:
      'An interactive course on Graph Foundation Models: message passing, the heterogeneity trilemma, the GFM zoo, and the billion-scale frontier — with hands-on labs, quizzes, and 46 referenced papers.',
    modules: 7,
    minutes: 66,
    highlights: '46 referenced papers',
  },
  {
    slug: 'attention-mechanisms',
    title: 'Attention, Everywhere',
    subtitle: 'One mechanism from transformers to vision to graph transformers',
    description:
      'An interactive course on attention: scaled dot-product and multi-head attention, the transformer block, vision transformers, efficient attention (GQA, FlashAttention, MLA), and typed graph attention (HGT, GraphBFF) — with interactive labs and quizzes.',
    modules: 7,
    minutes: 95,
    highlights: '11 interactive labs · 4 deep dives',
  },
]
