'use client'
import { ReactNode, useState } from 'react'
import s from './course.module.css'

export interface QuizOption {
  text: ReactNode
  correct?: boolean
  /** Shown when this option is picked: why it's right / not quite right. */
  explain: ReactNode
}

export interface QuizQuestion {
  id: string
  prompt: ReactNode
  options: QuizOption[]
}

interface QuizProps {
  questions: QuizQuestion[]
  /** questionId -> option index, for questions already answered correctly. */
  savedAnswers: Record<string, number>
  onCorrect: (questionId: string, optionIndex: number) => void
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E']

function QuestionCard({ question, number, savedIndex, onCorrect }: {
  question: QuizQuestion
  number: number
  savedIndex: number | undefined
  onCorrect: (optionIndex: number) => void
}) {
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [lastPick, setLastPick] = useState<number | null>(null)

  const correctIndex = savedIndex ?? (lastPick !== null && question.options[lastPick]?.correct ? lastPick : null)
  const solved = correctIndex !== null
  const feedbackIndex = solved ? correctIndex : lastPick

  const pick = (index: number) => {
    if (solved) return
    setLastPick(index)
    if (question.options[index].correct) {
      onCorrect(index)
    } else if (!wrongPicks.includes(index)) {
      setWrongPicks(prev => [...prev, index])
    }
  }

  return (
    <div className={s.quizQ}>
      <p className={s.quizPrompt}>
        <span className={s.quizNum}>Q{number}.</span>
        {question.prompt}
      </p>
      {question.options.map((opt, i) => {
        const isCorrectPick = solved && i === correctIndex
        const isWrongPick = wrongPicks.includes(i)
        const className = [
          s.option,
          isCorrectPick ? s.optionCorrect : '',
          isWrongPick ? s.optionWrong : '',
          solved && !isCorrectPick ? s.optionDim : '',
        ].filter(Boolean).join(' ')
        return (
          <button
            key={i}
            type="button"
            className={className}
            disabled={solved || isWrongPick}
            onClick={() => pick(i)}
          >
            <span className={s.optionKey}>{isCorrectPick ? '✓' : isWrongPick ? '✕' : OPTION_KEYS[i]}</span>
            <span>{opt.text}</span>
          </button>
        )
      })}
      {feedbackIndex !== null && (
        <div className={`${s.feedback} ${solved ? s.feedbackCorrect : s.feedbackWrong}`}>
          <span className={s.feedbackIcon}>{solved ? '✓' : '✕'}</span>
          <span>
            <strong>{solved ? 'Correct. ' : 'Not quite. '}</strong>
            {question.options[feedbackIndex].explain}
            {!solved && ' Try another answer.'}
          </span>
        </div>
      )}
    </div>
  )
}

export default function Quiz({ questions, savedAnswers, onCorrect }: QuizProps) {
  return (
    <div className={s.quiz}>
      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          number={i + 1}
          savedIndex={savedAnswers[q.id]}
          onCorrect={(idx) => onCorrect(q.id, idx)}
        />
      ))}
    </div>
  )
}
