'use client'
import { useState } from 'react'
import s from './finance.module.css'

export default function ShareDialog({
  code,
  onClose,
  onLoad,
}: {
  code: string
  onClose: () => void
  onLoad: (code: string) => boolean
}) {
  const [copied, setCopied] = useState<'code' | 'url' | ''>('')
  const [loadText, setLoadText] = useState('')
  const [loadError, setLoadError] = useState(false)
  const url = `https://shubhamvij.com/finance/?s=${code}`

  const copy = (text: string, which: 'code' | 'url') => {
    const done = () => {
      setCopied(which)
      setTimeout(() => setCopied(''), 1500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    } else {
      fallbackCopy(text, done)
    }
  }

  const fallbackCopy = (text: string, done: () => void) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      done()
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta)
  }

  const handleLoad = () => {
    const ok = onLoad(loadText.trim())
    if (ok) {
      onClose()
    } else {
      setLoadError(true)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={s.dialogTitle}>
          <span>Save &amp; Share Plan</span>
          <button type="button" className={s.dialogClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={s.dialogBody}>
          <div>Your plan is auto-saved to this browser. Copy a code or link to restore it anywhere.</div>

          <div>
            <div className={s.label}>
              Restore code {copied === 'code' && <span className={s.copied}>✓ copied</span>}
            </div>
            <div className={s.codeBox}>
              <input readOnly className={s.codeField} value={code} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={s.btn} onClick={() => copy(code, 'code')}>
                Copy
              </button>
            </div>
          </div>

          <div>
            <div className={s.label}>
              Shareable link {copied === 'url' && <span className={s.copied}>✓ copied</span>}
            </div>
            <div className={s.codeBox}>
              <input readOnly className={s.codeField} value={url} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={s.btn} onClick={() => copy(url, 'url')}>
                Copy
              </button>
            </div>
          </div>

          <div className={s.divider} />

          <div>
            <div className={s.label}>
              Load a saved code {loadError && <span className={s.statNeg}>— invalid code</span>}
            </div>
            <div className={s.codeBox}>
              <input
                className={s.codeField}
                placeholder="Paste a restore code…"
                value={loadText}
                onChange={(e) => {
                  setLoadText(e.target.value)
                  setLoadError(false)
                }}
              />
              <button type="button" className={s.btn} onClick={handleLoad}>
                Load
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
