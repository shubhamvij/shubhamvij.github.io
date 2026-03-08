'use client'
import { useState } from 'react'
import { SCREEN_SAVERS, getScreenSaver } from '@/lib/screenSavers'

interface DisplayPropertiesProps {
  currentScreenSaver: string
  currentTimeout: number
  onApply: (screenSaverId: string, timeoutSeconds: number) => void
  onPreview: (screenSaverId: string) => void
  onClose: () => void
}

const TABS = [
  { id: 'themes', label: 'Themes', disabled: true },
  { id: 'desktop', label: 'Desktop', disabled: true },
  { id: 'screensaver', label: 'Screen Saver', disabled: false },
  { id: 'appearance', label: 'Appearance', disabled: true },
  { id: 'settings', label: 'Settings', disabled: true },
]

function PreviewMonitor({ screenSaverId }: { screenSaverId: string }) {
  const meta = getScreenSaver(screenSaverId)
  const ScreenSaverComponent = meta?.component ?? null

  return (
    <div className="flex justify-center mb-4">
      <div style={{
        width: 200,
        padding: '12px 16px 24px',
        background: 'linear-gradient(180deg, #e8e8e8 0%, #c0c0c0 100%)',
        borderRadius: '8px 8px 0 0',
        border: '2px solid #999',
      }}>
        <div style={{
          width: '100%',
          height: 110,
          background: '#000',
          border: '2px solid #333',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {ScreenSaverComponent ? (
            <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%', pointerEvents: 'none', position: 'relative' }}>
              <ScreenSaverComponent />
            </div>
          ) : (
            <div className="w-full h-full bg-black" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function DisplayProperties({ currentScreenSaver, currentTimeout, onApply, onPreview, onClose }: DisplayPropertiesProps) {
  const [selectedSaver, setSelectedSaver] = useState(currentScreenSaver)
  const [timeout, setTimeout] = useState(currentTimeout)

  const handleApply = () => {
    onApply(selectedSaver, timeout)
  }

  const handleOk = () => {
    onApply(selectedSaver, timeout)
    onClose()
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ fontFamily: 'Tahoma, sans-serif', fontSize: '11px', background: '#ece9d8' }}
    >
      {/* Tabs */}
      <div className="flex px-2 pt-1" style={{ gap: '1px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className="px-3 py-1 border border-b-0 rounded-t"
            style={{
              background: tab.id === 'screensaver' ? '#ece9d8' : '#d4d0c8',
              borderColor: '#808080',
              color: tab.disabled ? '#808080' : '#000',
              cursor: tab.disabled ? 'default' : 'pointer',
              marginBottom: tab.id === 'screensaver' ? '-1px' : '0',
              zIndex: tab.id === 'screensaver' ? 1 : 0,
              position: 'relative',
              fontWeight: tab.id === 'screensaver' ? 'bold' : 'normal',
            }}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 mx-2 mb-2 p-4 border" style={{ borderColor: '#808080', background: '#ece9d8' }}>
        <PreviewMonitor screenSaverId={selectedSaver} />

        {/* Screen saver group */}
        <fieldset className="border px-3 pb-3 pt-1 mb-4" style={{ borderColor: '#808080' }}>
          <legend className="px-1">Screen saver</legend>
          <div className="flex items-center gap-2 mt-1">
            <select
              value={selectedSaver}
              onChange={(e) => setSelectedSaver(e.target.value)}
              className="flex-1 border px-1 py-0.5"
              style={{ borderColor: '#7f9db9', background: '#fff', fontSize: '11px' }}
            >
              {SCREEN_SAVERS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <button
              className="px-3 py-0.5 border"
              style={{ borderColor: '#808080', background: '#ece9d8', color: '#808080' }}
              disabled
            >
              Settings
            </button>
            <button
              className="px-3 py-0.5 border"
              style={{ borderColor: '#808080', background: '#ece9d8' }}
              onClick={() => onPreview(selectedSaver)}
            >
              Preview
            </button>
          </div>
        </fieldset>

        {/* Wait time */}
        <div className="flex items-center gap-2">
          <span>Wait:</span>
          <input
            type="number"
            min={5}
            max={600}
            value={timeout}
            onChange={(e) => setTimeout(Math.max(5, parseInt(e.target.value) || 5))}
            className="border px-1 py-0.5 w-16 text-center"
            style={{ borderColor: '#7f9db9', background: '#fff', fontSize: '11px' }}
          />
          <span>seconds</span>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex justify-end gap-2 px-2 pb-2">
        <button
          className="px-4 py-1 border"
          style={{ borderColor: '#808080', background: '#ece9d8', minWidth: 70 }}
          onClick={handleOk}
        >
          OK
        </button>
        <button
          className="px-4 py-1 border"
          style={{ borderColor: '#808080', background: '#ece9d8', minWidth: 70 }}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-1 border"
          style={{ borderColor: '#808080', background: '#ece9d8', minWidth: 70 }}
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  )
}
