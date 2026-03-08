'use client'
import { ReactNode } from 'react'
import { useMobile } from '@/lib/useMobile'

interface CRTFrameProps {
  children: ReactNode
}

export default function CRTFrame({ children }: CRTFrameProps) {
  const isMobile = useMobile()

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        <div className="w-full h-full relative">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div
        className="relative flex flex-col"
        style={{ width: '97vw', height: '97vh' }}
      >
        {/* Outer monitor shell */}
        <div
          className="w-full h-full flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 30%, #1e1e1e 100%)',
            borderRadius: '6px',
            borderTop: '3px solid #4a4a4a',
            borderLeft: '3px solid #4a4a4a',
            borderBottom: '3px solid #111',
            borderRight: '3px solid #111',
            boxShadow: 'inset 0 0 0 1px #333, 0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {/* Inner bezel */}
          <div
            className="flex-1 m-[6px] mb-0 flex flex-col"
            style={{
              borderTop: '3px solid #111',
              borderLeft: '3px solid #111',
              borderBottom: '3px solid #4a4a4a',
              borderRight: '3px solid #4a4a4a',
              borderRadius: '3px',
              background: '#0a0a0a',
            }}
          >
            {/* Screen area */}
            <div
              className="flex-1 relative"
              style={{
                margin: '3px',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              {children}
            </div>
          </div>

          {/* Monitor chin */}
          <div
            className="flex items-center justify-center"
            style={{
              height: '24px',
              minHeight: '24px',
              padding: '0 12px',
            }}
          >
            {/* Power LED */}
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00cc44',
                boxShadow: '0 0 4px #00cc44, 0 0 8px rgba(0,204,68,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
