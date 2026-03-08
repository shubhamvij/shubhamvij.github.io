'use client'

export default function ResumeViewer() {
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Tahoma, sans-serif' }}>
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-sm">Resume - Shubham Vij</span>
        <a
          href="/resume.pdf"
          download
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Download PDF
        </a>
      </div>
      <iframe
        src="/resume.pdf"
        className="flex-1 w-full"
        title="Resume"
      />
    </div>
  )
}
