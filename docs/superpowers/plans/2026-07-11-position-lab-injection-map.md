# Position Lab Injection Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it visible, inside the Position Lab, exactly where each positional-encoding scheme (Sinusoidal, Learned, RoPE, ALiBi) hooks into the transformer block, and regroup the 2.1 prose around the same two injection families.

**Architecture:** A new internal `InjectionMap` SVG component in `PositionLab.tsx` renders a persistent 8-node pipeline strip between the tab chips and the tab panel; the active tab's injection slot highlights while the other two render as dashed unused hooks. One caption line per tab sits below the strip. The RoPE/ALiBi lab notes gain one anchor sentence each tying them to the Anatomy widget's MHA stepper, and the 2.1 bullet list in `subchapters.tsx` becomes two labeled families with nested bullets.

**Tech Stack:** React 18 + TypeScript (Next.js static export), CSS modules (`course.module.css`), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-11-position-lab-injection-map-design.md`

## Global Constraints

- No new files, no new dependencies — `InjectionMap` lives inside `PositionLab.tsx`.
- Untouched files: `OrderBlindLab.tsx`, `TransformerBlockDiagram.tsx`, `blockFlow.ts`, `index.tsx` (widget registry), the course engine, and 2.1's quiz/callout/refs blocks.
- Visual language mirrors the Anatomy diagram: region tints `#d8e3f5` (embed) / `#cfe0f5` (MHA); active slot stroke `#0a246a` with fill `#fff7e0`; inactive slots dashed `#b0a898` stroke, `#f6f4ec` fill, `#a09880` text; plain nodes `#8898a8` stroke, white fill.
- JSX text must escape quotes/apostrophes as `&quot;` / `&apos;` (repo lint style — see existing files).
- **Testing-library subtlety:** `getByText` matches an element's *direct* text nodes only. Never split an asserted phrase with a tag (`<strong>`, `<em>`), and keep the exact asserted phrases from this plan — they were checked for uniqueness against existing panel/note text (e.g. the Sinusoidal note already contains "once, at the input", which is why tests assert different phrases).
- Commits: stage **by explicit path only** (another session may hold unrelated changes, e.g. `public/sitemap.xml`). End commit messages with the Co-Authored-By/Claude-Session footer used in this repo's recent commits.
- Baseline: the attention-course test files must be fully green. The repo-wide suite has ~12 pre-existing failures elsewhere — compare against baseline, don't chase them.

## File Structure

- `src/components/courses/attention/PositionLab.tsx` — gains `Slot` type, `INJECTION` config, `SLOT_TITLES`, `MAP_NODES`, `InjectionMap` component (Tasks 1); RoPE/ALiBi note sentences (Task 2).
- `src/components/courses/attention/subchapters.tsx` — second prose block of the `block-embeddings` module restructured (Task 3).
- `src/components/courses/attention/subchapterLabs.test.tsx` — 3 injection-map tests + 1 note-anchor test appended to the `PositionLab` describe (Tasks 1–2); 1 new describe asserting the two family labels in the 2.1 prose (Task 3, amended — see Task 3 note).

---

### Task 1: `InjectionMap` strip in PositionLab

**Files:**
- Modify: `src/components/courses/attention/PositionLab.tsx`
- Test: `src/components/courses/attention/subchapterLabs.test.tsx`

**Interfaces:**
- Consumes: existing `Tab` type (`'Sinusoidal' | 'Learned' | 'RoPE' | 'ALiBi'`), CSS classes `s.labCanvas`, `s.flowShape`.
- Produces: `InjectionMap({ tab }: { tab: Tab })` rendered between the chip row and `{panel[tab]}`. Caption phrases that Task 2/3 tests must not duplicate: "the layers above never see position again", "nothing added at the input", "rotated right after their projections", "no position vectors anywhere", "between QKᵀ and softmax".

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('PositionLab', …)` block in `src/components/courses/attention/subchapterLabs.test.tsx`:

```tsx
  it('injection map: default tab hooks position at the input, once', () => {
    render(<PositionLab />)
    expect(screen.getByText(/the layers above never see position again/i)).toBeDefined()
    expect(screen.getByRole('img', { name: /sinusoidal encoding is added to the embedding at the input/i })).toBeDefined()
  })

  it('injection map: RoPE moves the hook inside attention', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    expect(screen.getByText(/nothing added at the input/i)).toBeDefined()
    expect(screen.getByText(/rotated right after their projections/i)).toBeDefined()
  })

  it('injection map: ALiBi hooks between the scores and the softmax', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /ALiBi/ }))
    expect(screen.getByText(/no position vectors anywhere/i)).toBeDefined()
    expect(screen.getByText(/between QKᵀ and softmax/i)).toBeDefined()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx -t 'injection map'`
Expected: 3 failed — `TestingLibraryElementError: Unable to find an element with the text: /the layers above never see position again/i` (and similar for the other two).

- [ ] **Step 3: Implement `InjectionMap`**

In `src/components/courses/attention/PositionLab.tsx`, insert this section immediately **before** `export default function PositionLab()`:

```tsx
// ---------- Injection map: where each scheme hooks into the block ----------

type Slot = 'add' | 'rotate' | 'bias'

const INJECTION: Record<Tab, { slot: Slot; aria: string; caption: ReactNode }> = {
  Sinusoidal: {
    slot: 'add',
    aria: 'Injection map: sinusoidal encoding is added to the embedding at the input, once',
    caption: (
      <>sin/cos barcode <strong>⊕-added to the token embedding — once, at the input</strong>; the layers above never see position again</>
    ),
  },
  Learned: {
    slot: 'add',
    aria: 'Injection map: learned absolute encoding is added to the embedding at the input, once',
    caption: (
      <>trained table row <strong>⊕-added to the token embedding — once, at the input</strong> — the same ⊕ the Order-Blindness Lab&apos;s positions toggle flips</>
    ),
  },
  RoPE: {
    slot: 'rotate',
    aria: 'Injection map: RoPE rotates Q and K inside attention, at every layer',
    caption: (
      <><strong>nothing added at the input</strong> — Q and K are rotated right after their projections, inside attention, at every layer</>
    ),
  },
  ALiBi: {
    slot: 'bias',
    aria: 'Injection map: ALiBi biases the attention scores inside attention, at every layer',
    caption: (
      <><strong>no position vectors anywhere</strong> — −slope·distance joins the scores between QKᵀ and softmax, at every layer</>
    ),
  },
}

const SLOT_TITLES: Record<Slot, string> = {
  add: 'input injection — used by sinusoidal & learned absolute',
  rotate: 'Q/K rotation — used by RoPE',
  bias: 'score bias — used by ALiBi',
}

interface MapNode { label: string; x: number; w: number; slot?: Slot }

const MAP_NODES: MapNode[] = [
  { label: 'embed', x: 8, w: 36 },
  { label: '⊕ pos', x: 58, w: 34, slot: 'add' },
  { label: 'make Q,K,V', x: 106, w: 56 },
  { label: '↻ rotate Q,K', x: 176, w: 62, slot: 'rotate' },
  { label: 'QKᵀ/√d', x: 252, w: 42 },
  { label: '+ dist bias', x: 308, w: 56, slot: 'bias' },
  { label: 'softmax', x: 378, w: 44 },
  { label: '·V', x: 436, w: 24 },
]

/** Persistent pipeline strip: same on every tab, only the active hook moves. */
function InjectionMap({ tab }: { tab: Tab }) {
  const active = INJECTION[tab]
  return (
    <>
      <svg viewBox="0 0 480 84" className={s.labCanvas} role="img" aria-label={active.aria}>
        <text x={8} y={13} fontSize={8.5} fill="#888" letterSpacing={0.8}>WHERE IT ENTERS THE BLOCK</text>
        {/* once-vs-every-layer regions, in the block diagram's embed/MHA tints */}
        <rect x={4} y={20} width={94} height={34} rx={3} fill="#d8e3f5" opacity={0.55} />
        <rect x={100} y={20} width={364} height={34} rx={3} fill="#cfe0f5" opacity={0.4} />
        <line x1={8} y1={62} x2={94} y2={62} stroke="#9ab0cc" />
        <line x1={104} y1={62} x2={460} y2={62} stroke="#9ab0cc" />
        <text x={51} y={74} textAnchor="middle" fontSize={8} fill="#666">at the input · once</text>
        <text x={282} y={74} textAnchor="middle" fontSize={8} fill="#666">inside attention · every layer ×N</text>
        {MAP_NODES.map((nd, i) => {
          const isSlot = nd.slot !== undefined
          const on = isSlot && nd.slot === active.slot
          return (
            <g key={nd.label}>
              {i > 0 && <text x={nd.x - 8} y={40.5} textAnchor="middle" fontSize={9} fill="#999">→</text>}
              <rect
                x={nd.x} y={27} width={nd.w} height={20} rx={3}
                fill={on ? '#fff7e0' : isSlot ? '#f6f4ec' : '#fff'}
                stroke={on ? '#0a246a' : isSlot ? '#b0a898' : '#8898a8'}
                strokeWidth={on ? 2 : 1}
                strokeDasharray={isSlot && !on ? '3 2' : undefined}
              >
                {isSlot && <title>{SLOT_TITLES[nd.slot!]}</title>}
              </rect>
              <text
                x={nd.x + nd.w / 2} y={40} textAnchor="middle" fontSize={8}
                fontWeight={on ? 'bold' : 'normal'}
                fill={on ? '#0a246a' : isSlot ? '#a09880' : '#333'}
              >
                {nd.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p className={s.flowShape} style={{ margin: '4px 0 8px' }}>{active.caption}</p>
    </>
  )
}
```

Then render it between the chip row and the panel — the `widgetBody` div at the bottom of the file becomes:

```tsx
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {TABS.map(t => (
            <button key={t} type="button" className={`${s.chip} ${tab === t ? s.chipOn : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <InjectionMap tab={tab} />
        {panel[tab]}
      </div>
```

(`ReactNode` is already imported at the top of the file.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: all tests in the file PASS — the 3 new ones and the 4 pre-existing PositionLab tests (plus the other labs' tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/PositionLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Add injection-map strip to Position Lab: where each PE scheme enters the block"
```

---

### Task 2: RoPE/ALiBi note anchors to the MHA stepper

**Files:**
- Modify: `src/components/courses/attention/PositionLab.tsx` (two `labNote` paragraphs)
- Test: `src/components/courses/attention/subchapterLabs.test.tsx`

**Interfaces:**
- Consumes: `RopePanel` / `AlibiPanel` note paragraphs from Task 1's file state (unchanged by Task 1).
- Produces: note phrases "project first, rotate, then score" and "after QKᵀ, before the softmax" (distinct from Task 1's caption phrases by design).

- [ ] **Step 1: Write the failing test**

Append inside the `describe('PositionLab', …)` block:

```tsx
  it('RoPE and ALiBi notes anchor to the attention stepper steps', () => {
    render(<PositionLab />)
    fireEvent.click(screen.getByRole('button', { name: /RoPE/ }))
    expect(screen.getByText(/project first, rotate, then score/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /ALiBi/ }))
    expect(screen.getByText(/after QKᵀ, before the softmax/i)).toBeDefined()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx -t 'anchor to the attention stepper'`
Expected: 1 failed — unable to find `/project first, rotate, then score/i`.

- [ ] **Step 3: Append the anchor sentences**

In `RopePanel`'s closing `<p className={s.labNote}>` (currently ends "…slow pairs carry long-range position like an hour hand."), append one sentence so the note ends:

```tsx
        …fast pairs resolve nearby order like a second hand; slow pairs carry long-range position like an hour
        hand. In the block anatomy&apos;s attention stepper this sits between step 1 (make Q, K, V) and step 2
        (score + softmax): project first, rotate, then score — the embedding itself is never touched.
      </p>
```

In `AlibiPanel`'s closing `<p className={s.labNote}>` (currently ends "…the penalty just keeps going."), append one sentence so the note ends:

```tsx
        …position 3000 needs no new
        parameters — the penalty just keeps going. In stepper terms it lives inside step 2 — after QKᵀ, before
        the softmax.
      </p>
```

Keep both added sentences free of inline tags (`<strong>`/`<em>`) so the asserted phrases stay within the paragraph's direct text.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/PositionLab.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Anchor RoPE/ALiBi lab notes to the block anatomy's attention stepper"
```

---

### Task 3: Regroup 2.1 prose bullets into the two injection families

> **Amended 2026-07-11 (controller):** the test originally targeted `attentionCourse.test.tsx` via CourseShell navigation. A concurrent session holds uncommitted work in that file, so the test moves to `subchapterLabs.test.tsx` and renders the 2.1 prose blocks directly — same asserted labels, no shared-file contention. Shell-level rendering of 2.1 is already covered by the existing "module 2 exposes the four deep-dive subchapters" test.

**Files:**
- Modify: `src/components/courses/attention/subchapters.tsx` (second prose block of the `block-embeddings` module — the one currently starting "So position must be injected" with the flat 4-bullet `<ul>`)
- Test: `src/components/courses/attention/subchapterLabs.test.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1–2 (content-only change; renders through the existing course engine `.prose` styles, which handle nested `<ul>`).
- Produces: two `<strong>` family labels asserted by test: "At the input, once — a vector ⊕-added to the token embedding" and "Inside attention, at every layer — no position vectors at all".

- [ ] **Step 1: Write the failing test**

In `src/components/courses/attention/subchapterLabs.test.tsx`, add to the imports at the top of the file:

```tsx
import { BLOCK_SUBCHAPTERS } from './subchapters'
```

Then append this new describe block at the end of the file:

```tsx
describe('2.1 Embeddings & positions prose', () => {
  it('groups the four PE schemes into the two injection families', () => {
    const m21 = BLOCK_SUBCHAPTERS[0]
    expect(m21.id).toBe('block-embeddings')
    render(<>{m21.blocks.map((b, i) => (b.kind === 'prose' ? <div key={i}>{b.body}</div> : null))}</>)
    expect(screen.getByText(/At the input, once — a vector ⊕-added to the token embedding/)).toBeDefined()
    expect(screen.getByText(/Inside attention, at every layer — no position vectors at all/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx -t 'injection families'`
Expected: 1 failed — unable to find `/At the input, once — a vector ⊕-added to the token embedding/`.

- [ ] **Step 3: Replace the prose block**

In `src/components/courses/attention/subchapters.tsx`, replace the entire second prose block of the `block-embeddings` module (the `{ kind: 'prose', body: (<> <p>So position must be injected…</p> <ul>…four bullets…</ul> </>) }` object) with:

```tsx
      {
        kind: 'prose',
        body: (
          <>
            <p>
              So position must be <em>injected</em>. Every scheme answers two questions: <strong>where</strong>{' '}
              does position enter, and <strong>what</strong> does it encode (my absolute index, or my distance
              to you?). The &quot;where&quot; has exactly two families — the map at the top of the lab below
              shows each scheme&apos;s hook into the block you dissected on the module page:
            </p>
            <ul>
              <li>
                <strong>At the input, once — a vector ⊕-added to the token embedding</strong>{' '}
                (what the positions toggle above just did):
                <ul>
                  <li><strong>Sinusoidal</strong> (Transformer, 2017) — fixed sin/cos barcode. Absolute, zero parameters, defined for any length.</li>
                  <li><strong>Learned absolute</strong> (GPT-2, BERT) — a trainable row per position. Absolute, simple, cannot represent positions past the training length.</li>
                </ul>
              </li>
              <li>
                <strong>Inside attention, at every layer — no position vectors at all</strong>:
                <ul>
                  <li><strong>RoPE</strong> (2021; Llama, Qwen, DeepSeek) — rotate each Q/K dimension-pair by position×θ, right after the Q/K projections. Scores then depend only on relative offset.</li>
                  <li><strong>ALiBi</strong> (2022) — subtract slope×distance from each score, just before the softmax. Relative, parameter-free, extrapolates well.</li>
                </ul>
              </li>
            </ul>
          </>
        ),
      },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/courses/attention/subchapterLabs.test.tsx`
Expected: all 24 PASS (the new test plus the 23 existing — nothing else in the file touches this prose).

- [ ] **Step 5: Commit**

```bash
git add src/components/courses/attention/subchapters.tsx src/components/courses/attention/subchapterLabs.test.tsx
git commit -m "Regroup 2.1 positional-encoding bullets into the two injection families"
```

---

### Task 4: Full-suite check and browser verification

**Files:**
- No source changes expected. Fix-forward only if this task surfaces a defect introduced by Tasks 1–3.

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: green attention-course suite + visual confirmation.

- [ ] **Step 1: Run the attention-course test files**

Run: `npx vitest run src/components/courses/attention`
Expected: all attention-course test files PASS (0 failures in this directory).

- [ ] **Step 2: Run the whole suite and compare against baseline**

Run: `npm test`
Expected: no NEW failures versus baseline — the repo has ~12 pre-existing failures outside the attention course (jsdom/localStorage quirks). Only investigate failures inside `src/components/courses/attention/`.

- [ ] **Step 3: Browser verification via the `verify` skill**

Invoke the `verify` skill (builds, serves, and drives the static export). Check on the 2.1 page (`Attention Everywhere` course → sidebar `2.1 Embeddings & positions`):
1. The injection-map strip renders above the tab panel on all four tabs.
2. Switching Sinusoidal → RoPE → ALiBi visibly moves the highlighted slot (input ⊕ → rotate Q,K → dist bias) while the other two slots stay dashed/faded.
3. The caption line changes per tab.
4. The regrouped prose renders as two families with indented nested bullets (no styling breakage). If the nested `<ul>` looks broken under `.prose` styles, apply the spec's fallback: flatten to two flat `<ul>`s, each preceded by a one-line `<p>` carrying the same `<strong>` family label (keep the exact label text — the Task 3 test asserts it).
5. RoPE/ALiBi lab notes show the new stepper-anchor sentences.

Take a screenshot of the RoPE tab for the record.

- [ ] **Step 4: Commit (only if fixes were needed)**

```bash
git add <explicit paths of any fixed files>
git commit -m "Fix injection-map verification findings"
```
