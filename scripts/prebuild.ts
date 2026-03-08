import fs from 'fs'
import path from 'path'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getAllPosts, getPostBySlug } from '../src/lib/blog'
import { getScholarPublications } from '../src/lib/scholar'

const PUBLIC_DATA = path.join(process.cwd(), 'public', 'data')
const BLOG_DATA = path.join(PUBLIC_DATA, 'blog')
const BASE_URL = 'https://shubhamvij.com'

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function generateSitemap() {
  const posts = getAllPosts()
  const today = new Date().toISOString().split('T')[0]

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/blog/', priority: '0.8', changefreq: 'weekly' },
    { url: '/resume/', priority: '0.6', changefreq: 'monthly' },
    { url: '/research/', priority: '0.7', changefreq: 'monthly' },
    { url: '/about/', priority: '0.6', changefreq: 'monthly' },
  ]

  const blogPages = posts.map(p => ({
    url: `/blog/${p.slug}/`,
    priority: '0.7',
    changefreq: 'yearly' as const,
    lastmod: p.lastModified || p.date,
  }))

  const entries = [...staticPages, ...blogPages]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${BASE_URL}${e.url}</loc>
    <lastmod>${('lastmod' in e ? e.lastmod : today)}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), xml)
  console.log(`[prebuild] Generated sitemap.xml with ${entries.length} URLs`)
}

function generateRSSFeed() {
  const posts = getAllPosts()

  const items = posts.map(p => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${BASE_URL}/blog/${p.slug}/</link>
      <guid>${BASE_URL}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description><![CDATA[${p.description}]]></description>
    </item>`).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shubham Vij - Blog</title>
    <link>${BASE_URL}/blog/</link>
    <description>Articles on software engineering, AI, machine learning, and research.</description>
    <language>en-us</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  fs.writeFileSync(path.join(process.cwd(), 'public', 'feed.xml'), rss)
  console.log(`[prebuild] Generated feed.xml with ${posts.length} items`)
}

async function generateOGImages() {
  const posts = getAllPosts()
  const ogDir = path.join(process.cwd(), 'public', 'images', 'og', 'blog')
  ensureDir(ogDir)

  // Load a font for satori - use the system's Inter or a bundled font
  // We'll fetch Inter from Google Fonts at build time
  const fontData = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@600;700&display=swap'
  ).then(async (res) => {
    const css = await res.text()
    const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1]
    if (!fontUrl) throw new Error('Could not extract font URL')
    return fetch(fontUrl).then(r => r.arrayBuffer())
  })

  for (const post of posts) {
    if (post.image) {
      console.log(`[prebuild] Skipping OG image for "${post.slug}" (custom image set)`)
      continue
    }

    const ogPath = path.join(ogDir, `${post.slug}.png`)

    // satori expects ReactNode but we're in a .ts file, so cast the VDOM object
    const element = {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '20px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '48px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, maxWidth: '900px' },
                    children: post.title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '24px', color: '#a0a0c0', maxWidth: '800px', lineHeight: 1.4 },
                    children: post.description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '24px', fontWeight: 600, color: '#6366f1' },
                    children: 'shubhamvij.com',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '20px', color: '#666680' },
                    children: new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    }),
                  },
                },
              ],
            },
          },
        ],
      },
    } as unknown as React.ReactNode

    const svg = await satori(element, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    })
    const png = resvg.render().asPng()
    fs.writeFileSync(ogPath, png)
    console.log(`[prebuild] Generated OG image for "${post.slug}"`)
  }
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
  const publications = getScholarPublications()
  fs.writeFileSync(path.join(PUBLIC_DATA, 'scholar.json'), JSON.stringify(publications, null, 2))
  console.log(`[prebuild] Generated ${publications.length} scholar publications`)

  // Resume PDF
  const resumeSrc = path.join(process.cwd(), 'content', 'resume', 'resume.pdf')
  const resumeDest = path.join(process.cwd(), 'public', 'resume.pdf')
  fs.copyFileSync(resumeSrc, resumeDest)
  console.log('[prebuild] Copied resume.pdf')

  // SEO: Sitemap
  generateSitemap()

  // SEO: RSS Feed
  generateRSSFeed()

  // SEO: OG Images
  await generateOGImages()
}

main()
