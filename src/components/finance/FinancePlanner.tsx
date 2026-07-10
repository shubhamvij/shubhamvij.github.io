'use client'
import { useReducer, useMemo, useEffect, useRef, useState } from 'react'
import s from './finance.module.css'
import { plannerReducer } from './reducer'
import { makeDefaultState } from '@/lib/finance/defaults'
import { computePlan } from '@/lib/finance/computePlan'
import { encodeState, decodeState } from '@/lib/finance/serialize'
import { getSavedPlanCode, setSavedPlanCode } from '@/lib/finance/financeCookies'
import InputsPanel from './InputsPanel'
import ResultsPanel from './ResultsPanel'
import ShareDialog from './ShareDialog'
import { playSound } from '@/lib/sounds'

interface Props {
  initialCode?: string | null
  /** Force-close the window (bypasses the unsaved-changes guard). */
  onClose?: () => void
  /** Register a guard the window manager calls before closing; return true to intercept. */
  registerCloseGuard?: (guard: (() => boolean) | null) => void
}

export default function FinancePlanner({ initialCode, onClose, registerCloseGuard }: Props) {
  const [state, dispatch] = useReducer(plannerReducer, undefined, makeDefaultState)
  const result = useMemo(() => computePlan(state), [state])
  const code = useMemo(() => encodeState(state), [state])

  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const [savedCode, setSavedCode] = useState<string | null>(null)
  const urlLoaded = useRef(false)

  const dirty = savedCode !== null && code !== savedCode
  const dirtyRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  // XP exclamation when the unsaved-changes dialog pops up.
  useEffect(() => {
    if (unsavedOpen) playSound('error')
  }, [unsavedOpen])

  // Load from ?s= (priority) then cookie, once after mount; record that snapshot as the saved baseline.
  useEffect(() => {
    if (initialCode && !urlLoaded.current) {
      urlLoaded.current = true
      const decoded = decodeState(initialCode)
      if (decoded) {
        dispatch({ type: 'LOAD_STATE', state: decoded })
        setSavedCode(encodeState(decoded))
        return
      }
    }
    if (savedCode === null) {
      const decoded = (() => {
        const cookie = getSavedPlanCode()
        return cookie ? decodeState(cookie) : null
      })()
      if (decoded) {
        dispatch({ type: 'LOAD_STATE', state: decoded })
        setSavedCode(encodeState(decoded))
      } else {
        setSavedCode(encodeState(makeDefaultState()))
      }
    }
  }, [initialCode, savedCode])

  const saveNow = () => {
    setSavedPlanCode(code)
    setSavedCode(code)
  }

  const handleLoad = (raw: string): boolean => {
    const decoded = decodeState(raw)
    if (!decoded) return false
    dispatch({ type: 'LOAD_STATE', state: decoded })
    setSavedCode(encodeState(decoded))
    return true
  }

  const attemptClose = () => {
    if (dirty) setUnsavedOpen(true)
    else onClose?.()
  }

  // Window-manager close guard: intercept the title-bar X when there are unsaved changes.
  useEffect(() => {
    registerCloseGuard?.(() => {
      if (dirtyRef.current) {
        setUnsavedOpen(true)
        return true
      }
      return false
    })
    return () => registerCloseGuard?.(null)
  }, [registerCloseGuard])

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
        setShareOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className={s.app}>
      <div className={s.toolbar}>
        <div className={s.menuBar}>
          <button type="button" className={`${s.menuBtn} ${menuOpen ? s.menuBtnOpen : ''}`} onClick={() => setMenuOpen((o) => !o)}>
            File
          </button>
          <button type="button" className={s.menuBtn} disabled>
            Edit
          </button>
          <button type="button" className={s.menuBtn} disabled>
            Help
          </button>
          {menuOpen && (
            <>
              <div className={s.menuOverlay} onClick={() => setMenuOpen(false)} />
              <div className={s.dropdown} role="menu">
                <button
                  type="button"
                  className={s.dropdownItem}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    saveNow()
                    setShareOpen(true)
                  }}
                >
                  <span>Save &amp; Share…</span>
                  <kbd>Ctrl+S</kbd>
                </button>
                <button
                  type="button"
                  className={s.dropdownItem}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    dispatch({ type: 'RESET' })
                  }}
                >
                  <span>Reset to defaults</span>
                </button>
                <div className={s.dropdownSep} />
                <button
                  type="button"
                  className={s.dropdownItem}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    attemptClose()
                  }}
                >
                  <span>Close</span>
                </button>
              </div>
            </>
          )}
        </div>
        <div className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icons/calculator.svg" alt="" />
          Finance Planner{dirty && <span className={s.unsavedTag}> — unsaved&nbsp;*</span>}
        </div>
      </div>

      <div className={s.body}>
        <InputsPanel state={state} dispatch={dispatch} result={result} />
        <ResultsPanel result={result} state={state} />
      </div>

      <div className={s.footer}>
        Estimates only — not financial or tax advice. Tax year {state.taxYear} · federal + FICA + {state.state} state tax.
      </div>

      {shareOpen && <ShareDialog code={code} onClose={() => setShareOpen(false)} onLoad={handleLoad} />}

      {unsavedOpen && (
        <div className={s.overlay} onClick={() => setUnsavedOpen(false)}>
          <div className={`${s.dialog} ${s.dialogSmall}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.dialogTitle}>
              <span>Finance Planner</span>
            </div>
            <div className={s.dialogBody}>
              <div className={s.dialogMessage}>
                <span className={s.warnIcon}>!</span>
                <span>Do you want to save the changes to your plan?</span>
              </div>
              <div className={s.dialogButtons}>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => {
                    saveNow()
                    setUnsavedOpen(false)
                    onClose?.()
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={s.btn}
                  onClick={() => {
                    setUnsavedOpen(false)
                    onClose?.()
                  }}
                >
                  Don&apos;t Save
                </button>
                <button type="button" className={s.btn} onClick={() => setUnsavedOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
