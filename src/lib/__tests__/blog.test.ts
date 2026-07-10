import { describe, it, expect } from 'vitest'
import { getAllPosts, getPostBySlug } from '../blog'

describe('blog content', () => {
  it('lists the GFM study guide with its interactive flag', () => {
    const posts = getAllPosts()
    const guide = posts.find(p => p.slug === 'graph-foundation-models')
    expect(guide).toBeDefined()
    expect(guide!.interactive).toBe('gfm-study-guide')
    expect(guide!.title).toContain('Graph Foundation Models')
    expect(guide!.description.length).toBeGreaterThan(0)
    expect(guide!.date).toBe('2026-07-09')
  })

  it('round-trips the interactive flag through getPostBySlug', () => {
    const post = getPostBySlug('graph-foundation-models')
    expect(post.meta.interactive).toBe('gfm-study-guide')
    expect(post.content).toContain('Module 1')
  })

  it('leaves regular posts without an interactive flag', () => {
    const post = getPostBySlug('hello-world')
    expect(post.meta.interactive).toBeUndefined()
  })
})
