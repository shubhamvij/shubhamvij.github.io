import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Taskbar from '../Taskbar'
import { isMuted, setMuted } from '@/lib/sounds'

function renderTaskbar() {
  return render(
    <Taskbar windows={[]} onStartClick={() => {}} onWindowClick={() => {}} startMenuOpen={false} />
  )
}

describe('Taskbar sound tray', () => {
  beforeEach(() => {
    setMuted(false)
  })

  it('shows a speaker toggle that mutes and unmutes sounds', () => {
    renderTaskbar()
    const toggle = screen.getByRole('button', { name: 'Mute sounds' })

    fireEvent.click(toggle)
    expect(isMuted()).toBe(true)
    expect(screen.getByRole('button', { name: 'Unmute sounds' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Unmute sounds' }))
    expect(isMuted()).toBe(false)
    expect(screen.getByRole('button', { name: 'Mute sounds' })).toBeDefined()
  })

  it('starts in the muted state when mute was previously persisted', () => {
    setMuted(true)
    renderTaskbar()
    expect(screen.getByRole('button', { name: 'Unmute sounds' })).toBeDefined()
  })
})
