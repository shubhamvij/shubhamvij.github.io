import type { Metadata } from 'next'
import { getSocialLinks } from '@/lib/social'
import { getSettings } from '@/lib/settings'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { JsonLd } from '@/components/JsonLd'
import HomeClient from './HomeClient'

const BASE_URL = 'https://shubhamvij.com'
const DEFAULT_IMAGE = '/images/shubham.jpg'
const SITE_NAME = 'Shubham Vij'

const PAGE_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  blog: {
    title: `Blog | ${SITE_NAME}`,
    description: 'Articles on software engineering, AI, machine learning, and research by Shubham Vij.',
    keywords: ['blog', 'software engineering', 'AI', 'machine learning', 'tech articles'],
  },
  resume: {
    title: `Resume | ${SITE_NAME}`,
    description: 'Professional resume and experience of Shubham Vij — software engineer and researcher.',
    keywords: ['resume', 'software engineer', 'experience', 'CV'],
  },
  research: {
    title: `Research | ${SITE_NAME}`,
    description: 'Publications, papers, and patents by Shubham Vij in AI, ML, and computer science.',
    keywords: ['research', 'publications', 'papers', 'patents', 'AI', 'machine learning'],
  },
  about: {
    title: `About | ${SITE_NAME}`,
    description: 'About Shubham Vij — software engineer, researcher, and builder working on AI and machine learning.',
    keywords: ['about', 'Shubham Vij', 'software engineer', 'researcher'],
  },
}

export function generateStaticParams() {
  const posts = getAllPosts()
  return [
    { path: [] },
    { path: ['blog'] },
    { path: ['resume'] },
    { path: ['research'] },
    { path: ['about'] },
    ...posts.map(p => ({ path: ['blog', p.slug] })),
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>
}): Promise<Metadata> {
  const { path } = await params

  // Home page
  if (!path || path.length === 0) {
    return {
      title: SITE_NAME,
      description: 'Always building something new — software engineer, researcher, and builder working on AI and machine learning.',
      keywords: ['Shubham Vij', 'software engineer', 'AI', 'machine learning', 'portfolio', 'developer', 'research engineer'],
      alternates: { canonical: `${BASE_URL}/` },
      openGraph: {
        title: SITE_NAME,
        description: 'Always building something new — software engineer, researcher, and builder.',
        url: `${BASE_URL}/`,
        siteName: SITE_NAME,
        locale: 'en_US',
        type: 'website',
        images: [{ url: DEFAULT_IMAGE, width: 800, height: 800, alt: SITE_NAME }],
      },
      twitter: {
        card: 'summary_large_image',
        title: SITE_NAME,
        description: 'Always building something new — software engineer, researcher, and builder.',
        images: [DEFAULT_IMAGE],
      },
    }
  }

  const section = path[0]

  // Blog post: /blog/{slug}
  if (section === 'blog' && path.length > 1) {
    const slug = path[1]
    try {
      const post = getPostBySlug(slug)
      const ogImage = post.meta.image || `/images/og/blog/${slug}.png`
      return {
        title: `${post.meta.title} | ${SITE_NAME}`,
        description: post.meta.description,
        keywords: post.meta.tags,
        alternates: { canonical: `${BASE_URL}/blog/${slug}/` },
        openGraph: {
          type: 'article',
          title: post.meta.title,
          description: post.meta.description,
          url: `${BASE_URL}/blog/${slug}/`,
          siteName: SITE_NAME,
          locale: 'en_US',
          publishedTime: post.meta.date,
          ...(post.meta.lastModified && { modifiedTime: post.meta.lastModified }),
          authors: [SITE_NAME],
          tags: post.meta.tags,
          images: [{ url: ogImage, width: 1200, height: 630, alt: post.meta.title }],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${post.meta.title} | ${SITE_NAME}`,
          description: post.meta.description,
          images: [ogImage],
        },
      }
    } catch {
      return { title: SITE_NAME }
    }
  }

  // Static section pages
  const meta = PAGE_META[section]
  if (meta) {
    return {
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      alternates: { canonical: `${BASE_URL}/${section}/` },
      openGraph: {
        title: meta.title,
        description: meta.description,
        url: `${BASE_URL}/${section}/`,
        siteName: SITE_NAME,
        locale: 'en_US',
        type: 'website',
        images: [{ url: DEFAULT_IMAGE, width: 800, height: 800, alt: SITE_NAME }],
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.title,
        description: meta.description,
        images: [DEFAULT_IMAGE],
      },
    }
  }

  return { title: SITE_NAME }
}

function buildJsonLd(pathSegments: string[] | undefined) {
  const socialLinks = getSocialLinks()
  const sameAs = socialLinks
    .filter(l => l.href.startsWith('http'))
    .map(l => l.href)

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_NAME,
    url: BASE_URL,
    image: `${BASE_URL}${DEFAULT_IMAGE}`,
    sameAs,
  }

  // Home page
  if (!pathSegments || pathSegments.length === 0) {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: BASE_URL,
      },
      personSchema,
    ]
  }

  const section = pathSegments[0]

  // Blog post
  if (section === 'blog' && pathSegments.length > 1) {
    const slug = pathSegments[1]
    try {
      const post = getPostBySlug(slug)
      const ogImage = post.meta.image || `/images/og/blog/${slug}.png`
      return [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.meta.title,
          datePublished: post.meta.date,
          ...(post.meta.lastModified && { dateModified: post.meta.lastModified }),
          description: post.meta.description,
          author: { '@type': 'Person', name: SITE_NAME, url: BASE_URL },
          url: `${BASE_URL}/blog/${slug}/`,
          image: `${BASE_URL}${ogImage}`,
          keywords: post.meta.tags?.join(', '),
          wordCount: post.content.trim().split(/\s+/).length,
        },
      ]
    } catch {
      return []
    }
  }

  // About page
  if (section === 'about') {
    return [personSchema]
  }

  // Research page
  if (section === 'research') {
    return [
      {
        ...personSchema,
        '@type': 'Person',
        jobTitle: 'Research Engineer',
      },
    ]
  }

  return []
}

export default async function Home({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  const socialLinks = getSocialLinks()
  const settings = getSettings()
  const jsonLdItems = buildJsonLd(path)

  return (
    <>
      {jsonLdItems.map((item, i) => (
        <JsonLd key={i} data={item} />
      ))}
      <HomeClient
        socialLinks={socialLinks}
        defaultScreenSaver={settings.screenSaver.default}
        defaultIdleTimeout={settings.screenSaver.idleTimeout}
      />
    </>
  )
}
