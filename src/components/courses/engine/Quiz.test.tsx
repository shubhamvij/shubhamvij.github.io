import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Quiz, { QuizQuestion } from './Quiz'

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'What is 2 + 2?',
    options: [
      { text: 'Three', explain: 'One too few.' },
      { text: 'Four', correct: true, explain: 'Basic arithmetic.' },
      { text: 'Five', explain: 'One too many.' },
    ],
  },
]

describe('Quiz', () => {
  it('shows corrective feedback on a wrong answer and allows retrying', () => {
    const onCorrect = vi.fn()
    render(<Quiz questions={QUESTIONS} savedAnswers={{}} onCorrect={onCorrect} />)

    fireEvent.click(screen.getByRole('button', { name: /Three/ }))
    expect(screen.getByText(/Not quite/)).toBeDefined()
    expect(screen.getByText(/One too few/)).toBeDefined()
    expect(onCorrect).not.toHaveBeenCalled()

    // The wrong option is disabled; the right one is still clickable.
    expect((screen.getByRole('button', { name: /Three/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Four/ }))
    expect(screen.getByText(/Correct/)).toBeDefined()
    expect(onCorrect).toHaveBeenCalledWith('q1', 1)
  })

  it('locks the question after a correct answer', () => {
    const onCorrect = vi.fn()
    render(<Quiz questions={QUESTIONS} savedAnswers={{}} onCorrect={onCorrect} />)

    fireEvent.click(screen.getByRole('button', { name: /Four/ }))
    expect(screen.getByText(/Basic arithmetic/)).toBeDefined()

    // All options disabled once solved.
    const options = screen.getAllByRole('button')
    options.forEach(b => expect((b as HTMLButtonElement).disabled).toBe(true))
  })

  it('restores an already-solved question from savedAnswers', () => {
    render(<Quiz questions={QUESTIONS} savedAnswers={{ q1: 1 }} onCorrect={vi.fn()} />)
    expect(screen.getByText(/Correct/)).toBeDefined()
    expect(screen.getByText(/Basic arithmetic/)).toBeDefined()
  })
})
