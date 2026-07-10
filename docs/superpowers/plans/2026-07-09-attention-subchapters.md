# Attention Course Deep-Dive Subchapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-level module nesting to the course engine and four interactive deep-dive subchapters (2.1 embeddings & positions, 2.2 inside multi-head attention, 2.3 residuals & LayerNorm, 2.4 the FFN) under module 2 of the "Attention, Everywhere" course.

**Architecture:** `CourseModule` gains optional `subchapters` (one level). `CourseShell` navigates a flattened order `[1, 2, 2.1…2.4, 3…7]`, renders subchapters indented in the sidebar (XP help-TOC style), and derives a "Module 2 · Deep dive K of 4" kicker. Content lives in a new `subchapters.tsx`; five new self-contained widget components compute real math (real attention, real rotations) in plain JS/SVG.

**Tech Stack:** Next.js (static export), React 18 client components, CSS modules (`course.module.css`), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-09-attention-subchapters-design.md`

## Global Constraints

- Do NOT touch `src/components/learn/CoursewareShell.tsx`, `src/components/learn/CoursewareShell.test.tsx`, `src/app/[[...path]]/HomeClient.tsx`, or `content/settings.yaml` — a concurrent session has uncommitted edits there. `git add` by explicit path only; never `git add -A`.
- `storageKey: 'attention-course-progress-v1'` must not change.
- Widgets: `'use client'`, styles only via `import s from '../engine/course.module.css'`, Tahoma/XP look, SVG hand-drawn like existing labs. No `Math.random()`/`Date.now()` anywhere (deterministic renders for tests).
- JSX text must escape entities (`&apos;` `&quot;` — eslint react/no-unescaped-entities).
- Quiz ids `am2-1-q*`…`am2-4-q*` (a test asserts global uniqueness). Module ids: `block-embeddings`, `block-heads`, `block-residuals`, `block-ffn`.
- The test suite has **12 pre-existing failures** unrelated to this work (see memory note). Record the baseline in Task 1 and compare against it — "pass" means *no new failures*.
- Test env: jsdom lacks working localStorage — every test file that renders CourseShell must stub it (copy the `beforeEach` from `attentionCourse.test.tsx`).
- Commit after every task, message style matches repo history (imperative, no prefix), ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Engine nesting (types, CourseShell, CSS, tests)

**Files:**
- Modify: `src/components/courses/engine/types.ts`
- Modify: `src/components/courses/engine/CourseShell.tsx`
- Modify: `src/components/courses/engine/course.module.css` (append)
- Create: `src/components/courses/engine/CourseShell.test.tsx`

**Interfaces:**
- Consumes: existing `CourseDefinition`, `useCourseProgress`.
- Produces: `CourseModule.subchapters?: CourseModule[]` — Task 7 attaches subchapters to module 2; CourseShell renders any course with or without them identically to today when absent.

- [ ] **Step 1: Record the failing-test baseline**

Run: `cd /Users/shubhamvij/Developer/shubhamvij.github.io && npx vitest run 2>&1 | tail -3`
Expected: summary line showing the pre-existing failure count (~12 failed). Write the exact number down; every later "run the suite" step compares to it.

- [ ] **Step 2: Write the failing engine test**

Create `src/components/courses/engine/CourseShell.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CourseShell from './CourseShell'
import type { CourseDefinition } from './types'
import { invalidateCourseProgressCaches } from './progress'

beforeEach(() => {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    },
  })
  invalidateCourseProgressCaches()
})

const NESTED: CourseDefinition = {
  id: 'fixture-nested',
  title: 'Fixture Course',
  tagline: 'test',
  storageKey: 'fixture-nested-progress',
  widgets: {},
  modules: [
    { id: 'one', navLabel: '1. One', title: 'Module One', subtitle: 's', minutes: 5, blocks: [] },
    {
      id: 'two', navLabel: '2. Two', title: 'Module Two', subtitle: 's', minutes: 5, blocks: [],
      subchapters: [
        { id: 'two-a', navLabel: '2.1 Two-A', title: 'Deep Dive A', subtitle: 's', minutes: 3, blocks: [] },
        { id: 'two-b', navLabel: '2.2 Two-B', title: 'Deep Dive B', subtitle: 's', minutes: 3, blocks: [] },
      ],
    },
    { id: 'three', navLabel: '3. Three', title: 'Module Three', subtitle: 's', minutes: 5, blocks: [] },
  ],
}

describe('CourseShell with nested subchapters', () => {
  it('renders subchapters in the sidebar and navigates to them', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /2\.1 Two-A/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive A' })).toBeDefined()
    expect(screen.getByText(/Module 2 · Deep dive 1 of 2/)).toBeDefined()
  })

  it('threads subchapters into the prev/next flat order', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. Two/ }))
    // complete module 2 -> lands on 2.1
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive A' })).toBeDefined()
    // complete 2.1 -> 2.2, complete 2.2 -> module 3
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Deep Dive B' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Module Three' })).toBeDefined()
  })

  it('counts subchapters in the progress percentage (5 flat modules)', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByText('20% complete')).toBeDefined()
  })

  it('keeps top-level kicker numbering over top-level count', () => {
    render(<CourseShell course={NESTED} />)
    fireEvent.click(screen.getByRole('button', { name: /3\. Three/ }))
    expect(screen.getByText(/Module 3 of 3/)).toBeDefined()
  })

  it('resumes on a subchapter via lastModuleId', () => {
    window.localStorage.setItem('fixture-nested-progress', JSON.stringify({
      completedModules: [], quizAnswers: {}, lastModuleId: 'two-b',
    }))
    invalidateCourseProgressCaches()
    render(<CourseShell course={NESTED} />)
    expect(screen.getByRole('heading', { name: 'Deep Dive B' })).toBeDefined()
  })

  it('renders a subchapter-free course exactly as before', () => {
    const flat: CourseDefinition = { ...NESTED, id: 'fixture-flat', storageKey: 'fixture-flat-progress', modules: NESTED.modules.map(m => ({ ...m, subchapters: undefined })) }
    render(<CourseShell course={flat} />)
    expect(screen.getByText(/Module 1 of 3/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Mark complete & continue/ }))
    expect(screen.getByRole('heading', { name: 'Module Two' })).toBeDefined()
    expect(screen.getByText(/33% complete/)).toBeDefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/engine/CourseShell.test.tsx`
Expected: FAIL — `subchapters` is not a known property (TS) / "2.1 Two-A" button not found.

- [ ] **Step 4: Add `subchapters` to the type**

In `src/components/courses/engine/types.ts`, change the `CourseModule` interface to:

```ts
export interface CourseModule {
  id: string
  navLabel: string
  title: string
  subtitle: string
  minutes: number
  blocks: LessonBlock[]
  /** Optional deep-dive children, rendered indented under this module. One level only. */
  subchapters?: CourseModule[]
}
```

- [ ] **Step 5: Rewrite CourseShell around a flat entry list**

Replace the full contents of `src/components/courses/engine/CourseShell.tsx` with:

```tsx
'use client'
import { useRef, useState } from 'react'
import s from './course.module.css'
import type { CourseDefinition, CourseModule, LessonBlock } from './types'
import { useCourseProgress } from './progress'
import Quiz from './Quiz'

interface Props {
  course: CourseDefinition
  onBack?: () => void
  backLabel?: string
}

/** One row of the flattened reading order: a module or a subchapter with its context. */
interface FlatEntry {
  module: CourseModule
  /** Top-level index of this module (or of its parent, for subchapters). */
  topIndex: number
  parent?: CourseModule
  subIndex?: number
  subCount?: number
}

function flatten(modules: CourseModule[]): FlatEntry[] {
  const flat: FlatEntry[] = []
  modules.forEach((m, mi) => {
    flat.push({ module: m, topIndex: mi })
    m.subchapters?.forEach((sub, si) => {
      flat.push({ module: sub, topIndex: mi, parent: m, subIndex: si, subCount: m.subchapters!.length })
    })
  })
  return flat
}

export default function CourseShell({ course, onBack, backLabel = '← Back' }: Props) {
  const { progress, markModuleComplete, recordQuizAnswer, setLastModule, resetProgress } = useCourseProgress(course.storageKey)
  const [navChoice, setNavChoice] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const paneRef = useRef<HTMLDivElement>(null)

  const modules = course.modules
  const flat = flatten(modules)

  // Until the reader navigates, resume wherever they left off (falling back to module 1).
  const resumeId = progress.lastModuleId && flat.some(e => e.module.id === progress.lastModuleId)
    ? progress.lastModuleId
    : flat[0].module.id
  const activeId = navChoice ?? resumeId

  const activeIndex = flat.findIndex(e => e.module.id === activeId)
  const entry = flat[activeIndex]
  const active = entry.module
  const completedCount = flat.filter(e => progress.completedModules.includes(e.module.id)).length
  const pct = Math.round((completedCount / flat.length) * 100)
  const allDone = completedCount === flat.length

  const goTo = (id: string) => {
    setNavChoice(id)
    setLastModule(id)
    if (paneRef.current) paneRef.current.scrollTop = 0
  }

  const completeAndContinue = () => {
    markModuleComplete(active.id)
    if (activeIndex < flat.length - 1) {
      goTo(flat[activeIndex + 1].module.id)
    }
  }

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    resetProgress()
    setConfirmingReset(false)
    goTo(flat[0].module.id)
  }

  const renderBlock = (block: LessonBlock, i: number) => {
    switch (block.kind) {
      case 'prose':
        return <div key={i} className={s.prose}>{block.body}</div>
      case 'heading':
        return <h3 key={i} className={s.sectionHeading}>{block.text}</h3>
      case 'callout':
        return (
          <div key={i} className={s.callout}>
            <span className={s.calloutIcon}>{block.icon}</span>
            <span className={s.calloutBody}>
              <strong>{block.title}</strong>
              {block.body}
            </span>
          </div>
        )
      case 'widget': {
        const Widget = course.widgets[block.widget]
        return Widget ? <Widget key={i} /> : null
      }
      case 'quiz':
        return (
          <div key={i}>
            <h3 className={s.sectionHeading}>Check your understanding</h3>
            <Quiz
              questions={block.questions}
              savedAnswers={progress.quizAnswers}
              onCorrect={recordQuizAnswer}
            />
          </div>
        )
      case 'refs':
        return (
          <div key={i} className={s.refsBox}>
            <p className={s.refsHeading}>References & further reading</p>
            {block.items.map(item => (
              <div key={item.href} className={s.refItem}>
                <span className={s.refBullet}>▸</span>
                <span>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
                  {item.note && <span className={s.refNote}> — {item.note}</span>}
                </span>
              </div>
            ))}
          </div>
        )
    }
  }

  const sidebarItem = (e: FlatEntry) => {
    const m = e.module
    const isSub = e.parent !== undefined
    const isLastSub = isSub && e.subIndex === (e.subCount ?? 0) - 1
    return (
      <button
        key={m.id}
        type="button"
        className={[
          s.moduleItem,
          m.id === activeId ? s.moduleItemActive : '',
          isSub ? s.subModuleItem : '',
          isSub && !isLastSub ? s.subModuleItemMid : '',
        ].filter(Boolean).join(' ')}
        onClick={() => goTo(m.id)}
      >
        <span className={s.moduleTick}>{progress.completedModules.includes(m.id) ? '✓' : ''}</span>
        <span className={s.moduleLabel}>{m.navLabel}</span>
        <span className={s.moduleMinutes}>{m.minutes}m</span>
      </button>
    )
  }

  const kicker = entry.parent
    ? `Module ${entry.topIndex + 1} · Deep dive ${(entry.subIndex ?? 0) + 1} of ${entry.subCount} · ~${active.minutes} min`
    : `Module ${entry.topIndex + 1} of ${modules.length} · ~${active.minutes} min`

  return (
    <div className={s.guide}>
      <div className={s.toolbar}>
        {onBack && (
          <button type="button" className={s.backLink} onClick={onBack}>
            {backLabel}
          </button>
        )}
        <span className={s.toolbarTitle} title={course.tagline}>{course.title}</span>
        <span className={s.toolbarSpacer} />
        <span className={s.toolbarPct}>{pct}% complete</span>
        <div className={s.progressTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <button type="button" className={s.btn} aria-label="Reset progress" onClick={handleReset} onBlur={() => setConfirmingReset(false)}>
          {confirmingReset ? 'Sure?' : 'Reset'}
        </button>
      </div>

      <div className={s.narrowNav}>
        <select
          className={s.narrowSelect}
          value={activeId}
          onChange={e => goTo(e.target.value)}
          aria-label="Jump to module"
        >
          {flat.map(e => (
            <option key={e.module.id} value={e.module.id}>
              {progress.completedModules.includes(e.module.id) ? '✓ ' : ''}
              {e.parent ? `   └ ${e.module.navLabel}` : e.module.navLabel}
            </option>
          ))}
        </select>
      </div>

      <div className={s.body}>
        <nav className={s.sidebar}>
          <p className={s.sidebarHeading}>Modules</p>
          {flat.map(sidebarItem)}
        </nav>

        <div className={s.lessonPane} ref={paneRef}>
          <div className={s.lessonInner}>
            <p className={s.lessonKicker}>{kicker}</p>
            <h2 className={s.lessonTitle}>{active.title}</h2>
            <p className={s.lessonSubtitle}>{active.subtitle}</p>

            {active.blocks.map(renderBlock)}

            {allDone && activeIndex === flat.length - 1 && (
              <div className={s.completeBanner}>
                <span>🎉</span>
                <span>
                  <strong>Course complete.</strong> All {flat.length} modules done — the reference
                  shelves and reading paths are yours whenever you need them.
                </span>
              </div>
            )}

            <div className={s.footerNav}>
              {activeIndex > 0 && (
                <button type="button" className={s.btn} onClick={() => goTo(flat[activeIndex - 1].module.id)}>
                  ← {flat[activeIndex - 1].module.navLabel}
                </button>
              )}
              <span className={s.footerSpacer} />
              {progress.completedModules.includes(active.id) ? (
                activeIndex < flat.length - 1 && (
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => goTo(flat[activeIndex + 1].module.id)}>
                    {flat[activeIndex + 1].module.navLabel} →
                  </button>
                )
              ) : (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={completeAndContinue}>
                  {activeIndex < flat.length - 1 ? 'Mark complete & continue →' : 'Mark complete ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Note: the original file's kicker/`Module {n} of {m}` maths, banner condition, and footer nav are the only behavioral changes; `renderBlock`, toolbar, and reset logic are verbatim from the current file.

- [ ] **Step 6: Add the tree-indent CSS**

Append to `src/components/courses/engine/course.module.css`:

```css
/* ---------- Nested subchapters (deep dives) in the module sidebar ---------- */
.subModuleItem {
  margin-left: 12px;
  width: calc(100% - 12px);
  padding-left: 16px;
  position: relative;
}
.subModuleItem::before {
  /* dotted elbow: └ */
  content: '';
  position: absolute;
  left: 4px;
  top: -2px;
  bottom: 50%;
  width: 9px;
  border-left: 1px dotted #8a98ab;
  border-bottom: 1px dotted #8a98ab;
}
.subModuleItemMid::after {
  /* vertical continuation to the next sibling */
  content: '';
  position: absolute;
  left: 4px;
  top: 50%;
  bottom: -2px;
  border-left: 1px dotted #8a98ab;
}
```

- [ ] **Step 7: Run the engine tests**

Run: `npx vitest run src/components/courses/engine/CourseShell.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 8: Run the full suite and compare to baseline**

Run: `npx vitest run 2>&1 | tail -3`
Expected: same failure count as the Step 1 baseline (the pre-existing ~12), no new failures — in particular `attentionCourse.test.tsx`, `GfmStudyGuide.test.tsx`, and `courseCatalog.test.ts` still pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/courses/engine/types.ts src/components/courses/engine/CourseShell.tsx src/components/courses/engine/course.module.css src/components/courses/engine/CourseShell.test.tsx
git commit -m "Add one-level subchapter nesting to the course engine

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Order-Blindness Lab widget

**Files:**
- Create: `src/components/courses/attention/OrderBlindLab.tsx`
- Test: `src/components/courses/attention/subchapterLabs.test.tsx` (created here, extended by Tasks 3–6)

**Interfaces:**
- Produces: default-export React component `OrderBlindLab` (no props). Registered as widget key `order-blind` in Task 7.

- [ ] **Step 1: Write the failing test**

Create `src/components/courses/attention/subchapterLabs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrderBlindLab from './OrderBlindLab'

describe('OrderBlindLab', () => {
  it('shows permutation equivariance without positions, broken symmetry with', () => {
    render(<OrderBlindLab />)
    fireEvent.click(screen.getByRole('button', { name: /shuffle/i }))
    expect(screen.getByText(/same output vectors/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /positions/i }))
    expect(screen.getByText(/outputs changed/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./OrderBlindLab`.

- [ ] **Step 3: Implement the widget**

Create `src/components/courses/attention/OrderBlindLab.tsx`:

```tsx
'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// A real single-head attention layer over 5 tokens with d=4, tiny fixed weights.
// Everything is computed live so the equivariance claim is demonstrated, not asserted.
const TOKENS = ['cat', 'sat', 'on', 'the', 'mat']
const EMB: number[][] = [
  [0.9, 0.1, -0.3, 0.4],   // cat
  [-0.2, 0.8, 0.5, -0.1],  // sat
  [0.1, -0.4, 0.7, 0.6],   // on
  [-0.6, 0.2, -0.2, 0.3],  // the
  [0.7, -0.5, 0.1, -0.6],  // mat
]
const WQ = [[0.6, -0.3, 0.2, 0.5], [0.1, 0.7, -0.4, 0.2], [-0.5, 0.2, 0.6, -0.1], [0.3, 0.4, 0.1, -0.6]]
const WK = [[0.5, 0.2, -0.6, 0.1], [-0.2, 0.6, 0.3, -0.4], [0.4, -0.1, 0.5, 0.3], [0.2, 0.5, -0.3, 0.6]]
const WV = [[0.7, -0.2, 0.1, 0.4], [0.2, 0.5, -0.3, 0.1], [-0.3, 0.4, 0.6, 0.2], [0.1, -0.5, 0.2, 0.7]]

// Sinusoidal-flavored position vectors, added to the embedding at slot p when positions are ON.
const pe = (p: number) => [Math.sin(0.9 * p), Math.cos(0.9 * p), Math.sin(0.35 * p), Math.cos(0.35 * p)].map(v => v * 0.55)

const PERMS = [
  [4, 1, 2, 3, 0],
  [2, 3, 0, 4, 1],
  [1, 0, 3, 4, 2],
]

const matVec = (W: number[][], x: number[]) => W.map(row => row.reduce((acc, w, i) => acc + w * x[i], 0))
const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0)

/** Full attention outputs for token order `order` (order[i] = which token sits in slot i). */
function attend(order: number[], positions: boolean): number[][] {
  const x = order.map((tok, slot) => {
    const e = EMB[tok]
    return positions ? e.map((v, d) => v + pe(slot)[d]) : e
  })
  const q = x.map(v => matVec(WQ, v))
  const k = x.map(v => matVec(WK, v))
  const v = x.map(vec => matVec(WV, vec))
  return q.map(qi => {
    const scores = k.map(kj => dot(qi, kj) / 2) // 1/sqrt(4)
    const mx = Math.max(...scores)
    const exps = scores.map(sc => Math.exp(sc - mx))
    const sum = exps.reduce((a, b) => a + b, 0)
    const w = exps.map(e2 => e2 / sum)
    return v[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * v[j][d], 0))
  })
}

const IDENTITY = [0, 1, 2, 3, 4]

export default function OrderBlindLab() {
  const [permIdx, setPermIdx] = useState(-1) // -1 = original order
  const [positions, setPositions] = useState(false)

  const order = permIdx === -1 ? IDENTITY : PERMS[permIdx]
  const shuffled = permIdx !== -1

  const { outputs, same } = useMemo(() => {
    const base = attend(IDENTITY, positions)
    const outs = attend(order, positions)
    // Equivariance check: does slot i of the shuffled run equal the original
    // output of the token now sitting in slot i?
    const eq = outs.every((o, i) => o.every((val, d) => Math.abs(val - base[order[i]][d]) < 1e-9))
    return { outputs: outs, same: eq }
  }, [order, positions])

  const W = 480
  const slot = W / TOKENS.length

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Order-Blindness Lab</span>
        <span className={s.widgetHint}>a real attention head, computed live</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setPermIdx(p => (p + 1) % PERMS.length)}>
            Shuffle tokens
          </button>
          <button type="button" className={s.btn} onClick={() => setPermIdx(-1)} disabled={!shuffled}>
            Restore order
          </button>
          <button type="button" className={`${s.chip} ${positions ? s.chipOn : ''}`} onClick={() => setPositions(p => !p)}>
            positions {positions ? 'ON' : 'off'}
          </button>
        </div>
        <svg viewBox={`0 0 ${W} 120`} className={s.labCanvas} role="img" aria-label="Per-token attention output vectors">
          {order.map((tok, i) => (
            <g key={i}>
              <rect x={i * slot + 6} y={8} width={slot - 12} height={20} rx={3} fill="#fff" stroke="#7f9db9" />
              <text x={i * slot + slot / 2} y={22} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif">{TOKENS[tok]}</text>
              {/* 4 output dims as signed bars around a midline */}
              {outputs[i].map((val, d) => {
                const bx = i * slot + 14 + d * ((slot - 28) / 4)
                const h = Math.min(34, Math.abs(val) * 55)
                return (
                  <rect
                    key={d}
                    x={bx}
                    y={val >= 0 ? 72 - h : 72}
                    width={(slot - 28) / 4 - 3}
                    height={Math.max(1.5, h)}
                    fill={val >= 0 ? '#2b6fd0' : '#c86018'}
                  />
                )
              })}
              <text x={i * slot + slot / 2} y={116} textAnchor="middle" fontSize={8} fill="#666">
                [{outputs[i].slice(0, 2).map(v2 => v2.toFixed(2)).join(', ')}, …]
              </text>
            </g>
          ))}
          <line x1={0} y1={72} x2={W} y2={72} stroke="#ccc" strokeWidth={1} />
        </svg>
        <div className={`${s.feedback} ${same ? s.feedbackCorrect : s.feedbackWrong}`}>
          <span className={s.feedbackIcon}>{same ? '✓' : '✗'}</span>
          <span>
            {!shuffled
              ? 'Original order. Shuffle the tokens to test whether attention notices.'
              : same
                ? 'Same output vectors — just reordered with the tokens. Attention literally cannot tell that the order changed.'
                : 'Outputs changed — position vectors broke the permutation symmetry, so "cat sat" ≠ "sat cat" now.'}
          </span>
        </div>
        <p className={s.labNote}>
          This is a real attention head (fixed toy weights, d=4) running in your browser. Attention is{' '}
          <strong>permutation-equivariant</strong>: shuffle the input and the outputs shuffle identically, because{' '}
          <code>softmax(QKᵀ)·V</code> contains no notion of an index. Toggle <strong>positions</strong> to add a
          position vector to each embedding — now slot 0 and slot 4 genuinely differ, and word order becomes
          information the model can use.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/OrderBlindLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add Order-Blindness Lab: live permutation-equivariance demo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Position Lab widget (sinusoidal / learned / RoPE / ALiBi)

**Files:**
- Create: `src/components/courses/attention/PositionLab.tsx`
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append describe block)

**Interfaces:**
- Produces: default-export `PositionLab` (no props). Widget key `position-lab` (Task 7).

- [ ] **Step 1: Append the failing tests**

Append to `subchapterLabs.test.tsx` (add `import PositionLab from './PositionLab'` at the top):

```tsx
describe('PositionLab', () => {
  it('RoPE: shifting both positions leaves the attention score unchanged', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    // defaults m=6, n=2, pair θ=0.1 → score cos(0.4) ≈ 0.92
    expect(screen.getByText('0.92')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /shift both \+5/i }))
    expect(screen.getByText('m = 11')).toBeDefined()
    expect(screen.getByText('n = 7')).toBeDefined()
    expect(screen.getByText('0.92')).toBeDefined() // unchanged — relative invariance
  })

  it('RoPE: changing one position changes the score', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    fireEvent.change(screen.getByLabelText(/query position m/i), { target: { value: '12' } })
    // Δ=10, θ=0.1 → cos(1.0) ≈ 0.54
    expect(screen.getByText('0.54')).toBeDefined()
  })

  it('learned tab marks untrained positions', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /learned/i }))
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })

  it('switches to the ALiBi tab', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /ALiBi/ }))
    expect(screen.getByText(/linear distance penalty/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify the new block fails**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./PositionLab` (OrderBlindLab block still passes).

- [ ] **Step 3: Implement the widget**

Create `src/components/courses/attention/PositionLab.tsx`:

```tsx
'use client'
import { ReactNode, useState } from 'react'
import s from '../engine/course.module.css'

const TABS = ['Sinusoidal', 'Learned', 'RoPE', 'ALiBi'] as const
type Tab = typeof TABS[number]

const N_POS = 32
const N_DIM = 24
const TRAINED_MAX = 24 // "learned" table rows beyond this were never trained

/** Original-transformer sinusoidal encoding value at (position, dim). */
function sinusoidal(p: number, d: number): number {
  const i = Math.floor(d / 2)
  const freq = 1 / Math.pow(10000, (2 * i) / N_DIM)
  return d % 2 === 0 ? Math.sin(p * freq) : Math.cos(p * freq)
}

/** Deterministic pseudo-random in [-1, 1] — a stand-in for trained embedding values. */
function learned(p: number, d: number): number {
  const x = Math.sin(p * 12.9898 + d * 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/** value in [-1,1] → blue/white/orange diverging fill */
function valColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v))
  if (t >= 0) {
    const u = 1 - t
    return `rgb(${Math.round(200 + 55 * u)}, ${Math.round(96 + 159 * u)}, ${Math.round(24 + 231 * u)})`
  }
  const u = 1 + t
  return `rgb(${Math.round(43 + 212 * u)}, ${Math.round(111 + 144 * u)}, ${Math.round(208 + 47 * u)})`
}

function Heatmap({ values, untrainedFrom }: { values: (p: number, d: number) => number; untrainedFrom?: number }) {
  const cw = 480 / N_DIM
  const ch = 7
  return (
    <svg viewBox={`0 0 480 ${N_POS * ch + 14}`} className={s.labCanvas} role="img" aria-label="Positional encoding matrix heatmap">
      {Array.from({ length: N_POS }, (_, p) => (
        <g key={p}>
          {untrainedFrom !== undefined && p >= untrainedFrom ? (
            <>
              <rect x={0} y={p * ch} width={480} height={ch - 0.5} fill="#e8e6dd" />
              <text x={240} y={p * ch + ch - 1} textAnchor="middle" fontSize={6.5} fill="#a09880">?</text>
            </>
          ) : (
            Array.from({ length: N_DIM }, (_, d) => (
              <rect key={d} x={d * cw} y={p * ch} width={cw - 0.5} height={ch - 0.5} fill={valColor(values(p, d))}>
                <title>{`position ${p}, dim ${d}: ${values(p, d).toFixed(2)}`}</title>
              </rect>
            ))
          )}
        </g>
      ))}
      <text x={0} y={N_POS * ch + 11} fontSize={8.5} fill="#666">← dimensions (pairs at geometric frequencies) · rows = positions 0…{N_POS - 1}</text>
    </svg>
  )
}

const ROPE_PAIRS = [
  { label: 'pair 0 (fast, θ=1)', theta: 1 },
  { label: 'pair 2 (θ=0.1)', theta: 0.1 },
  { label: 'pair 4 (slow, θ=0.01)', theta: 0.01 },
]

function RopePanel() {
  const [m, setM] = useState(6)
  const [n, setN] = useState(2)
  const [pair, setPair] = useState(1)

  const theta = ROPE_PAIRS[pair].theta
  const score = Math.cos((m - n) * theta) // unit q,k rotated by mθ, nθ: q·k = cos((m−n)θ)
  const cx = 110, cy = 96, r = 78
  const arrow = (angle: number, color: string, label: string) => {
    const x = cx + r * Math.cos(-angle)
    const y = cy + r * Math.sin(-angle)
    return (
      <g>
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={2.5} />
        <circle cx={x} cy={y} r={3.5} fill={color} />
        <text x={x + (x > cx ? 6 : -6)} y={y} textAnchor={x > cx ? 'start' : 'end'} fontSize={10} fontWeight="bold" fill={color}>{label}</text>
      </g>
    )
  }

  return (
    <>
      <svg viewBox="0 0 480 196" className={s.labCanvas} role="img" aria-label="RoPE rotation of query and key on the unit circle">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#c9c4b4" strokeDasharray="3 3" />
        <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#ddd" />
        <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="#ddd" />
        {arrow(m * theta, '#2b6fd0', `q @ ${m}`)}
        {arrow(n * theta, '#c86018', `k @ ${n}`)}
        <text x={300} y={52} fontSize={11} fontFamily="Tahoma, sans-serif">rotation: position × θ</text>
        <text x={300} y={78} fontSize={11} fontFamily="Tahoma, sans-serif">angle between q and k:</text>
        <text x={300} y={96} fontSize={13} fontWeight="bold">(m − n)·θ = {((m - n) * theta).toFixed(2)} rad</text>
        <text x={300} y={126} fontSize={11} fontFamily="Tahoma, sans-serif">their dot product (the score):</text>
        <text x={300} y={148} fontSize={17} fontWeight="bold" fill="#0a246a">{score.toFixed(2)}</text>
        <text x={300} y={168} fontSize={10} fill="#666">depends ONLY on m − n = {m - n}</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>query position m</span>
        <input type="range" min={0} max={35} step={1} value={m} onChange={e => setM(Number(e.target.value))} className={s.slider} aria-label="query position m" />
        <span className={s.labStat}>m = {m}</span>
      </div>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>key position n</span>
        <input type="range" min={0} max={35} step={1} value={n} onChange={e => setN(Number(e.target.value))} className={s.slider} aria-label="key position n" />
        <span className={s.labStat}>n = {n}</span>
      </div>
      <div className={s.labControls}>
        <button type="button" className={s.btn} onClick={() => { setM(v => v + 5); setN(v => v + 5) }} disabled={m > 30 || n > 30}>
          shift both +5 →
        </button>
        {ROPE_PAIRS.map((p2, i) => (
          <button key={p2.label} type="button" className={`${s.chip} ${pair === i ? s.chipOn : ''}`} onClick={() => setPair(i)}>
            {p2.label}
          </button>
        ))}
      </div>
      <p className={s.labNote}>
        RoPE splits each query/key vector into 2D pairs and <strong>rotates</strong> pair i of the token at
        position p by angle p·θᵢ — inside attention, at every layer, no position vectors added anywhere. Because
        both vectors rotate, the angle <em>between</em> them (hence the score) depends only on the offset m−n:
        press <strong>shift both +5</strong> and watch the score not move. Different pairs get geometrically spaced
        θᵢ — fast pairs resolve nearby order like a second hand; slow pairs carry long-range position like an hour
        hand.
      </p>
    </>
  )
}

function AlibiPanel() {
  const [slope, setSlope] = useState(1)
  const SLOPES = [{ label: 'head slope 1/2', v: 0.5 }, { label: '1/4', v: 0.25 }, { label: '1/8', v: 0.125 }]
  const n = 10
  const cell = 30
  return (
    <>
      <div className={s.chipRow}>
        {SLOPES.map((sl, i) => (
          <button key={sl.label} type="button" className={`${s.chip} ${slope === i ? s.chipOn : ''}`} onClick={() => setSlope(i)}>
            {sl.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${n * cell + 130} ${n * cell + 20}`} className={s.labCanvas} role="img" aria-label="ALiBi bias matrix">
        {Array.from({ length: n }, (_, q) =>
          Array.from({ length: q + 1 }, (_, k) => {
            const bias = -SLOPES[slope].v * (q - k)
            return (
              <g key={`${q}-${k}`}>
                <rect x={k * cell} y={q * cell} width={cell - 1.5} height={cell - 1.5} fill={valColor(Math.max(-1, bias / 3))} stroke="#d8d4c0" strokeWidth={0.5}>
                  <title>{`query ${q}, key ${k}: bias ${bias.toFixed(2)}`}</title>
                </rect>
                <text x={k * cell + cell / 2} y={q * cell + cell / 2 + 3} textAnchor="middle" fontSize={7.5} fill="#333">{bias === 0 ? '0' : bias.toFixed(1)}</text>
              </g>
            )
          })
        )}
        <text x={n * cell + 12} y={40} fontSize={10.5} fontFamily="Tahoma, sans-serif">score += −slope·(q−k)</text>
        <text x={n * cell + 12} y={58} fontSize={10.5} fill="#666">added to QKᵀ before</text>
        <text x={n * cell + 12} y={71} fontSize={10.5} fill="#666">the softmax</text>
      </svg>
      <p className={s.labNote}>
        ALiBi adds a <strong>linear distance penalty</strong> straight onto the attention scores — no position
        vectors, no rotations. Each head gets its own slope (geometric series 1/2, 1/4, …), so some heads stay
        local while others keep long reach. Because the rule &quot;further = fainter&quot; is the same at any length, ALiBi
        models <strong>extrapolate</strong>: train at 1k tokens, run at 4k, and position 3000 needs no new
        parameters — the penalty just keeps going.
      </p>
    </>
  )
}

export default function PositionLab() {
  const [tab, setTab] = useState<Tab>('Sinusoidal')

  const panel: Record<Tab, ReactNode> = {
    Sinusoidal: (
      <>
        <Heatmap values={sinusoidal} />
        <p className={s.labNote}>
          The original transformer&apos;s encoding: dimension pair i oscillates at frequency 1/10000^(2i/d), so each
          row (a position) is a unique <strong>barcode</strong> of sines and cosines — fast columns on the left
          disambiguate neighbors, slow columns on the right encode coarse location. It&apos;s added to the token
          embedding once, at the input. Zero learned parameters, defined for <em>any</em> position — though
          attention still has to learn to decode it.
        </p>
      </>
    ),
    Learned: (
      <>
        <Heatmap values={learned} untrainedFrom={TRAINED_MAX} />
        <p className={s.labNote}>
          GPT-2/BERT style: the encoding is just a <strong>trainable lookup table</strong> — row p is a free
          d-dimensional vector, added to the token embedding at the input exactly like the sinusoidal version
          (x = emb(token) + PE[p]), and learned end-to-end like any other weight. The catch is visible above:
          the table has exactly max-length rows (here {TRAINED_MAX}). Position {TRAINED_MAX} or beyond{' '}
          <strong>has no row</strong> — the model simply cannot represent it, which is why learned absolute PEs
          don&apos;t extrapolate past the training length.
        </p>
      </>
    ),
    RoPE: <RopePanel />,
    ALiBi: <AlibiPanel />,
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Position Lab</span>
        <span className={s.widgetHint}>four ways to smuggle order into an order-blind mechanism</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {TABS.map(t => (
            <button key={t} type="button" className={`${s.chip} ${tab === t ? s.chipOn : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {panel[tab]}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/PositionLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add Position Lab: sinusoidal, learned, RoPE, and ALiBi explorers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Head Matrix Lab widget

**Files:**
- Create: `src/components/courses/attention/HeadMatrixLab.tsx`
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)

**Interfaces:**
- Produces: default-export `HeadMatrixLab`. Widget key `head-matrix` (Task 7).

- [ ] **Step 1: Append the failing tests**

Append to `subchapterLabs.test.tsx` (add `import HeadMatrixLab from './HeadMatrixLab'`):

```tsx
describe('HeadMatrixLab', () => {
  it('slicing into more heads shrinks d_head but not the parameter count', () => {
    render(<HeadMatrixLab />)
    // defaults: d_model=512, h=8 → d_head=64; attn params 4·512² = 1,048,576
    expect(screen.getByText(/d_head = 64/)).toBeDefined()
    expect(screen.getAllByText(/1,048,576/).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText(/number of heads/i), { target: { value: '4' } }) // index 4 → h=16
    expect(screen.getByText(/d_head = 32/)).toBeDefined()
    expect(screen.getAllByText(/1,048,576/).length).toBeGreaterThan(0) // unchanged
  })

  it('fewer K/V heads shrink the KV cache readout', () => {
    render(<HeadMatrixLab />)
    expect(screen.getByText(/0\.54 GB/)).toBeDefined() // g=8 (=h), 8k ctx, 32 layers, fp16
    fireEvent.change(screen.getByLabelText(/K\/V heads/i), { target: { value: '1' } }) // index 1 → g=2
    expect(screen.getByText(/0\.13 GB/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./HeadMatrixLab`.

- [ ] **Step 3: Implement the widget**

Create `src/components/courses/attention/HeadMatrixLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const D_MODELS = [256, 512, 1024]
const HEAD_OPTIONS = [1, 2, 4, 8, 16, 32]

interface Stage {
  id: string
  label: (d: number, h: number, dh: number) => string
  blurb: (d: number, h: number, dh: number, g: number) => string
}

const STAGES: Stage[] = [
  { id: 'input', label: d => `input  n × ${d}`, blurb: d => `One ${d}-dim vector per token — the residual stream reading this layer.` },
  { id: 'wqkv', label: d => `W_Q, W_K, W_V  each ${d} × ${d}`, blurb: (d, h) => `Three big learned matrices. "${h} heads" does not mean ${h} separate networks — each head owns a ${d}/${h}-column slice of these same matrices.` },
  { id: 'split', label: (d, h, dh) => `split → ${h} heads × (n × ${dh})`, blurb: (d, h, dh) => `Reshape, not computation: the ${d}-dim projections are viewed as ${h} independent ${dh}-dim subspaces. Each head attends in its own low-rank world.` },
  { id: 'scores', label: (d, h) => `scores  ${h} × (n × n)`, blurb: (d, h) => `Every head builds its own n×n attention pattern — ${h} different relationship-detectors running in parallel (module 2's Multi-Head Lab).` },
  { id: 'concat', label: d => `concat → n × ${d}`, blurb: () => 'Head outputs are stacked back side by side into one vector per token.' },
  { id: 'wo', label: d => `W_O  ${d} × ${d}`, blurb: () => 'The output projection: mixes the concatenated head outputs so heads can write to shared directions of the residual stream. Without it, heads would live in sealed silos.' },
  { id: 'kv', label: () => 'KV cache (decoding)', blurb: (d, h, dh, g) => `At generation time, every past token's K and V are cached: 2 × ${g} K/V heads × ${dh} dims per token per layer. Shrinking g (keeping all ${h} query heads) is exactly GQA — module 3.` },
]

const fmt = (x: number) => x.toLocaleString('en-US')

export default function HeadMatrixLab() {
  const [dIdx, setDIdx] = useState(1)   // 512
  const [hIdx, setHIdx] = useState(3)   // 8 heads
  const [gIdx, setGIdx] = useState(3)   // 8 K/V heads (= h → plain MHA)
  const [stage, setStage] = useState('wqkv')

  const d = D_MODELS[dIdx]
  const h = HEAD_OPTIONS[hIdx]
  const g = Math.min(HEAD_OPTIONS[gIdx], h)
  const dh = d / h
  const attnParams = 4 * d * d
  // fp16 KV cache: 2 (K and V) · g · dh values · 2 bytes · 8192 ctx · 32 layers
  const kvGb = (2 * g * dh * 2 * 8192 * 32) / 1e9
  const sel = STAGES.find(st => st.id === stage)!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Head Matrix Lab</span>
        <span className={s.widgetHint}>click a stage; drag the sliders</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {D_MODELS.map((dm, i) => (
            <button key={dm} type="button" className={`${s.chip} ${dIdx === i ? s.chipOn : ''}`} onClick={() => setDIdx(i)}>
              d_model = {dm}
            </button>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>heads h</span>
          <input type="range" min={0} max={5} step={1} value={hIdx} onChange={e => { setHIdx(Number(e.target.value)); setGIdx(gi => Math.min(gi, Number(e.target.value))) }} className={s.slider} aria-label="number of heads" />
          <span className={s.labStat}>h = {h} → <span className={s.labStatValue}>d_head = {dh}</span></span>
        </div>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>K/V heads g</span>
          <input type="range" min={0} max={5} step={1} value={gIdx} onChange={e => setGIdx(Number(e.target.value))} className={s.slider} aria-label="K/V heads (GQA preview)" />
          <span className={s.labStat}>g = {g}{g === h ? ' (plain MHA)' : ' (GQA!)'}</span>
        </div>
        <svg viewBox="0 0 480 168" className={s.labCanvas} role="img" aria-label="Tensor shapes flowing through multi-head attention">
          {STAGES.map((st, i) => {
            const col = i % 4, row = Math.floor(i / 4)
            const x = 8 + col * 119, y = 12 + row * 74
            return (
              <g key={st.id} onClick={() => setStage(st.id)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={110} height={44} rx={4} fill={st.id === 'kv' ? '#fbe7d4' : '#d8e3f5'} stroke={stage === st.id ? '#0a246a' : '#8898a8'} strokeWidth={stage === st.id ? 2.5 : 1} />
                <text x={x + 55} y={y + 26} textAnchor="middle" fontSize={9.5} fontFamily="Tahoma, sans-serif" fontWeight={stage === st.id ? 'bold' : 'normal'}>
                  {st.label(d, h, dh)}
                </text>
                {i < STAGES.length - 1 && col < 3 && <line x1={x + 110} y1={y + 22} x2={x + 119} y2={y + 22} stroke="#777" strokeWidth={1.5} />}
              </g>
            )
          })}
        </svg>
        <div className={`${s.feedback} ${s.feedbackCorrect}`}>
          <span className={s.feedbackIcon}>▸</span>
          <span>{sel.blurb(d, h, dh, g)}</span>
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>attention params/layer <span className={s.labStatValue}>4·d² = {fmt(attnParams)}</span></span>
          <span className={s.labStat}>KV cache @ 8k ctx × 32 layers (fp16) <span className={s.labStatValue}>{kvGb.toFixed(2)} GB</span></span>
        </div>
        <p className={s.labNote}>
          Drag <strong>h</strong>: d_head shrinks but the parameter count doesn&apos;t move — heads are a{' '}
          <strong>slicing</strong> of the same four ${'{'}d×d{'}'} matrices (W_Q, W_K, W_V, W_O), trading subspace
          size for pattern count. Drag <strong>g</strong> below h and you&apos;ve invented GQA: fewer K/V heads
          shared across query heads, shrinking the KV cache that dominates decoding memory — the story module 3
          picks up.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/HeadMatrixLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add Head Matrix Lab: tensor shapes, head slicing, KV-cache readout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Residual Stream Lab widget

**Files:**
- Create: `src/components/courses/attention/ResidualStreamLab.tsx`
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)

**Interfaces:**
- Produces: default-export `ResidualStreamLab`. Widget key `residual-stream` (Task 7).

- [ ] **Step 1: Append the failing tests**

Append to `subchapterLabs.test.tsx` (add `import ResidualStreamLab from './ResidualStreamLab'`):

```tsx
describe('ResidualStreamLab', () => {
  it('shows vanishing signal without residuals and stable signal with them', () => {
    render(<ResidualStreamLab />)
    expect(screen.getByText(/100%/)).toBeDefined() // residuals + norm: healthy
    fireEvent.click(screen.getByRole('button', { name: /residuals ON/i }))
    // 16 layers of 0.8× shrink → 0.8^16 ≈ 2.8% of the input signal
    expect(screen.getByText(/2\.8%/)).toBeDefined()
  })

  it('toggles between pre-norm and post-norm placement', () => {
    render(<ResidualStreamLab />)
    fireEvent.click(screen.getByRole('button', { name: /post-norm/i }))
    expect(screen.getByText(/original 2017 placement/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./ResidualStreamLab`.

- [ ] **Step 3: Implement the widget**

Create `src/components/courses/attention/ResidualStreamLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// Toy-but-honest signal model. Each sublayer without a skip contracts the signal
// (repeated matrices don't preserve norm); a residual keeps an identity path; norms
// re-standardize the stream. Gradients follow the same multiplicative story backwards.
const SHRINK = 0.8   // per-layer gain without residuals
const DRIFT = 1.13   // per-layer growth with residuals but no norm

export default function ResidualStreamLab() {
  const [layers, setLayers] = useState(16)
  const [residuals, setResiduals] = useState(true)
  const [norm, setNorm] = useState(true)
  const [placement, setPlacement] = useState<'pre' | 'post'>('pre')

  const mag = (l: number) => (!residuals ? Math.pow(SHRINK, l) : norm ? 1 : Math.pow(DRIFT, l))
  const final = mag(layers)
  const finalLabel = !residuals
    ? `${(final * 100).toFixed(1)}% of the input signal survives — and gradients shrink the same way going backwards`
    : norm
      ? '100% — identity path + normalization keep every layer in a healthy range'
      : `${final.toFixed(1)}× the input scale — the highway preserves signal but activations drift without norms`

  const W = 480
  const bw = Math.min(20, (W - 20) / layers)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Residual Stream Lab</span>
        <span className={s.widgetHint}>why 100-layer stacks train at all</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <button type="button" className={`${s.chip} ${residuals ? s.chipOn : ''}`} onClick={() => setResiduals(r => !r)}>
            residuals {residuals ? 'ON' : 'off'}
          </button>
          <button type="button" className={`${s.chip} ${norm ? s.chipOn : ''}`} onClick={() => setNorm(nm => !nm)} disabled={!residuals}>
            LayerNorm {norm ? 'ON' : 'off'}
          </button>
          <span className={s.sliderLabel}>depth</span>
          <input type="range" min={4} max={24} step={1} value={layers} onChange={e => setLayers(Number(e.target.value))} className={s.slider} aria-label="number of layers" />
          <span className={s.labStat}>{layers} layers</span>
        </div>
        <svg viewBox={`0 0 ${W} 130`} className={s.labCanvas} role="img" aria-label="Signal magnitude per layer">
          <line x1={8} y1={110} x2={W - 8} y2={110} stroke="#aaa" />
          {Array.from({ length: layers }, (_, l) => {
            const v = mag(l + 1)
            const h = Math.max(2, Math.min(100, v * 62))
            return (
              <rect key={l} x={10 + l * bw} y={110 - h} width={bw - 3} height={h}
                fill={!residuals ? '#c86018' : norm ? '#2f8e2f' : '#b8860b'} opacity={0.85}>
                <title>{`after layer ${l + 1}: ${v >= 10 ? v.toFixed(0) + '×' : (v * 100).toFixed(1) + '%'}`}</title>
              </rect>
            )
          })}
          <text x={10} y={124} fontSize={8.5} fill="#666">layer 1 → {layers}: signal magnitude relative to the input</text>
        </svg>
        <div className={`${s.feedback} ${residuals && norm ? s.feedbackCorrect : s.feedbackWrong}`}>
          <span className={s.feedbackIcon}>{residuals && norm ? '✓' : '⚠'}</span>
          <span>After {layers} layers: <strong>{finalLabel}</strong>.</span>
        </div>
        <div className={s.labControls}>
          <button type="button" className={`${s.chip} ${placement === 'pre' ? s.chipOn : ''}`} onClick={() => setPlacement('pre')}>pre-norm</button>
          <button type="button" className={`${s.chip} ${placement === 'post' ? s.chipOn : ''}`} onClick={() => setPlacement('post')}>post-norm</button>
          <span className={s.labStat}>
            {placement === 'pre'
              ? 'norm INSIDE the branch: x + f(LN(x)) — the skip path stays untouched; modern default (GPT-2 onward)'
              : 'norm ON the highway: LN(x + f(x)) — the original 2017 placement; needs LR warmup at depth because the norm interrupts the identity path'}
          </span>
        </div>
        <p className={s.labNote}>
          Without skips, each layer <em>replaces</em> its input — compose {layers} slightly-contractive transforms
          and both the signal and its gradient decay geometrically (orange bars). A residual makes each layer an{' '}
          <strong>edit added to an untouched copy</strong>: x + f(x). The identity term keeps a gradient
          superhighway open at any depth — but activations then slowly drift in scale (gold bars), which is the
          job normalization does (green bars). RMSNorm is LayerNorm minus the mean-subtraction — cheaper, works
          just as well, and is what Llama-class models ship.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/ResidualStreamLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add Residual Stream Lab: signal propagation with and without skips

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Parameter Budget Lab widget

**Files:**
- Create: `src/components/courses/attention/ParamBudgetLab.tsx`
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)

**Interfaces:**
- Produces: default-export `ParamBudgetLab`. Widget key `param-budget` (Task 7).

- [ ] **Step 1: Append the failing tests**

Append to `subchapterLabs.test.tsx` (add `import ParamBudgetLab from './ParamBudgetLab'`):

```tsx
describe('ParamBudgetLab', () => {
  it('reproduces real model sizes from the component formulas', () => {
    render(<ParamBudgetLab />)
    // GPT-2 small is the default preset: 38.6M emb + 28.3M attn + 56.6M ffn ≈ 124M
    expect(screen.getByText(/total ≈ 124M/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Llama-3-8B/ }))
    expect(screen.getByText(/total ≈ 8\.0B/)).toBeDefined()
  })

  it('MoE multiplies total but not active parameters', () => {
    render(<ParamBudgetLab />)
    fireEvent.click(screen.getByRole('button', { name: /mixture-of-experts/i }))
    expect(screen.getByText(/total ≈ 520M/)).toBeDefined()
    expect(screen.getByText(/active\/token ≈ 180M/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./ParamBudgetLab`.

- [ ] **Step 3: Implement the widget**

Create `src/components/courses/attention/ParamBudgetLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

interface Preset {
  name: string
  d: number
  layers: number
  dff: number
  vocab: number
  /** SwiGLU has three FFN matrices; GELU-style has two. */
  gated: boolean
  /** K/V heads × d_head (for GQA models K/V projections are smaller than d²). */
  kvDim: number
  /** Untied models pay for the unembedding matrix separately. */
  tiedEmb: boolean
}

const PRESETS: Preset[] = [
  { name: 'GPT-2 small', d: 768, layers: 12, dff: 3072, vocab: 50257, gated: false, kvDim: 768, tiedEmb: true },
  { name: 'Llama-3-8B', d: 4096, layers: 32, dff: 14336, vocab: 128256, gated: true, kvDim: 1024, tiedEmb: false },
]

function components(p: Preset) {
  const emb = p.vocab * p.d * (p.tiedEmb ? 1 : 2)
  // Q and O are d×d; K and V are d×kvDim (kvDim = d for plain MHA, smaller under GQA)
  const attn = (2 * p.d * p.d + 2 * p.d * p.kvDim) * p.layers
  const ffnPerLayer = (p.gated ? 3 : 2) * p.d * p.dff
  const ffn = ffnPerLayer * p.layers
  return { emb, attn, ffn, ffnPerLayer }
}

const fmt = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${Math.round(n / 1e6)}M`)

const MOE_EXPERTS = 8
const MOE_TOPK = 2

export default function ParamBudgetLab() {
  const [presetIdx, setPresetIdx] = useState(0)
  const [moe, setMoe] = useState(false)

  const p = PRESETS[presetIdx]
  const { emb, attn, ffn, ffnPerLayer } = components(p)
  const ffnTotal = moe ? ffn * MOE_EXPERTS : ffn
  const total = emb + attn + ffnTotal
  const active = emb + attn + (moe ? ffnPerLayer * MOE_TOPK * p.layers : ffn)
  const ffnShare = Math.round((ffnTotal / (attn + ffnTotal)) * 100)

  const rows = [
    { label: `embeddings${p.tiedEmb ? ' (tied in/out)' : ' + unembedding'}`, v: emb, color: '#9ab48c' },
    { label: `attention (Q,K,V,O × ${p.layers} layers${p.kvDim < p.d ? ', GQA-shrunk K/V' : ''})`, v: attn, color: '#2b6fd0' },
    { label: `FFN (${p.gated ? 'SwiGLU, 3' : 'GELU, 2'} matrices × ${p.layers} layers${moe ? ` × ${MOE_EXPERTS} experts` : ''})`, v: ffnTotal, color: '#c86018' },
  ]
  const max = Math.max(...rows.map(r => r.v))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Parameter Budget Lab</span>
        <span className={s.widgetHint}>where the weights actually live</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {PRESETS.map((pr, i) => (
            <button key={pr.name} type="button" className={`${s.chip} ${presetIdx === i ? s.chipOn : ''}`} onClick={() => { setPresetIdx(i); setMoe(false) }}>
              {pr.name}
            </button>
          ))}
          <button type="button" className={`${s.chip} ${moe ? s.chipOn : ''}`} onClick={() => setMoe(m => !m)}>
            mixture-of-experts ({MOE_EXPERTS} experts, top-{MOE_TOPK})
          </button>
        </div>
        <div className={s.gapChart}>
          {rows.map(r => (
            <div key={r.label} className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>{r.label}</span>
                <span className={s.gapSub}>{fmt(r.v)} · {Math.round((r.v / total) * 100)}%</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${(r.v / max) * 100}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>total ≈ <span className={s.labStatValue}>{fmt(total)}</span></span>
          {moe && <span className={s.labStat}>active/token ≈ <span className={s.labStatValue}>{fmt(active)}</span></span>}
          <span className={s.labStat}>FFN share of block params <span className={s.labStatValue}>{ffnShare}%</span></span>
        </div>
        <p className={s.labNote}>
          These are the real formulas, and they land on the real sizes: vocab·d for embeddings, (2d² + 2d·d_kv)
          per layer for attention, {`${'{'}2 or 3${'}'}`}·d·d_ff per layer for the FFN — GPT-2 small comes out at
          124M and Llama-3-8B at 8.0B from nothing but the table above. The FFN&apos;s ~⅔ share of block parameters
          is module 2&apos;s &quot;attention communicates, the FFN computes&quot; made quantitative. Toggle{' '}
          <strong>mixture-of-experts</strong>: {MOE_EXPERTS}× the FFN weights exist, but each token is routed
          through only {MOE_TOPK} experts — parameters scale, per-token FLOPs don&apos;t (Mixtral, DeepSeek-V3).
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: PASS (11 tests). Verify the arithmetic the test asserts: GPT-2: emb 50257·768 = 38.6M; attn (2·768² + 2·768·768)·12 = 28.3M; ffn 2·768·3072·12 = 56.6M; total 123.5M → "124M". Llama-3-8B: emb 2·128256·4096 = 1.05B; attn (2·4096² + 2·4096·1024)·32 = 1.34B; ffn 3·4096·14336·32 = 5.64B; total 8.03B → "8.0B". MoE on GPT-2: total 38.6 + 28.3 + 8·56.6 = 520M; active 38.6 + 28.3 + 2·(56.6/... ffnPerLayer·2·12 = 113.2M) = 180M.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/ParamBudgetLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add Parameter Budget Lab: real model sizes from component formulas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Subchapter content and wiring

**Files:**
- Create: `src/components/courses/attention/subchapters.tsx`
- Modify: `src/components/courses/attention/content.tsx` (attach subchapters, add pointer prose)
- Modify: `src/components/courses/attention/index.tsx` (register widgets)
- Modify: `src/components/courses/attention/TransformerBlockDiagram.tsx` (blurb suffixes)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx` (flatten widget-registry test; new nav test)

**Interfaces:**
- Consumes: `CourseModule` (Task 1), the five widgets (Tasks 2–6).
- Produces: `BLOCK_SUBCHAPTERS: CourseModule[]` (exactly 4 entries, ids `block-embeddings`, `block-heads`, `block-residuals`, `block-ffn`) exported from `subchapters.tsx`; widget keys `order-blind`, `position-lab`, `head-matrix`, `residual-stream`, `param-budget` registered on `attentionCourse.widgets`.

- [ ] **Step 1: Extend the course test (failing first)**

In `attentionCourse.test.tsx`, replace the widget-registry test with a flattened version and add a subchapter navigation test:

```tsx
  it('every widget key used by the content is registered', () => {
    const used = new Set<string>()
    for (const m of MODULES) {
      for (const b of m.blocks) {
        if (b.kind === 'widget') used.add(b.widget)
      }
      for (const sub of m.subchapters ?? []) {
        for (const b of sub.blocks) {
          if (b.kind === 'widget') used.add(b.widget)
        }
      }
    }
    for (const key of used) {
      expect(attentionCourse.widgets[key], `widget "${key}" missing from registry`).toBeDefined()
    }
  })

  it('module 2 exposes the four deep-dive subchapters', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\.1 Embeddings & positions/ }))
    expect(screen.getByText('Position Lab')).toBeDefined()
    expect(screen.getByText(/Module 2 · Deep dive 1 of 4/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /2\.4 The FFN/ }))
    expect(screen.getByText('Parameter Budget Lab')).toBeDefined()
  })
```

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — no button named `2.1 Embeddings & positions`.

- [ ] **Step 2: Create `subchapters.tsx`**

Create `src/components/courses/attention/subchapters.tsx` with the complete content below. (Prose is final copy, not placeholder — review for tone against `content.tsx` while pasting.)

```tsx
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
            absolute embeddings (images are fixed-size grids), which is why module 4&apos;s ViT interpolates its
            position table when resolution changes.
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
              { text: 'd_ff is shrunk to about two-thirds of the classic 4×d so 3 matrices ≈ the old 2-matrix budget', correct: true, explain: 'E.g. Llama-3-8B: d_ff = 14336 ≈ (2/3)·4·4096. Gating wins at equal parameters, which is why it became the default.' },
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
```

- [ ] **Step 3: Attach to module 2 in `content.tsx`**

At the top of `content.tsx`, add:

```tsx
import { BLOCK_SUBCHAPTERS } from './subchapters'
```

In module 2 (id `'block'`), add the field after `minutes: 10,`:

```tsx
    minutes: 10,
    subchapters: BLOCK_SUBCHAPTERS,
```

Then add a pointer sentence to module 2's second prose block — change the paragraph ending "Click around:" — replace:

```tsx
            <p>
              Attention alone isn&apos;t a model, though. The full <strong>transformer block</strong> wraps it with
              three pieces of glue that make 100-layer stacks trainable. Click around:
            </p>
```

with:

```tsx
            <p>
              Attention alone isn&apos;t a model, though. The full <strong>transformer block</strong> wraps it with
              three pieces of glue that make 100-layer stacks trainable. Click around — and when a component
              hooks you, it has its own deep dive: <strong>2.1</strong> embeddings &amp; positions,{' '}
              <strong>2.2</strong> inside multi-head, <strong>2.3</strong> residuals &amp; norms,{' '}
              <strong>2.4</strong> the FFN (in the sidebar, right under this module):
            </p>
```

- [ ] **Step 4: Register the widgets in `index.tsx`**

Replace the imports/widgets in `src/components/courses/attention/index.tsx`:

```tsx
import type { CourseDefinition } from '../engine/types'
import { MODULES, COURSE_TITLE, COURSE_TAGLINE } from './content'
import AttentionLab from './AttentionLab'
import MultiHeadLab from './MultiHeadLab'
import TransformerBlockDiagram from './TransformerBlockDiagram'
import AttentionMaskLab from './AttentionMaskLab'
import PatchifyLab from './PatchifyLab'
import TypedAttentionLab from './TypedAttentionLab'
import OrderBlindLab from './OrderBlindLab'
import PositionLab from './PositionLab'
import HeadMatrixLab from './HeadMatrixLab'
import ResidualStreamLab from './ResidualStreamLab'
import ParamBudgetLab from './ParamBudgetLab'

const MaskEfficiency = () => <AttentionMaskLab emphasis="efficiency" />
const MaskGraphs = () => <AttentionMaskLab emphasis="graphs" />

export const attentionCourse: CourseDefinition = {
  id: 'attention-mechanisms',
  title: COURSE_TITLE,
  tagline: COURSE_TAGLINE,
  storageKey: 'attention-course-progress-v1',
  modules: MODULES,
  widgets: {
    'attention-lab': AttentionLab,
    'multi-head': MultiHeadLab,
    'block-diagram': TransformerBlockDiagram,
    'mask-lab-efficiency': MaskEfficiency,
    'mask-lab-graphs': MaskGraphs,
    'patchify': PatchifyLab,
    'typed-attention': TypedAttentionLab,
    'order-blind': OrderBlindLab,
    'position-lab': PositionLab,
    'head-matrix': HeadMatrixLab,
    'residual-stream': ResidualStreamLab,
    'param-budget': ParamBudgetLab,
  },
}
```

- [ ] **Step 5: Add deep-dive pointers to the block diagram blurbs**

In `TransformerBlockDiagram.tsx`, append to each part's `blurb` string:
- `embed`: append ` Deep dive: 2.1.`
- `ln1`: append ` Deep dive: 2.3.`
- `mha`: append ` Deep dive: 2.2.`
- `add1`: append ` Deep dive: 2.3.`
- `ln2`: append ` Deep dive: 2.3.`
- `ffn`: append ` Deep dive: 2.4.`
- `add2`: append ` Deep dive: 2.3.`

- [ ] **Step 6: Run the course tests**

Run: `npx vitest run src/components/courses/attention/`
Expected: PASS — including the new "module 2 exposes the four deep-dive subchapters" test and all pre-existing lab tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/courses/attention/subchapters.tsx src/components/courses/attention/content.tsx src/components/courses/attention/index.tsx src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Add four deep-dive subchapters to the attention course's block module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Catalog sync and cross-course tests

**Files:**
- Modify: `src/lib/courseCatalog.ts`
- Modify: `src/lib/__tests__/courseCatalog.test.ts`

**Interfaces:**
- Consumes: `CourseModule.subchapters` (Task 1), attention course definition (Task 7).

- [ ] **Step 1: Update the catalog sync test to flatten subchapters**

In `courseCatalog.test.ts`, replace the minutes computation in the "keeps module counts…" test:

```ts
      const minutes = def.modules.reduce(
        (sum, m) => sum + m.minutes + (m.subchapters ?? []).reduce((s2, sub) => s2 + sub.minutes, 0),
        0
      )
```

(`def.modules.length` stays as-is — the catalog counts top-level modules.)

Replace the widget-registry test body with a flattened version:

```ts
  it('references only registered widgets from every module', () => {
    for (const def of Object.values(COURSE_DEFINITIONS)) {
      const all = def.modules.flatMap(m => [m, ...(m.subchapters ?? [])])
      for (const m of all) {
        for (const b of m.blocks) {
          if (b.kind === 'widget') {
            expect(def.widgets[b.widget], `${def.id}/${m.id} widget "${b.widget}"`).toBeDefined()
          }
        }
      }
    }
  })
```

Replace the quiz-id uniqueness test body the same way:

```ts
  it('uses globally unique quiz question ids across courses', () => {
    const ids: string[] = []
    for (const def of Object.values(COURSE_DEFINITIONS)) {
      const all = def.modules.flatMap(m => [m, ...(m.subchapters ?? [])])
      for (const m of all) {
        for (const b of m.blocks) {
          if (b.kind === 'quiz') ids.push(...b.questions.map(q => q.id))
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
```

- [ ] **Step 2: Run to see the minutes mismatch fail**

Run: `npx vitest run src/lib/__tests__/courseCatalog.test.ts`
Expected: FAIL — attention-mechanisms minutes: 89 ≠ catalog's 64.

- [ ] **Step 3: Update the catalog entry**

In `courseCatalog.ts`, attention-mechanisms entry: change `minutes: 64` → `minutes: 89` and `highlights: '6 interactive labs'` → `highlights: '11 interactive labs · 4 deep dives'`. Leave `modules: 7`.

- [ ] **Step 4: Run the catalog tests, then the full suite**

Run: `npx vitest run src/lib/__tests__/courseCatalog.test.ts`
Expected: PASS.
Run: `npx vitest run 2>&1 | tail -3`
Expected: failure count equals the Task 1 baseline (only the pre-existing ~12).

- [ ] **Step 5: Lint**

Run: `npx eslint src/components/courses src/lib/courseCatalog.ts`
Expected: no errors (watch for unescaped entities in the new JSX).

- [ ] **Step 6: Commit**

```bash
git add src/lib/courseCatalog.ts src/lib/__tests__/courseCatalog.test.ts
git commit -m "Sync course catalog with attention deep-dive subchapters

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Live data-flow panel in the block diagram

**Files:**
- Modify: `src/components/courses/attention/TransformerBlockDiagram.tsx`
- Modify: `src/components/courses/engine/course.module.css` (append)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx` (append)

**Interfaces:**
- Consumes: nothing new — self-contained upgrade of the module-2 diagram widget (keep Task 7's "Deep dive: 2.x" blurb suffixes intact).
- Produces: the diagram shows, for the selected component, a real forward pass's data before → after with shape captions.

- [ ] **Step 1: Append the failing test**

Append to the describe block in `attentionCourse.test.tsx`:

```tsx
  it('block diagram shows shapes and data flowing through the selected component', () => {
    render(<CourseShell course={attentionCourse} />)
    fireEvent.click(screen.getByRole('button', { name: /2\. The transformer block/ }))
    fireEvent.click(screen.getAllByText('feed-forward network')[0])
    expect(screen.getByText(/4×4 → 4×8 → 4×4/)).toBeDefined()
    fireEvent.click(screen.getAllByText('token embeddings + positions')[0])
    expect(screen.getByText(/tokens \[4\] → vectors \[4×4\]/)).toBeDefined()
  })
```

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — shape captions not found.

- [ ] **Step 2: Append the vector-grid CSS**

Append to `src/components/courses/engine/course.module.css`:

```css
/* ---------- Block-diagram data-flow panel ---------- */
.flowPanel {
  margin-top: 8px;
  border: 1px solid #aca899;
  background: #fff;
  padding: 8px 10px;
}
.flowTitle {
  font-size: 10.5px;
  font-weight: bold;
  color: #0a246a;
  margin: 0 0 6px;
}
.flowGrids {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.flowArrow {
  font-size: 16px;
  color: #555;
}
.vecGrid {
  display: grid;
  gap: 1px;
  font-size: 8.5px;
  font-family: Tahoma, sans-serif;
}
.vecCell {
  min-width: 34px;
  padding: 2px 3px;
  text-align: right;
  border: 1px solid #e2ddcc;
}
.vecTok {
  min-width: 30px;
  padding: 2px 4px;
  color: #555;
  text-align: right;
  border: 1px solid transparent;
}
.flowShape {
  font-size: 9.5px;
  color: #666;
  margin: 2px 0 0;
}
.flowNote {
  font-size: 10.5px;
  color: #333;
  margin: 6px 0 0;
  line-height: 1.4;
}
```

- [ ] **Step 3: Add the forward pass and panel to `TransformerBlockDiagram.tsx`**

Insert after the `PARTS` array (before the component), keeping the existing imports and `Part` interface — only `useState` from react is needed, already imported:

```tsx
// ---------- A real forward pass through one pre-norm block ----------
// 4 tokens, d=4, one attention head, d_ff=8, fixed weights, no biases, γ=1/β=0.
// Computed once at module load; the panel below the diagram shows the numbers.
const FLOW_TOKENS = ['The', 'cat', 'sat', 'here']
const F_EMB = [
  [0.2, -0.6, 0.4, 0.1],
  [0.9, 0.3, -0.5, 0.7],
  [-0.4, 0.8, 0.6, -0.2],
  [0.5, -0.3, -0.7, -0.8],
]
const F_WQ = [[0.6, -0.3, 0.2, 0.5], [0.1, 0.7, -0.4, 0.2], [-0.5, 0.2, 0.6, -0.1], [0.3, 0.4, 0.1, -0.6]]
const F_WK = [[0.5, 0.2, -0.6, 0.1], [-0.2, 0.6, 0.3, -0.4], [0.4, -0.1, 0.5, 0.3], [0.2, 0.5, -0.3, 0.6]]
const F_WV = [[0.7, -0.2, 0.1, 0.4], [0.2, 0.5, -0.3, 0.1], [-0.3, 0.4, 0.6, 0.2], [0.1, -0.5, 0.2, 0.7]]
const F_WO = [[0.5, 0.3, -0.2, 0.1], [-0.3, 0.6, 0.2, -0.1], [0.2, -0.4, 0.7, 0.3], [0.1, 0.2, -0.3, 0.6]]
const F_W1 = [
  [0.4, -0.2, 0.3, 0.1], [-0.3, 0.5, 0.2, -0.4], [0.2, 0.3, -0.5, 0.6], [0.6, -0.4, 0.1, 0.2],
  [-0.1, 0.2, 0.4, -0.3], [0.3, 0.6, -0.2, -0.5], [-0.5, 0.1, 0.3, 0.4], [0.2, -0.3, 0.6, 0.1],
]
const F_W2 = [
  [0.3, -0.2, 0.4, 0.1, -0.3, 0.2, 0.5, -0.1],
  [-0.2, 0.4, 0.1, -0.5, 0.2, 0.3, -0.4, 0.6],
  [0.5, 0.1, -0.3, 0.2, 0.4, -0.6, 0.1, 0.3],
  [0.1, -0.4, 0.2, 0.3, -0.1, 0.5, 0.2, -0.2],
]

const fMatVec = (W: number[][], x: number[]) => W.map(row => row.reduce((acc, w, i) => acc + w * x[i], 0))
const fLn = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length + 1e-5)
  return v.map(x => (x - m) / sd)
}
const fPe = (p: number) => [Math.sin(0.9 * p), Math.cos(0.9 * p), Math.sin(0.35 * p), Math.cos(0.35 * p)].map(v => v * 0.5)

function blockForward() {
  const x0 = F_EMB.map((e, p) => e.map((v, d) => v + fPe(p)[d]))
  const x1 = x0.map(fLn)
  const q = x1.map(v => fMatVec(F_WQ, v))
  const k = x1.map(v => fMatVec(F_WK, v))
  const vv = x1.map(v => fMatVec(F_WV, v))
  const attnW = q.map(qi => {
    const scores = k.map(kj => qi.reduce((acc, x, i2) => acc + x * kj[i2], 0) / 2)
    const mx = Math.max(...scores)
    const exps = scores.map(sc => Math.exp(sc - mx))
    const sum = exps.reduce((a2, b2) => a2 + b2, 0)
    return exps.map(e2 => e2 / sum)
  })
  const a = attnW.map(w => fMatVec(F_WO, vv[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * vv[j][d], 0))))
  const x2 = x0.map((v, i2) => v.map((x, d) => x + a[i2][d]))
  const x3 = x2.map(fLn)
  const f = x3.map(v => fMatVec(F_W2, fMatVec(F_W1, v).map(h => Math.max(0, h))))
  const out = x2.map((v, i2) => v.map((x, d) => x + f[i2][d]))
  return { x0, x1, a, attnW, x2, x3, f, out }
}
const FLOW = blockForward()

interface FlowStage {
  before: number[][] | null // null = show token symbols
  after: number[][]
  beforeLabel: string
  afterLabel: string
  shape: string
  note: string
  weights?: number[][]
}

const FLOW_STAGES: Record<string, FlowStage> = {
  embed: {
    before: null, after: FLOW.x0, beforeLabel: 'tokens', afterLabel: 'embedding + position',
    shape: 'tokens [4] → vectors [4×4]',
    note: 'The only shape-changing step: symbols become d-dim vectors (embedding row + position vector). Everything after is [4×4] in, [4×4] out.',
  },
  ln1: {
    before: FLOW.x0, after: FLOW.x1, beforeLabel: 'from embeddings', afterLabel: 'normalized',
    shape: '[4×4] → [4×4]',
    note: 'Each ROW is rescaled to mean 0, variance 1 — compare a row across the two grids. Per token, never across the batch.',
  },
  mha: {
    before: FLOW.x1, after: FLOW.a, beforeLabel: 'normalized input', afterLabel: 'attention output (the edit)',
    shape: '[4×4] → [4×4]', weights: FLOW.attnW,
    note: 'The middle grid is the real attention pattern — row = query token, column = who it attends to, rows sum to 1. The output mixes value vectors by those weights.',
  },
  add1: {
    before: FLOW.a, after: FLOW.x2, beforeLabel: 'attention edit', afterLabel: 'input + edit',
    shape: '[4×4] + [4×4] → [4×4]',
    note: 'The edit is ADDED to the untouched pre-norm input (the residual copy) — attention adjusts each token\'s vector, it never replaces it.',
  },
  ln2: {
    before: FLOW.x2, after: FLOW.x3, beforeLabel: 'residual stream', afterLabel: 'normalized',
    shape: '[4×4] → [4×4]',
    note: 'Same normalization again before the FFN — each row back to mean 0, variance 1.',
  },
  ffn: {
    before: FLOW.x3, after: FLOW.f, beforeLabel: 'normalized input', afterLabel: 'FFN output (the edit)',
    shape: '4×4 → 4×8 → 4×4 (expand → nonlinearity → project back)',
    note: 'Each row goes through the SAME two matrices independently — cover the other rows and nothing changes. No token sees any other token here.',
  },
  add2: {
    before: FLOW.f, after: FLOW.out, beforeLabel: 'FFN edit', afterLabel: 'block output',
    shape: '[4×4] + [4×4] → [4×4]',
    note: 'Output shape = input shape, so the next block consumes this directly — stack 96 of them and you have a GPT.',
  },
}

const flowColor = (v: number) => {
  const t = Math.max(-1.6, Math.min(1.6, v)) / 1.6
  return t >= 0
    ? `rgb(${Math.round(255 - 55 * t)}, ${Math.round(255 - 144 * t)}, ${Math.round(255 - 231 * t)})`
    : `rgb(${Math.round(255 + 212 * t)}, ${Math.round(255 + 144 * t)}, ${Math.round(255 + 47 * t)})`
}

function VecGrid({ label, data, weights }: { label: string; data: number[][] | null; weights?: boolean }) {
  return (
    <div>
      <div className={s.vecGrid} style={{ gridTemplateColumns: `auto repeat(${data ? data[0].length : 1}, auto)` }}>
        {FLOW_TOKENS.map((tok, i) => (
          <>
            <span key={`t${i}`} className={s.vecTok}>{tok}</span>
            {data
              ? data[i].map((v, d) => (
                  <span key={`${i}-${d}`} className={s.vecCell} style={{ background: weights ? flowColor(-v * 1.6) : flowColor(v) }}>
                    {v.toFixed(2)}
                  </span>
                ))
              : <span key={`s${i}`} className={s.vecCell}>&quot;{FLOW_TOKENS[i]}&quot;</span>}
          </>
        ))}
      </div>
      <p className={s.flowShape}>{label}</p>
    </div>
  )
}
```

Then, inside the component's JSX, insert the panel between the existing feedback box and the closing `labNote` paragraph:

```tsx
        {(() => {
          const flow = FLOW_STAGES[selected]
          if (!flow) return null
          return (
            <div className={s.flowPanel}>
              <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
              <div className={s.flowGrids}>
                <VecGrid label={flow.beforeLabel} data={flow.before} />
                <span className={s.flowArrow}>→</span>
                {flow.weights && (
                  <>
                    <VecGrid label="attention weights (rows sum to 1)" data={flow.weights} weights />
                    <span className={s.flowArrow}>→</span>
                  </>
                )}
                <VecGrid label={flow.afterLabel} data={flow.after} />
              </div>
              <p className={s.flowShape}>{flow.shape}</p>
              <p className={s.flowNote}>{flow.note}</p>
            </div>
          )
        })()}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/courses/attention/`
Expected: PASS, including the new data-flow test.

- [ ] **Step 5: Lint and commit**

Run: `npx eslint src/components/courses/attention/TransformerBlockDiagram.tsx`
Expected: clean. (React may warn about the fragment key pattern in `VecGrid` — if so, use `<Fragment key={...}>` from react instead of `<>`.)

```bash
git add src/components/courses/attention/TransformerBlockDiagram.tsx src/components/courses/engine/course.module.css src/components/courses/attention/attentionCourse.test.tsx
git commit -m "Show live data flow and tensor shapes in the block diagram

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Head Sharing Lab + subchapter 3.1 "Shrink the cache"

**Files:**
- Create: `src/components/courses/attention/HeadShareLab.tsx`
- Create: `src/components/courses/attention/efficiencySubchapters.tsx`
- Modify: `src/components/courses/attention/content.tsx` (attach subchapters to module 3; remove quiz am3-q2 from main)
- Modify: `src/components/courses/attention/index.tsx` (register `head-sharing`)
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)

**Interfaces:**
- Consumes: `CourseModule.subchapters` (Task 1).
- Produces: `EFFICIENCY_SUBCHAPTERS: CourseModule[]` exported from `efficiencySubchapters.tsx` (grows to 3 entries across Tasks 10–12; module ids `efficiency-kv-sharing`, `efficiency-flash`, `efficiency-sparse`); widget key `head-sharing`.

- [ ] **Step 1: Append the failing widget tests**

Append to `subchapterLabs.test.tsx` (add `import HeadShareLab from './HeadShareLab'`):

```tsx
describe('HeadShareLab', () => {
  it('cache per token shrinks from MHA to MQA', () => {
    render(<HeadShareLab />)
    expect(screen.getByText(/1024 values/)).toBeDefined() // MHA: 2·8·64
    fireEvent.click(screen.getByRole('button', { name: /^MQA$/ }))
    expect(screen.getByText(/128 values/)).toBeDefined() // 2·1·64
  })
  it('MLA mode shows the latent-vector story', () => {
    render(<HeadShareLab />)
    fireEvent.click(screen.getByRole('button', { name: /^MLA$/ }))
    expect(screen.getByText(/288 values/)).toBeDefined() // d_c=256 + d_R=32
    expect(screen.getByText(/low-rank latent/i)).toBeDefined()
  })
})
```

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: FAIL — cannot resolve `./HeadShareLab`.

- [ ] **Step 2: Implement the widget**

Create `src/components/courses/attention/HeadShareLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// 8 query heads, d_head = 64 throughout; what varies is how many K/V heads serve them.
const D_HEAD = 64
const N_Q = 8

interface Mode {
  key: string
  kvHeads: number // 0 = MLA latent
  quality: string
  dots: string
  blurb: string
}

const MODES: Mode[] = [
  { key: 'MHA', kvHeads: 8, quality: 'baseline', dots: '●●●●', blurb: 'Every query head owns a private K/V head — maximum expressivity, maximum cache.' },
  { key: 'GQA-4', kvHeads: 4, quality: '≈ baseline', dots: '●●●◐', blurb: 'Pairs of query heads share a K/V head. Llama-style sweet spot: half the cache, near-zero quality loss.' },
  { key: 'GQA-2', kvHeads: 2, quality: 'slight drop', dots: '●●●○', blurb: 'Groups of four share. More savings, still close to baseline on most benchmarks.' },
  { key: 'MQA', kvHeads: 1, quality: 'measurable drop', dots: '●●○○', blurb: 'All eight query heads read ONE K/V head — 8× cache saving, but quality and training stability pay.' },
  { key: 'MLA', kvHeads: 0, quality: '≈ baseline (or better)', dots: '●●●●', blurb: 'DeepSeek-V2: cache neither K nor V — cache one low-rank latent vector per token and up-project per-head K/V from it at use time (a small decoupled key carries RoPE). GQA-level memory, MHA-level quality.' },
]

// cache values per token per layer: 2 (K and V) · kvHeads · d_head; MLA caches d_c + d_R
const cacheValues = (m: Mode) => (m.kvHeads > 0 ? 2 * m.kvHeads * D_HEAD : 4 * D_HEAD + D_HEAD / 2)

export default function HeadShareLab() {
  const [modeIdx, setModeIdx] = useState(0)
  const m = MODES[modeIdx]
  const vals = cacheValues(m)
  const maxVals = cacheValues(MODES[0])

  const qw = 480 / N_Q
  const kvCount = m.kvHeads > 0 ? m.kvHeads : 1
  const kvw = 480 / kvCount

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Head Sharing Lab</span>
        <span className={s.widgetHint}>8 query heads — how many K/V heads serve them?</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {MODES.map((mo, i) => (
            <button key={mo.key} type="button" className={`${s.chip} ${modeIdx === i ? s.chipOn : ''}`} onClick={() => setModeIdx(i)}>
              {mo.key}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 480 150" className={s.labCanvas} role="img" aria-label="Query heads wired to shared K/V heads">
          {Array.from({ length: N_Q }, (_, i) => (
            <g key={`q${i}`}>
              <rect x={i * qw + 4} y={10} width={qw - 8} height={26} rx={3} fill="#cfe0f5" stroke="#8898a8" />
              <text x={i * qw + qw / 2} y={27} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">Q{i + 1}</text>
              <line
                x1={i * qw + qw / 2} y1={36}
                x2={m.kvHeads > 0 ? Math.floor(i / (N_Q / m.kvHeads)) * kvw + kvw / 2 : 240} y2={96}
                stroke="#777" strokeWidth={1.2} strokeDasharray={m.kvHeads === 0 ? '4 3' : undefined}
              />
            </g>
          ))}
          {m.kvHeads > 0 ? (
            Array.from({ length: m.kvHeads }, (_, i) => (
              <g key={`kv${i}`}>
                <rect x={i * kvw + 6} y={96} width={kvw - 12} height={28} rx={3} fill="#e3f6e3" stroke="#6a9a6a" />
                <text x={i * kvw + kvw / 2} y={114} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">K/V {i + 1}</text>
              </g>
            ))
          ) : (
            <g>
              <rect x={150} y={96} width={180} height={28} rx={3} fill="#f6ecd8" stroke="#b8860b" />
              <text x={240} y={114} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">latent cᵗ (d_c = 4·d_head) + RoPE key</text>
            </g>
          )}
          <text x={240} y={144} textAnchor="middle" fontSize={9} fill="#666">
            {m.kvHeads > 0 ? `${m.kvHeads} K/V head${m.kvHeads > 1 ? 's' : ''} cached per token` : 'one low-rank latent cached per token; per-head K/V up-projected on the fly'}
          </text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>cache/token/layer <span className={s.labStatValue}>{vals} values</span></span>
          <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((vals / maxVals) * 100)}%</span></span>
          <span className={s.labStat}>quality <span className={s.labStatValue}>{m.dots} {m.quality}</span></span>
        </div>
        <div className={`${s.feedback} ${s.feedbackCorrect}`}>
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{m.key}:</strong> {m.blurb}</span>
        </div>
        <p className={s.labNote}>
          Query heads are recomputed fresh each step — only <strong>K and V get cached</strong>, so the K/V-head
          count is the entire memory story. MQA and GQA shrink it by sharing; <strong>MLA</strong> shrinks it by{' '}
          <strong>compression</strong>: cache a low-rank latent instead of any heads at all, and spend a little
          compute re-expanding it. Quality dots are qualitative summaries of the papers&apos; ablations.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `efficiencySubchapters.tsx` with 3.1**

```tsx
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
```

- [ ] **Step 4: Wire up**

In `content.tsx`: add `import { EFFICIENCY_SUBCHAPTERS } from './efficiencySubchapters'`; in module 3 (id `'efficiency'`) add `subchapters: EFFICIENCY_SUBCHAPTERS,` after `minutes: 9,`; delete the am3-q2 question object from module 3's quiz block (it now lives in 3.1).

In `index.tsx`: add `import HeadShareLab from './HeadShareLab'` and registry entry `'head-sharing': HeadShareLab,`.

- [ ] **Step 5: Run course + engine tests, commit**

Run: `npx vitest run src/components/courses src/lib`
Expected: PASS at baseline (catalog minutes still match because subchapter minutes aren't in the catalog yet — NO: the flattened minutes test from Task 8 now sums 89+6=95 ≠ 89. Update `courseCatalog.ts` minutes to `95` in this task to keep the suite green.)

```bash
git add src/components/courses/attention/HeadShareLab.tsx src/components/courses/attention/efficiencySubchapters.tsx src/components/courses/attention/content.tsx src/components/courses/attention/index.tsx src/components/courses/attention/subchapterLabs.test.tsx src/lib/courseCatalog.ts
git commit -m "Add subchapter 3.1: shrink the KV cache (MQA/GQA/MLA) with Head Sharing Lab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Flash Tiling Lab + subchapter 3.2 "Compute smarter"

**Files:**
- Create: `src/components/courses/attention/FlashTilingLab.tsx`
- Modify: `src/components/courses/attention/efficiencySubchapters.tsx` (append 3.2)
- Modify: `src/components/courses/attention/content.tsx` (remove quiz am3-q1 from main)
- Modify: `src/components/courses/attention/index.tsx` (register `flash-tiling`)
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)
- Modify: `src/lib/courseCatalog.ts` (minutes 95 → 101)

**Interfaces:**
- Produces: widget key `flash-tiling`; `efficiencySubchapters.tsx` gains module id `efficiency-flash`.

- [ ] **Step 1: Append the failing widget tests**

```tsx
describe('FlashTilingLab', () => {
  it('naive mode materializes the score matrix; tiled mode never does', () => {
    render(<FlashTilingLab />)
    expect(screen.getByText(/256 scores/)).toBeDefined() // 16×16 written to HBM
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    expect(screen.getByText(/0 scores/)).toBeDefined()
  })
  it('steps through tiles with the online-softmax narration', () => {
    render(<FlashTilingLab />)
    fireEvent.click(screen.getByRole('button', { name: /FlashAttention/ }))
    fireEvent.click(screen.getByRole('button', { name: /process next tile/i }))
    expect(screen.getByText(/tile 1\/16/)).toBeDefined()
    expect(screen.getByText(/running max/i)).toBeDefined()
  })
})
```

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement the widget**

Create `src/components/courses/attention/FlashTilingLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const N = 16
const TILE = 4
const TILES_PER_SIDE = N / TILE // 4 → 16 tiles, processed row-major

export default function FlashTilingLab() {
  const [flash, setFlash] = useState(false)
  const [done, setDone] = useState(0) // tiles fully processed

  const total = TILES_PER_SIDE * TILES_PER_SIDE
  const cell = 480 / N / 2 // draw matrix at 240px wide, leave room for panel
  const doneRow = Math.floor(done / TILES_PER_SIDE)
  const doneCol = done % TILES_PER_SIDE

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Flash Tiling Lab</span>
        <span className={s.widgetHint}>same math, radically less memory traffic</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${!flash ? s.chipOn : ''}`} onClick={() => { setFlash(false); setDone(0) }}>
            naive attention
          </button>
          <button type="button" className={`${s.chip} ${flash ? s.chipOn : ''}`} onClick={() => { setFlash(true); setDone(0) }}>
            FlashAttention (tiled)
          </button>
          {flash && (
            <>
              <button type="button" className={s.btn} onClick={() => setDone(d => Math.min(total, d + 1))} disabled={done >= total}>
                process next tile →
              </button>
              <button type="button" className={s.btn} onClick={() => setDone(0)} disabled={done === 0}>reset</button>
            </>
          )}
        </div>
        <svg viewBox="0 0 480 260" className={s.labCanvas} role="img" aria-label="The n-by-n attention score matrix, naive versus tiled">
          {Array.from({ length: N }, (_, q) =>
            Array.from({ length: N }, (_, k) => {
              const tileIdx = Math.floor(q / TILE) * TILES_PER_SIDE + Math.floor(k / TILE)
              const isDone = flash && tileIdx < done
              const isCurrent = flash && tileIdx === done && done < total
              return (
                <rect
                  key={`${q}-${k}`}
                  x={8 + k * cell * 2 * 0.5} y={8 + q * cell * 2 * 0.5}
                  width={cell - 1} height={cell - 1}
                  fill={!flash ? '#c86018' : isCurrent ? '#f0d98c' : isDone ? '#dfe8df' : '#f7f5ec'}
                  opacity={!flash ? 0.75 : 1}
                  stroke={isCurrent ? '#9a7a1a' : '#e0dcc8'}
                  strokeWidth={isCurrent ? 1.5 : 0.4}
                />
              )
            })
          )}
          <text x={8} y={256} fontSize={9} fill="#666">
            {N}×{N} score matrix S = QKᵀ {flash ? '— only the gold tile exists at any moment, in on-chip SRAM' : '— fully materialized, written to and read back from HBM'}
          </text>
          <text x={270} y={30} fontSize={11} fontFamily="Tahoma, sans-serif" fontWeight="bold">GPU memory hierarchy</text>
          <rect x={270} y={40} width={200} height={34} fill="#fbe7d4" stroke="#b88a5a" />
          <text x={370} y={54} textAnchor="middle" fontSize={9.5}>HBM: tens of GB, ~2 TB/s</text>
          <text x={370} y={67} textAnchor="middle" fontSize={9.5}>{!flash ? 'S written + read here ✗' : 'only Q, K, V, O touch this ✓'}</text>
          <rect x={270} y={84} width={200} height={34} fill="#e3f6e3" stroke="#6a9a6a" />
          <text x={370} y={98} textAnchor="middle" fontSize={9.5}>on-chip SRAM: ~20 MB, ~19 TB/s</text>
          <text x={370} y={111} textAnchor="middle" fontSize={9.5}>{flash ? 'score tiles live and die here' : '(barely used by naive attention)'}</text>
          {flash && done > 0 && done < total && (
            <text x={270} y={150} fontSize={9.5} fill="#333">
              tile {done}/{total}: rows {doneRow * TILE}–{doneRow * TILE + TILE - 1} × cols {doneCol * TILE}–{doneCol * TILE + TILE - 1}
            </text>
          )}
          {flash && done >= total && (
            <text x={270} y={150} fontSize={9.5} fill="#2f8e2f" fontWeight="bold">all tiles processed — output identical to naive</text>
          )}
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>scores materialized in HBM <span className={s.labStatValue}>{flash ? '0 scores' : `${N * N} scores (written, then read back)`}</span></span>
          <span className={s.labStat}>peak score memory <span className={s.labStatValue}>{flash ? `one ${TILE}×${TILE} tile` : `${N}×${N}`}</span></span>
        </div>
        {flash && (
          <div className={`${s.feedback} ${s.feedbackCorrect}`}>
            <span className={s.feedbackIcon}>▸</span>
            <span>
              {done === 0
                ? 'Press "process next tile": load a block of Q rows and K columns into SRAM, compute that tile of scores, and fold it into the output immediately.'
                : done < total
                  ? `Processing tile ${done}/${total}: scores computed in SRAM; the running max and running denominator (online softmax) are updated so earlier tiles' contributions stay exactly correct; the output block is rescaled and accumulated; the tile is discarded.`
                  : 'Every pair was scored — the same FLOPs as naive — but the n×n matrix never existed in HBM. Exact attention, several times faster, because the bottleneck was memory movement.'}
            </span>
          </div>
        )}
        <p className={s.labNote}>
          Softmax normally needs a whole row before it can normalize — the reason naive kernels materialize S.
          The <strong>online softmax</strong> trick maintains a <strong>running max</strong> and running
          denominator per row, correcting previously accumulated output whenever a new tile raises the max. That
          single algebraic identity is what lets attention stream through {TILE}×{TILE} tiles of fast on-chip
          SRAM instead of round-tripping an n×n matrix through HBM.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Append 3.2 to `efficiencySubchapters.tsx`**

Append this module object to `EFFICIENCY_SUBCHAPTERS`:

```tsx
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
              { text: 'Peak memory for the score matrix', explain: 'Reduced from n² to one tile — the lab\'s second counter.' },
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
```

- [ ] **Step 4: Wire up and rebalance**

- `index.tsx`: `import FlashTilingLab from './FlashTilingLab'`; registry `'flash-tiling': FlashTilingLab,`.
- `content.tsx`: delete the am3-q1 question object from module 3's main quiz (moved to 3.2). Also delete the FlashAttention entry from module 3's main refs (now in 3.2).
- `courseCatalog.ts`: minutes 95 → 101.

- [ ] **Step 5: Run tests, commit**

Run: `npx vitest run src/components/courses src/lib`
Expected: PASS at baseline.

```bash
git add src/components/courses/attention/FlashTilingLab.tsx src/components/courses/attention/efficiencySubchapters.tsx src/components/courses/attention/content.tsx src/components/courses/attention/index.tsx src/components/courses/attention/subchapterLabs.test.tsx src/lib/courseCatalog.ts
git commit -m "Add subchapter 3.2: FlashAttention with step-through tiling lab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Subchapter 3.3 "Score fewer pairs" (mask lab moves here)

**Files:**
- Modify: `src/components/courses/attention/efficiencySubchapters.tsx` (append 3.3)
- Modify: `src/components/courses/attention/content.tsx` (remove mask-lab widget block, am3-q3, and Longformer/BigBird/Mistral/linear refs from main module 3)
- Modify: `src/components/courses/attention/attentionCourse.test.tsx` (mask-lab test navigates to 3.3)
- Modify: `src/lib/courseCatalog.ts` (minutes 101 → 107)

**Interfaces:**
- Consumes: existing widget key `mask-lab-efficiency` (already registered).
- Produces: `efficiencySubchapters.tsx` gains module id `efficiency-sparse`.

- [ ] **Step 1: Update the mask-lab test to navigate to 3.3 (failing first)**

In `attentionCourse.test.tsx`, change the mask-lab test's navigation line to:

```tsx
    fireEvent.click(screen.getByRole('button', { name: /3\.3 Score fewer pairs/ }))
```

Run: `npx vitest run src/components/courses/attention/attentionCourse.test.tsx`
Expected: FAIL — no such button yet.

- [ ] **Step 2: Append 3.3 to `EFFICIENCY_SUBCHAPTERS`**

```tsx
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
              information (module 3&apos;s quiz taught the receptive-field arithmetic), with a rolling KV cache
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
```

- [ ] **Step 3: Trim main module 3**

In `content.tsx` module 3: delete the `{ kind: 'widget', widget: 'mask-lab-efficiency' }` block; delete the am3-q3 question object; delete the Longformer, BigBird, Mistral (2310.06825), and linear-attention refs from the main refs block (all now in 3.3). Update `courseCatalog.ts` minutes 101 → 107.

- [ ] **Step 4: Run tests, commit**

Run: `npx vitest run src/components/courses src/lib`
Expected: PASS at baseline (mask-lab test now passes via 3.3).

```bash
git add src/components/courses/attention/efficiencySubchapters.tsx src/components/courses/attention/content.tsx src/components/courses/attention/attentionCourse.test.tsx src/lib/courseCatalog.ts
git commit -m "Add subchapter 3.3: sparse and linear attention; move mask lab there

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: KV Cache Lab + module 3 prelim rewrite

**Files:**
- Create: `src/components/courses/attention/KvCacheLab.tsx`
- Modify: `src/components/courses/attention/content.tsx` (rewrite module 3 main blocks)
- Modify: `src/components/courses/attention/index.tsx` (register `kv-cache`)
- Modify: `src/components/courses/attention/subchapterLabs.test.tsx` (append)
- Modify: `src/lib/courseCatalog.ts` (minutes 107 → 106 — module 3 main drops 9 → 8; highlights)

**Interfaces:**
- Produces: widget key `kv-cache`; module 3 main content teaches the KV cache before any technique names it.

- [ ] **Step 1: Append the failing widget tests**

```tsx
describe('KvCacheLab', () => {
  it('counts cached vs recomputed K/V projections while decoding', () => {
    render(<KvCacheLab />)
    // 3 tokens generated, cache ON: each token's K/V computed exactly once
    expect(screen.getByText(/3 — once per token, then reused/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /KV cache ON/i }))
    expect(screen.getByText(/6 — every past token reprojected/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /generate next token/i }))
    expect(screen.getByText(/10 — every past token reprojected/)).toBeDefined()
  })
  it('sizes the cache for real configs', () => {
    render(<KvCacheLab />)
    // default Llama-3-8B at 8k ctx: 2·32·8·128·2B·8192 = 1.07 GB
    expect(screen.getByText(/1\.07 GB/)).toBeDefined()
    fireEvent.change(screen.getByLabelText(/context length/i), { target: { value: '4' } }) // 131072
    expect(screen.getByText(/17\.18 GB/)).toBeDefined()
  })
})
```

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement the widget**

Create `src/components/courses/attention/KvCacheLab.tsx`:

```tsx
'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// Decoding stepper: watch the KV cache earn its existence, then size it for real models.
const GEN = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred']

const PRESETS = [
  { name: 'GPT-2 small', layers: 12, kvHeads: 12, dHead: 64 },
  { name: 'Llama-3-8B', layers: 32, kvHeads: 8, dHead: 128 },
  { name: 'Llama-3-70B', layers: 80, kvHeads: 8, dHead: 128 },
]
const CTX = [1024, 4096, 8192, 32768, 131072]
const HBM_GB = 80

export default function KvCacheLab() {
  const [t, setT] = useState(3)          // tokens generated so far
  const [cache, setCache] = useState(true)
  const [preset, setPreset] = useState(1) // Llama-3-8B
  const [ctxIdx, setCtxIdx] = useState(2) // 8192

  const projections = cache ? t : (t * (t + 1)) / 2
  const p = PRESETS[preset]
  const ctx = CTX[ctxIdx]
  const gb = (2 * p.layers * p.kvHeads * p.dHead * 2 * ctx) / 1e9

  const slot = 480 / GEN.length

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>KV Cache Lab</span>
        <span className={s.widgetHint}>decode token by token; watch what must be remembered</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setT(v => Math.min(GEN.length, v + 1))} disabled={t >= GEN.length}>
            generate next token →
          </button>
          <button type="button" className={s.btn} onClick={() => setT(1)} disabled={t <= 1}>restart</button>
          <button type="button" className={`${s.chip} ${cache ? s.chipOn : ''}`} onClick={() => setCache(c => !c)}>
            KV cache {cache ? 'ON' : 'off'}
          </button>
        </div>
        <svg viewBox="0 0 480 132" className={s.labCanvas} role="img" aria-label="Generated tokens with their cached or recomputed K and V projections">
          {GEN.slice(0, t).map((tok, i) => {
            const isNew = i === t - 1
            const recomputes = t - i // token i's K/V computed at steps i+1..t without a cache
            return (
              <g key={i}>
                <rect x={i * slot + 4} y={10} width={slot - 8} height={22} rx={3} fill={isNew ? '#f0d98c' : '#fff'} stroke={isNew ? '#9a7a1a' : '#7f9db9'} strokeWidth={isNew ? 2 : 1} />
                <text x={i * slot + slot / 2} y={25} textAnchor="middle" fontSize={9.5} fontFamily="Tahoma, sans-serif">{tok}</text>
                {isNew && (
                  <>
                    <rect x={i * slot + 8} y={38} width={slot - 16} height={16} rx={2} fill="#cfe0f5" stroke="#2b6fd0" />
                    <text x={i * slot + slot / 2} y={50} textAnchor="middle" fontSize={8.5}>Q (fresh)</text>
                  </>
                )}
                <rect x={i * slot + 8} y={60} width={slot - 16} height={16} rx={2}
                  fill={cache ? '#e3f6e3' : '#fbe7d4'} stroke={cache ? '#6a9a6a' : '#c86018'} />
                <text x={i * slot + slot / 2} y={72} textAnchor="middle" fontSize={8.5}>
                  K,V {cache ? (isNew ? 'new' : 'cached') : `×${recomputes}`}
                </text>
              </g>
            )
          })}
          <text x={4} y={100} fontSize={9.5} fill="#333">
            step {t}: the new token&apos;s Q must score against EVERY past token&apos;s K — then blend their V.
          </text>
          <text x={4} y={116} fontSize={9.5} fill={cache ? '#2f8e2f' : '#c86018'}>
            {cache
              ? 'cache: each K,V computed once, stored, reused at every later step'
              : 'no cache: every step reprojects the whole history — the orange ×counts add up quadratically'}
          </text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>
            K/V projections computed so far{' '}
            <span className={s.labStatValue}>
              {projections} — {cache ? 'once per token, then reused' : 'every past token reprojected each step: t(t+1)/2'}
            </span>
          </span>
        </div>
        <div className={s.chipRow}>
          {PRESETS.map((pr, i) => (
            <button key={pr.name} type="button" className={`${s.chip} ${preset === i ? s.chipOn : ''}`} onClick={() => setPreset(i)}>
              {pr.name}
            </button>
          ))}
          <span className={s.sliderLabel}>context length</span>
          <input type="range" min={0} max={4} step={1} value={ctxIdx} onChange={e => setCtxIdx(Number(e.target.value))} className={s.slider} aria-label="context length" />
          <span className={s.labStat}>{ctx.toLocaleString('en-US')} tokens</span>
        </div>
        <div className={s.gapChart}>
          <div className={s.gapRow}>
            <div className={s.gapLabel}>
              <span>KV cache — 2 × {p.layers} layers × {p.kvHeads} K/V heads × {p.dHead} dims × 2 bytes × context</span>
              <span className={s.gapSub}>{gb.toFixed(2)} GB of {HBM_GB} GB HBM</span>
            </div>
            <div className={s.gapTrack}>
              <div className={s.gapFill} style={{ width: `${Math.min(100, (gb / HBM_GB) * 100)}%`, background: gb > HBM_GB * 0.5 ? '#c86018' : '#2b6fd0' }} />
            </div>
          </div>
        </div>
        <p className={s.labNote}>
          The cache is pure trade: memory for compute. It turns each decode step from &quot;reproject the whole
          history&quot; into &quot;project one token, read the rest&quot; — but the reading is the new tax. Every generated
          token must stream the <em>entire</em> cache through the GPU&apos;s compute units, so long-context decoding
          is <strong>memory-bound</strong>: the bar above, re-read per token. That number is what modules 3.1
          (shrink it), 3.2 (move bytes smarter), and 3.3 (score fewer pairs) are all attacking.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite module 3's main blocks in `content.tsx`**

Replace module 3's `blocks` array (keep id `'efficiency'`, navLabel, title, subtitle; change `minutes: 9` → `minutes: 8`; keep `subchapters: EFFICIENCY_SUBCHAPTERS`) with:

```tsx
    blocks: [
      {
        kind: 'prose',
        body: (
          <>
            <p>
              Full attention scores every pair: n tokens → n² work. Double your context, quadruple the compute.
              That&apos;s the tax at <strong>prefill</strong>, when the prompt is processed in one parallel pass. But
              generation is different, and this is the piece most explanations skip: a decoder produces{' '}
              <strong>one token at a time</strong>, and each new token&apos;s query must score against the key of{' '}
              <em>every token so far</em>, then blend their values. Recompute those K/V projections from scratch
              each step and you&apos;re doing t(t+1)/2 projections for t tokens — almost all of it repeated work,
              since past tokens&apos; K and V never change (with a causal mask, tokens can&apos;t see the future, so new
              tokens never alter old projections).
            </p>
            <p>
              So decoders store them. That store is the <strong>KV cache</strong> — the second character in every
              efficiency story of the LLM era. Watch it earn its existence, then check its price:
            </p>
          </>
        ),
      },
      { kind: 'widget', widget: 'kv-cache' },
      {
        kind: 'callout',
        icon: '🧾',
        title: 'The n² tax is really two different bills',
        body: (
          <>
            <strong>Prefill is compute-bound</strong> (n² scores, but massively parallel);{' '}
            <strong>decoding is memory-bound</strong> (one token&apos;s worth of compute per step, but the whole KV
            cache re-read from memory every single token). Optimizations target one bill or the other — misread
            which one and none of this module makes sense.
          </>
        ),
      },
      {
        kind: 'prose',
        body: (
          <>
            <p>With the vocabulary in place, the modern fixes sort into three attack directions — each with its own deep dive below this module in the sidebar:</p>
            <ul>
              <li><strong>3.1 — Shrink the cache.</strong> Queries are used once, but K/V are re-read forever: share K/V heads across query heads (MQA, GQA) or cache a compressed latent instead (DeepSeek&apos;s MLA).</li>
              <li><strong>3.2 — Compute the same thing, smarter.</strong> FlashAttention changes zero math: it reorganizes the computation so the n×n matrix never touches GPU main memory. The bottleneck was memory movement, not FLOPs.</li>
              <li><strong>3.3 — Score fewer pairs.</strong> Windows + global tokens (Longformer, BigBird), production sliding windows (Mistral), or linear attention&apos;s reordering that dodges n² entirely — with trade-offs.</li>
            </ul>
          </>
        ),
      },
      {
        kind: 'quiz',
        questions: [
          {
            id: 'am3-q4',
            prompt: 'Decoders cache K and V — but never Q. Why the asymmetry?',
            options: [
              { text: 'Each query is used once, at the step that computes it; every past K and V must be re-read at every future step', correct: true, explain: 'Cache what gets re-read, recompute what doesn\'t. This lifetime asymmetry is also why the K/V side is where all of 3.1\'s surgery happens.' },
              { text: 'Queries are too large to store', explain: 'Q, K, V are the same size per head — the difference is how long each is needed, not how big it is.' },
              { text: 'The causal mask deletes queries', explain: 'The mask hides future keys from queries; it doesn\'t delete anything.' },
            ],
          },
          {
            id: 'am3-q5',
            prompt: 'Which of these does the KV cache\'s size NOT scale with?',
            options: [
              { text: 'The number of QUERY heads', correct: true, explain: 'Cache = 2 × layers × K/V heads × d_head × context × bytes. Query heads never enter the formula — which is exactly the loophole GQA exploits (subchapter 3.1).' },
              { text: 'Context length', explain: 'Linearly — it\'s the slider in the lab, and the reason 128k contexts hurt.' },
              { text: 'The number of layers', explain: 'Every layer keeps its own K/V for every past token.' },
            ],
          },
          {
            id: 'am3-q6',
            prompt: 'After generating t tokens, how many K/V projections has the model computed with vs without a cache?',
            options: [
              { text: 't with the cache; t(t+1)/2 without — the cache turns quadratic recomputation into linear work, paid for in memory', correct: true, explain: 'Each token projected once vs the whole history reprojected each step (1+2+…+t). The lab\'s counter is this formula running live.' },
              { text: 'The same either way — the cache only helps latency jitter', explain: 'The counts differ asymptotically: t vs t(t+1)/2 is the entire reason the cache exists.' },
              { text: 't² with the cache, t without', explain: 'Backwards — the cache is the linear one.' },
            ],
          },
        ],
      },
      {
        kind: 'refs',
        items: [
          { label: 'Transformer Inference Arithmetic — kipply (2022)', href: 'https://kipp.ly/transformer-inference-arithmetic/', note: 'the classic back-of-envelope treatment of KV cache & memory-bound decoding' },
          { label: 'Efficient Memory Management for LLM Serving (PagedAttention/vLLM) — Kwon et al. (SOSP 2023)', href: 'https://arxiv.org/abs/2309.06180', note: 'what serving systems do about the cache' },
        ],
      },
    ],
```

- [ ] **Step 4: Wire up and sync catalog**

- `index.tsx`: `import KvCacheLab from './KvCacheLab'`; registry `'kv-cache': KvCacheLab,`.
- `courseCatalog.ts`: minutes 107 → 106 (module 3 main went 9 → 8); highlights → `'14 interactive labs · 7 deep dives'`.

- [ ] **Step 5: Run all tests and lint, commit**

Run: `npx vitest run src/components/courses src/lib && npx eslint src/components/courses src/lib/courseCatalog.ts`
Expected: tests PASS at baseline; lint clean.

```bash
git add src/components/courses/attention/KvCacheLab.tsx src/components/courses/attention/content.tsx src/components/courses/attention/index.tsx src/components/courses/attention/subchapterLabs.test.tsx src/lib/courseCatalog.ts
git commit -m "Rewrite module 3 with KV-cache prelims and a decoding stepper lab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: End-to-end verification in a real browser

**Files:** none (verification only)

- [ ] **Step 1: Invoke the project's verify skill**

Invoke the `verify` skill (Skill tool) — it builds the static export, serves it, and drives a browser. Note: another session may hold the Playwright browser; the skill's scratchpad-playwright fallback applies (see memory note).

- [ ] **Step 2: Manually verify in the driven browser**

On `/learn/attention-mechanisms`:
1. Sidebar shows 2.1–2.4 indented under "2. The transformer block" and 3.1–3.3 under "3. Taming the n²", with dotted tree guides.
2. Click "2.1 Embeddings & positions" → kicker reads "Module 2 · Deep dive 1 of 4"; Order-Blindness Lab and Position Lab render.
3. In the RoPE tab: press "shift both +5" and confirm the score readout doesn't change.
4. Click "Mark complete & continue" from module 2 → lands on 2.1.
5. In module 2's block diagram, click "feed-forward network" → the data-flow panel shows "4×4 → 4×8 → 4×4" with real numbers; click "multi-head attention" → attention-weight grid appears.
6. In module 3: step the KV Cache Lab twice, toggle the cache off, and confirm the counter switches to the t(t+1)/2 story; drag the context slider and watch the GB bar.
7. In 3.1: click through MHA → MQA → MLA and confirm the wiring diagram and cache readout change. In 3.2: switch to FlashAttention mode and process a few tiles. In 3.3: the mask lab works as before.
8. Open `/learn/graph-foundation-models` → renders exactly as before (no subchapters, "Module 1 of 7").
9. Check the library card for the attention course shows "106 min" and "14 interactive labs · 7 deep dives".

- [ ] **Step 3: Confirm clean git state**

Run: `git status --porcelain`
Expected: only the concurrent session's files (`.claude/skills/verify/SKILL.md`, `content/settings.yaml`, `src/app/[[...path]]/HomeClient.tsx`, `src/components/learn/CoursewareShell.tsx`, `src/components/learn/CoursewareShell.test.tsx`, `.playwright-mcp/`) remain dirty — none of ours.

---

## Self-Review (completed at plan-writing time)

- **Spec coverage:** engine nesting (Task 1), 2.1 with order-blind + position lab (Tasks 2, 3, 7), 2.2 head-matrix (4, 7), 2.3 residual-stream (5, 7), 2.4 param-budget (6, 7), diagram blurbs + module-2 pointer (7), catalog + flattened tests (8), block-diagram data-flow panel (9), module-3 subchapters 3.1/3.2/3.3 (10–12), KV-cache prelims + lab (13), both-courses regression + browser verify (14). Storage key untouched; moved quiz ids (am3-q1, am3-q2, am3-q3) keep their strings so saved progress survives. ✓
- **Placeholder scan:** all steps carry complete code/commands; prose and quiz copy is final. ✓
- **Type consistency:** `subchapters?: CourseModule[]` (Task 1) is what Tasks 7/10 set and Task 8's flattened tests cover generically; widget keys registered in `index.tsx` (`order-blind`, `position-lab`, `head-matrix`, `residual-stream`, `param-budget`, `head-sharing`, `flash-tiling`, `kv-cache`) match the widget blocks in `subchapters.tsx`, `efficiencySubchapters.tsx`, and rewritten module 3; quiz ids unique across am2-1-q*…am2-4-q*, am3-q1…q6, am3-1-q*, am3-2-q*, am3-3-q*. ✓
- **Catalog minutes ledger:** 64 (base) → 89 (Task 8: +2.1…2.4 = 25) → 95 (Task 10: +3.1) → 101 (Task 11: +3.2) → 107 (Task 12: +3.3) → 106 (Task 13: module 3 main 9→8). Each task's commit leaves the sync test green. ✓
