'use client'
import { ReactNode, useState } from 'react'
import s from '../engine/course.module.css'

// Toy scale for the drawn readouts — mirrors HeadShareLab's world (8 heads, d_head 64).
const N_H = 8
const D_HEAD = 64
const D_C = 4 * D_HEAD          // 256 — latent width (DeepSeek-V2 uses 512 at d_head=128)
const D_R = D_HEAD / 2          // 32  — decoupled RoPE key width (DeepSeek-V2 uses 64)
const MHA_CACHE = 2 * N_H * D_HEAD  // 1024
const MLA_CACHE = D_C + D_R          // 288

// DeepSeek-V2 real-scale anchors (verified against arXiv 2405.04434 §2.1 in Task 1).
const DS_MLA = 512 + 64              // 576
const DS_MHA = 2 * 128 * 128         // 32768

const ACTS = ['① compress', '② absorb', '③ RoPE breaks it', '④ decouple'] as const
type Act = typeof ACTS[number]

// ---------- Act ① — compress & cache (static) ----------
function PathDiagram() {
  return (
    <>
      <svg viewBox="0 0 480 168" className={s.labCanvas} role="img" aria-label="MLA data path: hidden state down-projected to a latent, then up-projected to per-head keys and values">
        <rect x={6} y={64} width={54} height={30} rx={3} fill="#cfe0f5" stroke="#2b6fd0" />
        <text x={33} y={83} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif">h_t</text>
        <text x={70} y={82} fontSize={12} fill="#999">→</text>
        <text x={86} y={58} fontSize={9} fill="#666">W_DKV</text>
        <rect x={84} y={64} width={40} height={30} rx={3} fill="#eef" stroke="#8898a8" strokeDasharray="3 2" />
        <text x={104} y={83} textAnchor="middle" fontSize={9}>↓ d_c</text>
        <text x={130} y={82} fontSize={12} fill="#999">→</text>
        <rect x={146} y={58} width={96} height={42} rx={4} fill="#f6ecd8" stroke="#b8860b" strokeWidth={2} />
        <text x={194} y={76} textAnchor="middle" fontSize={12} fontWeight="bold" fontFamily="Tahoma, sans-serif">latent cₜ</text>
        <text x={194} y={92} textAnchor="middle" fontSize={9} fill="#7a5c0a">d_c = {D_C} — cached</text>
        <text x={250} y={82} fontSize={12} fill="#999">→</text>
        <text x={286} y={42} fontSize={9} fill="#666">W_UK</text>
        <text x={286} y={126} fontSize={9} fill="#666">W_UV</text>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`k${i}`} x={320 + i * 6} y={30 - i} width={80} height={20} rx={2} fill="#e3f6e3" stroke="#6a9a6a" strokeDasharray="3 2" opacity={0.5 + 0.12 * i} />
        ))}
        <text x={360} y={44} textAnchor="middle" fontSize={9}>kᶜ per head</text>
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`v${i}`} x={320 + i * 6} y={116 - i} width={80} height={20} rx={2} fill="#e3f6e3" stroke="#6a9a6a" strokeDasharray="3 2" opacity={0.5 + 0.12 * i} />
        ))}
        <text x={360} y={130} textAnchor="middle" fontSize={9}>vᶜ per head</text>
        <line x1={242} y1={70} x2={318} y2={44} stroke="#6a9a6a" strokeWidth={1} strokeDasharray="3 2" />
        <line x1={242} y1={88} x2={318} y2={120} stroke="#6a9a6a" strokeWidth={1} strokeDasharray="3 2" />
        <text x={360} y={158} textAnchor="middle" fontSize={8.5} fill="#888">dashed = rebuilt each step, never stored</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.labStat}>cached so far <span className={s.labStatValue}>d_c = {D_C} values</span></span>
        <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((D_C / MHA_CACHE) * 100)}%</span></span>
      </div>
      <p className={s.labNote}>
        MLA caches <strong>one low-rank latent cₜ</strong> per token — not keys, not values. The per-head keys
        and values are <strong>up-projected from cₜ on the fly</strong> (W_UK, W_UV) and discarded after the
        step. Storing {D_C} numbers instead of {MHA_CACHE} is the whole memory win — and the next act shows the
        per-head keys never even need to be built.
      </p>
    </>
  )
}

// ---------- Act ② — the absorption trick (one toggle) ----------
function AbsorbPanel() {
  const [absorbed, setAbsorbed] = useState(false)
  return (
    <>
      <div className={s.chipRow}>
        <button type="button" className={`${s.chip} ${!absorbed ? s.chipOn : ''}`} onClick={() => setAbsorbed(false)}>naïve</button>
        <button type="button" className={`${s.chip} ${absorbed ? s.chipOn : ''}`} onClick={() => setAbsorbed(true)}>absorbed</button>
      </div>
      <svg viewBox="0 0 480 150" className={s.labCanvas} role="img" aria-label={absorbed ? 'Absorbed: the two up-projection matrices fold into one precomputed matrix acting on the latent' : 'Naive: per-head content keys are built from the latent, then dotted with the query'}>
        {!absorbed ? (
          <>
            <text x={240} y={26} textAnchor="middle" fontSize={11} fill="#555">build the per-head content key, then score:</text>
            <rect x={40} y={44} width={150} height={30} rx={3} fill="#cfe0f5" stroke="#2b6fd0" />
            <text x={115} y={63} textAnchor="middle" fontSize={11}>qᶜ = W_UQ · c_q</text>
            <rect x={290} y={44} width={150} height={30} rx={3} fill="#e3f6e3" stroke="#6a9a6a" />
            <text x={365} y={63} textAnchor="middle" fontSize={11}>kᶜ = W_UK · c_kv</text>
            <text x={240} y={104} textAnchor="middle" fontSize={13} fontWeight="bold">score = qᶜ · kᶜ</text>
            <text x={240} y={128} textAnchor="middle" fontSize={9} fill="#a33">two up-projections per token, every step</text>
          </>
        ) : (
          <>
            <text x={240} y={26} textAnchor="middle" fontSize={11} fill="#555">fold the up-projections together — one fixed matrix:</text>
            <text x={240} y={62} textAnchor="middle" fontSize={13} fontWeight="bold">score = c_qᵀ · (W_UQᵀ W_UK) · c_kv</text>
            <rect x={150} y={76} width={180} height={30} rx={4} fill="#f6ecd8" stroke="#b8860b" strokeWidth={2} />
            <text x={240} y={95} textAnchor="middle" fontSize={11} fontWeight="bold">W_UQᵀ W_UK — precomputed once</text>
            <text x={240} y={130} textAnchor="middle" fontSize={9} fill="#2f7a2f">attention runs on the cached latent — kᶜ never built</text>
          </>
        )}
      </svg>
      <p className={s.labNote}>
        Because kᶜ = W_UK·c_kv and qᶜ = W_UQ·c_q, the content score qᶜ·kᶜ = c_qᵀ(W_UQᵀ W_UK)c_kv. The middle
        matrix <strong>W_UQᵀ W_UK is constant</strong>, so it is precomputed once and attention operates{' '}
        <strong>directly on the latent cₜ</strong> — the per-head keys of Act ① are never materialized at
        inference. (Symmetrically, W_UV folds into the output projection W_O.) This is why MLA is cheap to{' '}
        <em>run</em>, not merely cheap to <em>store</em>.
      </p>
    </>
  )
}

// ---------- Act ③ — RoPE breaks absorption (one slider; centerpiece) ----------
const THETA0 = 0.19 // radians/unit; ≤ π/16 keeps |sin| monotonic across the ±8 range so the gap widens with |Δ| everywhere
// A fixed shear stands in for the projection W_UQᵀ(…)W_UK: rotation plainly does not commute with it.
const shear = ([x, y]: [number, number]): [number, number] => [x + 0.55 * y, y]
const rot = (a: number, [x, y]: [number, number]): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

function RopeBreakPanel() {
  const [delta, setDelta] = useState(4)
  const a = delta * THETA0
  const v: [number, number] = [0.82, 0.44]
  const pathA = shear(rot(a, v)) // rotate-then-map: position lives INSIDE the projection
  const pathB = rot(a, shear(v)) // map-then-rotate: position OUTSIDE the projection
  const gap = Math.hypot(pathA[0] - pathB[0], pathA[1] - pathB[1])
  const cx = 118, cy = 100, R = 66
  const pt = ([x, y]: [number, number]): [number, number] => [cx + R * x, cy - R * y]
  const arrow = (p: [number, number], color: string, label: string) => {
    const [px, py] = pt(p)
    return (
      <g>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={2.5} />
        <circle cx={px} cy={py} r={3.5} fill={color} />
        <text x={px + (px >= cx ? 6 : -6)} y={py + (py < cy ? -3 : 12)} textAnchor={px >= cx ? 'start' : 'end'} fontSize={9.5} fontWeight="bold" fill={color}>{label}</text>
      </g>
    )
  }
  return (
    <>
      <svg viewBox="0 0 480 200" className={s.labCanvas} role="img" aria-label="Rotate-then-map versus map-then-rotate diverge as the relative position grows, because rotation does not commute with the projection matrix">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#c9c4b4" strokeDasharray="3 3" />
        <line x1={cx - R - 8} y1={cy} x2={cx + R + 8} y2={cy} stroke="#ddd" />
        <line x1={cx} y1={cy - R - 8} x2={cx} y2={cy + R + 8} stroke="#ddd" />
        {arrow(pathB, '#c86018', 'map, then rotate')}
        {arrow(pathA, '#2b6fd0', 'rotate, then map')}
        <text x={244} y={40} fontSize={11} fontFamily="Tahoma, sans-serif">content score with RoPE:</text>
        <text x={244} y={63} fontSize={12} fontWeight="bold">c_qᵀ (W_UQᵀ R_Δ W_UK) c_kv</text>
        <rect x={244} y={73} width={196} height={22} rx={3} fill={delta === 0 ? '#e3f6e3' : '#fbe4d4'} stroke={delta === 0 ? '#6a9a6a' : '#c86018'} />
        <text x={342} y={88} textAnchor="middle" fontSize={9.5} fill="#333">W_UQᵀ R_Δ W_UK {delta === 0 ? '= fixed matrix ✓' : '— changes with Δ ✗'}</text>
        <text x={244} y={118} fontSize={10} fill="#555">Δ = n − m = {delta}</text>
        <text x={244} y={138} fontSize={10} fill="#555">gap between the two paths: <tspan fontWeight="bold" fill={gap < 0.01 ? '#2f7a2f' : '#a33'}>{gap.toFixed(2)}</tspan></text>
        <text x={244} y={170} fontSize={9} fill="#666">{delta === 0
          ? 'at Δ=0 the rotation is identity — the matrix is fixed and absorbable'
          : 'position sits inside the matrix — nothing to precompute'}</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>relative position Δ = n − m</span>
        <input type="range" min={-8} max={8} step={1} value={delta} onChange={e => setDelta(Number(e.target.value))} className={s.slider} aria-label="relative position offset delta" />
        <span className={s.labStat}>Δ = {delta}</span>
      </div>
      <p className={s.labNote}>
        RoPE rotates each key/query by an angle proportional to its position, dropping a{' '}
        <strong>position-dependent rotation R_Δ between W_UQᵀ and W_UK</strong>. Rotation does not commute with
        the projection, so <strong>rotate-then-map ≠ map-then-rotate</strong> for any Δ ≠ 0 — drag the slider and
        the two arrows split, the gap widening as Δ moves away from 0. The absorbed matrix that made Act ② cheap is now a{' '}
        <em>different</em> matrix for every query–key distance, so there is nothing to precompute. At Δ = 0 they
        coincide — the escape hatch the next act uses.
      </p>
    </>
  )
}

// ---------- Act ④ — the decoupled-key fix (static) ----------
function DecouplePanel() {
  const contentW = (D_C / MLA_CACHE) * 300
  const rotaryW = (D_R / MLA_CACHE) * 300
  return (
    <>
      <svg viewBox="0 0 480 176" className={s.labCanvas} role="img" aria-label="Two-lane key: a position-free content lane up-projected from the latent, plus a small shared decoupled rotary key carrying position">
        <rect x={8} y={20} width={230} height={58} rx={4} fill="#eaf1fb" stroke="#2b6fd0" />
        <text x={123} y={38} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#1a4f9c">content lane — position-free</text>
        <text x={123} y={55} textAnchor="middle" fontSize={9.5}>kᶜ = W_UK · cₜ  (up-projected from latent)</text>
        <text x={123} y={70} textAnchor="middle" fontSize={8.5} fill="#2f7a2f">absorbable — Act ②&apos;s trick still works</text>
        <rect x={250} y={20} width={222} height={58} rx={4} fill="#fbe4d4" stroke="#c86018" />
        <text x={361} y={38} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#9a4a12">rotary lane — carries position</text>
        <text x={361} y={55} textAnchor="middle" fontSize={9.5}>kᴿ = RoPE(W_KR · h_t),  shared</text>
        <text x={361} y={70} textAnchor="middle" fontSize={8.5} fill="#9a4a12">small: d_R = {D_R}, one per token (not per head)</text>
        <text x={240} y={104} textAnchor="middle" fontSize={12} fontWeight="bold">score = qᶜ·kᶜ  +  qᴿ·kᴿ</text>
        <text x={240} y={123} textAnchor="middle" fontSize={9} fill="#666">absorbable content term  +  cheap positional term</text>
        <rect x={90} y={138} width={contentW} height={16} fill="#f6ecd8" stroke="#b8860b" />
        <rect x={90 + contentW} y={138} width={rotaryW} height={16} fill="#fbe4d4" stroke="#c86018" />
        <text x={240} y={170} textAnchor="middle" fontSize={9} fill="#666">cache = d_c + d_R = {D_C} + {D_R} = {MLA_CACHE} values / token / layer</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.labStat}>MLA cache <span className={s.labStatValue}>{MLA_CACHE} values</span></span>
        <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((MLA_CACHE / MHA_CACHE) * 100)}%</span></span>
        <span className={s.labStat}>DeepSeek-V2 scale <span className={s.labStatValue}>{DS_MLA} vs {DS_MHA}</span></span>
      </div>
      <p className={s.labNote}>
        The fix: <strong>split the key into two lanes</strong>. The content lane stays position-free, so its
        matrix is still the fixed, absorbable one from Act ②. Position rides a separate <strong>decoupled rotary
        key kᴿ</strong> — RoPE-rotated, <strong>shared across all heads</strong>, and tiny (d_R = {D_R}). The
        score is their sum. Total cache is d_c + d_R = {MLA_CACHE} values — at DeepSeek-V2&apos;s real scale {DS_MLA}{' '}
        vs MHA&apos;s {DS_MHA} ({((DS_MLA / DS_MHA) * 100).toFixed(1)}%): GQA-class memory, MHA-class quality, RoPE
        intact.
      </p>
    </>
  )
}

export default function MlaLab() {
  const [act, setAct] = useState<Act>(ACTS[0])
  const panel: Record<Act, ReactNode> = {
    '① compress': <PathDiagram />,
    '② absorb': <AbsorbPanel />,
    '③ RoPE breaks it': <RopeBreakPanel />,
    '④ decouple': <DecouplePanel />,
  }
  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>MLA Lab</span>
        <span className={s.widgetHint}>compress the cache · absorb the projections · decouple the rotation</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {ACTS.map(name => (
            <button key={name} type="button" className={`${s.chip} ${act === name ? s.chipOn : ''}`} onClick={() => setAct(name)}>
              {name}
            </button>
          ))}
        </div>
        {panel[act]}
      </div>
    </div>
  )
}
