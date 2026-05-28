/**
 * LeagueInfoModal — disclosure target for the BrandHeaderWordmark
 * trigger. Renders the LP-C "sectioned cards on themed background"
 * layout from the design exploration (see `LiVariantC` in
 * `web/src/Mockup.jsx`). Sections in order:
 *
 *   1. Hero card        — league name, tri-continental flag strip,
 *                         season label, tagline
 *   2. Settings         — embeds `<SettingsPanelBody>` (shared with the
 *                         standalone /settings route — no duplication).
 *                         Promoted to the top so default-tab + theme
 *                         controls are reachable without scrolling past
 *                         identity / roster cards. The standalone
 *                         Appearance pill was removed; theme switching
 *                         lives inside SettingsPanelBody.
 *   3. League Badges    — 2-up roster grid (crest + team name)
 *   4. Managers list    — all 8 managers with crest + full name
 *   5. TCLOT Terminology — glossary of league lore terms
 *   6. Footer           — tiny credit / version line
 *
 * The modal portals onto `document.body` (so it clears the
 * `.app.fotmob` stacking context). All design tokens used by the
 * `.li-*` styles imported from `Mockup.css` are mirrored on the shell
 * selector in `LeagueInfoModal.css` — same trick as
 * `.live-player-slide` in `App.css`.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TeamAvatar } from './TeamAvatar'
import { SettingsPanelBody } from './SettingsPage'
import './LeagueInfoModal.css'

const LEAGUE_FULL_NAME = 'Tri-Continental League of Titans'
const LEAGUE_TAGLINE = 'Eight managers. Five seasons. One trophy.'

/** Three continents represented by the league. Rendered as a small
 * flag strip in the Hero card so the "Tri-Continental" name reads
 * literally at a glance. Flag glyphs use Unicode regional indicators
 * which the OS renders as proper country flags on every modern
 * platform; the country label sits beside each flag in purple
 * uppercase tracking that matches the rest of the modal. */
const LEAGUE_REGIONS = [
  { code: 'KR', flag: '🇰🇷', label: 'Korea' },
  { code: 'GB', flag: '🇬🇧', label: 'UK' },
  { code: 'CA', flag: '🇨🇦', label: 'Canada' },
]

/**
 * League-canon terminology. Order is roughly grouped by theme: scoring /
 * GW outcomes first, then season-arc accolades, then manager-personality
 * jokes. Definitions are quoted verbatim from the league chat so the
 * voice stays authentic.
 */
const TCLOT_TERMS = [
  { term: 'Villains Victory',     def: 'Winning with the 7th highest score of the GW.' },
  { term: 'Heroes Defeat',        def: 'Losing with the 2nd highest score of the GW.' },
  { term: 'The Motty',            def: 'Winning thanks to a bench player coming in.' },
  { term: 'Douchebag Sneak',      def: 'Winning with the 5th highest score.' },
  { term: 'Stallions Stalemate',  def: 'The top 2 scorers of the GW drawing.' },
  { term: 'The Ream',             def: 'Picking an insanely poor first waiver.' },
  { term: 'The Sancho',           def: 'Terrible first draft pick.' },
  { term: 'La Decima',            def: 'The first to win 10 game weeks in a season.' },
  { term: 'The Golden Circuit',   def: 'Defeating all other seven managers consecutively.' },
  { term: 'La Gran Vergüenza',    def: 'Losing to all other seven managers consecutively.' },
  { term: 'Box Office',           def: 'Michael Alan Sutton and his ability to mince through life while consistently meeting the highest levels of glory.' },
  { term: 'Grumpy Goodacre',      def: "Declaring your chances in a GW over when they're clearly not." },
  { term: 'Dr Ward',              def: 'Declaring a player heading off injured in a wildly incorrect manner.' },
  { term: 'TTAT',                 def: 'Tery Talks About Tery — when Webster pops up to chime in about his own team in spite of the chatter at the time.' },
]

/**
 * Returns up to `count` leading initials of `text`. Used for the
 * crest/avatar fallback letters.
 * @param {string} text
 * @param {number} [count]
 */
function liInitials(text, count = 2) {
  return String(text)
    .split(/\s+/)
    .slice(0, count)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
}

/** Gold/amber trophy SVG, ported from `LiTrophy` in Mockup.jsx. */
function LiTrophy({ size = 88 }) {
  const gradId = `league-info-trophy-grad-${size}`
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="li-trophy">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe7a3" />
          <stop offset="55%" stopColor="#f1c43b" />
          <stop offset="100%" stopColor="#a37305" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M7 3h10v2.4c1.1 0 2.1.05 2.9.35.7.27 1.1.86 1.1 1.7 0 1.85-1.2 3.4-2.95 4.18-.55.25-1.18.37-1.82.4-.4 2-1.85 3.65-3.73 4.27V19h2.25a1 1 0 010 2H9.25a1 1 0 010-2H11.5v-2.7c-1.88-.62-3.33-2.27-3.73-4.27-.64-.03-1.27-.15-1.82-.4C4.2 10.85 3 9.3 3 7.45c0-.84.4-1.43 1.1-1.7C4.9 5.45 5.9 5.4 7 5.4V3zm0 4.42c-.78 0-1.4.04-1.85.2-.13.05-.15.13-.15.23 0 1 .65 1.78 1.55 2.18.16.07.31.12.45.15V7.42zm10 0v2.76c.14-.03.29-.08.45-.15.9-.4 1.55-1.18 1.55-2.18 0-.1-.02-.18-.15-.23-.45-.16-1.07-.2-1.85-.2z"
      />
    </svg>
  )
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   leagueEntries?: Array<{ id: number, entry_name?: string, player_first_name?: string, player_last_name?: string }>,
 *   teamLogoMap?: Record<string|number, string>,
 *   kitIndexByEntry?: Record<string|number, number>,
 *   gw?: number | null,
 *   themePref: 'light' | 'dark' | 'system',
 *   onThemePrefChange: (t: 'light' | 'dark' | 'system') => void,
 *   defaultTab: string,
 *   onDefaultTabChange: (id: string) => void,
 * }} props
 */
export function LeagueInfoModal({
  open,
  onClose,
  leagueEntries = [],
  teamLogoMap = {},
  kitIndexByEntry = {},
  gw,
  themePref,
  onThemePrefChange,
  defaultTab,
  onDefaultTabChange,
}) {
  const closeBtnRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousActive = typeof document !== 'undefined' ? document.activeElement : null

    /** ESC closes the modal — standard dialog behavior. */
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      /** Focus trap — Tab / Shift+Tab cycle inside the modal so
       * keyboard users can't tab into the page behind. */
      if (e.key !== 'Tab') return
      const root = modalRef.current
      if (!root) return
      const focusables = root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
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

  const seasonLabel = gw != null ? `2025/26 · GW ${gw}` : '2025/26'

  /* Stable ordering: by `league_entry` id ascending — the standings
   * order changes week-to-week, but this list is "the league roster",
   * which is fixed. */
  const sortedEntries = [...(leagueEntries ?? [])]
    .filter((e) => e?.id != null)
    .sort((a, b) => Number(a.id) - Number(b.id))

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
        ref={modalRef}
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
          {/* 1 · Hero — league identity + tri-continental flag strip */}
          <div className="li-card li-card--hero">
            <div className="li-hero li-hero--large">
              <div className="li-hero__crest">
                <LiTrophy size={88} />
              </div>
              <h1 id="league-info-modal-title" className="li-hero__name">
                {LEAGUE_FULL_NAME}
              </h1>
              <div
                className="li-hero__flags"
                aria-label="Three continents represented in the league"
              >
                {LEAGUE_REGIONS.map((r, i) => (
                  <span className="li-hero__flag-item" key={r.code}>
                    {i > 0 ? (
                      <span className="li-hero__flag-divider" aria-hidden="true">·</span>
                    ) : null}
                    <span className="li-hero__flag" aria-hidden="true">{r.flag}</span>
                    <span className="li-hero__flag-label">{r.label}</span>
                  </span>
                ))}
              </div>
              <div className="li-hero__season league-info-modal__season">{seasonLabel}</div>
              <div className="li-hero__tagline">{LEAGUE_TAGLINE}</div>
            </div>
          </div>

          {/* 2 · Settings — promoted to the top of the modal so the
              actionable controls (default tab, theme) are reachable
              without scrolling past the identity / roster cards.
              Shared with the standalone /settings route via the
              `<SettingsPanelBody>` component. */}
          <div className="li-card li-card--settings">
            <div className="li-card__eyebrow">Settings</div>
            <SettingsPanelBody
              themePref={themePref}
              onThemePrefChange={onThemePrefChange}
              defaultTab={defaultTab}
              onDefaultTabChange={onDefaultTabChange}
            />
          </div>

          {/* 3 · League Badges
              TODO: replace this roster-style grid with real "league
              badges" once data hooks for defending champion / current
              leader / longest tenure / etc. are available. For now we
              render the 8-team roster so the card has visual presence
              and the section reads as "League Roster ↔ Badges". */}
          <div className="li-card li-card--badges">
            <div className="li-card__eyebrow">League Roster</div>
            {sortedEntries.length === 0 ? (
              <p className="league-info-modal__placeholder">League data not loaded yet.</p>
            ) : (
              <div className="li-badges-grid league-info-modal__badges-grid">
                {sortedEntries.map((e) => {
                  const teamName = e.entry_name ?? '—'
                  return (
                    <div className="li-badge" key={e.id}>
                      <div className="li-badge__crest league-info-modal__badge-crest">
                        <TeamAvatar
                          entryId={e.id}
                          name={teamName}
                          size="md"
                          logoMap={teamLogoMap}
                          kitIndexByEntry={kitIndexByEntry}
                          badgeFallback
                        />
                      </div>
                      <div className="li-badge__name">{teamName}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4 · Managers list */}
          <div className="li-card li-card--managers">
            <div className="li-card__eyebrow">Managers</div>
            {sortedEntries.length === 0 ? (
              <p className="league-info-modal__placeholder">League data not loaded yet.</p>
            ) : (
              <div className="li-managers-list">
                {sortedEntries.map((e) => {
                  const teamName = e.entry_name ?? '—'
                  const mgr = `${e.player_first_name ?? ''} ${e.player_last_name ?? ''}`.trim() || '—'
                  return (
                    <div className="li-mgr-row" key={e.id}>
                      <div className="li-mgr-row__avatar league-info-modal__mgr-avatar">
                        <TeamAvatar
                          entryId={e.id}
                          name={teamName}
                          size="sm"
                          logoMap={teamLogoMap}
                          kitIndexByEntry={kitIndexByEntry}
                          badgeFallback
                        />
                      </div>
                      <div className="li-mgr-row__body">
                        <div className="li-mgr-row__name">{mgr}</div>
                        <div className="li-mgr-row__descriptor" title={teamName}>{teamName}</div>
                      </div>
                      <div className="li-mgr-row__initials" aria-hidden>
                        {liInitials(mgr)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 5 · TCLOT Terminology — league-canon glossary. Each entry
              is a `<dl>` row with the term in purple uppercase and the
              definition flowing as prose underneath. */}
          <div className="li-card li-card--terminology">
            <div className="li-card__eyebrow">TCLOT Terminology</div>
            <dl className="li-terms">
              {TCLOT_TERMS.map((t) => (
                <div className="li-term" key={t.term}>
                  <dt className="li-term__name">{t.term}</dt>
                  <dd className="li-term__def">{t.def}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 6 · Footer */}
          <div className="li-footer">
            TCLOT · 2025/26 ·{' '}
            <span className="league-info-modal__footer-version">
              {String(import.meta.env.VITE_LEAGUE_DATA_REVISION ?? 'dev').trim() || 'dev'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return body
  return createPortal(body, document.body)
}
