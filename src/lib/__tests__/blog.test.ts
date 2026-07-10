import { describe, it, expect } from 'vitest'
import { getAllPosts, getPostBySlug } from '../blog'
import { COURSE_CATALOG } from '../courseCatalog'

describe('blog content', () => {
  it('lists both course summary posts', () => {
    const posts = getAllPosts()
    const slugs = posts.map(p => p.slug)
    expect(slugs).toContain('graph-foundation-models')
    expect(slugs).toContain('attention-everywhere')
    for (const post of posts) {
      expect(post.title.length).toBeGreaterThan(0)
      expect(post.description.length).toBeGreaterThan(0)
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('each course summary post links to its course in the courseware', () => {
    const gfm = getPostBySlug('graph-foundation-models')
    expect(gfm.content).toContain('](/learn/graph-foundation-models)')

    const attention = getPostBySlug('attention-everywhere')
    expect(attention.content).toContain('](/learn/attention-mechanisms)')
  })

  it('course links in posts point at real catalog slugs', () => {
    const validPaths = COURSE_CATALOG.map(c => `/learn/${c.slug}`)
    for (const post of getAllPosts()) {
      const { content } = getPostBySlug(post.slug)
      const learnLinks = [...content.matchAll(/\]\((\/learn\/[^)\s]+)\)/g)].map(m => m[1])
      for (const link of learnLinks) {
        expect(validPaths).toContain(link)
      }
    }
  })
})
