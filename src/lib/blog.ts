import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  description: string
  tags?: string[]
  image?: string
  lastModified?: string
  readingTime?: number
}

function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '')
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    if (!data.title || !data.date || !data.description) return null
    return { slug, ...data, readingTime: calculateReadingTime(content) } as BlogPostMeta
  }).filter((p): p is BlogPostMeta => p !== null)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): { meta: BlogPostMeta; content: string } {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  return { meta: { slug, ...data, readingTime: calculateReadingTime(content) } as BlogPostMeta, content }
}
