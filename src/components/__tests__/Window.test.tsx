import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Window from '../Window'
import type { WindowState } from '@/lib/useWindowManager'

// Mock useMobile
let mockIsMobile = false
vi.mock('@/lib/useMobile', () => ({
  useMobile: () => mockIsMobile,
}))

// Mock react-rnd to capture props
vi.mock('react-rnd', () => ({
  Rnd: (props: Record<string, unknown>) => (
    <div
      data-testid="rnd"
      data-size={JSON.stringify(props.size)}
      data-position={JSON.stringify(props.position)}
      style={props.style as React.CSSProperties}
    >
      {props.children as React.ReactNode}
    </div>
  ),
}))

function makeWindow(overrides: Partial<WindowState> = {}): WindowState {
  return {
    id: 'test',
    title: 'Test Window',
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    defaultPosition: { x: 50, y: 30 },
    defaultSize: { width: 500, height: 350 },
    position: { x: 50, y: 30 },
    size: { width: 500, height: 350 },
    ...overrides,
  }
}

const noop = () => {}

describe('Window', () => {
  let onClose: ReturnType<typeof vi.fn>
  let onFocus: ReturnType<typeof vi.fn>
  let onMinimize: ReturnType<typeof vi.fn>
  let onToggleMaximize: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockIsMobile = false
    onClose = vi.fn()
    onFocus = vi.fn()
    onMinimize = vi.fn()
    onToggleMaximize = vi.fn()
  })

  function renderWindow(stateOverrides: Partial<WindowState> = {}) {
    return render(
      <Window
        state={makeWindow(stateOverrides)}
        onClose={onClose}
        onFocus={onFocus}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
        onUpdateGeometry={noop}
      >
        <div>Content</div>
      </Window>
    )
  }

  describe('maximize (desktop)', () => {
    it('passes 100% width and height to Rnd when maximized', () => {
      const { getByTestId } = renderWindow({ isMaximized: true })
      const rnd = getByTestId('rnd')
      const size = JSON.parse(rnd.getAttribute('data-size')!)
      expect(size).toEqual({ width: '100%', height: '100%' })
    })

    it('wrapper div has full width and height for maximize to work', () => {
      const { getByTestId } = renderWindow({ isMaximized: true })
      const wrapper = getByTestId('rnd').parentElement!
      expect(wrapper.style.width).toBe('100%')
      expect(wrapper.style.height).toBe('100%')
    })

    it('passes actual size to Rnd when not maximized', () => {
      const { getByTestId } = renderWindow({ isMaximized: false })
      const rnd = getByTestId('rnd')
      const size = JSON.parse(rnd.getAttribute('data-size')!)
      expect(size).toEqual({ width: 500, height: 350 })
    })
  })

  describe('minimize button (desktop)', () => {
    it('calls onMinimize when minimize button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('_'))
      expect(onMinimize).toHaveBeenCalledTimes(1)
    })

    it('does not call onFocus when minimize button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('_'))
      expect(onFocus).not.toHaveBeenCalled()
    })
  })

  describe('close button (desktop)', () => {
    it('calls onClose when close button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('×'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onFocus when close button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('×'))
      expect(onFocus).not.toHaveBeenCalled()
    })
  })

  describe('minimize button (mobile)', () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it('calls onMinimize when minimize button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('_'))
      expect(onMinimize).toHaveBeenCalledTimes(1)
    })

    it('does not call onFocus when minimize button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('_'))
      expect(onFocus).not.toHaveBeenCalled()
    })
  })

  describe('close button (mobile)', () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it('calls onClose when close button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('×'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onFocus when close button is clicked', () => {
      const { getByText } = renderWindow()
      fireEvent.click(getByText('×'))
      expect(onFocus).not.toHaveBeenCalled()
    })
  })

  describe('mobile has pointer events', () => {
    it('mobile window wrapper has pointerEvents auto', () => {
      mockIsMobile = true
      const { container } = renderWindow()
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper.style.pointerEvents).toBe('auto')
    })
  })
})
