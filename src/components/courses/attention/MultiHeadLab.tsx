'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'
import { SENTENCE, computeLogits, softmaxRow, AttentionArcs, LogitRules } from './attentionCore'

// Three heads with deliberately different "specialties" — the patterns interpretability
// work keeps finding in real trained transformers.
const HEADS: { name: string; color: string; blurb: string; rules: LogitRules }[] = [
  {
    name: 'Head 1: previous token',
    color: '#2b6fd0',
    blurb: 'attends almost entirely to the token just before the query — a syntax/ordering workhorse found in every trained LM',
    rules: { self: 0.4, prev: 3.2, next: 0, decay: 0.3 },
  },
  {
    name: 'Head 2: coreference',
    color: '#2f8e2f',
    blurb: 'links pronouns and their referents across long distances ("it" → "animal")',
    rules: {
      self: 0.8, prev: 0.2, next: 0.1, decay: 0.05,
      boosts: {
        7: { 1: 4.2, 5: 1.4 },
        10: { 7: 2.6, 1: 2.8 },
        3: { 1: 2.4 },
        6: { 3: 1.8, 10: 1.6 },
      },
    },
  },
  {
    name: 'Head 3: local window',
    color: '#c86018',
    blurb: 'spreads attention over immediate neighbors — local phrase structure',
    rules: { self: 1.8, prev: 1.8, next: 1.8, decay: 0.55 },
  },
]

const HEAD_LOGITS = HEADS.map(h => computeLogits(h.rules, SENTENCE.length))

export default function MultiHeadLab() {
  const [head, setHead] = useState(1)
  const [query, setQuery] = useState(7) // "it"

  const weights = useMemo(() => softmaxRow(HEAD_LOGITS[head][query], 1), [head, query])

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Multi-Head Lab</span>
        <span className={s.widgetHint}>same sentence, same query — different heads</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {HEADS.map((h, i) => (
            <button
              key={h.name}
              type="button"
              className={`${s.chip} ${head === i ? s.chipOn : ''}`}
              style={head === i ? { borderBottomColor: h.color, borderBottomWidth: 2 } : undefined}
              onClick={() => setHead(i)}
            >
              {h.name}
            </button>
          ))}
        </div>
        <AttentionArcs tokens={SENTENCE} weights={weights} query={query} onSelectQuery={setQuery} color={HEADS[head].color} />
        <div className={s.labControls}>
          <span className={s.labStat}>this head <span className={s.labStatValue}>{HEADS[head].blurb.split(' — ')[0].split(' (')[0]}</span></span>
        </div>
        <p className={s.labNote}>
          Each head runs the exact same attention math with its <strong>own learned Q/K/V projections</strong>, so
          each learns to look for a different relationship — here: {HEADS[head].blurb}. The heads&apos; outputs are
          concatenated and mixed by one final linear layer. That&apos;s all &quot;multi-head&quot; means: several
          relationship-detectors reading the sequence in parallel, in different learned subspaces.
        </p>
      </div>
    </div>
  )
}
