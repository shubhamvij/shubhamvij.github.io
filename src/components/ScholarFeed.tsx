'use client'
import { useState, useEffect } from 'react'

interface Publication {
  title: string
  authors: string
  venue: string
  year: string
  citations: string
  link: string
}

export default function ScholarFeed() {
  const [pubs, setPubs] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/data/scholar.json')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPubs(data)
        else setError('Failed to load publications')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load publications'); setLoading(false) })
  }, [])

  if (loading) return <div className="p-4 text-gray-500" style={{ fontFamily: 'Tahoma, sans-serif' }}>Loading publications...</div>
  if (error) return <div className="p-4 text-red-500" style={{ fontFamily: 'Tahoma, sans-serif' }}>{error}</div>

  return (
    <div className="p-4" style={{ fontFamily: 'Tahoma, sans-serif' }}>
      <h2 className="text-lg font-bold mb-1">Research</h2>
      <p className="text-xs text-gray-500 mb-4">Papers & patents from Google Scholar</p>
      {pubs.length === 0 && <p className="text-gray-500">No publications found.</p>}
      {pubs.map((pub, i) => (
        <a
          key={i}
          href={pub.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 hover:bg-blue-50 rounded border-b border-gray-100"
        >
          <h3 className="font-bold text-sm text-blue-800">{pub.title}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{pub.authors}</p>
          <div className="flex gap-3 mt-1 text-xs text-gray-500">
            {pub.venue && <span>{pub.venue}</span>}
            {pub.year && <span>{pub.year}</span>}
            {pub.citations && <span>Cited by {pub.citations}</span>}
          </div>
        </a>
      ))}
    </div>
  )
}
