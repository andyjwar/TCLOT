import { useState, useMemo, useId } from 'react'

const RAW_BASE = `${import.meta.env.BASE_URL}team-logos/`
const WEB_BASE = `${import.meta.env.BASE_URL}team-logos-web/`
const LOGO_EXTS = ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'webp', 'WEBP']

/** Simple short-sleeve shirt silhouette (viewBox 0 0 48 56). */
const SHIRT_PATH =
  'M24 9 C19 9 15 11 14 14 L9 18 6 25 9 29 11 51 h26 l2-22 3-4-3-7-5-3 C33 11 29 9 24 9 Z'

const SHIRT_TEXT = {
  sm: { fontSize: 8.5, y: 32 },
  md: { fontSize: 11.5, y: 33.5 },
  lg: { fontSize: 18, y: 35 },
}

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
 * Eight kit designs (hash % 8): solid blue; blue/white stripes; matte red; forest green;
 * black/white stripes; rust orange; yellow/green stripes; aubergine.
 * `text` = initials colour chosen for contrast on each kit.
 */
const KITS = [
  { mode: 'solid', fill: '#1d4ed8', text: '#f0f7ff', outline: 'dark' },
  { mode: 'stripes', a: '#e8f0fe', b: '#1e40af', text: '#ffffff', outline: 'dark' },
  { mode: 'solid', fill: '#9f1b2e', text: '#fff5f5', outline: 'dark' },
  { mode: 'solid', fill: '#14532d', text: '#ecfdf3', outline: 'dark' },
  { mode: 'stripes', a: '#f5f5f5', b: '#1a1a1a', text: '#ffffff', outline: 'dark' },
  { mode: 'solid', fill: '#c2410c', text: '#fff8f0', outline: 'dark' },
  { mode: 'stripes', a: '#facc15', b: '#166534', text: '#1a1a0a', outline: 'light' },
  { mode: 'solid', fill: '#4a1d4d', text: '#faf5ff', outline: 'dark' },
]

function fnv1a32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function kitStyleIndex(entryId, name) {
  const key = `${entryId == null ? '' : String(entryId)}\u{1e}${name == null ? '' : String(name)}`
  const h = fnv1a32(key)
  const mixed = Math.imul(h, 2654435769) >>> 0
  return mixed % KITS.length
}

function patternIdBase(reactId) {
  return `k${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
}

function ShirtInitialsBadge({ name, entryId, size }) {
  const initial = (name || '?').slice(0, 2).toUpperCase()
  const kit = KITS[kitStyleIndex(entryId, name)]
  const reactId = useId()
  const pid = patternIdBase(reactId)
  const stripeId = `${pid}-stripe`
  const { fontSize, y } = SHIRT_TEXT[size] ?? SHIRT_TEXT.md

  const textStroke =
    kit.outline === 'light'
      ? 'rgba(255, 255, 255, 0.72)'
      : 'rgba(0, 0, 0, 0.38)'
  const strokeW = kit.mode === 'stripes' ? 1.45 : 1.05

  return (
    <svg
      className={`team-shirt team-shirt--${size}`}
      viewBox="0 0 48 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {kit.mode === 'stripes' ? (
        <defs>
          <pattern
            id={stripeId}
            width="10"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <rect width="5" height="56" fill={kit.a} />
            <rect x="5" width="5" height="56" fill={kit.b} />
          </pattern>
        </defs>
      ) : null}
      <path
        d={SHIRT_PATH}
        fill={kit.mode === 'solid' ? kit.fill : `url(#${stripeId})`}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.6"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x="24"
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={kit.text}
        stroke={textStroke}
        strokeWidth={strokeW}
        paintOrder="stroke fill"
        style={{
          fontFamily: 'inherit',
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        {initial}
      </text>
    </svg>
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
    return <ShirtInitialsBadge name={name} entryId={entryId} size={size} />
  }

  const src = srcList[idx]
  if (!src) {
    return <ShirtInitialsBadge name={name} entryId={entryId} size={size} />
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
