'use client'
import { useState, useEffect, useRef } from 'react'

interface PostMeta {
  slug: string
  title: string
  date: string
  description: string
  tags?: string[]
}

interface BlogListProps {
  initialSlug?: string | null
  onNavigate?: (slug: string | null) => void
  onOpenPost?: (slug: string) => void
}

export default function BlogList({ initialSlug, onNavigate, onOpenPost }: BlogListProps) {
  const [posts, setPosts] = useState<PostMeta[]>([])
  const [selectedPost, setSelectedPost] = useState<{ content: string; meta: PostMeta } | null>(null)
  const [loading, setLoading] = useState(true)
  const initialSlugHandled = useRef(false)

  useEffect(() => {
    fetch('/data/blog.json')
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Handle initialSlug - load the post when provided
  useEffect(() => {
    if (initialSlug && !initialSlugHandled.current) {
      initialSlugHandled.current = true
      openPost(initialSlug)
    }
  }, [initialSlug])

  // Handle slug changes from popstate (browser back/forward)
  useEffect(() => {
    if (initialSlugHandled.current) {
      if (initialSlug) {
        openPost(initialSlug)
      } else if (initialSlug === null && selectedPost) {
        setSelectedPost(null)
      }
    }
  }, [initialSlug])

  const openPost = async (slug: string) => {
    const res = await fetch(`/data/blog/${slug}.json`)
    const data = await res.json()
    setSelectedPost(data)
    onNavigate?.(slug)
  }

  const goBackToList = () => {
    setSelectedPost(null)
    onNavigate?.(null)
  }

  if (loading) return <div className="p-4 text-gray-500" style={{ fontFamily: 'Tahoma, sans-serif' }}>Loading...</div>

  if (selectedPost) {
    return (
      <div className="p-4" style={{ fontFamily: 'Tahoma, sans-serif' }}>
        <button
          onClick={goBackToList}
          className="text-blue-600 hover:underline text-sm mb-4 block"
        >
          &larr; Back to posts
        </button>
        <h1 className="text-xl font-bold mb-1">{selectedPost.meta.title}</h1>
        <p className="text-xs text-gray-500 mb-4">{selectedPost.meta.date}</p>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedPost.content) }}
        />
      </div>
    )
  }

  return (
    <div className="p-4" style={{ fontFamily: 'Tahoma, sans-serif' }}>
      <h2 className="text-lg font-bold mb-3">Blog Posts</h2>
      {posts.length === 0 && <p className="text-gray-500">No posts yet.</p>}
      {posts.map(post => (
        <button
          key={post.slug}
          onClick={() => openPost(post.slug)}
          className="block w-full text-left p-3 hover:bg-blue-50 rounded border-b border-gray-100"
        >
          <h3 className="font-bold text-sm text-blue-800">{post.title}</h3>
          <p className="text-xs text-gray-500">{post.date}</p>
          <p className="text-xs text-gray-600 mt-1">{post.description}</p>
        </button>
      ))}
    </div>
  )
}

// Simple markdown to HTML converter for blog posts
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-3 rounded my-3 text-xs overflow-x-auto"><code>$2</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br />')
  return '<p class="my-2">' + html + '</p>'
}
