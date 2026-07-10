'use client'
import s from '../engine/course.module.css'

// The classic disambiguation sentence used by the original Transformer authors'
// visualizations: "it" should attend to "animal", not "street".
export const SENTENCE = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired']

/** Sparse pairwise boosts on top of base rules; index pairs are [query][key]. */
export type BoostTable = Record<number, Record<number, number>>

export interface LogitRules {
  self: number
  prev: number
  next: number
  /** subtracted per token of distance */
  decay: number
  boosts?: BoostTable
}

export function computeLogits(rules: LogitRules, n: number): number[][] {
  const logits: number[][] = []
  for (let q = 0; q < n; q++) {
    const row: number[] = []
    for (let k = 0; k < n; k++) {
      let l = -rules.decay * Math.abs(q - k)
      if (k === q) l += rules.self
      if (k === q - 1) l += rules.prev
      if (k === q + 1) l += rules.next
      l += rules.boosts?.[q]?.[k] ?? 0
      row.push(l)
    }
    logits.push(row)
  }
  return logits
}

export function softmaxRow(logits: number[], temperature: number, masked?: (k: number) => boolean): number[] {
  const scaled = logits.map((l, k) => (masked?.(k) ? -Infinity : l / temperature))
  const max = Math.max(...scaled)
  const exps = scaled.map(l => (l === -Infinity ? 0 : Math.exp(l - max)))
  const sum = exps.reduce((a, b) => a + b, 0) || 1
  return exps.map(e => e / sum)
}

const W = 480
const TOKEN_H = 22
const ARC_H = 96
const BAR_H = 26

interface AttentionArcsProps {
  tokens: string[]
  weights: number[]
  query: number
  onSelectQuery: (index: number) => void
  color?: string
}

/** Token strip with attention arcs from the selected query token, plus a weight bar per token. */
export function AttentionArcs({ tokens, weights, query, onSelectQuery, color = '#2b6fd0' }: AttentionArcsProps) {
  const n = tokens.length
  const slot = W / n
  const cx = (i: number) => slot * i + slot / 2
  const tokenTopY = ARC_H + 4
  const barTopY = tokenTopY + TOKEN_H + 4
  const height = barTopY + BAR_H + 14

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={s.labCanvas} role="img" aria-label="Attention weights from the selected query token">
      {/* arcs */}
      {tokens.map((_, k) => {
        const w = weights[k]
        if (k === query || w < 0.015) return null
        const x1 = cx(query)
        const x2 = cx(k)
        const lift = Math.min(ARC_H - 8, 26 + Math.abs(x2 - x1) * 0.28)
        return (
          <path
            key={k}
            d={`M ${x1} ${tokenTopY} C ${x1} ${tokenTopY - lift}, ${x2} ${tokenTopY - lift}, ${x2} ${tokenTopY}`}
            fill="none"
            stroke={color}
            strokeWidth={0.8 + 6.5 * w}
            opacity={0.25 + 0.7 * w}
          />
        )
      })}
      {/* self-attention loop */}
      {weights[query] >= 0.015 && (
        <path
          d={`M ${cx(query) - 7} ${tokenTopY} C ${cx(query) - 16} ${tokenTopY - 26}, ${cx(query) + 16} ${tokenTopY - 26}, ${cx(query) + 7} ${tokenTopY}`}
          fill="none"
          stroke={color}
          strokeWidth={0.8 + 6.5 * weights[query]}
          opacity={0.25 + 0.7 * weights[query]}
        />
      )}
      {/* tokens */}
      {tokens.map((t, i) => (
        <g key={i} onClick={() => onSelectQuery(i)} style={{ cursor: 'pointer' }}>
          <rect
            x={cx(i) - slot / 2 + 2}
            y={tokenTopY}
            width={slot - 4}
            height={TOKEN_H}
            rx={3}
            fill={i === query ? '#f0d98c' : '#fff'}
            stroke={i === query ? '#9a7a1a' : '#7f9db9'}
            strokeWidth={i === query ? 2 : 1}
          />
          <text x={cx(i)} y={tokenTopY + 15} textAnchor="middle" fontSize={t.length > 6 ? 8.5 : 10} fontFamily="Tahoma, sans-serif">
            {t}
          </text>
          {/* weight bar */}
          <rect x={cx(i) - slot / 2 + 5} y={barTopY + (BAR_H - 3) * (1 - weights[i])} width={slot - 10} height={Math.max(2, (BAR_H - 3) * weights[i])} fill={color} opacity={0.8} />
          <text x={cx(i)} y={barTopY + BAR_H + 10} textAnchor="middle" fontSize={7.5} fill="#666">
            {weights[i] >= 0.005 ? `${Math.round(weights[i] * 100)}%` : ''}
          </text>
        </g>
      ))}
    </svg>
  )
}
