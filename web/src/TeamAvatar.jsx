import { useState, useMemo, useId } from 'react'
import {
  SHIRT_FILL_PATH,
  SHIRT_OUTLINE_PATH,
  SHIRT_TEXT_ANCHOR,
  SHIRT_VIEW_BOX,
} from './shirtSilhouettePaths'
import { TEAM_KITS, TEAM_KIT_COUNT } from './teamKitStyles'

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

function fnv1a32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Map hit from standings-assigned kits; else stable hash fallback. */
function resolveKitIndex(entryId, kitIndexByEntry, name) {
  if (entryId != null && kitIndexByEntry && typeof kitIndexByEntry === 'object') {
    const n = Number(entryId)
    const raw = kitIndexByEntry[n] ?? kitIndexByEntry[String(n)]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const m = Math.floor(raw) % TEAM_KIT_COUNT
      return ((m % TEAM_KIT_COUNT) + TEAM_KIT_COUNT) % TEAM_KIT_COUNT
    }
  }
  const key = `${entryId == null ? '' : String(entryId)}\u{1e}${name == null ? '' : String(name)}`
  const h = fnv1a32(key)
  const mixed = Math.imul(h, 2654435769) >>> 0
  return mixed % TEAM_KIT_COUNT
}

function patternIdBase(reactId) {
  return `k${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
}

function ShirtInitialsBadge({ name, entryId, size, kitIndex }) {
  const initial = (name || '?').slice(0, 2).toUpperCase()
  const kit = TEAM_KITS[kitIndex] ?? TEAM_KITS[0]
  const reactId = useId()
  const pid = patternIdBase(reactId)
  const stripeVId = `${pid}-sv`
  const stripeHId = `${pid}-sh`
  const { fontSize } = SHIRT_TEXT[size] ?? SHIRT_TEXT.md
  const { x: textX, y: textY } = SHIRT_TEXT_ANCHOR

  const textStroke =
    kit.outline === 'light'
      ? 'rgba(255, 255, 255, 0.72)'
      : 'rgba(0, 0, 0, 0.38)'
  const strokeW = kit.mode === 'solid' ? 1.05 : 1.45

  const fill =
    kit.mode === 'solid'
      ? kit.fill
      : kit.mode === 'stripes-v'
        ? `url(#${stripeVId})`
        : `url(#${stripeHId})`

  return (
    <svg
      className={`team-shirt team-shirt--${size}`}
      viewBox={SHIRT_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {kit.mode === 'stripes-v' ? (
        <defs>
          <pattern
            id={stripeVId}
            width="11"
            height="140"
            y="-10"
            patternUnits="userSpaceOnUse"
          >
            <rect y="-10" width="5.5" height="140" fill={kit.a} />
            <rect y="-10" x="5.5" width="5.5" height="140" fill={kit.b} />
          </pattern>
        </defs>
      ) : kit.mode === 'stripes-h' ? (
        <defs>
          <pattern
            id={stripeHId}
            width="140"
            height="12"
            y="-10"
            patternUnits="userSpaceOnUse"
          >
            <rect y="-10" width="140" height="6" fill={kit.a} />
            <rect y="-4" width="140" height="6" fill={kit.b} />
          </pattern>
        </defs>
      ) : null}
      <path d={SHIRT_FILL_PATH} fill={fill} />
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
export function TeamAvatar({
  entryId,
  name,
  size = 'md',
  logoMap = {},
  kitIndexByEntry,
}) {
  const kitIndex = useMemo(
    () => resolveKitIndex(entryId, kitIndexByEntry, name),
    [entryId, kitIndexByEntry, name],
  )
  const srcList = useMemo(() => buildSrcList(entryId, logoMap), [entryId, logoMap])
  const [idx, setIdx] = useState(0)
  const [showInitials, setShowInitials] = useState(false)

  if (entryId == null || showInitials) {
    return (
      <ShirtInitialsBadge
        name={name}
        entryId={entryId}
        size={size}
        kitIndex={kitIndex}
      />
    )
  }

  const src = srcList[idx]
  if (!src) {
    return (
      <ShirtInitialsBadge
        name={name}
        entryId={entryId}
        size={size}
        kitIndex={kitIndex}
      />
    )
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
