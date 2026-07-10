'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type Level = 'node' | 'edge' | 'graph'

const SCENARIOS: { prompt: string; answer: Level; why: string }[] = [
  { prompt: 'Is this molecule toxic?', answer: 'graph', why: 'toxicity is a property of the whole molecule — one label per graph.' },
  { prompt: 'Is this social-media account a bot?', answer: 'node', why: 'each account is a node; you label nodes one by one.' },
  { prompt: 'Will this user click this ad?', answer: 'edge', why: 'you\'re predicting whether a user–ad connection exists — link prediction.' },
  { prompt: 'Which subject area does a new arXiv paper belong to?', answer: 'node', why: 'papers are nodes in the citation graph; the class is per-paper.' },
  { prompt: 'Do these two drugs interact dangerously?', answer: 'edge', why: 'the question is about a pair of nodes — an edge-level prediction.' },
  { prompt: 'How fast will this neural network\'s computation graph run on a TPU?', answer: 'graph', why: 'runtime is a property of the entire computation graph (this is the TpuGraphs task).' },
]

const LEVELS: { id: Level; label: string }[] = [
  { id: 'node', label: 'Node' },
  { id: 'edge', label: 'Edge' },
  { id: 'graph', label: 'Graph' },
]

export default function TaskMatcher() {
  const [solved, setSolved] = useState<Record<number, boolean>>({})
  const [wrong, setWrong] = useState<Record<number, Level[]>>({})

  const pick = (i: number, level: Level) => {
    if (solved[i]) return
    if (SCENARIOS[i].answer === level) {
      setSolved(prev => ({ ...prev, [i]: true }))
    } else {
      setWrong(prev => ({ ...prev, [i]: [...(prev[i] ?? []), level] }))
    }
  }

  const solvedCount = Object.keys(solved).length

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Task Matcher</span>
        <span className={s.widgetHint}>{solvedCount}/{SCENARIOS.length} matched</span>
      </div>
      <div className={s.widgetBody}>
        {SCENARIOS.map((sc, i) => (
          <div key={i} className={s.matchRow}>
            <span className={s.matchState}>
              {solved[i] ? <span className={s.matchStateOk}>✓</span> : (wrong[i]?.length ? <span className={s.matchStateNo}>✕</span> : '·')}
            </span>
            <span className={s.matchPrompt}>
              {sc.prompt}
              {solved[i] && <span style={{ color: '#666' }}> — {sc.why}</span>}
            </span>
            <span className={s.matchBtns}>
              {LEVELS.map(l => {
                const isAnswer = solved[i] && l.id === sc.answer
                const wasWrong = (wrong[i] ?? []).includes(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`${s.btn} ${isAnswer ? s.btnPrimary : ''}`}
                    style={wasWrong ? { color: '#a04030', textDecoration: 'line-through' } : undefined}
                    disabled={solved[i] || wasWrong}
                    onClick={() => pick(i, l.id)}
                  >
                    {l.label}
                  </button>
                )
              })}
            </span>
          </div>
        ))}
        <p className={s.labNote}>
          Node-, edge-, and graph-level tasks want different inductive biases (and even different pooling and
          training objectives) — that&apos;s <strong>task heterogeneity</strong>, the third axis a general GFM has to
          bridge. One trick you&apos;ll see repeatedly: reformulating everything as one task, e.g. classification
          as link prediction to a &quot;label node&quot;.
        </p>
      </div>
    </div>
  )
}
