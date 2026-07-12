'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Illustrative latency shapes anchored to the spec ledger: embedding compute is
// roughly flat per-GPU (~100-200ms at scale); all-to-all grows with GPU count
// and exceeds 3x compute by ~1000 GPUs (>600ms). Shapes, not a benchmark.
function latencies(gpus: number) {
  const compute = 100 + 100 * Math.min(1, gpus / 1000) // 100..200 ms
  const a2a = 40 * Math.pow(gpus, 0.55)                 // ~40ms@8 -> ~600ms@1000
  return { compute, a2a }
}

const GPU_STEPS = [8, 16, 32, 64, 128, 256, 512, 1000]

export default function ShardShuffleLab() {
  const [gpus, setGpus] = useState(8)
  const { compute, a2a } = useMemo(() => latencies(gpus), [gpus])
  const bound = a2a > compute ? 'communication-bound' : 'compute-bound'
  const shards = Math.min(gpus, 4) // draw up to 4 GPU boxes

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Shard &amp; Shuffle</span>
        <span className={s.widgetHint}>the DLRM training wall is communication</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 470 130" className={s.labCanvas} role="img" aria-label="Sharded embedding tables and replicated MLP across GPUs">
          {Array.from({ length: shards }, (_, i) => {
            const x = 12 + i * 116
            return (
              <g key={i}>
                <rect x={x} y={14} width={104} height={100} rx={4} fill="#f7f6f1" stroke="#bbb" />
                <text x={x + 52} y={28} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#555">GPU {i}</text>
                {/* model-parallel table shard */}
                <rect x={x + 8} y={34} width={88} height={26} rx={2} fill="#dceefb" stroke="#5a8fd0" />
                <text x={x + 52} y={51} textAnchor="middle" fontSize={7.5} fill="#1a4a8a">table shard {i}</text>
                {/* data-parallel MLP replica */}
                <rect x={x + 8} y={70} width={88} height={26} rx={2} fill="#ffe9d6" stroke="#c86018" />
                <text x={x + 52} y={87} textAnchor="middle" fontSize={7.5} fill="#8a3a0a">MLP (replica)</text>
              </g>
            )
          })}
          {/* all-to-all arrows between shards */}
          {shards > 1 && <text x={235} y={124} textAnchor="middle" fontSize={8} fill="#c0392b">↔ all-to-all: route each sample's rows to its MLP GPU ↔</text>}
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>GPUs <strong>{gpus}</strong></span>
          <input type="range" min={0} max={GPU_STEPS.length - 1} step={1} value={GPU_STEPS.indexOf(gpus)} aria-label="gpus"
            className={s.slider} onChange={e => setGpus(GPU_STEPS[Number(e.target.value)])} />
        </div>
        {/* latency bars */}
        <svg viewBox="0 0 360 70" className={s.labCanvas} role="img" aria-label="Compute versus all-to-all latency">
          <rect x={90} y={10} width={Math.min(260, compute / 3)} height={18} fill="#c86018" />
          <text x={8} y={23} fontSize={8} fill="#555">compute</text>
          <text x={94 + Math.min(260, compute / 3)} y={23} fontSize={8} fill="#555">{Math.round(compute)}ms</text>
          <rect x={90} y={36} width={Math.min(260, a2a / 3)} height={18} fill="#c0392b" />
          <text x={8} y={49} fontSize={8} fill="#555">all-to-all</text>
          <text x={94 + Math.min(260, a2a / 3)} y={49} fontSize={8} fill="#555">{Math.round(a2a)}ms</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>regime <span className={s.labStatValue}>{bound}</span></span>
        </div>
        <p className={s.labNote}>
          The table is too big to replicate, so it's <strong>model-parallel sharded</strong> across GPUs
          while the small MLP is <strong>data-parallel replicated</strong>. Each step, a personalized{' '}
          <strong>all-to-all</strong> routes every sample's rows to the GPU running its MLP; MLP gradients
          sync via allreduce. Slide the GPU count: the all-to-all grows until it dwarfs compute — on a ~2 TB,
          4000+-table model at 1000 GPUs it exceeds <strong>3×</strong> the embedding compute (&gt;600 ms). The
          DLRM wall is communication, not FLOPs — the mirror image of the attention course's memory-movement
          lesson.
        </p>
      </div>
    </div>
  )
}
