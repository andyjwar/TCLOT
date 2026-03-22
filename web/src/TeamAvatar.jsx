import { useState, useMemo } from 'react'

const RAW_BASE = `${import.meta.env.BASE_URL}team-logos/`
const WEB_BASE = `${import.meta.env.BASE_URL}team-logos-web/`
const LOGO_EXTS = ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'webp', 'WEBP']

function buildSrcList(entryId, logoMap) {
  const key = String(entryId)
  const mapped = logoMap[key]
  if (mapped) return [`${RAW_BASE}${mapped}`]
  const list = [`${WEB_BASE}${entryId}.png`]
  for (const ext of LOGO_EXTS) {
    list.push(`${RAW_BASE}${entryId}.${ext}`)
  }
  return list
}

/**
 * Hand-picked dark backgrounds (white initials): spaced around the wheel with varied
 * saturation/chroma so neighbours don’t read as “another blue-green”.
 */
const BADGE_BG_PALETTE = [
  '#b42318',
  '#c2410c',
  '#b45309',
  '#a15c07',
  '#3f6212',
  '#166534',
  '#047857',
  '#0f766e',
  '#0e7490',
  '#0369a1',
  '#1d4ed8',
  '#3730a3',
  '#5b21b6',
  '#6b21a8',
  '#86198f',
  '#a3005c',
  '#be123c',
  '#854d0e',
]

function fnv1a32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Index into palette — FNV + golden-ratio mix so sequential ids don’t pick adjacent slots. */
function badgePaletteIndex(entryId, name) {
  const key = `${entryId == null ? '' : String(entryId)}\u{1e}${name == null ? '' : String(name)}`
  const h = fnv1a32(key)
  const mixed = Math.imul(h, 2654435769) >>> 0
  return mixed % BADGE_BG_PALETTE.length
}

function InitialsBadge({ name, entryId, size }) {
  const initial = (name || '?').slice(0, 2).toUpperCase()
  const bg = BADGE_BG_PALETTE[badgePaletteIndex(entryId, name)]
  const fg = '#f5f5f5'
  return (
    <span
      className={`team-badge team-badge--${size}`}
      style={{
        background: bg,
        color: fg,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
      }}
      aria-hidden
    >
      {initial}
    </span>
  )
}

/**
 * Prefers pre-sized assets in team-logos-web/ (run: npm run dev / npm run build).
 */
export function TeamAvatar({ entryId, name, size = 'md', logoMap = {} }) {
  const srcList = useMemo(() => buildSrcList(entryId, logoMap), [entryId, logoMap])
  const [idx, setIdx] = useState(0)
  const [showInitials, setShowInitials] = useState(false)

  if (entryId == null || showInitials) {
    return <InitialsBadge name={name} entryId={entryId} size={size} />
  }

  const src = srcList[idx]
  if (!src) {
    return <InitialsBadge name={name} entryId={entryId} size={size} />
  }

  const px = size === 'sm' ? 28 : size === 'lg' ? 64 : 36
  return (
    <img
      className={`team-avatar team-avatar--${size}`}
      src={src}
      alt=""
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (idx < srcList.length - 1) setIdx((i) => i + 1)
        else setShowInitials(true)
      }}
    />
  )
}
