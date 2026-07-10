import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BlogList from '../BlogList'
import { invalidateGuideProgressCache } from '../gfm/progress'

const POSTS = [
  { slug: 'hello-world', title: 'Hello World', date: '2026-03-06', description: 'Welcome.' },
  {
    slug: 'graph-foundation-models',
    title: 'Graph Foundation Models: An Interactive Study Guide',
    date: '2026-07-09',
    description: 'Interactive GFM course.',
    interactive: 'gfm-study-guide',
  },
]

const POST_BODIES: Record<string, unknown> = {
  'hello-world': { meta: POSTS[0], content: '# Hello World\n\nSome markdown body.' },
  'graph-foundation-models': { meta: POSTS[1], content: '# Static fallback outline' },
}

beforeEach(() => {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    },
  })
  invalidateGuideProgressCache()
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/data/blog.json') {
      return Promise.resolve({ json: () => Promise.resolve(POSTS) })
    }
    const slug = url.match(/\/data\/blog\/(.+)\.json$/)?.[1]
    return Promise.resolve({ json: () => Promise.resolve(POST_BODIES[slug!]) })
  }))
})

describe('BlogList interactive posts', () => {
  it('renders a regular post as markdown', async () => {
    render(<BlogList />)
    fireEvent.click(await screen.findByText('Hello World'))
    expect(await screen.findByText(/Some markdown body/)).toBeDefined()
    expect(screen.getByText(/Back to posts/)).toBeDefined()
  })

  it('renders the flagged post as the interactive study guide', async () => {
    render(<BlogList />)
    fireEvent.click(await screen.findByText(/Graph Foundation Models: An Interactive/))
    // The interactive shell takes over: guide heading instead of the markdown fallback.
    expect(await screen.findByRole('heading', { name: 'Graphs are everywhere' })).toBeDefined()
    expect(screen.queryByText(/Static fallback outline/)).toBeNull()
  })

  it('returns to the list via the guide toolbar', async () => {
    const onNavigate = vi.fn()
    render(<BlogList onNavigate={onNavigate} />)
    fireEvent.click(await screen.findByText(/Graph Foundation Models: An Interactive/))
    fireEvent.click(await screen.findByRole('button', { name: /All posts/ }))
    expect(await screen.findByText('Blog Posts')).toBeDefined()
    expect(onNavigate).toHaveBeenLastCalledWith(null)
  })
})
