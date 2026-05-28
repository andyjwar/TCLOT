/**
 * LeagueInfoModal — disclosure target for the BrandHeaderWordmark
 * trigger. Renders the LP-C "sectioned cards on themed background"
 * layout from the design exploration (see `LiVariantC` in
 * `web/src/Mockup.jsx`). Sections are filled in progressively across
 * commits; this commit stands up the modal shell (backdrop, focus,
 * ESC, aria-modal) so the wordmark trigger has somewhere to open to.
 *
 * The full sectioned content (hero card, badges, managers, about,
 * fast-facts, appearance, settings, footer) is added in the next
 * commit.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './LeagueInfoModal.css'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 * }} props
 */
export function LeagueInfoModal({ open, onClose }) {
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousActive = typeof document !== 'undefined' ? document.activeElement : null

    /** ESC closes the modal — standard dialog behavior. */
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)

    /** Move focus to the close button on open. */
    const t = window.setTimeout(() => {
      closeBtnRef.current?.focus()
    }, 0)

    /** Lock body scroll while the modal is open (mobile sheet UX). */
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
      document.body.style.overflow = prevOverflow
      if (previousActive && typeof previousActive.focus === 'function') {
        try { previousActive.focus() } catch { /* ignore */ }
      }
    }
  }, [open, onClose])

  if (!open) return null

  const body = (
    <div
      className="league-info-modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="league-info-modal-title"
      id="league-info-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="league-info-modal li-modal li-modal--lp-c"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="li-modal__close league-info-modal__close"
          aria-label="Close League Info"
          onClick={onClose}
        >
          ×
        </button>
        <div className="li-modal__body li-modal__body--scroll">
          <div className="li-card li-card--hero">
            <div className="li-hero li-hero--large">
              <h1 id="league-info-modal-title" className="li-hero__name">
                League Info
              </h1>
              <div className="li-hero__tagline">Coming together in the next commit.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return body
  return createPortal(body, document.body)
}
