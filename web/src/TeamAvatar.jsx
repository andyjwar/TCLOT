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

/** Stable, well-spread hue per team (golden ratio on numeric id; else string hash). */
function hueForBadge(entryId, name) {
  if (entryId != null && entryId !== '') {
    const n = Number(entryId)
    if (!Number.isNaN(n)) return (n * 137.508) % 360
    const k = String(entryId)
    let h = 0
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0
    return h % 360
  }
  let h = 0
  const s = String(name || '?')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

function InitialsBadge({ name, entryId, size }) {
  const initial = (name || '?').slice(0, 2).toUpperCase()
  const hue = hueForBadge(entryId, name)
  const bg = `hsl(${Math.round(hue)} 58% 40%)`
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
