import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BlogList from '../BlogList'

const POSTS = [
  { slug: 'hello-world', title: 'Hello World', date: '2026-03-06', description: 'Welcome.' },
  {
    slug: 'graph-foundation-models',
    title: 'Graph Foundation Models, in Seven Ideas',
    date: '2026-07-09',
    description: 'Summary of the interactive GFM course.',
  },
]

const POST_BODIES: Record<string, unknown> = {
  'hello-world': { meta: POSTS[0], content: '# Hello World\n\nSome markdown body.' },
  'graph-foundation-models': {
    meta: POSTS[1],
    content: 'Launch [the course](/learn/graph-foundation-models) or read [the paper](https://arxiv.org/abs/2602.04768).',
  },
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/data/blog.json') {
      return Promise.resolve({ json: () => Promise.resolve(POSTS) })
    }
    const slug = url.match(/\/data\/blog\/(.+)\.json$/)?.[1]
    return Promise.resolve({ json: () => Promise.resolve(POST_BODIES[slug!]) })
  }))
})

describe('BlogList', () => {
  it('renders a post as markdown', async () => {
    render(<BlogList />)
    fireEvent.click(await screen.findByText('Hello World'))
    expect(await screen.findByText(/Some markdown body/)).toBeDefined()
    expect(screen.getByText(/Back to posts/)).toBeDefined()
  })

  it('renders markdown links: internal in the same tab, external in a new tab', async () => {
    render(<BlogList />)
    fireEvent.click(await screen.findByText(/Graph Foundation Models, in Seven Ideas/))

    const internal = await screen.findByRole('link', { name: 'the course' })
    expect(internal.getAttribute('href')).toBe('/learn/graph-foundation-models')
    expect(internal.getAttribute('target')).toBeNull()

    const external = screen.getByRole('link', { name: 'the paper' })
    expect(external.getAttribute('href')).toBe('https://arxiv.org/abs/2602.04768')
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('routes internal link clicks through onInternalNavigate without a page load', async () => {
    const onInternalNavigate = vi.fn()
    render(<BlogList onInternalNavigate={onInternalNavigate} />)
    fireEvent.click(await screen.findByText(/Graph Foundation Models, in Seven Ideas/))

    const internal = await screen.findByRole('link', { name: 'the course' })
    const clicked = fireEvent.click(internal)
    expect(onInternalNavigate).toHaveBeenCalledWith('/learn/graph-foundation-models')
    expect(clicked).toBe(false) // default prevented — no browser navigation

    // External links keep their default behavior.
    const external = screen.getByRole('link', { name: 'the paper' })
    fireEvent.click(external)
    expect(onInternalNavigate).toHaveBeenCalledTimes(1)
  })
})
