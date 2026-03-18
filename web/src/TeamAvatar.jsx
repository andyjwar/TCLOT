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

function InitialsBadge({ name, size }) {
  const initial = (name || '?').slice(0, 2).toUpperCase()
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const hue = h % 360
  const bg = `hsl(${hue} 42% 88%)`
  const fg = `hsl(${hue} 50% 22%)`
  return (
    <span
      className={`team-badge team-badge--${size}`}
      style={{ background: bg, color: fg }}
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

  const isHeader = size === 'header'

  if (entryId == null || showInitials) {
    return <InitialsBadge name={name} size={size} />
  }

  const src = srcList[idx]
  if (!src) {
    return <InitialsBadge name={name} size={size} />
  }

  return (
    <img
      className={`team-avatar team-avatar--${size}`}
      src={src}
      alt=""
      width={isHeader ? 60 : size === 'sm' ? 28 : 36}
      height={isHeader ? 60 : size === 'sm' ? 28 : 36}
      loading={isHeader ? 'eager' : 'lazy'}
      decoding={isHeader ? 'sync' : 'async'}
      fetchPriority={isHeader ? 'high' : undefined}
      onError={() => {
        if (idx < srcList.length - 1) setIdx((i) => i + 1)
        else setShowInitials(true)
      }}
    />
  )
}
