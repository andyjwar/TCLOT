import { useState, useMemo, useId } from 'react'
import {
  SHIRT_FILL_PATH,
  SHIRT_OUTLINE_PATH,
  SHIRT_TEXT_ANCHOR,
  SHIRT_VIEW_BOX,
} from './shirtSilhouettePaths'

const RAW_BASE = `${import.meta.env.BASE_URL}team-logos/`
const WEB_BASE = `${import.meta.env.BASE_URL}team-logos-web/`
const LOGO_EXTS = ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'webp', 'WEBP']

const SHIRT_TEXT = {
  sm: { fontSize: 15 },
  md: { fontSize: 20 },
  lg: { fontSize: 33 },
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
  const { fontSize } = SHIRT_TEXT[size] ?? SHIRT_TEXT.md
  const { x: textX, y: textY } = SHIRT_TEXT_ANCHOR

  const textStroke =
    kit.outline === 'light'
      ? 'rgba(255, 255, 255, 0.72)'
      : 'rgba(0, 0, 0, 0.38)'
  const strokeW = kit.mode === 'stripes' ? 1.45 : 1.05

  return (
    <svg
      className={`team-shirt team-shirt--${size}`}
      viewBox={SHIRT_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {kit.mode === 'stripes' ? (
        <defs>
          <pattern
            id={stripeId}
            width="11"
            height="140"
            y="-10"
            patternUnits="userSpaceOnUse"
          >
            <rect y="-10" width="5.5" height="140" fill={kit.a} />
            <rect y="-10" x="5.5" width="5.5" height="140" fill={kit.b} />
          </pattern>
        </defs>
      ) : null}
      <path
        d={SHIRT_FILL_PATH}
        fill={kit.mode === 'solid' ? kit.fill : `url(#${stripeId})`}
      />
      <path
        d={SHIRT_OUTLINE_PATH}
        fill="none"
        stroke="rgba(0, 0, 0, 0.34)"
        strokeWidth="0.75"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={textX}
        y={textY}
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
