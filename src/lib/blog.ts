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
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '')
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data } = matter(content)
    return { slug, ...data } as BlogPostMeta
  })
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): { meta: BlogPostMeta; content: string } {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  return { meta: { slug, ...data } as BlogPostMeta, content }
}
