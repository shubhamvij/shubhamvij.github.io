import fs from 'fs'
import path from 'path'
import { getAllPosts, getPostBySlug } from '../src/lib/blog'
import { fetchScholarData } from '../src/lib/scholar'

const PUBLIC_DATA = path.join(process.cwd(), 'public', 'data')
const BLOG_DATA = path.join(PUBLIC_DATA, 'blog')

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  ensureDir(BLOG_DATA)

  // Blog posts
  const posts = getAllPosts()
  fs.writeFileSync(path.join(PUBLIC_DATA, 'blog.json'), JSON.stringify(posts, null, 2))
  for (const post of posts) {
    const full = getPostBySlug(post.slug)
    fs.writeFileSync(path.join(BLOG_DATA, `${post.slug}.json`), JSON.stringify(full, null, 2))
  }
  console.log(`[prebuild] Generated ${posts.length} blog posts`)

  // About
  const aboutPath = path.join(process.cwd(), 'content', 'about_me.md')
  const aboutContent = fs.readFileSync(aboutPath, 'utf-8')
  fs.writeFileSync(path.join(PUBLIC_DATA, 'about.json'), JSON.stringify({ content: aboutContent }))
  console.log('[prebuild] Generated about.json')

  // Scholar
  try {
    const publications = await fetchScholarData()
    fs.writeFileSync(path.join(PUBLIC_DATA, 'scholar.json'), JSON.stringify(publications, null, 2))
    console.log(`[prebuild] Generated ${publications.length} scholar publications`)
  } catch (err) {
    console.warn('[prebuild] Warning: Scholar scraping failed, writing empty array:', (err as Error).message)
    fs.writeFileSync(path.join(PUBLIC_DATA, 'scholar.json'), '[]')
  }

  // Resume PDF
  const resumeSrc = path.join(process.cwd(), 'content', 'resume', 'resume.pdf')
  const resumeDest = path.join(process.cwd(), 'public', 'resume.pdf')
  fs.copyFileSync(resumeSrc, resumeDest)
  console.log('[prebuild] Copied resume.pdf')
}

main().catch(err => {
  console.error('[prebuild] Fatal error:', err)
  process.exit(1)
})
