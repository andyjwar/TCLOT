import { useMemo, useState } from 'react'
import './WireLiveSeasonMockup.css'

/**
 * Local-only Players / Wire live-season preview (`?wirelive=1`).
 *
 * Production Wire is the same tile list year-round. Off-season it looks empty
 * under each name because `buildNextFixturesByTeam` has nothing upcoming.
 * This page shows that same chrome mid-season (next-3 crests, owner avatars,
 * LIVE / FT nav) without changing production code.
 */

const PL = {
  ARS: { color: '#ef0107' },
  AVL: { color: '#670e36' },
  BOU: { color: '#da291c' },
  BRE: { color: '#e30613' },
  BHA: { color: '#0057b8' },
  CHE: { color: '#034694' },
  CRY: { color: '#1b458f' },
  EVE: { color: '#003399' },
  FUL: { color: '#000000' },
  LEE: { color: '#ffcd00' },
  LIV: { color: '#c8102e' },
  MCI: { color: '#6cabdd' },
  MUN: { color: '#da291c' },
  NEW: { color: '#241f20' },
  NFO: { color: '#e53233' },
  TOT: { color: '#132257' },
  WHU: { color: '#7a263a' },
  WOL: { color: '#fdb913' },
}

const OWNERS = {
  TO: { initials: 'TO', color: '#b1364c', name: 'Toronto Oizo' },
  HM: { initials: 'HM', color: '#0f766e', name: 'Hackney Meat Loaf' },
  CC: { initials: 'CC', color: '#4f46e5', name: 'Clapton Cornershop' },
  CE: { initials: 'CE', color: '#b45309', name: 'Crouch End Oashisu' },
  MJ: { initials: 'MJ', color: '#0369a1', name: 'Morpeth Jamiroquai' },
  SC: { initials: 'SC', color: '#7c3aed', name: 'Seoul Club 7' },
}

const NOW_PLAYERS = [
  { name: 'Rice', club: 'ARS', pos: 'M', pts: 184, gp: 36, g: 4, a: 9, dc: 14 },
  { name: 'João Pedro', club: 'CHE', pos: 'F', pts: 177, gp: 35, g: 15, a: 9, dc: 0 },
  { name: 'Rogers', club: 'AVL', pos: 'M', pts: 169, gp: 37, g: 8, a: 14, dc: 1 },
  { name: 'Watkins', club: 'AVL', pos: 'F', pts: 167, gp: 37, g: 16, a: 8, dc: 0 },
  { name: 'Gvardiol', club: 'MCI', pos: 'D', pts: 162, gp: 36, g: 5, a: 2, dc: 6 },
  { name: 'J.Timber', club: 'ARS', pos: 'D', pts: 149, gp: 30, g: 1, a: 3, dc: 3, injury: true },
  { name: 'Bowen', club: 'WHU', pos: 'M', pts: 148, gp: 34, g: 13, a: 8, dc: 4 },
  { name: 'Raya', club: 'ARS', pos: 'G', pts: 148, gp: 38, g: 0, a: 0, dc: 0 },
]

const LIVE_WIRE = [
  {
    name: 'Semenyo',
    club: 'BOU',
    pos: 'M',
    pts: 68,
    gp: 12,
    g: 6,
    a: 3,
    dc: 4,
    next3: [
      { club: 'WHU', home: true },
      { club: 'LIV', home: false },
      { club: 'BHA', home: true },
    ],
  },
  {
    name: 'Cunha',
    club: 'WOL',
    pos: 'F',
    pts: 61,
    gp: 11,
    g: 5,
    a: 4,
    dc: 0,
    next3: [
      { club: 'NFO', home: true },
      { club: 'MCI', home: false },
      { club: 'FUL', home: true },
    ],
  },
  {
    name: 'Schade',
    club: 'BRE',
    pos: 'F',
    pts: 57,
    gp: 12,
    g: 5,
    a: 2,
    dc: 0,
    next3: [
      { club: 'EVE', home: false },
      { club: 'CHE', home: true },
      { club: 'LEE', home: false },
    ],
  },
  {
    name: 'Rogers',
    club: 'AVL',
    pos: 'M',
    pts: 55,
    gp: 12,
    g: 3,
    a: 4,
    dc: 1,
    next3: [
      { club: 'MCI', home: true },
      { club: 'BRE', home: false },
      { club: 'NFO', home: true },
    ],
  },
  {
    name: 'J.Timber',
    club: 'ARS',
    pos: 'D',
    pts: 52,
    gp: 10,
    g: 1,
    a: 2,
    dc: 2,
    injury: true,
    next3: [
      { club: 'WHU', home: true },
      { club: 'LIV', home: false },
      { club: 'BHA', home: true },
    ],
  },
  {
    name: 'Andersen',
    club: 'FUL',
    pos: 'D',
    pts: 49,
    gp: 12,
    g: 1,
    a: 0,
    dc: 6,
    next3: [
      { club: 'TOT', home: false },
      { club: 'BOU', home: true },
      { club: 'NEW', home: false },
    ],
  },
  {
    name: 'Kudus',
    club: 'TOT',
    pos: 'M',
    pts: 47,
    gp: 11,
    g: 3,
    a: 3,
    dc: 2,
    next3: [
      { club: 'FUL', home: true },
      { club: 'CRY', home: false },
      { club: 'MUN', home: true },
    ],
  },
  {
    name: 'Verbruggen',
    club: 'BHA',
    pos: 'G',
    pts: 46,
    gp: 12,
    g: 0,
    a: 0,
    dc: 0,
    next3: [
      { club: 'ARS', home: false },
      { club: 'WHU', home: true },
      { club: 'EVE', home: false },
    ],
  },
]

const LIVE_OWNED = [
  {
    name: 'Rice',
    club: 'ARS',
    pos: 'M',
    pts: 71,
    gp: 12,
    g: 2,
    a: 3,
    dc: 5,
    owner: 'CE',
    next3: [
      { club: 'WHU', home: true },
      { club: 'LIV', home: false },
      { club: 'BHA', home: true },
    ],
  },
  {
    name: 'João Pedro',
    club: 'CHE',
    pos: 'F',
    pts: 66,
    gp: 11,
    g: 6,
    a: 3,
    dc: 0,
    owner: 'TO',
    next3: [
      { club: 'NEW', home: true },
      { club: 'BRE', home: false },
      { club: 'AVL', home: true },
    ],
  },
  {
    name: 'Palmer',
    club: 'CHE',
    pos: 'M',
    pts: 64,
    gp: 12,
    g: 4,
    a: 5,
    dc: 1,
    owner: 'HM',
    next3: [
      { club: 'NEW', home: true },
      { club: 'BRE', home: false },
      { club: 'AVL', home: true },
    ],
  },
  {
    name: 'Watkins',
    club: 'AVL',
    pos: 'F',
    pts: 59,
    gp: 12,
    g: 6,
    a: 2,
    dc: 0,
    owner: 'CC',
    next3: [
      { club: 'MCI', home: true },
      { club: 'BRE', home: false },
      { club: 'NFO', home: true },
    ],
  },
  {
    name: 'Gvardiol',
    club: 'MCI',
    pos: 'D',
    pts: 58,
    gp: 12,
    g: 2,
    a: 1,
    dc: 3,
    owner: 'MJ',
    next3: [
      { club: 'AVL', home: false },
      { club: 'WOL', home: true },
      { club: 'LIV', home: true },
    ],
  },
  {
    name: 'Bowen',
    club: 'WHU',
    pos: 'M',
    pts: 54,
    gp: 11,
    g: 4,
    a: 3,
    dc: 2,
    owner: 'SC',
    next3: [
      { club: 'ARS', home: false },
      { club: 'BHA', home: false },
      { club: 'NFO', home: true },
    ],
  },
  {
    name: 'Raya',
    club: 'ARS',
    pos: 'G',
    pts: 53,
    gp: 12,
    g: 0,
    a: 0,
    dc: 0,
    owner: 'CE',
    next3: [
      { club: 'WHU', home: true },
      { club: 'LIV', home: false },
      { club: 'BHA', home: true },
    ],
  },
  {
    name: 'Isak',
    club: 'LIV',
    pos: 'F',
    pts: 51,
    gp: 9,
    g: 5,
    a: 1,
    dc: 0,
    owner: 'TO',
    injury: true,
    next3: [
      { club: 'ARS', home: true },
      { club: 'MCI', home: false },
      { club: 'BOU', home: true },
    ],
  },
]

const SCENES = {
  now: {
    id: 'now',
    season: '2025/26',
    status: null,
    nav: 'pre',
    mode: 'wire',
    players: NOW_PLAYERS,
    caption: 'What you are looking at now',
    detail: 'Season complete. Next-3 is a dash. Centre tab is the 26/27 hub.',
  },
  idle: {
    id: 'idle',
    season: '2026/27',
    status: { kind: 'idle', strong: 'GW 11 complete', rest: 'Waivers in 2d 4h · Fri 13:30' },
    nav: 'over',
    ftGw: 11,
    mode: 'wire',
    players: LIVE_WIRE,
    caption: 'Live season · midweek',
    detail: 'Same Wire list, next-3 crests filled, FT GW chip in the nav.',
  },
  live: {
    id: 'live',
    season: '2026/27',
    status: { kind: 'live', strong: 'GW 12', rest: '2 fixtures live · 67′ · 4 of 10 complete' },
    nav: 'live',
    mode: 'wire',
    players: LIVE_WIRE,
    caption: 'Live season · match weekend',
    detail: 'Header strip goes live. Bottom centre becomes the LIVE chip.',
  },
  owned: {
    id: 'owned',
    season: '2026/27',
    status: { kind: 'live', strong: 'GW 12', rest: '2 fixtures live · 67′ · 4 of 10 complete' },
    nav: 'live',
    mode: 'owned',
    players: LIVE_OWNED,
    caption: 'Owned tab during a live GW',
    detail: 'Rostered players get the owner avatar between name and PTS.',
  },
}

function Crest({ club, size = 24 }) {
  const meta = PL[club]
  return (
    <span
      className="wlsm-crest wlsm-crest--fallback"
      style={{ width: size, height: size, background: meta?.color ?? '#888' }}
      aria-hidden
    >
      {club.slice(0, 1)}
    </span>
  )
}

function FixtureChip({ club, home }) {
  return (
    <span
      className={'wlsm-fx' + (home ? ' is-home' : ' is-away')}
      title={`${home ? 'Home' : 'Away'} vs ${club}`}
    >
      <Crest club={club} size={14} />
    </span>
  )
}

function OwnerDot({ ownerId }) {
  const owner = OWNERS[ownerId]
  if (!owner) return null
  return (
    <span className="wlsm-owner" title={`Owned by ${owner.name}`} style={{ background: owner.color }}>
      {owner.initials}
    </span>
  )
}

function LionIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12.2 3.2c1.1 1.4 1.7 2.6 1.8 3.6.8-.2 1.7.1 2.3.8.4.5.5 1.2.3 1.8 1 .9 1.6 2 1.8 3.3.3 1.8-.3 3.7-1.6 5.1-1.1 1.2-2.6 1.9-4.2 2.1v1.9h-1.6v-1.9c-2.2-.3-4-1.5-5.1-3.4C4.6 14 4.5 11.4 5.8 9.3c.6-1 1.5-1.8 2.5-2.3-.1-.7.1-1.5.6-2 .6-.7 1.6-1 2.5-.8.2-1 .8-2.1 1.8-3zm-.4 4.1c-.7.1-1.3.6-1.5 1.3l-.2.8-.8.2c-.8.2-1.4.8-1.6 1.6-.4 1.4.1 2.9 1.3 3.8.9.7 2 .9 3.1.7 1.4-.3 2.5-1.4 2.8-2.8.2-1.1-.1-2.2-.8-3-.5-.6-1.2-.9-2-.9h-.3z"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function NavSvg({ name }) {
  if (name === 'table') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M7 16v-5" />
        <path d="M12 16V8" />
        <path d="M17 16v-3" />
      </svg>
    )
  }
  if (name === 'moves') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (name === 'players') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m16 3 4 4-4 4" />
        <path d="M20 7H4" />
        <path d="m8 21-4-4 4-4" />
        <path d="M4 17h16" />
      </svg>
    )
  }
  if (name === 'more') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="19" cy="12" r="1.7" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5v14" />
      <path d="M3 12h5" />
      <path d="M16 9h2" />
      <path d="M16 13h2" />
    </svg>
  )
}

function StatusStrip({ status }) {
  if (!status) return null
  return (
    <div className={`wlsm-status wlsm-status--${status.kind}`}>
      {status.kind === 'live' ? <span className="wlsm-live-dot" aria-hidden /> : null}
      <strong>{status.strong}</strong>
      <span className="wlsm-status__sep">·</span>
      <span>{status.rest}</span>
    </div>
  )
}

function PhoneChrome({ scene, mode, onMode, interactive = false }) {
  const players = scene.players
  const showOwned = mode === 'owned'
  const cols = showOwned
    ? ['PTS', 'GP', 'G', 'A', 'DC']
    : ['PTS', 'GP', 'G', 'A', 'DC']

  return (
    <div className="wlsm-phone" data-scene={scene.id} data-mode={mode}>
      <div className="wlsm-phone__statusbar">
        <span>07:23</span>
        <span className="wlsm-phone__island" aria-hidden />
        <span>96</span>
      </div>
      <header className="wlsm-header">
        <div className="wlsm-header__row">
          <span className="wlsm-pill">
            <LionIcon />
            TCLOT
          </span>
          <span className="wlsm-season">{scene.season}</span>
        </div>
        <StatusStrip status={scene.status} />
      </header>

      <div className="wlsm-toolbar">
        <label className="wlsm-search">
          <SearchIcon />
          <input readOnly={!interactive} placeholder="Search players" aria-label="Search players" />
        </label>
        <div className="wlsm-segment" role="group" aria-label="Ownership filter">
          <button
            type="button"
            className={mode === 'wire' ? 'is-active' : ''}
            onClick={interactive ? () => onMode('wire') : undefined}
            tabIndex={interactive ? 0 : -1}
          >
            Wire
          </button>
          <button
            type="button"
            className={mode === 'owned' ? 'is-active' : ''}
            onClick={interactive ? () => onMode('owned') : undefined}
            tabIndex={interactive ? 0 : -1}
          >
            Owned
          </button>
        </div>
      </div>

      <div className="wlsm-filters" aria-hidden>
        <span>Position · All</span>
        <span>Club · All</span>
        <span>Stats · 4</span>
      </div>

      <div className="wlsm-colhead">
        <span className="wlsm-colhead__spacer" />
        {showOwned ? <span className="wlsm-colhead__owner-gap" /> : null}
        <div className="wlsm-colhead__cols">
          {cols.map((c, i) => (
            <span key={c} className={i === 0 ? 'is-sorted' : ''}>
              {c}
              {i === 0 ? <i>↓</i> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="wlsm-list" role="list">
        {players.map((p) => (
          <div
            key={p.name}
            className={'wlsm-row' + (p.owner && showOwned ? ' has-owner' : '')}
            role="listitem"
          >
            <div className="wlsm-row__left">
              <div className="wlsm-id">
                <Crest club={p.club} size={24} />
                <span className="wlsm-name">{p.name}</span>
                <span className="wlsm-pos">{p.pos}</span>
              </div>
              <div className="wlsm-sub">
                {p.injury ? (
                  <span className="wlsm-injury" title="Injured" aria-label="Injured">
                    🚑
                  </span>
                ) : null}
                {p.next3?.length ? (
                  <span className="wlsm-fx-row">
                    {p.next3.map((fx) => (
                      <FixtureChip key={`${p.name}-${fx.club}-${fx.home}`} club={fx.club} home={fx.home} />
                    ))}
                  </span>
                ) : (
                  <span className="wlsm-empty-fx">—</span>
                )}
              </div>
            </div>
            {showOwned && p.owner ? <OwnerDot ownerId={p.owner} /> : null}
            <div className="wlsm-stats">
              <span className="wlsm-pts">{p.pts}</span>
              <span>{p.gp}</span>
              <span className={p.g === 0 ? 'is-zero' : ''}>{p.g}</span>
              <span className={p.a === 0 ? 'is-zero' : ''}>{p.a}</span>
              <span className={p.dc === 0 ? 'is-zero' : ''}>{p.dc}</span>
            </div>
          </div>
        ))}
      </div>

      <nav className="wlsm-tabbar" data-gwstate={scene.nav} aria-label="App navigation">
        <span>
          <NavSvg name="table" />
          Table
        </span>
        <span>
          <NavSvg name="moves" />
          Moves
        </span>
        <span className="wlsm-tabbar__center">
          {scene.nav === 'pre' ? (
            <>
              <NavSvg name="film" />
              26/27
            </>
          ) : scene.nav === 'live' ? (
            <>
              <b className="wlsm-live-chip">
                <i />
                LIVE
              </b>
              Live
            </>
          ) : (
            <>
              <b className="wlsm-ft-chip">FT GW{scene.ftGw ?? 11}</b>
              Scores
            </>
          )}
        </span>
        <span className="is-active">
          <NavSvg name="players" />
          Players
        </span>
        <span>
          <NavSvg name="more" />
          More
        </span>
      </nav>
    </div>
  )
}

export function WireLiveSeasonMockup() {
  const [playSceneId, setPlaySceneId] = useState('live')
  const [playMode, setPlayMode] = useState('wire')

  const playScene = useMemo(() => {
    const base = SCENES[playSceneId] ?? SCENES.live
    if (playMode === 'owned') {
      return {
        ...base,
        mode: 'owned',
        players: LIVE_OWNED,
      }
    }
    if (playSceneId === 'now') return SCENES.now
    return {
      ...base,
      mode: 'wire',
      players: LIVE_WIRE,
    }
  }, [playSceneId, playMode])

  return (
    <div className="wlsm">
      <header className="wlsm-pagehead">
        <p className="wlsm-kicker">Players · Wire</p>
        <h1>How this screen looks in a live season</h1>
        <p>
          Same Players tab you have open now. Nothing about the tile layout
          changes. Mid-season the empty dash under each name becomes the next
          three fixtures, the 26/27 centre tab becomes Live / Scores, and a
          status strip sits under TCLOT.
        </p>
      </header>

      <section className="wlsm-gallery" aria-label="Side-by-side season states">
        {['now', 'idle', 'live'].map((id) => {
          const scene = SCENES[id]
          return (
            <figure key={id} className="wlsm-card">
              <figcaption>
                <strong>{scene.caption}</strong>
                <span>{scene.detail}</span>
              </figcaption>
              <PhoneChrome scene={scene} mode="wire" />
            </figure>
          )
        })}
      </section>

      <section className="wlsm-gallery wlsm-gallery--owned" aria-label="Owned tab live">
        <figure className="wlsm-card">
          <figcaption>
            <strong>{SCENES.owned.caption}</strong>
            <span>{SCENES.owned.detail}</span>
          </figcaption>
          <PhoneChrome scene={SCENES.owned} mode="owned" />
        </figure>
        <div className="wlsm-callouts">
          <h2>What fills in</h2>
          <ul>
            <li>
              <strong>Next 3 under the name.</strong> Green square = home,
              red circle = away. Production already renders this from
              upcoming fixtures. Off-season it is a dash because GW 38 is
              finished and there is no next event.
            </li>
            <li>
              <strong>Header strip.</strong> Live weekend: pulsing dot + GW +
              live count / minute. Midweek: GW complete + waiver countdown.
            </li>
            <li>
              <strong>Centre nav.</strong> 26/27 film tab is pre-season only.
              In season it is a green LIVE chip, or FT GW{'{n}'} between weeks.
            </li>
            <li>
              <strong>Wire vs Owned.</strong> Once rosters are healthy, Wire
              is free agents only. Owned shows every rostered player with the
              fantasy-team avatar aligned to the PTS pill.
            </li>
            <li>
              <strong>Stats stay season totals.</strong> PTS / GP / G / A / DC
              are still cumulative. Live GW scoring lives on the Live tab,
              not as a second points column here.
            </li>
          </ul>
        </div>
      </section>

      <section className="wlsm-play">
        <div className="wlsm-play__copy">
          <h2>Try it</h2>
          <p>Flip season phase and Wire / Owned. Layout stays locked.</p>
          <div className="wlsm-play__chips" role="group" aria-label="Season phase">
            {[
              ['now', 'Now'],
              ['idle', 'Between GWs'],
              ['live', 'Match live'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={playSceneId === id ? 'is-active' : ''}
                onClick={() => {
                  setPlaySceneId(id)
                  if (id === 'now') setPlayMode('wire')
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <PhoneChrome
          scene={playScene}
          mode={playSceneId === 'now' ? 'wire' : playMode}
          onMode={setPlayMode}
          interactive
        />
      </section>
    </div>
  )
}
