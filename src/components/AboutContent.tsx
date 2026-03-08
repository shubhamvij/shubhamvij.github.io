'use client'

import { useState, useEffect } from 'react'

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="font-bold text-sm mt-4 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br />')
  return '<p class="my-2">' + html + '</p>'
}

export default function AboutContent() {
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/about.json')
      .then(res => res.json())
      .then(data => setContent(data.content))
      .catch(() => setContent(null))
  }, [])

  return (
    <div className="p-4" style={{ fontFamily: 'Tahoma, sans-serif' }}>
      <div className="flex items-start gap-4 mb-4">
        <img
          src="/images/shubham.jpg"
          alt="Shubham Vij"
          className="w-16 h-16 rounded object-cover shrink-0"
        />
        <div>
          <h1 className="text-lg font-bold">Shubham Vij</h1>
          <p className="text-sm text-gray-600 mt-1">
            Software Engineer & Researcher
          </p>
        </div>
      </div>
      <div className="border-t pt-4 text-sm text-gray-700 space-y-3">
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  )
}
