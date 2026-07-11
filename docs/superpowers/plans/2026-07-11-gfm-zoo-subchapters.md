# GFM Zoo Deep-Dive Subchapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five architecture deep-dive subchapters (5.1 ULTRA, 5.2 text-as-glue, 5.3 structure + in-context, 5.4 GraphBFF, 5.5 relational-DB FMs) under module 5 of the Graph Foundation Models course, six new interactive labs (a cross-family Zoo Map comparator plus one bespoke lab per deep dive), and a rewritten "five bets" parent module.

**Architecture:** The course engine's one-level `subchapters` nesting (shipped with the attention course) is reused unchanged. Content lives in a new `zooSubchapters.tsx` attached to module 5 in `content.tsx`; six new self-contained widget components compute real small-matrix math (real least-squares LinearGNN channels, real softmaxes, real interaction-edge derivation) in plain JS/SVG/HTML with zero randomness.

**Tech Stack:** Next.js (static export), React client components, CSS modules (`course.module.css`), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-10-gfm-zoo-subchapters-design.md` — READ IT FIRST, especially the **verification ledger**: every architectural claim in this plan's prose was verified against the primary papers on 2026-07-10/11; do not "fix" prose to match your own memory of these models. The ledger wording wins.

## Global Constraints

- Do NOT touch `public/sitemap.xml`, `src/components/learn/CoursewareShell.tsx`, or `content/settings.yaml` — concurrent sessions may hold edits. `git add` by explicit path only; never `git add -A` or `git add .`.
- GFM course `storageKey: 'gfm-guide-progress-v1'` and existing module ids (`graphs`, `message-passing`, `recipe`, `heterogeneity`, `zoo`, `scale`, `frontier`) must not change.
- Moved quiz ids keep their exact strings: `m5-q1` (→5.1), `m5-q2` (→5.2), `m5-q3` (→5.3, with corrected prompt text), `m5-q4` (→5.4). New ids: parent `m5-q5`..`m5-q7`; subchapters `m5-1-q*`..`m5-5-q*`. A catalog test asserts global uniqueness across BOTH courses.
- New module ids: `zoo-ultra`, `zoo-text-glue`, `zoo-in-context`, `zoo-graphbff`, `zoo-relational`. New widget keys: `zoo-map`, `relation-graph`, `text-glue`, `channel-ensemble`, `bff-anatomy`, `label-injection`.
- Widgets: `'use client'`, styles only via `import s from '../engine/course.module.css'` plus minimal inline styles, SVG/HTML in the existing hand-drawn house style. No `Math.random()` / `Date.now()` anywhere — every render must be deterministic (tests and resume depend on it).
- JSX text must escape entities (`&apos;` `&quot;` — eslint react/no-unescaped-entities). Em dashes are fine as literal —.
- `src/lib/__tests__/courseCatalog.test.ts` already sums minutes over modules AND subchapters, checks widget registration and quiz-id uniqueness over the flattened list — do not modify it; make the content satisfy it. `entry.modules` stays 7 (top-level count).
- The test suite has **12 pre-existing failures** unrelated to this work. Record the exact baseline in Task 1 Step 1; "pass" in every later step means *no new failures relative to that baseline*.
- Test env: jsdom lacks working localStorage — any test file that renders `CourseShell` must stub it (copy the `beforeEach` from `GfmStudyGuide.test.tsx`). Pure widget tests don't need the stub.
- Commit after every task; message style matches repo history (imperative, no prefix), ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Two lab tests (Tasks 2 and 4) assert on live-computed deterministic numbers. If the first honest run produces a different deterministic value than the plan's literal, update the test literal to the actual output and note it in the commit message — determinism is the requirement, not the plan's guess. Never fudge the component to match the plan.

---

### Task 1: Zoo Map comparator widget

**Files:**
- Create: `src/components/courses/gfm/ZooMapLab.tsx`
- Create: `src/components/courses/gfm/zooLabs.test.tsx`

**Interfaces:**
- Consumes: `../engine/course.module.css` classes only.
- Produces: default export `ZooMapLab` (no props) — Task 9 registers it as widget key `zoo-map`. The 10 model cards' `cells` data is the densest fact surface in the course; Task 10's fact-check gate re-reviews every string against the spec ledger.

- [ ] **Step 1: Record the failing-test baseline**

Run: `cd /Users/shubhamvij/Developer/shubhamvij.github.io && npx vitest run 2>&1 | tail -3`
Expected: a summary line with the pre-existing failure count (~12 failed). Write down the exact numbers (failed / passed); every later suite run compares against them.

- [ ] **Step 2: Write the failing widget test**

Create `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ZooMapLab from './ZooMapLab'

describe('ZooMapLab', () => {
  it('compares ULTRA vs GraphBFF by default', () => {
    render(<ZooMapLab />)
    expect(screen.getByText('conditional MPNN (NBFNet-style)')).toBeDefined()
    expect(screen.getByText('graph transformer: TCA + TAA fused per block')).toBeDefined()
  })

  it('replaces the older selection first and marks identical rows as same', () => {
    render(<ZooMapLab />)
    fireEvent.click(screen.getByRole('button', { name: /LLaGA/ }))   // [GraphBFF, LLaGA]
    fireEvent.click(screen.getByRole('button', { name: /GraphGPT/ })) // [LLaGA, GraphGPT]
    // GraphGPT and LLaGA share prediction locus and frozen-vs-trained cells:
    expect(screen.getAllByText('· same ·').length).toBe(2)
    expect(screen.getAllByText('the LLM generates the answer').length).toBe(2)
  })

  it('points every card at a deep dive', () => {
    render(<ZooMapLab />)
    expect(screen.getAllByText(/deep dive 5\./).length).toBe(10)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./ZooMapLab`.

- [ ] **Step 4: Implement ZooMapLab**

Create `src/components/courses/gfm/ZooMapLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type AxisKey = 'token' | 'backbone' | 'conditioning' | 'trained' | 'locus'

interface ZooModel {
  id: string
  name: string
  year: string
  family: string
  color: string
  dive: string
  cells: Record<AxisKey, string>
}

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'token', label: 'What is the "token"?' },
  { key: 'backbone', label: 'Backbone' },
  { key: 'conditioning', label: 'Where conditioning enters' },
  { key: 'trained', label: 'Frozen vs trained' },
  { key: 'locus', label: 'Who predicts' },
]

// Every cell string below is fact-checked against the primary papers — see the
// verification ledger in docs/superpowers/specs/2026-07-10-gfm-zoo-subchapters-design.md.
const MODELS: ZooModel[] = [
  {
    id: 'ultra', name: 'ULTRA', year: '2023', family: 'domain vocabulary', color: '#2f8e2f', dive: 'deep dive 5.1',
    cells: {
      token: 'relations, via their interaction graph',
      backbone: 'conditional MPNN (NBFNet-style)',
      conditioning: 'inside message passing, per query (labeling trick)',
      trained: 'GNN weights transfer; relation graph recomputed per KG',
      locus: 'the GNN scores (h, r, ?) directly',
    },
  },
  {
    id: 'jmp', name: 'JMP', year: '2023', family: 'domain vocabulary', color: '#2f8e2f', dive: 'deep dive 5.1',
    cells: {
      token: 'atoms: element + 3D position',
      backbone: 'geometric MPNN (GemNet-OC)',
      conditioning: 'per-dataset output heads',
      trained: 'pretrain all; fine-tune whole model with new heads',
      locus: 'GNN regression heads (energy & forces)',
    },
  },
  {
    id: 'ofa', name: 'One-for-All', year: '2023', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'nodes/edges described in text, LM-embedded',
      backbone: 'edge-type-aware GNN',
      conditioning: 'prompt + class nodes appended to the graph',
      trained: 'LM frozen; GNN trained',
      locus: 'the GNN: P(class i) = sigmoid(MLP(h_class_i))',
    },
  },
  {
    id: 'graphgpt', name: 'GraphGPT', year: '2023', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'projected node embeddings as prompt tokens',
      backbone: 'frozen graph encoder feeding a frozen LLM',
      conditioning: 'graph tokens spliced at <graph> in the instruction',
      trained: 'everything frozen except one projector',
      locus: 'the LLM generates the answer',
    },
  },
  {
    id: 'llaga', name: 'LLaGA', year: '2024', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'template-ordered node sequences (+ Laplacian PE)',
      backbone: 'no graph encoder — frozen LLM only',
      conditioning: 'parameter-free structure templates',
      trained: 'everything frozen except one projector',
      locus: 'the LLM generates the answer',
    },
  },
  {
    id: 'unigraph', name: 'UniGraph', year: '2024', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'masked node text, one [CLS] per node',
      backbone: 'DeBERTa-to-GAT cascade',
      conditioning: 'none at pretrain; LoRA LLM later for instructions',
      trained: 'LM + GNN trained jointly, end to end',
      locus: 'GNN-side heads (masked-graph modeling)',
    },
  },
  {
    id: 'graphany', name: 'GraphAny', year: '2024', family: 'structure + in-context', color: '#5a8fd0', dive: 'deep dive 5.3',
    cells: {
      token: 'pairwise distances between channel predictions',
      backbone: '5 closed-form LinearGNNs + an attention MLP',
      conditioning: 'the target graph’s own labels (closed-form solve)',
      trained: 'only the attention MLP is ever trained',
      locus: 'weighted vote over LinearGNN channels',
    },
  },
  {
    id: 'graphpfn', name: 'GraphPFN', year: '2025', family: 'structure + in-context', color: '#5a8fd0', dive: 'deep dive 5.3',
    cells: {
      token: 'node = a table row of feature tokens',
      backbone: 'LimiX PFN + adjacency-masked attention adapters',
      conditioning: 'labeled nodes as in-context examples',
      trained: 'frozen at inference (ICL); fine-tune optional',
      locus: 'the PFN transformer head',
    },
  },
  {
    id: 'graphbff', name: 'GraphBFF', year: '2026', family: 'typed at scale', color: '#7a4ab8', dive: 'deep dive 5.4',
    cells: {
      token: 'typed nodes (per-type feature vector)',
      backbone: 'graph transformer: TCA + TAA fused per block',
      conditioning: 'downstream: frozen features + a small probe',
      trained: 'pretrain all 1.4B; freeze + probe downstream',
      locus: 'edge scorer at pretrain; probe downstream',
    },
  },
  {
    id: 'kumorfm2', name: 'KumoRFM-2', year: '2026', family: 'relational', color: '#b03060', dive: 'deep dive 5.5',
    cells: {
      token: 'task-conditioned table rows',
      backbone: 'column-row attention, then PK-FK + cross-sample',
      conditioning: 'labels injected into the input tables (earliest)',
      trained: 'fully frozen at inference — pure ICL',
      locus: 'cross-sample attention readout',
    },
  },
]

export default function ZooMapLab() {
  const [selected, setSelected] = useState<[string, string]>(['ultra', 'graphbff'])

  const pick = (id: string) => {
    setSelected(sel => (sel.includes(id) ? sel : [sel[1], id]))
  }

  const a = MODELS.find(m => m.id === selected[0])!
  const b = MODELS.find(m => m.id === selected[1])!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Zoo Map</span>
        <span className={s.widgetHint}>pick any two models to compare</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {MODELS.map(m => (
            <button
              key={m.id}
              type="button"
              className={`${s.chip} ${selected.includes(m.id) ? s.chipOn : ''}`}
              style={{ borderColor: m.color }}
              onClick={() => pick(m.id)}
            >
              {m.name} <span style={{ opacity: 0.65 }}>&apos;{m.year.slice(2)}</span>
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 6px', width: '20%' }}></th>
              {[a, b].map(m => (
                <th key={m.id} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: `2px solid ${m.color}` }}>
                  {m.name}
                  <div style={{ fontWeight: 'normal', opacity: 0.7 }}>
                    {m.family} · <em>{m.dive}</em>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AXES.map(ax => {
              const same = a.cells[ax.key] === b.cells[ax.key]
              return (
                <tr key={ax.key} style={same ? { opacity: 0.6 } : undefined}>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold', verticalAlign: 'top' }}>
                    {ax.label}
                    {same && <div style={{ fontWeight: 'normal', fontSize: 10 }}>· same ·</div>}
                  </td>
                  <td style={{ padding: '5px 6px', verticalAlign: 'top', borderLeft: `3px solid ${a.color}` }}>{a.cells[ax.key]}</td>
                  <td style={{ padding: '5px 6px', verticalAlign: 'top', borderLeft: `3px solid ${b.color}` }}>{b.cells[ax.key]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className={s.labNote}>
          Five axes, every model. Rows where two models agree are dimmed — GraphGPT and LLaGA, for example,
          share a prediction locus and a frozen/trained split and differ only in how graph structure reaches
          the LLM. One caution from Mao et al.: a graph &quot;vocabulary&quot; need not be a literal tokenizer —
          for several of these models the transferable unit is <em>a model</em> that maps graphs into a shared
          space, not a symbol table.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/gfm/ZooMapLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add Zoo Map comparator lab: 10 GFMs on five verified contrast axes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Relation-Graph Builder lab (ULTRA, 5.1)

**Files:**
- Create: `src/components/courses/gfm/RelationGraphLab.tsx`
- Modify: `src/components/courses/gfm/zooLabs.test.tsx` (append a describe block)

**Interfaces:**
- Produces: default export `RelationGraphLab` (no props) — registered as `relation-graph` in Task 9.
- The interaction edges are DERIVED from the entity graph at render time (generic set intersection per interaction type) — never hard-coded — so the "computed, not learned" claim is literally true in the code.

- [ ] **Step 1: Append the failing test**

Append to `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import RelationGraphLab from './RelationGraphLab'

describe('RelationGraphLab', () => {
  it('builds relation-graph edges only when interaction chips are toggled on', () => {
    render(<RelationGraphLab />)
    expect(screen.getByText(/relation-graph edges:/)).toBeDefined()
    expect(screen.getByText('0', { selector: 'span' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /h2h/ }))
    // authored–affiliated (Ada, Bob head both) and cites–published-in (P1 heads both)
    expect(screen.getByText('2', { selector: 'span' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /t2t/ }))
    expect(screen.getByText('3', { selector: 'span' })).toBeDefined()
  })

  it('propagates a query and ranks candidates deterministically', () => {
    render(<RelationGraphLab />)
    fireEvent.click(screen.getByRole('button', { name: /h2h/ }))
    fireEvent.click(screen.getByRole('button', { name: /t2h/ }))
    fireEvent.click(screen.getByRole('button', { name: /Propagate 1 step/ }))
    fireEvent.click(screen.getByRole('button', { name: /Propagate 1 step/ }))
    expect(screen.getByText(/top candidate:/)).toBeDefined()
    // Deterministic under the fixed weights; if the honest first run ranks a
    // different entity on top, pin THAT value here (see Global Constraints).
    expect(screen.getByText(/top candidate:/).textContent).toContain('P1')
  })

  it('shows the zero-learned-embeddings stat', () => {
    render(<RelationGraphLab />)
    expect(screen.getByText(/learned per-relation embeddings/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./RelationGraphLab`.

- [ ] **Step 3: Implement RelationGraphLab**

Create `src/components/courses/gfm/RelationGraphLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

type Rel = 'authored' | 'cites' | 'affiliated' | 'published-in'
type Interaction = 'h2h' | 't2t' | 'h2t' | 't2h'

const RELS: Rel[] = ['authored', 'cites', 'affiliated', 'published-in']
const REL_COLORS: Record<Rel, string> = {
  authored: '#2f8e2f',
  cites: '#c86018',
  affiliated: '#5a8fd0',
  'published-in': '#7a4ab8',
}

const ENTITIES: { id: string; x: number; y: number }[] = [
  { id: 'Ada', x: 36, y: 40 },
  { id: 'Bob', x: 36, y: 130 },
  { id: 'P1', x: 120, y: 62 },
  { id: 'P2', x: 120, y: 148 },
  { id: 'Org', x: 30, y: 196 },
  { id: 'Venue', x: 196, y: 108 },
]

// Directed typed edges: h --r--> t
const EDGES: { h: string; t: string; r: Rel }[] = [
  { h: 'Ada', t: 'P1', r: 'authored' },
  { h: 'Bob', t: 'P2', r: 'authored' },
  { h: 'P1', t: 'P2', r: 'cites' },
  { h: 'Ada', t: 'Org', r: 'affiliated' },
  { h: 'Bob', t: 'Org', r: 'affiliated' },
  { h: 'P1', t: 'Venue', r: 'published-in' },
  { h: 'P2', t: 'Venue', r: 'published-in' },
]

const INTERACTIONS: { key: Interaction; label: string; blurb: string }[] = [
  { key: 'h2h', label: 'h2h — share a head', blurb: 'some entity is the head of both relations' },
  { key: 't2t', label: 't2t — share a tail', blurb: 'some entity is the tail of both relations' },
  { key: 'h2t', label: 'h2t — head meets tail', blurb: 'some entity heads one relation and tails the other' },
  { key: 't2h', label: 't2h — tail meets head', blurb: 'some entity tails one relation and heads the other' },
]

function headsOf(r: Rel): Set<string> { return new Set(EDGES.filter(e => e.r === r).map(e => e.h)) }
function tailsOf(r: Rel): Set<string> { return new Set(EDGES.filter(e => e.r === r).map(e => e.t)) }
function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true
  return false
}

/** Derive the graph-of-relations edges for one interaction type (no self-pairs). */
function interactionEdges(kind: Interaction): [Rel, Rel][] {
  const out: [Rel, Rel][] = []
  for (const r1 of RELS) {
    for (const r2 of RELS) {
      if (r1 === r2) continue
      if (kind === 'h2h' && RELS.indexOf(r1) < RELS.indexOf(r2) && intersects(headsOf(r1), headsOf(r2))) out.push([r1, r2])
      if (kind === 't2t' && RELS.indexOf(r1) < RELS.indexOf(r2) && intersects(tailsOf(r1), tailsOf(r2))) out.push([r1, r2])
      if (kind === 'h2t' && intersects(headsOf(r1), tailsOf(r2))) out.push([r1, r2])
      if (kind === 't2h' && intersects(tailsOf(r1), headsOf(r2))) out.push([r1, r2])
    }
  }
  return out
}

const INTERACTION_WEIGHT: Record<Interaction, number> = { h2h: 0.6, t2t: 0.5, h2t: 0.35, t2h: 0.35 }

// Fixed positions for the 4 relation nodes on the right panel.
const REL_POS: Record<Rel, { x: number; y: number }> = {
  authored: { x: 300, y: 44 },
  cites: { x: 420, y: 44 },
  affiliated: { x: 300, y: 172 },
  'published-in': { x: 420, y: 172 },
}

const QUERIES: { head: string; rel: Rel }[] = [
  { head: 'P2', rel: 'cites' },
  { head: 'Bob', rel: 'affiliated' },
]

export default function RelationGraphLab() {
  const [active, setActive] = useState<Interaction[]>([])
  const [query, setQuery] = useState(0)
  const [steps, setSteps] = useState(0)

  const relEdges = useMemo(
    () => active.flatMap(kind => interactionEdges(kind).map(([r1, r2]) => ({ r1, r2, kind }))),
    [active]
  )

  // Stage A: relation representations conditioned on the query relation,
  // computed purely from the (active) interaction structure — no lookup table.
  const relScore = useMemo(() => {
    const score: Record<Rel, number> = { authored: 0, cites: 0, affiliated: 0, 'published-in': 0 }
    score[QUERIES[query].rel] = 1
    for (let round = 0; round < 2; round++) {
      const prev = { ...score }
      for (const { r1, r2, kind } of relEdges) {
        score[r2] += INTERACTION_WEIGHT[kind] * prev[r1]
        score[r1] += INTERACTION_WEIGHT[kind] * prev[r2]
      }
      const max = Math.max(...RELS.map(r => score[r]), 1e-9)
      for (const r of RELS) score[r] = score[r] / max
    }
    return score
  }, [relEdges, query])

  // Stage B: conditional message passing over entities, head initialized to 1.
  const entScore = useMemo(() => {
    let cur: Record<string, number> = Object.fromEntries(ENTITIES.map(e => [e.id, 0]))
    cur[QUERIES[query].head] = 1
    for (let k = 0; k < steps; k++) {
      const next = { ...cur }
      for (const e of EDGES) {
        next[e.t] += cur[e.h] * relScore[e.r] * 0.8
        next[e.h] += cur[e.t] * relScore[e.r] * 0.3
      }
      const max = Math.max(...Object.values(next), 1e-9)
      cur = Object.fromEntries(Object.entries(next).map(([k2, v]) => [k2, v / max]))
    }
    return cur
  }, [query, steps, relScore])

  const q = QUERIES[query]
  const ranked = ENTITIES.filter(e => e.id !== q.head)
    .map(e => ({ id: e.id, v: entScore[e.id] }))
    .sort((x, y) => y.v - x.v)
  const top = steps > 0 ? ranked[0] : null

  const toggle = (kind: Interaction) =>
    setActive(a => (a.includes(kind) ? a.filter(k => k !== kind) : [...a, kind]))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Relation-Graph Builder</span>
        <span className={s.widgetHint}>ULTRA: the vocabulary is how relations interact</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {INTERACTIONS.map(i => (
            <button
              key={i.key}
              type="button"
              className={`${s.chip} ${active.includes(i.key) ? s.chipOn : ''}`}
              title={i.blurb}
              onClick={() => toggle(i.key)}
            >
              {i.label}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 470 224" className={s.labCanvas} role="img" aria-label="Entity graph (left) and derived graph of relations (right)">
          {/* left: entity graph */}
          {EDGES.map((e, i) => {
            const h = ENTITIES.find(n => n.id === e.h)!
            const t = ENTITIES.find(n => n.id === e.t)!
            return (
              <g key={i}>
                <line x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={REL_COLORS[e.r]} strokeWidth={1.6} markerEnd="url(#rg-arrow)" />
              </g>
            )
          })}
          {ENTITIES.map(n => (
            <g key={n.id}>
              <circle
                cx={n.x} cy={n.y} r={13}
                fill={n.id === q.head ? '#f0d98c' : '#fff'}
                stroke={steps > 0 ? '#0a246a' : '#666'}
                strokeWidth={n.id === q.head ? 2.5 : 1}
                opacity={n.id === q.head ? 1 : 0.35 + 0.65 * (entScore[n.id] ?? 0)}
              />
              <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={8.5} fontWeight="bold">{n.id}</text>
            </g>
          ))}
          <text x={110} y={218} textAnchor="middle" fontSize={9} fill="#555">entity graph (typed edges)</text>
          {/* divider */}
          <line x1={252} y1={8} x2={252} y2={210} stroke="#b8b4a2" strokeDasharray="3 3" />
          {/* right: graph of relations, derived live */}
          {relEdges.map((e, i) => {
            const p1 = REL_POS[e.r1]
            const p2 = REL_POS[e.r2]
            const bend = 6 + 5 * (i % 3)
            const mx = (p1.x + p2.x) / 2
            const my = (p1.y + p2.y) / 2 - bend
            return (
              <path
                key={i}
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke="#555"
                strokeWidth={1.3}
                opacity={0.75}
              />
            )
          })}
          {RELS.map(r => (
            <g key={r}>
              <circle cx={REL_POS[r].x} cy={REL_POS[r].y} r={15} fill={REL_COLORS[r]} opacity={0.25 + 0.75 * relScore[r]} stroke="#444" />
              <text x={REL_POS[r].x} y={REL_POS[r].y - 20} textAnchor="middle" fontSize={8.5} fontWeight="bold" fill={REL_COLORS[r]}>{r}</text>
            </g>
          ))}
          <text x={360} y={218} textAnchor="middle" fontSize={9} fill="#555">graph of relations (derived, not learned)</text>
          <defs>
            <marker id="rg-arrow" markerWidth="7" markerHeight="7" refX="14" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#888" />
            </marker>
          </defs>
        </svg>
        <div className={s.labControls}>
          {QUERIES.map((qq, i) => (
            <button key={i} type="button" className={`${s.chip} ${query === i ? s.chipOn : ''}`} onClick={() => { setQuery(i); setSteps(0) }}>
              query: ({qq.head}, {qq.rel}, ?)
            </button>
          ))}
          <button type="button" className={s.btn} onClick={() => setSteps(k => Math.min(k + 1, 4))} disabled={steps >= 4}>
            Propagate 1 step ▸
          </button>
          <button type="button" className={s.btn} onClick={() => setSteps(0)} disabled={steps === 0}>
            Reset
          </button>
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>relation-graph edges <span className={s.labStatValue}>{relEdges.length}</span></span>
          <span className={s.labStat}>learned per-relation embeddings <span className={s.labStatValue}>0</span></span>
          {top && <span className={s.labStat}>top candidate: <span className={s.labStatValue}>{top.id}</span></span>}
        </div>
        <p className={s.labNote}>
          Toggle the four <strong>fundamental interactions</strong> and watch the right panel build ULTRA&apos;s{' '}
          <strong>graph of relations</strong> — computed from the entity graph, never learned. Then pick a query{' '}
          (h, r, ?): the relation nodes light up with <em>query-conditioned</em> roles (stage A), the head entity
          is marked with the query (the <strong>labeling trick</strong>), and each propagate step runs conditional
          message passing over the entities (stage B). Nothing in the parameters names any relation — that is why
          one pretrained ULTRA does zero-shot link prediction on 57 unseen knowledge graphs.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS. If the `top candidate` literal differs from `P1`, inspect the deterministic output, pin the actual value in the test, and note it in the commit message (Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/gfm/RelationGraphLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add Relation-Graph Builder lab: derive ULTRA's relation graph live

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Wiring Switcher lab (text as glue, 5.2)

**Files:**
- Create: `src/components/courses/gfm/TextGlueLab.tsx`
- Modify: `src/components/courses/gfm/zooLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `TextGlueLab` (no props) — registered as `text-glue` in Task 9.
- Slot states: `'frozen' | 'trained' | 'free' | 'none'`. `'free'` = parameter-free (LLaGA templates); `'none'` renders a dashed empty slot so absence is visible.

- [ ] **Step 1: Append the failing test**

Append to `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import TextGlueLab from './TextGlueLab'

describe('TextGlueLab', () => {
  it('starts on OFA: trained GNN, GNN predicts', () => {
    render(<TextGlueLab />)
    expect(screen.getByText('trained here: the GNN + class-node MLP head')).toBeDefined()
    expect(screen.getByText('GNN predicts')).toBeDefined()
  })

  it('switches wirings and flips the frozen/trained readouts', () => {
    render(<TextGlueLab />)
    fireEvent.click(screen.getByRole('button', { name: 'GraphGPT' }))
    expect(screen.getByText('trained here: the projector — nothing else')).toBeDefined()
    expect(screen.getByText('LLM predicts')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'LLaGA' }))
    expect(screen.getByText(/0 params/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'UniGraph' }))
    expect(screen.getByText('trained here: LM + GNN jointly, end to end')).toBeDefined()
  })

  it('explains a slot on click', () => {
    render(<TextGlueLab />)
    fireEvent.click(screen.getByRole('button', { name: 'GraphGPT' }))
    fireEvent.click(screen.getByText('projector'))
    expect(screen.getByText(/single linear layer/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./TextGlueLab`.

- [ ] **Step 3: Implement TextGlueLab**

Create `src/components/courses/gfm/TextGlueLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type SlotState = 'frozen' | 'trained' | 'free' | 'none'
type Wiring = 'ofa' | 'graphgpt' | 'llaga' | 'unigraph'

interface Slot {
  label: string
  sub?: string
  state: SlotState
  blurb?: string
}

interface WiringDef {
  name: string
  /** Exactly 5 slots: source, text encoder, graph module, projector, predictor. */
  slots: Slot[]
  trained: string
  locus: 'GNN predicts' | 'LLM predicts'
  conditioning: string
}

// All facts per the spec's verification ledger (OFA/GraphGPT/LLaGA/UniGraph primary papers).
const WIRINGS: Record<Wiring, WiringDef> = {
  ofa: {
    name: 'One-for-All',
    slots: [
      { label: 'node & task text', state: 'none', blurb: 'every node, edge, task and class gets a natural-language description' },
      { label: 'LM text encoder', sub: 'e5 / Llama2 — frozen', state: 'frozen', blurb: 'a frozen LM embeds all descriptions into one shared vector space — the whole alignment trick' },
      { label: 'typed GNN', sub: 'edge-type aware', state: 'trained', blurb: 'a trained GNN message-passes over the graph PLUS the appended prompt and class nodes' },
      { label: '', state: 'none' },
      { label: 'sigmoid(MLP(h_class))', sub: 'per class node', state: 'trained', blurb: 'each class node&apos;s final embedding is scored — classification without a fixed-size head' },
    ],
    trained: 'the GNN + class-node MLP head',
    locus: 'GNN predicts',
    conditioning: 'the task arrives as GRAPH SURGERY: a prompt node + class nodes appended to the input graph',
  },
  graphgpt: {
    name: 'GraphGPT',
    slots: [
      { label: 'graph + instruction', state: 'none', blurb: 'an instruction template contains a <graph> placeholder token' },
      { label: '', state: 'none' },
      { label: 'graph encoder', sub: 'frozen', state: 'frozen', blurb: 'a pre-aligned graph encoder (default: a graph transformer) — frozen during instruction tuning' },
      { label: 'projector', sub: 'the only 🔥', state: 'trained', blurb: 'as simple as a single linear layer: maps node embeddings into the LLM&apos;s token space' },
      { label: 'LLM', sub: 'Vicuna — frozen', state: 'frozen', blurb: 'n graph tokens replace <graph>: {<graph_begin>, <graph_token>_1..n, <graph_end>}; the frozen LLM answers' },
    ],
    trained: 'the projector — nothing else',
    locus: 'LLM predicts',
    conditioning: 'graph tokens are spliced into the instruction at the <graph> marker',
  },
  llaga: {
    name: 'LLaGA',
    slots: [
      { label: 'node text', state: 'none', blurb: 'node attributes only — LLaGA never trains a graph encoder' },
      { label: 'text encoder', sub: 'SimTeG/SBERT — frozen', state: 'frozen', blurb: 'off-the-shelf frozen text embeddings for every node' },
      { label: 'templates', sub: '0 params', state: 'free', blurb: 'parameter-free: a fixed-shape sampled tree flattened level-by-level (+ Laplacian PEs), or per-hop mean aggregation' },
      { label: 'projector', sub: 'MLP — the only 🔥', state: 'trained', blurb: 'a small MLP maps template sequences into token space — the only trained parameters' },
      { label: 'LLM', sub: 'Vicuna-7B — frozen', state: 'frozen', blurb: 'the frozen LLM reads the projected node sequence and answers' },
    ],
    trained: 'the MLP projector — nothing else',
    locus: 'LLM predicts',
    conditioning: 'structure is encoded by the token ORDER the parameter-free templates produce',
  },
  unigraph: {
    name: 'UniGraph',
    slots: [
      { label: 'masked node text', state: 'none', blurb: 'node texts with masked spans — the self-supervision signal' },
      { label: 'DeBERTa', sub: 'trained 🔥', state: 'trained', blurb: 'the LM is NOT frozen here — it trains jointly with the GNN' },
      { label: 'GAT', sub: 'trained 🔥', state: 'trained', blurb: 'propagates each node&apos;s [CLS] embedding over the graph — the cascade&apos;s second half' },
      { label: '', state: 'none' },
      { label: 'MGM head', sub: 'masked-graph modeling', state: 'trained', blurb: 'Graph Siamese Masked Autoencoder objective on text-attributed graphs' },
    ],
    trained: 'LM + GNN jointly, end to end',
    locus: 'GNN predicts',
    conditioning: 'none at pretrain; a LoRA-tuned Llama handles instructions at inference time only',
  },
}

const FILL: Record<SlotState, { fill: string; stroke: string; icon: string }> = {
  frozen: { fill: '#dceefb', stroke: '#5a8fd0', icon: '❄' },
  trained: { fill: '#ffe9d6', stroke: '#c86018', icon: '🔥' },
  free: { fill: '#eeeeea', stroke: '#999', icon: '∅' },
  none: { fill: 'none', stroke: '#bbb', icon: '' },
}

export default function TextGlueLab() {
  const [wiring, setWiring] = useState<Wiring>('ofa')
  const [picked, setPicked] = useState<number | null>(null)

  const def = WIRINGS[wiring]
  const blurb = picked !== null ? def.slots[picked].blurb : undefined

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Wiring Switcher</span>
        <span className={s.widgetHint}>one bet, four machines — click a slot for details</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {(Object.keys(WIRINGS) as Wiring[]).map(w => (
            <button key={w} type="button" className={`${s.chip} ${wiring === w ? s.chipOn : ''}`} onClick={() => { setWiring(w); setPicked(null) }}>
              {WIRINGS[w].name}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 470 120" className={s.labCanvas} role="img" aria-label={`Pipeline diagram for ${def.name}`}>
          {def.slots.map((slot, i) => {
            const x = 6 + i * 94
            const st = FILL[slot.state]
            const empty = slot.label === ''
            return (
              <g key={i} onClick={() => !empty && setPicked(i)} style={{ cursor: empty ? 'default' : 'pointer' }}>
                <rect
                  x={x} y={26} width={86} height={46} rx={4}
                  fill={empty ? 'none' : st.fill}
                  stroke={st.stroke}
                  strokeWidth={picked === i ? 2.5 : 1.4}
                  strokeDasharray={slot.state === 'none' ? '4 3' : undefined}
                />
                {!empty && (
                  <>
                    <text x={x + 43} y={44} textAnchor="middle" fontSize={9} fontWeight="bold">{slot.label} {st.icon}</text>
                    {slot.sub && <text x={x + 43} y={57} textAnchor="middle" fontSize={7.5} fill="#555">{slot.sub}</text>}
                  </>
                )}
                {empty && <text x={x + 43} y={52} textAnchor="middle" fontSize={8} fill="#aaa">—</text>}
                {i < 4 && <text x={x + 90} y={52} textAnchor="middle" fontSize={11} fill="#666">→</text>}
              </g>
            )
          })}
          <text x={10} y={14} fontSize={8.5} fill="#555">❄ frozen · 🔥 trained · ∅ parameter-free · dashed = absent</text>
          <text x={10} y={104} fontSize={8.5} fill="#333" fontWeight="bold">conditioning: <tspan fontWeight="normal">{def.conditioning}</tspan></text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>trained here: <span className={s.labStatValue}>{def.trained}</span></span>
          <span className={s.labStat}><span className={s.labStatValue}>{def.locus}</span></span>
        </div>
        {blurb && <p className={s.labNote}>{blurb}</p>}
        {!blurb && (
          <p className={s.labNote}>
            All four share the same bet — English as the universal vocabulary — yet they are four different
            machines. Watch three things as you switch: <strong>who predicts</strong> (GNN or LLM),{' '}
            <strong>whether a graph encoder exists at all</strong> (LLaGA&apos;s answer: no), and{' '}
            <strong>what actually trains</strong> (OFA: the GNN; GraphGPT/LLaGA: one projector; UniGraph:
            everything). The shared ceiling: nodes need meaningful text.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/gfm/TextGlueLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add Wiring Switcher lab: four LLM-graph wirings with frozen/trained anatomy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Channel Ensemble lab (GraphAny, 5.3)

**Files:**
- Create: `src/components/courses/gfm/ChannelEnsembleLab.tsx`
- Modify: `src/components/courses/gfm/zooLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `ChannelEnsembleLab` — registered as `channel-ensemble` in Task 9.
- The five channels are the paper's exact bank (Linear, LinearSGC1, LinearSGC2, LinearHGC1, LinearHGC2 over row-normalized Ā), each solved by REAL least squares on the toy graph's labeled nodes at every render. The "attention" bars are an honest stand-in (softmax over held-out ref/target accuracy), and the lab note says so.

- [ ] **Step 1: Append the failing test**

Append to `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import ChannelEnsembleLab from './ChannelEnsembleLab'

describe('ChannelEnsembleLab', () => {
  it('renders all five LinearGNN channels', () => {
    render(<ChannelEnsembleLab />)
    for (const name of ['Linear', 'LinearSGC1', 'LinearSGC2', 'LinearHGC1', 'LinearHGC2']) {
      expect(screen.getByText(name)).toBeDefined()
    }
  })

  it('shifts the trusted filter as homophily drops', () => {
    render(<ChannelEnsembleLab />)
    const slider = screen.getByLabelText(/homophily/i)
    fireEvent.change(slider, { target: { value: '0' } })   // 100% homophily
    const topAtHomophily = screen.getByText(/top filter:/).textContent
    expect(topAtHomophily).toMatch(/LinearSGC/)
    fireEvent.change(slider, { target: { value: '14' } })  // 0% homophily
    const topAtHeterophily = screen.getByText(/top filter:/).textContent
    // Paper: heterophilic graphs prefer LinearHGC1, Linear or LinearSGC1 —
    // the toy graph lands on one of the identity/high-pass channels.
    expect(topAtHeterophily).toMatch(/LinearHGC|Linear\b/)
    expect(topAtHeterophily).not.toBe(topAtHomophily)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./ChannelEnsembleLab`.

- [ ] **Step 3: Implement ChannelEnsembleLab**

Create `src/components/courses/gfm/ChannelEnsembleLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// 14 nodes, two communities (0-6 vs 7-13). Fixed weak features: community
// signal 0.4 plus fixed per-node "noise" — weak enough that raw features
// alone are unreliable, so the graph filters genuinely matter.
const NOISE: [number, number][] = [
  [0.42, -0.18], [-0.35, 0.28], [0.15, 0.45], [-0.48, -0.12], [0.3, 0.38], [-0.22, -0.42], [0.05, 0.2],
  [-0.4, 0.15], [0.33, -0.3], [-0.1, -0.45], [0.45, 0.1], [-0.28, 0.35], [0.2, -0.25], [-0.05, 0.48],
]
const X: [number, number][] = NOISE.map((n, i) => (i < 7 ? [0.4 + n[0], n[1]] : [n[0], 0.4 + n[1]]))
const LABEL = (i: number) => (i < 7 ? 0 : 1)

const LABELED = [0, 1, 2, 7, 8, 9]
const REF = [0, 1, 7, 8]      // used to SOLVE each channel (GraphAny's V_ref)
const TARGET = [2, 9]         // held out to weight channels (GraphAny's V_target)

// Two 7-rings; slider swaps within-edges for cross-edges (v of 14).
const WITHIN: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 7],
]
const CROSS: [number, number][] = [
  [0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 7],
  [0, 11], [3, 8], [5, 10], [1, 12], [4, 9], [6, 13], [2, 7],
]

const POS: [number, number][] = [
  [22, 24], [52, 12], [80, 26], [88, 56], [64, 76], [34, 78], [12, 54],
  [122, 24], [152, 12], [180, 26], [188, 56], [164, 76], [134, 78], [112, 54],
]

type Mat = number[][]

function edgesFor(v: number): [number, number][] {
  return [...WITHIN.slice(0, 14 - v), ...CROSS.slice(0, v)]
}

/** Row-normalized adjacency times a matrix: (Ā M). */
function aBar(edges: [number, number][], m: Mat): Mat {
  const nbrs: number[][] = Array.from({ length: 14 }, () => [])
  for (const [a, b] of edges) { nbrs[a].push(b); nbrs[b].push(a) }
  return m.map((_, i) => {
    if (nbrs[i].length === 0) return [0, 0]
    const acc = [0, 0]
    for (const j of nbrs[i]) { acc[0] += m[j][0]; acc[1] += m[j][1] }
    return [acc[0] / nbrs[i].length, acc[1] / nbrs[i].length]
  })
}

function sub(a: Mat, b: Mat): Mat { return a.map((r, i) => [r[0] - b[i][0], r[1] - b[i][1]]) }

/** Least squares W = (FᵀF + εI)⁻¹ FᵀY on the given rows (2x2 closed form). */
function solve(F: Mat, rows: number[]): Mat {
  let a = 1e-6, b = 0, c = 0, d = 1e-6
  const fty: Mat = [[0, 0], [0, 0]]
  for (const i of rows) {
    const [f0, f1] = F[i]
    a += f0 * f0; b += f0 * f1; c += f1 * f0; d += f1 * f1
    const y = LABEL(i)
    fty[0][y] += f0
    fty[1][y] += f1
  }
  const det = a * d - b * c
  const inv = [[d / det, -b / det], [-c / det, a / det]]
  return [
    [inv[0][0] * fty[0][0] + inv[0][1] * fty[1][0], inv[0][0] * fty[0][1] + inv[0][1] * fty[1][1]],
    [inv[1][0] * fty[0][0] + inv[1][1] * fty[1][0], inv[1][0] * fty[0][1] + inv[1][1] * fty[1][1]],
  ]
}

function predict(F: Mat, W: Mat): number[] {
  return F.map(f => (f[0] * W[0][0] + f[1] * W[1][0] >= f[0] * W[0][1] + f[1] * W[1][1] ? 0 : 1))
}

function acc(pred: number[], rows: number[]): number {
  return rows.filter(i => pred[i] === LABEL(i)).length / rows.length
}

const CHANNEL_NAMES = ['Linear', 'LinearSGC1', 'LinearSGC2', 'LinearHGC1', 'LinearHGC2']
const COMMUNITY_COLORS = ['#d64541', '#3a6ec8']

export default function ChannelEnsembleLab() {
  const [v, setV] = useState(0) // 0 = 100% homophily … 14 = 0%

  const { channels, attention, topIdx, ensembleAcc } = useMemo(() => {
    const edges = edgesFor(v)
    const ax = aBar(edges, X)
    const aax = aBar(edges, ax)
    const F: Mat[] = [X, ax, aax, sub(X, ax), sub(sub(X, ax), aBar(edges, sub(X, ax)))]
    const unlabeled = Array.from({ length: 14 }, (_, i) => i).filter(i => !LABELED.includes(i))
    const chans = F.map((f, ci) => {
      const W = solve(f, REF)
      const pred = predict(f, W)
      return { name: CHANNEL_NAMES[ci], pred, evalAcc: acc(pred, unlabeled), targetAcc: acc(pred, TARGET) }
    })
    // Honest stand-in for the learned attention: softmax over held-out accuracy.
    const exps = chans.map(c => Math.exp(3 * c.targetAcc))
    const z = exps.reduce((p, q) => p + q, 0)
    const att = exps.map(e => e / z)
    const top = att.indexOf(Math.max(...att))
    // Ensemble: attention-weighted vote.
    const ens = Array.from({ length: 14 }, (_, i) => {
      const w0 = chans.reduce((p, c, ci) => p + att[ci] * (c.pred[i] === 0 ? 1 : 0), 0)
      return w0 >= 0.5 ? 0 : 1
    })
    return { channels: chans, attention: att, topIdx: top, ensembleAcc: acc(ens, unlabeled) }
  }, [v])

  const edges = edgesFor(v)
  const homophily = Math.round(((14 - v) / 14) * 100)

  const miniGraph = (pred: number[], key: string) => (
    <svg key={key} viewBox="0 0 200 90" width={150} aria-hidden="true">
      {edges.map(([a2, b2], i) => (
        <line key={i} x1={POS[a2][0]} y1={POS[a2][1]} x2={POS[b2][0]} y2={POS[b2][1]} stroke="#c5c1af" strokeWidth={0.8} />
      ))}
      {POS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5}
          fill={COMMUNITY_COLORS[pred[i]]}
          stroke={COMMUNITY_COLORS[LABEL(i)]}
          strokeWidth={1.8}
        />
      ))}
    </svg>
  )

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Channel Ensemble Lab</span>
        <span className={s.widgetHint}>GraphAny: learn which filter to trust</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>homophily <strong>{homophily}%</strong></span>
          <input
            type="range" min={0} max={14} step={2} value={v}
            aria-label="homophily"
            className={s.slider}
            onChange={e => setV(Number(e.target.value))}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {channels.map((c, ci) => (
            <div key={c.name} style={{ textAlign: 'center', fontSize: 10 }}>
              <div style={{ fontWeight: ci === topIdx ? 'bold' : 'normal' }}>
                {c.name} · {Math.round(c.evalAcc * 100)}%
              </div>
              {miniGraph(c.pred, c.name)}
              <div style={{ height: 6, background: '#e4e0cf', borderRadius: 2 }}>
                <div style={{ height: 6, width: `${Math.round(attention[ci] * 100)}%`, background: '#0a246a', borderRadius: 2 }} />
              </div>
              <div>α = {attention[ci].toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>top filter: <span className={s.labStatValue}>{channels[topIdx].name}</span></span>
          <span className={s.labStat}>ensemble accuracy <span className={s.labStatValue}>{Math.round(ensembleAcc * 100)}%</span></span>
          <span className={s.labStat}>learned input weights <span className={s.labStatValue}>0</span></span>
        </div>
        <p className={s.labNote}>
          Five <strong>LinearGNN channels</strong> — X, ĀX, Ā²X, (I−Ā)X, (I−Ā)²X — each solved in closed form
          (least squares via the pseudo-inverse) on this graph&apos;s six labeled nodes; node fill = prediction,
          ring = truth. Drag homophily down: the low-pass channels (ĀX, Ā²X) collapse — averaging your neighbors
          is exactly wrong at 0% — and the identity/high-pass channels take over. The α bars here are an honest
          stand-in (softmax over held-out accuracy) for GraphAny&apos;s learned attention, which reads
          entropy-normalized distances <em>between the channels&apos; predictions</em> — quantities that exist for
          any graph, any feature width, any label count. It never learns your features; it learns{' '}
          <strong>which filter to trust</strong>.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test, verify it passes honestly**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`

> **SUPERSEDED (2026-07-11, controller):** the original predicate ("low-pass
> dies at 0%") is mathematically wrong for a clean bipartite toy — at 0%
> homophily ĀX is a perfect community-flip detector and the closed-form
> solve learns the inverted rule (module 4's own lesson). The corrected,
> honest behavior is a U-SHAPE: /LinearSGC/ tops at v=0 (100% homophily),
> identity/high-pass (/Linear\b|LinearHGC/) top at the MIXED midpoint
> (search v ∈ {6, 8, 10} for the low-pass dip and pin the test to that v),
> and /LinearSGC/ resurges at v=14. The attention stand-in gained a
> mean-margin tiebreak over TARGET = 4 held-out nodes (accuracy alone ties
> on tiny sets). The labNote teaches the U-shape and ties it to module 4's
> "0% is as far from random as 100%" quiz. See ledger + spec (amended) —
> the fix commits carry the authoritative code.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/gfm/ChannelEnsembleLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add Channel Ensemble lab: five real LinearGNN channels under a homophily slider

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: BFF Block Anatomy lab (GraphBFF, 5.4)

**Files:**
- Create: `src/components/courses/gfm/BffAnatomyLab.tsx`
- Modify: `src/components/courses/gfm/zooLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `BffAnatomyLab` — registered as `bff-anatomy` in Task 9.
- CRITICAL (spec ledger): step 1 is per-NODE-TYPE projections W_τ (user 4-dim, merchant 6-dim, device 3-dim → shared d), NOT per-modality group encoders — the grouping scheme belongs to the TabFM lineage and is mentioned only in the caption. Fusion is a learned FFN Φ, not a sum.

- [ ] **Step 1: Append the failing test**

Append to `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import BffAnatomyLab from './BffAnatomyLab'

describe('BffAnatomyLab', () => {
  it('steps through the five stages of one forward pass', () => {
    render(<BffAnatomyLab />)
    expect(screen.getByText(/per-node-type projection/i)).toBeDefined()
    const next = screen.getByRole('button', { name: /next ▸/i })
    fireEvent.click(next)
    expect(screen.getByText(/one softmax per relation-type set/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/one shared softmax/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/learned combination/i)).toBeDefined()
    fireEvent.click(next)
    expect(screen.getByText(/masked link/i)).toBeDefined()
  })

  it('always shows where the parameters live', () => {
    render(<BffAnatomyLab />)
    expect(screen.getByText(/≈85% of 1.4B params/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./BffAnatomyLab`.

- [ ] **Step 3: Implement BffAnatomyLab**

Create `src/components/courses/gfm/BffAnatomyLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type NType = 'user' | 'merchant' | 'device'
type EType = 'paid' | 'shares-device' | 'affiliated'

const NODES: { id: string; type: NType; x: number; y: number }[] = [
  { id: 'U1', type: 'user', x: 44, y: 44 },
  { id: 'U2', type: 'user', x: 44, y: 138 },
  { id: 'M1', type: 'merchant', x: 152, y: 30 },
  { id: 'M2', type: 'merchant', x: 152, y: 118 },
  { id: 'D1', type: 'device', x: 96, y: 188 },
]

const EDGES: { a: string; b: string; t: EType }[] = [
  { a: 'U1', b: 'M1', t: 'paid' },
  { a: 'U1', b: 'M2', t: 'paid' },
  { a: 'U2', b: 'M2', t: 'paid' },
  { a: 'U1', b: 'D1', t: 'shares-device' },
  { a: 'U2', b: 'D1', t: 'shares-device' },
  { a: 'M1', b: 'M2', t: 'affiliated' },
]

const E_COLORS: Record<EType, string> = { paid: '#2f8e2f', 'shares-device': '#c86018', affiliated: '#7a4ab8' }
const N_FILL: Record<NType, string> = { user: '#5a8fd0', merchant: '#e0a040', device: '#a879d8' }
const RAW_DIMS: Record<NType, number> = { user: 4, merchant: 6, device: 3 }

function softmax(logits: number[]): number[] {
  const m = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - m))
  const z = exps.reduce((p, q) => p + q, 0)
  return exps.map(e => e / z)
}

// Fixed toy attention logits for the focus node U1 (real softmax, fixed inputs).
const TCA_PAID = softmax([0.8, 0.3])            // over {M1, M2}
const TAA_ALL = softmax([0.5, 0.2, 0.6, 0.1])   // over sampled 2-hop {M1, M2, D1, U2}
// Fixed toy scores for the masked-link step (concat + MLP on fixed embeddings).
const LINK_SCORES: { pair: string; v: number }[] = [
  { pair: 'U2 — M2 (masked true edge)', v: 0.86 },
  { pair: 'U2 — M1', v: 0.41 },
  { pair: 'U2 — D1 (negative)', v: 0.12 },
]

const STEPS = [
  {
    title: '1 · Per-node-type projection',
    caption: 'per-node-type projection W_τ: user features are 4-dim, merchant 6-dim, device 3-dim — each node type has its OWN learned linear map into the shared hidden d. (The other wing of this bet — grouping features by kind (numerical/categorical/text) with one shared transform per group — is the TabFM lineage; GraphBFF describes it as related work and notes it can limit expressivity.)',
  },
  {
    title: '2 · TCA — type-conditioned attention',
    caption: 'one softmax per relation-type set, each with its own W_Q/W_K/W_V and edge bias, normalized only within that subset — then the per-set outputs are summed. Singleton sets recover strict per-relation attention. This is where about 85% of the parameters live.',
  },
  {
    title: '3 · TAA — type-agnostic attention',
    caption: 'one shared softmax over a sampled neighborhood (2 hops, up to 10 per hop in the paper), shared W_Q/W_K/W_V across all types — cheap cross-type information flow.',
  },
  {
    title: '4 · Fusion Φ',
    caption: 'learned combination: an FFN Φ takes (h_tca, h_taa) and produces the node update — then the standard residual + LayerNorm + block-FFN wrapper. Theorem 4.1: TCA + TAA together are strictly more expressive than either alone.',
  },
  {
    title: '5 · Masked-link head',
    caption: 'masked link prediction: sampled true edges are hidden from the input graph; concat the two node embeddings, score with a 2-layer MLP, train with BCE against 1:1 uniform negatives. That is the entire pretraining objective.',
  },
]

export default function BffAnatomyLab() {
  const [step, setStep] = useState(0)

  const focus = 'U1'
  const focusEdges = EDGES.filter(e => e.a === focus || e.b === focus)

  const edgeWeight = (e: { a: string; b: string; t: EType }): number | null => {
    if (step === 1) {
      if (!(e.a === focus || e.b === focus)) return null
      if (e.t === 'paid') return e.b === 'M1' || e.a === 'M1' ? TCA_PAID[0] : TCA_PAID[1]
      if (e.t === 'shares-device') return 1
      return null
    }
    if (step === 2) {
      const other = e.a === focus ? e.b : e.a
      const idx = ['M1', 'M2', 'D1', 'U2'].indexOf(other)
      return idx >= 0 && (e.a === focus || e.b === focus) ? TAA_ALL[idx] : null
    }
    return null
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>BFF Block Anatomy</span>
        <span className={s.widgetHint}>one forward pass, five stops</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 470 210" className={s.labCanvas} role="img" aria-label="GraphBFF block anatomy stepper">
          {/* left: the heterogeneous graph */}
          {EDGES.map((e, i) => {
            const a = NODES.find(n => n.id === e.a)!
            const b = NODES.find(n => n.id === e.b)!
            const w = edgeWeight(e)
            const masked = step === 4 && e.a === 'U2' && e.b === 'M2'
            return (
              <g key={i}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={E_COLORS[e.t]}
                  strokeWidth={w !== null ? 1.5 + 6 * w : 1.3}
                  strokeDasharray={masked ? '4 3' : undefined}
                  opacity={w !== null ? 0.95 : masked ? 0.9 : 0.45}
                />
                {w !== null && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize={8} fontWeight="bold" textAnchor="middle" fill={E_COLORS[e.t]}>
                    {Math.round(w * 100)}%
                  </text>
                )}
                {masked && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize={8} fontWeight="bold" textAnchor="middle" fill="#333">
                    masked
                  </text>
                )}
              </g>
            )
          })}
          {NODES.map(n => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={13} fill={N_FILL[n.type]} stroke={n.id === focus && step >= 1 && step <= 3 ? '#0a246a' : '#555'} strokeWidth={n.id === focus && step >= 1 && step <= 3 ? 2.5 : 1} />
              <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#fff">{n.id}</text>
            </g>
          ))}
          {/* right: per-step panel */}
          <g transform="translate(232, 8)">
            {step === 0 && (
              <g fontSize={8.5}>
                {(['user', 'merchant', 'device'] as NType[]).map((t, r) => (
                  <g key={t} transform={`translate(0, ${r * 52})`}>
                    {Array.from({ length: RAW_DIMS[t] }, (_, i) => (
                      <rect key={i} x={i * 13} y={4} width={11} height={11} fill={N_FILL[t]} opacity={0.5 + 0.07 * i} stroke="#666" strokeWidth={0.6} />
                    ))}
                    <text x={0} y={30} fill="#333">{t}: {RAW_DIMS[t]}-dim → <tspan fontWeight="bold">W_{t}</tspan> →</text>
                    {Array.from({ length: 4 }, (_, i) => (
                      <rect key={i} x={126 + i * 13} y={18} width={11} height={11} fill="#888" opacity={0.6 + 0.1 * i} stroke="#333" strokeWidth={0.6} />
                    ))}
                    <text x={126} y={44} fill="#555">d = 4</text>
                  </g>
                ))}
              </g>
            )}
            {step === 1 && (
              <g fontSize={8.5}>
                <rect x={0} y={0} width={190} height={30} rx={3} fill="#fff" stroke={E_COLORS.paid} strokeWidth={1.5} />
                <text x={7} y={12} fill={E_COLORS.paid} fontWeight="bold">W_Q W_K W_V — set {'{paid}'}</text>
                <text x={7} y={24} fill="#555">softmax over paid neighbors only: {Math.round(TCA_PAID[0] * 100)} / {Math.round(TCA_PAID[1] * 100)}</text>
                <rect x={0} y={38} width={190} height={30} rx={3} fill="#fff" stroke={E_COLORS['shares-device']} strokeWidth={1.5} />
                <text x={7} y={50} fill={E_COLORS['shares-device']} fontWeight="bold">W_Q W_K W_V — set {'{shares-device}'}</text>
                <text x={7} y={62} fill="#555">softmax over device neighbors only: 100</text>
                <text x={0} y={86} fill="#333">then: h_tca = Σ over sets</text>
              </g>
            )}
            {step === 2 && (
              <g fontSize={8.5}>
                <rect x={0} y={0} width={190} height={30} rx={3} fill="#fff" stroke="#667" strokeWidth={1.5} />
                <text x={7} y={12} fill="#333" fontWeight="bold">shared W_Q W_K W_V — all types</text>
                <text x={7} y={24} fill="#555">sampled 2-hop, ≤10 per hop</text>
                <text x={0} y={50} fill="#333">weights: M1 {Math.round(TAA_ALL[0] * 100)} · M2 {Math.round(TAA_ALL[1] * 100)} · D1 {Math.round(TAA_ALL[2] * 100)} · U2 {Math.round(TAA_ALL[3] * 100)}</text>
              </g>
            )}
            {step === 3 && (
              <g fontSize={9}>
                <rect x={0} y={4} width={62} height={22} rx={3} fill="#dceefb" stroke="#5a8fd0" />
                <text x={31} y={18} textAnchor="middle">h_tca</text>
                <rect x={0} y={34} width={62} height={22} rx={3} fill="#ffe9d6" stroke="#c86018" />
                <text x={31} y={48} textAnchor="middle">h_taa</text>
                <text x={72} y={34} fontSize={11}>→</text>
                <rect x={86} y={16} width={46} height={28} rx={3} fill="#efe9f8" stroke="#7a4ab8" strokeWidth={1.6} />
                <text x={109} y={34} textAnchor="middle" fontWeight="bold">Φ</text>
                <text x={140} y={34} fontSize={11}>→</text>
                <text x={156} y={34}>h&apos;</text>
              </g>
            )}
            {step === 4 && (
              <g fontSize={8.5}>
                {LINK_SCORES.map((l, i) => (
                  <g key={l.pair} transform={`translate(0, ${i * 26})`}>
                    <rect x={0} y={2} width={150 * l.v} height={12} fill="#0a246a" opacity={0.7} rx={2} />
                    <text x={0} y={26} fill="#333">{l.pair}: {l.v.toFixed(2)}</text>
                  </g>
                ))}
              </g>
            )}
          </g>
        </svg>
        {/* parameter meter — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 10, background: '#e4e0cf', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '85%', background: '#7a4ab8' }} />
            <div style={{ width: '15%', background: '#5a8fd0' }} />
          </div>
          <span>TCA ≈85% of 1.4B params (paper: &quot;about 85%&quot;) · rest: TAA + FFNs + heads</span>
        </div>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.max(0, st - 1))} disabled={step === 0}>◂ back</button>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.min(STEPS.length - 1, st + 1))} disabled={step === STEPS.length - 1}>next ▸</button>
          <span className={s.labStat}><span className={s.labStatValue}>{STEPS[step].title}</span></span>
        </div>
        <p className={s.labNote}>{STEPS[step].caption}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS. (Step captions contain the asserted phrases: &quot;per-node-type projection&quot;, &quot;one softmax per relation-type set&quot;, &quot;one shared softmax&quot;, &quot;learned combination&quot;, &quot;masked link&quot;.)

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/gfm/BffAnatomyLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add BFF Block Anatomy lab: TCA/TAA/fusion stepper with parameter meter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Label-Injection Stepper lab (KumoRFM-2, 5.5)

**Files:**
- Create: `src/components/courses/gfm/LabelInjectionLab.tsx`
- Modify: `src/components/courses/gfm/zooLabs.test.tsx` (append)

**Interfaces:**
- Produces: default export `LabelInjectionLab` — registered as `label-injection` in Task 9.
- Uses semantic HTML tables (not SVG) — rows/cells are asserted by tests and read by screen readers. Cross-sample weights come from a real softmax over fixed similarity scores.

- [ ] **Step 1: Append the failing test**

Append to `src/components/courses/gfm/zooLabs.test.tsx`:

```tsx
import LabelInjectionLab from './LabelInjectionLab'

describe('LabelInjectionLab', () => {
  it('injects context labels into the users table at step 1', () => {
    render(<LabelInjectionLab />)
    expect(screen.queryByText('churn?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /next ▸/i }))
    expect(screen.getByText('churn?')).toBeDefined()
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })

  it('ends frozen: prediction with zero weight updates', () => {
    render(<LabelInjectionLab />)
    const next = screen.getByRole('button', { name: /next ▸/i })
    for (let i = 0; i < 4; i++) fireEvent.click(next)
    expect(screen.getByText(/churn\(U4\) =/)).toBeDefined()
    expect(screen.getByText(/weights updated/)).toBeDefined()
    expect(screen.getByText('0', { selector: 'span' })).toBeDefined()
  })

  it('contrasts with the flatten-to-one-row pipeline', () => {
    render(<LabelInjectionLab />)
    fireEvent.click(screen.getByRole('button', { name: /flatten instead/i }))
    expect(screen.getByText(/task-conditioned extraction/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: FAIL — cannot resolve `./LabelInjectionLab`.

- [ ] **Step 3: Implement LabelInjectionLab**

Create `src/components/courses/gfm/LabelInjectionLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const USERS = [
  { id: 'U1', country: 'US', churn: 'yes' },
  { id: 'U2', country: 'DE', churn: 'no' },
  { id: 'U3', country: 'US', churn: 'no' },
  { id: 'U4', country: 'DE', churn: '?' },
]
const ORDERS = [
  { id: 'O1', user: 'U1', item: 'I1', amount: 12 },
  { id: 'O2', user: 'U2', item: 'I2', amount: 80 },
  { id: 'O3', user: 'U3', item: 'I2', amount: 64 },
  { id: 'O4', user: 'U4', item: 'I3', amount: 71 },
  { id: 'O5', user: 'U4', item: 'I2', amount: 58 },
]
const ITEMS = [
  { id: 'I1', category: 'starter' },
  { id: 'I2', category: 'pro' },
  { id: 'I3', category: 'pro' },
]

// Fixed similarity of U4 to each context user (from order count + avg amount),
// run through a real softmax → cross-sample attention weights.
function softmax(l: number[]): number[] {
  const m = Math.max(...l)
  const e = l.map(x => Math.exp(x - m))
  const z = e.reduce((p, q) => p + q, 0)
  return e.map(x => x / z)
}
const SIM = [0.2, 1.4, 1.1] // U1 (1 cheap order) vs U2/U3 (like U4: fewer, pricier)
const W = softmax(SIM)
const P_NO = W[1] + W[2] // U2 and U3 are "no"

const STEP_CAPTIONS = [
  'A tiny relational database: three tables joined by primary/foreign keys. The task: will U4 churn? Three users have known outcomes — they are the in-context examples.',
  'Step 1 — inject: the context users’ labels are written INTO the users table as a new column. Conditioning enters before any model runs — earlier than every other model in this zoo.',
  'Step 2 — within each table, attention alternates over columns and rows, producing TASK-CONDITIONED row embeddings: because the label column is present, the network can learn task-relevant extractions per row.',
  'Step 3 — attention follows primary/foreign-key edges: U4’s row gathers from U4’s orders (O4, O5), which gather from their items. No quadratic all-cell attention — only key-joined rows talk.',
  'Step 4 — cross-sample attention: the query row attends over the context rows, weighted by learned similarity — then the prediction reads out. No gradient step ever ran.',
]

export default function LabelInjectionLab() {
  const [step, setStep] = useState(0)
  const [flat, setFlat] = useState(false)

  const cell: React.CSSProperties = { border: '1px solid #b8b4a2', padding: '2px 7px', fontSize: 10.5 }
  const head: React.CSSProperties = { ...cell, background: '#e4e0cf', fontWeight: 'bold' }
  const hot = (on: boolean): React.CSSProperties => (on ? { background: '#ffe9d6' } : {})
  const injected = step >= 1

  if (flat) {
    return (
      <div className={s.widgetBox}>
        <div className={s.widgetTitle}>
          <span>Label-Injection Stepper</span>
          <span className={s.widgetHint}>the flatten-first alternative</span>
        </div>
        <div className={s.widgetBody}>
          <table style={{ borderCollapse: 'collapse', margin: '6px 0' }}>
            <thead>
              <tr>{['id', 'country', 'n_orders', 'total_spent', 'top_category', 'churn?'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{['U4', 'DE', '2', '129', 'pro', '?'].map((v, i) => <td key={i} style={cell}>{v}</td>)}</tr>
            </tbody>
          </table>
          <p className={s.labNote}>
            The flatten-then-tabular-FM pipeline (RDBLearn-style: deep feature synthesis, then TabPFN) collapses
            U4&apos;s whole neighborhood into ONE wide row before the model runs. The aggregation columns were
            chosen <em>before anyone knew the task</em> — <strong>task-conditioned extraction</strong> is lost.
            Kumo&apos;s purpose-built synthetic makes the gap stark: fixed column-wise encoders score AUROC 0.5
            where task-conditioned extraction scores 1.0 (vendor-reported, adversarial example).
          </p>
          <div className={s.labControls}>
            <button type="button" className={s.btn} onClick={() => setFlat(false)}>◂ back to the stepper</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Label-Injection Stepper</span>
        <span className={s.widgetHint}>KumoRFM-2: will user U4 churn?</span>
      </div>
      <div className={s.widgetBody}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
          <table style={{ borderCollapse: 'collapse' }} aria-label="users table">
            <thead>
              <tr>
                <th style={head} colSpan={injected ? 3 : 2}>users</th>
              </tr>
              <tr>
                <th style={head}>id</th>
                <th style={head}>country</th>
                {injected && <th style={{ ...head, background: '#ffe9d6' }}>churn?</th>}
              </tr>
            </thead>
            <tbody>
              {USERS.map(u => (
                <tr key={u.id}>
                  <td style={{ ...cell, ...hot(step >= 2 && u.id === 'U4') }}>{u.id}</td>
                  <td style={{ ...cell, ...hot(step >= 2 && u.id === 'U4') }}>{u.country}</td>
                  {injected && <td style={{ ...cell, background: '#fff7ec' }}>{u.churn}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse' }} aria-label="orders table">
            <thead>
              <tr><th style={head} colSpan={4}>orders</th></tr>
              <tr>{['id', 'user ⇢', 'item ⇢', 'amount'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.id}>
                  {[o.id, o.user, o.item, String(o.amount)].map((v, i) => (
                    <td key={i} style={{ ...cell, ...hot(step >= 3 && o.user === 'U4') }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse' }} aria-label="items table">
            <thead>
              <tr><th style={head} colSpan={2}>items</th></tr>
              <tr>{['id', 'category'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ITEMS.map(it => (
                <tr key={it.id}>
                  <td style={{ ...cell, ...hot(step >= 3 && (it.id === 'I2' || it.id === 'I3')) }}>{it.id}</td>
                  <td style={{ ...cell, ...hot(step >= 3 && (it.id === 'I2' || it.id === 'I3')) }}>{it.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {step >= 4 && (
          <div className={s.labControls}>
            <span className={s.labStat}>cross-sample weights: U1 <span className={s.labStatValue}>{W[0].toFixed(2)}</span> · U2 <span className={s.labStatValue}>{W[1].toFixed(2)}</span> · U3 <span className={s.labStatValue}>{W[2].toFixed(2)}</span></span>
            <span className={s.labStat}>churn(U4) = <span className={s.labStatValue}>no ({P_NO.toFixed(2)})</span></span>
            <span className={s.labStat}>weights updated <span className={s.labStatValue}>0</span></span>
          </div>
        )}
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.max(0, st - 1))} disabled={step === 0}>◂ back</button>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.min(4, st + 1))} disabled={step === 4}>next ▸</button>
          <button type="button" className={s.btn} onClick={() => setFlat(true)}>flatten instead</button>
          <span className={s.labStat}>step <span className={s.labStatValue}>{step} / 4</span></span>
        </div>
        <p className={s.labNote}>{STEP_CAPTIONS[step]}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS (all six labs' describes green).

- [ ] **Step 5: Run the full suite and compare to the Task 1 baseline**

Run: `npx vitest run 2>&1 | tail -3`
Expected: failure count equals the Task 1 baseline (the 12 known pre-existing failures) — no new failures.

- [ ] **Step 6: Commit**

```bash
git add src/components/courses/gfm/LabelInjectionLab.tsx src/components/courses/gfm/zooLabs.test.tsx
git commit -m "Add Label-Injection Stepper lab: KumoRFM-2 in-context flow vs flattening

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Subchapter content — 5.1 ULTRA and 5.2 text as glue

**Files:**
- Create: `src/components/courses/gfm/zooSubchapters.tsx`

**Interfaces:**
- Produces: `export const ZOO_SUBCHAPTERS: CourseModule[]` — Task 8 appends three more modules to the array literal; Task 9 attaches it to module 5 and registers the widgets the blocks reference (`relation-graph`, `text-glue`).
- Quiz ids introduced here: moved `m5-q1` (verbatim from content.tsx), moved `m5-q2` (verbatim), new `m5-1-q1`, `m5-1-q2`, `m5-2-q1`, `m5-2-q2`, `m5-2-q3`. Task 9 DELETES `m5-q1`/`m5-q2` from the parent quiz — until then the file is unattached so no duplicate-id test can fire.
- All prose facts follow the spec's verification ledger. Do not paraphrase numbers or mechanisms beyond it.

- [ ] **Step 1: Create the file with 5.1 and 5.2**

Create `src/components/courses/gfm/zooSubchapters.tsx` (the `A` helper matches `content.tsx`):

```tsx
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
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/courses/gfm/zooSubchapters.tsx`
Expected: clean (the file is not yet imported anywhere — that's Task 9).

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/gfm/zooSubchapters.tsx
git commit -m "Add zoo deep-dive content: 5.1 ULTRA and 5.2 text-as-glue

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Subchapter content — 5.3 in-context, 5.4 GraphBFF, 5.5 relational

**Files:**
- Modify: `src/components/courses/gfm/zooSubchapters.tsx` (append three modules inside the `ZOO_SUBCHAPTERS` array, after the `zoo-text-glue` object)

**Interfaces:**
- Consumes: the `A` helper and array from Task 7.
- Produces: modules `zoo-in-context`, `zoo-graphbff`, `zoo-relational` referencing widgets `channel-ensemble`, `bff-anatomy`, `label-injection`. Quiz ids: moved `m5-q3` (prompt CORRECTED per ledger — "120 labeled nodes", not "120-node graph"), moved `m5-q4` (verbatim), new `m5-3-q1`, `m5-3-q2`, `m5-4-q1`, `m5-4-q2`, `m5-5-q1`, `m5-5-q2`, `m5-5-q3`.

- [ ] **Step 1: Append the three modules**

Insert before the closing `]` of `ZOO_SUBCHAPTERS`:

```tsx
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
          { label: 'Turning Tabular Foundation Models into Graph Foundation Models (G2T-FM) — Eremeev et al. (NeurIPS 2025)', href: 'https://arxiv.org/abs/2508.20906' },
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
              standard pre-norm transformer block — and Theorem 4.1 proves the pair is{' '}
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
            The <a href="/learn/attention-mechanisms">Attention course</a> builds every primitive this block
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
              with predictions that &quot;often reduce to the historical mean&quot; (vendor-reported; the
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
            1 of the <a href="/learn/attention-mechanisms">Attention course</a> (and deep dive 2.2 for
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
          { label: 'The Relational Transformer — (2025)', href: 'https://arxiv.org/abs/2510.06377', note: 'RT_zero is its zero-shot mode' },
        ],
      },
    ],
  },
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/courses/gfm/zooSubchapters.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/gfm/zooSubchapters.tsx
git commit -m "Add zoo deep-dive content: 5.3 in-context, 5.4 GraphBFF, 5.5 relational FMs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Wire it together — parent module rewrite, registration, catalog, shell tests

**Files:**
- Modify: `src/components/courses/gfm/content.tsx` (replace the module object with id `'zoo'`; add one import)
- Modify: `src/components/courses/gfm/index.tsx` (register six widgets)
- Modify: `src/lib/courseCatalog.ts` (GFM entry: minutes, highlights, description)
- Modify: `src/components/courses/gfm/GfmStudyGuide.test.tsx` (flat-count progress; deep-dive navigation test)

**Interfaces:**
- Consumes: `ZOO_SUBCHAPTERS` (Task 7/8), the six lab components (Tasks 1–6).
- Produces: the live course. `courseCatalog.test.ts` (untouched) enforces: minutes sum over modules+subchapters = catalog entry; every referenced widget registered; quiz ids globally unique. `entry.modules` stays 7.

- [ ] **Step 1: Update the shell tests first (failing)**

In `src/components/courses/gfm/GfmStudyGuide.test.tsx`:

(a) Add below the imports:

```tsx
const FLAT_COUNT = MODULES.reduce((n, m) => n + 1 + (m.subchapters?.length ?? 0), 0)
```

(b) In BOTH the `'marks a module complete...'` and `'persists progress...'` tests, replace

```tsx
    expect(screen.getByText(`${Math.round(100 / MODULES.length)}% complete`)).toBeDefined()
```

with

```tsx
    expect(screen.getByText(`${Math.round(100 / FLAT_COUNT)}% complete`)).toBeDefined()
```

(c) Append inside the top-level `describe`:

```tsx
  it('renders the five zoo deep dives in the sidebar and navigates to 5.1', () => {
    render(<CourseShell course={gfmCourse} />)
    const nav = screen.getByRole('navigation')
    for (const label of ['5.1 ULTRA: relations', '5.2 Text as glue', '5.3 Structure + in-context', '5.4 GraphBFF: typed attention', '5.5 The relational bet']) {
      expect(within(nav).getByText(label)).toBeDefined()
    }
    fireEvent.click(screen.getByRole('button', { name: /5\.1 ULTRA/ }))
    expect(screen.getByRole('heading', { name: 'A vocabulary of relations — ULTRA' })).toBeDefined()
    expect(screen.getByText(/Module 5 · Deep dive 1 of 5/)).toBeDefined()
    expect(screen.getByText('Relation-Graph Builder')).toBeDefined()
  })

  it('threads deep dives into prev/next order after module 5', () => {
    render(<CourseShell course={gfmCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /5\. The GFM zoo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'A vocabulary of relations — ULTRA' })).toBeDefined()
  })
```

Run: `npx vitest run src/components/courses/gfm/GfmStudyGuide.test.tsx`
Expected: FAIL (no subchapters yet; pct strings unchanged at runtime).

- [ ] **Step 2: Rewrite module 5 in `content.tsx`**

Add to the imports at the top of `src/components/courses/gfm/content.tsx`:

```tsx
import { ZOO_SUBCHAPTERS } from './zooSubchapters'
```

Replace the ENTIRE module object with `id: 'zoo'` (from `{` before `id: 'zoo'` through its closing `},` before `id: 'scale'`) with:

```tsx
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
```

- [ ] **Step 3: Register the widgets in `src/components/courses/gfm/index.tsx`**

Add imports after the existing ones and extend the `widgets` map:

```tsx
import ZooMapLab from './ZooMapLab'
import RelationGraphLab from './RelationGraphLab'
import TextGlueLab from './TextGlueLab'
import ChannelEnsembleLab from './ChannelEnsembleLab'
import BffAnatomyLab from './BffAnatomyLab'
import LabelInjectionLab from './LabelInjectionLab'
```

```tsx
    'zoo-map': ZooMapLab,
    'relation-graph': RelationGraphLab,
    'text-glue': TextGlueLab,
    'channel-ensemble': ChannelEnsembleLab,
    'bff-anatomy': BffAnatomyLab,
    'label-injection': LabelInjectionLab,
```

- [ ] **Step 4: Count the referenced papers, then update `src/lib/courseCatalog.ts`**

Run: `grep -o "label: '" src/components/courses/gfm/content.tsx src/components/courses/gfm/zooSubchapters.tsx | wc -l`
Use the number (call it N) in the highlights string. Update the GFM entry:

```ts
  {
    slug: 'graph-foundation-models',
    title: 'Graph Foundation Models',
    subtitle: 'From message passing to billion-parameter graph models',
    description:
      'An interactive course on Graph Foundation Models: message passing, the heterogeneity trilemma, and the GFM zoo — with architecture deep dives on ULTRA, text-as-glue LLM hybrids, GraphAny and graph PFNs, GraphBFF\'s typed attention, and relational foundation models like KumoRFM-2.',
    modules: 7,
    minutes: 101,
    highlights: `12 interactive labs · 5 deep dives · ${'{N}'} referenced papers`,
  },
```

(Substitute the literal N — e.g. `'12 interactive labs · 5 deep dives · 58 referenced papers'`. Do NOT ship the template placeholder.)

- [ ] **Step 5: Run the GFM and catalog tests**

Run: `npx vitest run src/components/courses/gfm/GfmStudyGuide.test.tsx src/lib/__tests__/courseCatalog.test.ts src/components/courses/gfm/zooLabs.test.tsx`
Expected: PASS. If the minutes assertion fails, re-check: top-level 6+9+8+12+9+11+8 = 63, subchapters 8+8+7+7+8 = 38, total 101.

- [ ] **Step 6: Full suite vs baseline**

Run: `npx vitest run 2>&1 | tail -3`
Expected: failure count equals the Task 1 baseline.

- [ ] **Step 7: Commit**

```bash
git add src/components/courses/gfm/content.tsx src/components/courses/gfm/index.tsx src/lib/courseCatalog.ts src/components/courses/gfm/GfmStudyGuide.test.tsx
git commit -m "Rewrite module 5 as five vocabulary bets with zoo deep dives attached

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Fact-check gate (blocking)

**Files:**
- Read: `src/components/courses/gfm/zooSubchapters.tsx`, `src/components/courses/gfm/content.tsx` (module 5), `src/components/courses/gfm/ZooMapLab.tsx`
- Reference: `docs/superpowers/specs/2026-07-10-gfm-zoo-subchapters-design.md` (verification ledger)

This gate exists because implementers transcribe plan errors faithfully — the assembled content must be re-reviewed against the ledger by FRESH eyes, not by the author.

- [ ] **Step 1: Dispatch two review subagents (Agent tool, in parallel)**

Reviewer A — claims audit. Prompt it to: read the three files above plus the spec's verification ledger; check EVERY factual claim (mechanisms, numbers, names, dates, attributions — including all 50 Zoo Map cells) against the ledger; anything the ledger doesn't cover must be flagged UNSUPPORTED rather than assumed true; return findings as `file:line — claim — CONFIRMED | CONTRADICTS-LEDGER (quote the ledger line) | UNSUPPORTED`.

Reviewer B — quiz-key audit. Prompt it to: extract every quiz question in the two content files; verify exactly one option has `correct: true`; verify the correct option is factually right per the ledger and each distractor's `explain` is accurate and doesn't accidentally describe a true statement as wrong; check moved ids (`m5-q1`…`m5-q4`) exist exactly once course-wide; return findings per question id.

- [ ] **Step 2: Fix every finding**

Apply fixes to the content files. UNSUPPORTED claims get either (a) a ledger-backed rewrite, or (b) deletion — never a plausible-sounding patch. Re-run: `npx vitest run src/components/courses/gfm/ 2>&1 | tail -3` — no new failures.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/gfm/zooSubchapters.tsx src/components/courses/gfm/content.tsx src/components/courses/gfm/ZooMapLab.tsx
git commit -m "Apply fact-check review findings to zoo deep-dive content

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If the reviewers return zero findings, note that in the task log and skip the commit.)

---

### Task 11: End-to-end verification

- [ ] **Step 1: Full suite + lint**

Run: `npx vitest run 2>&1 | tail -3` — failure count equals the Task 1 baseline.
Run: `npx eslint src/components/courses/gfm/ src/lib/courseCatalog.ts` — clean.
Run: `npx tsc --noEmit` — clean.

- [ ] **Step 2: Drive the real site**

Invoke the project's `verify` skill (Skill tool: `verify`) to build the static export, serve it, and drive a browser. Checklist:
- `/learn/graph-foundation-models` loads; sidebar shows modules 1–7 with 5.1–5.5 indented under module 5.
- Module 5 renders the Zoo Map; picking two models updates the comparison table.
- Each deep dive 5.1–5.5 renders its lab; exercise each once (toggle an interaction chip; switch a wiring tab; drag the homophily slider; advance both steppers; flip the flatten toggle).
- Kicker on 5.3 reads "Module 5 · Deep dive 3 of 5".
- Course progress % changes when completing a deep dive.
- No console errors.
- Screenshot each deep dive once for the session record.

- [ ] **Step 3: Final tidy**

Confirm `git status` shows no unintended files (sitemap.xml untouched). Mark plan checkboxes done. Report the baseline-vs-final test numbers and the screenshot paths.

---

## Plan self-review (author-completed)

1. **Spec coverage:** parent rewrite (Task 9), five deep dives (7–8), six widgets (1–6), attention-course prelim callouts (in 5.2/5.3/5.4/5.5 blocks; 5.1 points to module 2 of this course per spec), catalog + tests (9), fact-check gate (10), verify (11), quiz-id moves with corrected m5-q3 prompt (7–9). Non-goals respected: no engine changes, no attention-course changes, no sitemap edits.
2. **Placeholder scan:** the one intentional template (`{N}` referenced papers) carries an explicit DO-NOT-SHIP instruction with a worked example.
3. **Type consistency:** widget default exports and keys match between Tasks 1–6 and Task 9; `ZOO_SUBCHAPTERS` name matches Tasks 7/8/9; quiz ids consistent (m5-q1→5.1, q2→5.2, q3→5.3, q4→5.4; new m5-q5–7 parent; m5-N-q* subchapters); minutes 9+38 over the spec's numbers sum to the catalog's 101.





