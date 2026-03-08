import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// --- Mocks ---

// Mock useParams from next/navigation
let mockPath: string[] | undefined = undefined
vi.mock('next/navigation', () => ({
  useParams: () => ({ path: mockPath }),
}))

// Mock useMobile
vi.mock('@/lib/useMobile', () => ({
  useMobile: () => false,
}))

// Mock react-rnd
vi.mock('react-rnd', () => ({
  Rnd: (props: Record<string, unknown>) => (
    <div data-testid="rnd">
      {props.children as React.ReactNode}
    </div>
  ),
}))

// Mock child components as simple stubs
vi.mock('@/components/CRTFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="crt-frame">{children}</div>
  ),
}))

vi.mock('@/components/BootSequence', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="boot-sequence">
      <button data-testid="boot-complete" onClick={onComplete}>Complete Boot</button>
    </div>
  ),
}))

vi.mock('@/components/Desktop', () => ({
  default: ({ onOpenWindow }: { onOpenWindow: (id: string) => void }) => (
    <div data-testid="desktop">
      <button data-testid="open-blog" onClick={() => onOpenWindow('blog')}>Blog</button>
      <button data-testid="open-resume" onClick={() => onOpenWindow('resume')}>Resume</button>
      <button data-testid="open-research" onClick={() => onOpenWindow('research')}>Research</button>
      <button data-testid="open-about" onClick={() => onOpenWindow('about')}>About</button>
    </div>
  ),
}))

vi.mock('@/components/Window', () => ({
  default: ({ state, children, onClose }: { state: { id: string; title: string }; children: React.ReactNode; onClose: () => void }) => (
    <div data-testid={`window-${state.id}`} data-title={state.title}>
      <button data-testid={`close-${state.id}`} onClick={onClose}>Close</button>
      {children}
    </div>
  ),
}))

vi.mock('@/components/Taskbar', () => ({
  default: () => <div data-testid="taskbar" />,
}))

vi.mock('@/components/StartMenu', () => ({
  default: () => <div data-testid="start-menu" />,
}))

vi.mock('@/components/BlogList', () => ({
  default: ({ initialSlug }: { initialSlug: string | null }) => (
    <div data-testid="blog-list" data-slug={initialSlug ?? ''} />
  ),
}))

vi.mock('@/components/ResumeViewer', () => ({
  default: () => <div data-testid="resume-viewer" />,
}))

vi.mock('@/components/ScholarFeed', () => ({
  default: () => <div data-testid="scholar-feed" />,
}))

vi.mock('@/components/AboutContent', () => ({
  default: () => <div data-testid="about-content" />,
}))

// Spy on pushState and replaceState
let pushStateSpy: ReturnType<typeof vi.fn>
let replaceStateSpy: ReturnType<typeof vi.fn>

import HomeClient from '../[[...path]]/HomeClient'

describe('Navigation', () => {
  beforeEach(() => {
    mockPath = undefined
    pushStateSpy = vi.fn()
    replaceStateSpy = vi.fn()
    window.history.pushState = pushStateSpy
    window.history.replaceState = replaceStateSpy
  })

  describe('path parsing', () => {
    it('shows boot sequence when no path is provided', () => {
      mockPath = undefined
      const { getByTestId, queryByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      expect(getByTestId('boot-sequence')).toBeInTheDocument()
      expect(queryByTestId('desktop')).not.toBeInTheDocument()
    })

    it('skips boot and opens blog window for /blog', () => {
      mockPath = ['blog']
      const { queryByTestId, getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      expect(queryByTestId('boot-sequence')).not.toBeInTheDocument()
      expect(getByTestId('desktop')).toBeInTheDocument()
      expect(getByTestId('window-blog')).toBeInTheDocument()
    })

    it('skips boot and opens resume window for /resume', () => {
      mockPath = ['resume']
      const { queryByTestId, getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      expect(queryByTestId('boot-sequence')).not.toBeInTheDocument()
      expect(getByTestId('window-resume')).toBeInTheDocument()
    })

    it('skips boot and opens research window for /research', () => {
      mockPath = ['research']
      const { queryByTestId, getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      expect(queryByTestId('boot-sequence')).not.toBeInTheDocument()
      expect(getByTestId('window-research')).toBeInTheDocument()
    })

    it('passes slug to blog window for /blog/hello-world', () => {
      mockPath = ['blog', 'hello-world']
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      expect(getByTestId('window-blog')).toBeInTheDocument()
      const blogList = getByTestId('blog-list')
      expect(blogList.getAttribute('data-slug')).toBe('hello-world')
    })
  })

  describe('URL sync on window open', () => {
    it('calls pushState with /blog when blog is opened via Desktop', async () => {
      mockPath = undefined
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      // Complete boot first
      await act(async () => {
        fireEvent.click(getByTestId('boot-complete'))
      })
      await act(async () => {
        fireEvent.click(getByTestId('open-blog'))
      })
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/blog')
    })

    it('calls pushState with /resume when resume is opened', async () => {
      mockPath = undefined
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      await act(async () => {
        fireEvent.click(getByTestId('boot-complete'))
      })
      await act(async () => {
        fireEvent.click(getByTestId('open-resume'))
      })
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/resume')
    })

    it('calls pushState with /research when research is opened', async () => {
      mockPath = undefined
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      await act(async () => {
        fireEvent.click(getByTestId('boot-complete'))
      })
      await act(async () => {
        fireEvent.click(getByTestId('open-research'))
      })
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/research')
    })
  })

  describe('URL sync on window close', () => {
    it('calls pushState with / when the only routable window is closed', async () => {
      mockPath = ['blog']
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      await act(async () => {
        fireEvent.click(getByTestId('close-blog'))
      })
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/')
    })
  })

  describe('multi-window support', () => {
    it('keeps first window open when a second window is opened', async () => {
      mockPath = undefined
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      await act(async () => {
        fireEvent.click(getByTestId('boot-complete'))
      })
      await act(async () => {
        fireEvent.click(getByTestId('open-resume'))
      })
      expect(getByTestId('window-resume')).toBeInTheDocument()
      await act(async () => {
        fireEvent.click(getByTestId('open-blog'))
      })
      expect(getByTestId('window-blog')).toBeInTheDocument()
      expect(getByTestId('window-resume')).toBeInTheDocument()
    })
  })

  describe('non-routable windows', () => {
    it('does not call pushState when about window is opened', async () => {
      mockPath = undefined
      const { getByTestId } = render(<HomeClient socialLinks={[]} defaultScreenSaver="pipes" defaultIdleTimeout={30} />)
      await act(async () => {
        fireEvent.click(getByTestId('boot-complete'))
      })
      pushStateSpy.mockClear()
      await act(async () => {
        fireEvent.click(getByTestId('open-about'))
      })
      expect(pushStateSpy).not.toHaveBeenCalled()
    })
  })
})
