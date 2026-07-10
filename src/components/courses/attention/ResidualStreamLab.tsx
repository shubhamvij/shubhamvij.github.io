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
