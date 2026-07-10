'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'
import { SENTENCE, computeLogits, softmaxRow, AttentionArcs } from './attentionCore'

// Compatibility scores a trained model might assign: mild self/previous-token habits
// plus the linguistic relationships that make this sentence famous.
const LOGITS = computeLogits({
  self: 1.6,
  prev: 1.2,
  next: 0.4,
  decay: 0.15,
  boosts: {
    7: { 1: 3.4, 5: 1.6 },          // "it" -> animal (and a little to street)
    10: { 7: 2.2, 1: 2.6 },         // "tired" -> it, animal
    3: { 1: 2.0, 5: 2.4, 2: 1.2 },  // "cross" -> animal, street, didn't
    6: { 3: 1.6, 10: 1.4 },         // "because" -> cross, tired
  },
}, SENTENCE.length)

export default function AttentionLab() {
  const [query, setQuery] = useState(7) // "it"
  const [temperature, setTemperature] = useState(1)
  const [causal, setCausal] = useState(false)

  const weights = useMemo(
    () => softmaxRow(LOGITS[query], temperature, causal ? (k => k > query) : undefined),
    [query, temperature, causal]
  )

  const top = weights
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 2)
    .map(({ i }) => `"${SENTENCE[i]}"`)
    .join(', ')

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Attention Lab</span>
        <span className={s.widgetHint}>click any token to make it the query</span>
      </div>
      <div className={s.widgetBody}>
        <AttentionArcs tokens={SENTENCE} weights={weights} query={query} onSelectQuery={setQuery} />
        <div className={s.labControls}>
          <span className={s.sliderLabel}>sharper</span>
          <input
            type="range" min={0.4} max={3} step={0.05} value={temperature}
            onChange={e => setTemperature(Number(e.target.value))}
            className={s.slider} aria-label="Softmax temperature"
          />
          <span className={s.sliderLabel}>softer</span>
          <button type="button" className={`${s.chip} ${causal ? s.chipOn : ''}`} onClick={() => setCausal(c => !c)}>
            causal mask {causal ? 'ON' : 'off'}
          </button>
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>query <span className={s.labStatValue}>&quot;{SENTENCE[query]}&quot;</span></span>
          <span className={s.labStat}>weights sum to <span className={s.labStatValue}>1.00</span></span>
          <span className={s.labStat}>looking mostly at <span className={s.labStatValue}>{top}</span></span>
        </div>
        <p className={s.labNote}>
          Each token&apos;s <strong>query</strong> vector is compared (dot product, scaled by 1/√d) against every
          token&apos;s <strong>key</strong> vector; softmax turns those scores into weights that sum to 1; the output is
          the weight-blended mix of <strong>value</strong> vectors. Select <strong>&quot;it&quot;</strong>: the network resolves
          the pronoun by attending to <em>animal</em> — context, computed as a weighted average. The slider is the
          softmax temperature (sharp → nearly one-hot; soft → uniform blur), and the <strong>causal mask</strong>{' '}
          hides all future tokens — the one-line difference between a BERT-style encoder and a GPT-style decoder.
        </p>
      </div>
    </div>
  )
}
