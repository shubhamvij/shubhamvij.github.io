# Interactive Study Guide: Graph Foundation Models (GFMs)

**Date:** 2026-07-09
**Status:** Approved for implementation (autonomous session)

## Purpose

A brilliant.org-style interactive study guide on Graph Foundation Models, published as a
blog post on shubhamvij.com. Readers progress through short lessons that mix prose,
hands-on interactive widgets, and check-your-understanding quizzes. Every lesson cites
its sources (papers / blog posts / courses) so readers can go deeper. Anchored loosely
around the related-work themes of arXiv:2602.04768 (billion-scale GFMs): data scarcity,
the three heterogeneity axes (feature / structural / task), domain-specific vs unified
approaches, and the TabFM connection.

## Approaches considered

1. **Pure markdown blog post** — fits the existing pipeline, zero code. Rejected: cannot
   be interactive; the whole point is brilliant.org-style widgets and quizzes.
2. **Convert the blog pipeline to MDX** (next-mdx-remote is already a dependency) —
   general solution allowing interactive components inside any post. Rejected for now:
   invasive change to the render path for all posts (current renderer is a small regex
   converter fed by pre-generated JSON fetched client-side; MDX hydration under static
   export + client fetch is a much bigger surface area). Can revisit later.
3. **Interactive React blog post via a frontmatter flag** *(chosen)* — the post is a
   normal `content/blog/*.md` entry (so it appears in the blog list, sitemap, RSS, OG
   image, SEO metadata, `/blog/<slug>/` deep link), but its frontmatter carries
   `interactive: gfm-study-guide`. `BlogList` renders the matching React component
   instead of the markdown body. The markdown body remains as a static fallback/outline
   with the full reference list. This mirrors the existing "app in a window" precedent
   (Finance Planner) with a one-line branch in the blog renderer.

## Architecture

```
content/blog/graph-foundation-models.md      # frontmatter + static outline fallback
src/components/gfm/
  GfmStudyGuide.tsx                          # shell: module nav, lesson pager, progress
  gfm.module.css                             # XP Luna theme (mirrors finance.module.css)
  content.tsx                                # all lesson content as structured data
  progress.ts                                # safe localStorage progress store
  Quiz.tsx                                   # MCQ with instant feedback + explanation
  MessagePassingLab.tsx                      # interactive message-passing simulator (SVG)
  FeatureSpaceLab.tsx                        # feature-heterogeneity widget (domain toggle)
  HomophilyLab.tsx                           # homophily slider + synthetic graph
  ScalingLab.tsx                             # log-log scaling-law explorer + data-scarcity bars
  TaskMatcher.tsx                            # match tasks to node/edge/graph level
  PaperShelf.tsx                             # filterable reference cards (family filters)
src/lib/blog.ts                              # BlogPostMeta gains `interactive?: string`
src/components/BlogList.tsx                  # branch: interactive flag -> React component
src/app/[[...path]]/HomeClient.tsx           # blog window opens larger on deep link (like finance)
```

### Data flow

Unchanged for normal posts. For the guide: `prebuild.ts` already serializes frontmatter
into `public/data/blog/<slug>.json`; `BlogList` fetches it, sees `meta.interactive ===
'gfm-study-guide'`, and mounts `<GfmStudyGuide/>` (statically imported; it is small
enough not to warrant a dynamic chunk under static export). The markdown body ships in
the JSON but is not rendered in interactive mode.

### Progress model

`progress.ts` wraps localStorage in try/catch (jsdom in this repo lacks a working
localStorage; private-mode browsers too) with an in-memory fallback. Stores per-lesson
completion + quiz answers under one key (`gfm-guide-progress-v1`). Free navigation
(no hard gating — blog readers, not a course platform), with a "recommended order",
per-module completion ticks, and an XP-style green-block progress bar.

### Content plan (7 modules)

1. **Graphs are everywhere** — what a graph is; where they show up (molecules, social,
   knowledge graphs, road networks, relational DBs). Widget: none (warm-up quiz).
2. **How machines learn on graphs** — message passing in 3 steps; what a GNN layer does;
   receptive fields. Widget: MessagePassingLab. Refs: GCN, GraphSAGE, GAT, GIN, Distill.
3. **The foundation-model recipe** — pretrain→transfer, scaling laws, in-context
   learning; why text/vision could do it. Widget: ScalingLab (power-law explorer).
4. **Why graphs break the recipe** — the heterogeneity trilemma: feature / structural /
   task; no shared vocabulary. Widgets: FeatureSpaceLab, HomophilyLab, TaskMatcher.
5. **The GFM zoo** — four strategies: domain-specific (ULTRA, JMP), text-as-glue
   (OFA, LLM-based), feature-agnostic in-context (GraphAny, TabPFN-lineage),
   feature-grouping (TabFM-to-graph line). Widget: PaperShelf + matching quiz.
6. **The billion-scale frontier** — public graph data scarcity; scaling laws on graphs;
   relational DBs as the data source (RelBench, KumoRFM); the anchor paper. Widget:
   ScalingLab data-availability view.
7. **Open problems & going further** — graph vocabulary, evaluation/benchmarks, what to
   read/watch next. Capstone mixed quiz.

Each module: ~600-900 words of prose in short blocks, 1 widget (where applicable),
3-5 quiz questions with explanations, and a references list with working links
(verified by research agents against arXiv/OpenReview/official blogs).

### Error handling

- Storage unavailable → in-memory progress (degrades silently).
- Unknown `interactive` value → fall back to markdown rendering (never a blank window).
- Widgets are pure-React SVG/CSS, no external requests, no new dependencies.
- Narrow window (default 500×350) and mobile fullscreen both supported: single-column
  layout below ~640px container width via container queries in the module CSS; deep
  links to blog posts now open the window at 900×680 (finance precedent).

### Testing (vitest + testing-library, mirroring finance tests)

- `progress.ts`: persists/restores; survives missing localStorage.
- `Quiz`: wrong answer → explanation + retry; right answer → recorded, fires callback.
- `GfmStudyGuide`: renders modules, navigation, completion ticks, progress bar.
- `blog.ts`: `interactive` frontmatter round-trips through getAllPosts/getPostBySlug.
- `BlogList`: flagged post mounts the guide; unflagged posts render markdown (fetch mocked).
- Existing failures in `navigation.test.tsx` (11) and `Window.test.tsx` (1) predate this
  work (jsdom localStorage regression + rnd mock style assertion) and are out of scope.

## Out of scope

- MDX-ifying the blog pipeline; link support in the regex markdown renderer.
- A desktop icon / start-menu entry for the guide (it lives in Blog).
- Server-side rendering of lesson content for SEO (site is client-rendered by design;
  metadata/OG/JSON-LD already handled by the existing pipeline).
