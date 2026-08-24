import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import './IdeasMockup.css'

/**
 * Local-only interactive gallery (`?ideas=1`) — motion / "moving ticket"
 * concepts pitched for review. NOTHING here is wired into production; it is a
 * playground so we can feel the choreography before porting any of it onto the
 * real Live Scores / Moves / Standings surfaces.
 *
 * Sections (each has live controls so the animation can be triggered on demand):
 *   1. Matchday Stub      — H2H fixture as a perforated programme ticket
 *   2. Season lifecycle   — WHEN each cinematic splash fires across a season
 *   3. Waiver telegraph   — waiver feed that types in like a stock ticker
 *   4. Standings FLIP      — live table rows sliding to new ranks mid-GW
 *   5. Scoreboard flip     — split-flap score digits + a data-persistence note
 *
 * Self-contained Scorebook palette (cream paper + racing green) so previews
 * read correctly regardless of the app's active theme.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Shared crest atom — initials chip, same grammar as ScorecardRemainingMockup. */
function Crest({ short, alt = false }) {
  return (
    <span className={'ideas-crest' + (alt ? ' ideas-crest--alt' : '')} aria-hidden="true">
      {short}
    </span>
  )
}

function SectionHead({ id, title, desc }) {
  return (
    <div className="ideas-sec__head">
      <span className="ideas-sec__id">Idea {id}</span>
      <h2 className="ideas-sec__title">{title}</h2>
      <p className="ideas-sec__desc">{desc}</p>
    </div>
  )
}

/* ================================================================== */
/* 1. MATCHDAY STUB                                                     */
/* ================================================================== */

const XI = 11

function RemainingGauge({ homeRemaining, awayRemaining }) {
  const played = (r) => ((XI - r) / XI) * 100
  return (
    <div className="stub-gauge" aria-hidden="true">
      <span className="stub-gauge__label">{homeRemaining === 0 ? 'FT' : homeRemaining}</span>
      <span className="stub-gauge__track">
        <span className="stub-gauge__side">
          <span className="stub-gauge__fill" style={{ width: `${played(homeRemaining)}%` }} />
        </span>
        <span className="stub-gauge__notch" />
        <span className="stub-gauge__side stub-gauge__side--away">
          <span className="stub-gauge__fill" style={{ width: `${played(awayRemaining)}%` }} />
        </span>
      </span>
      <span className="stub-gauge__label">{awayRemaining === 0 ? 'FT' : awayRemaining}</span>
    </div>
  )
}

function MatchdayStubDemo() {
  const [dealtKey, setDealtKey] = useState(0) // remount → replays the deal-in slide
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [homeRem, setHomeRem] = useState(11)
  const [awayRem, setAwayRem] = useState(11)
  const [tilt, setTilt] = useState(null) // 'home' | 'away' | null
  const [torn, setTorn] = useState(false)
  const tiltTimer = useRef(null)

  const winner = home === away ? null : home > away ? 'home' : 'away'

  const flashTilt = useCallback((side) => {
    if (prefersReducedMotion()) return
    setTilt(side)
    window.clearTimeout(tiltTimer.current)
    tiltTimer.current = window.setTimeout(() => setTilt(null), 900)
  }, [])

  useEffect(() => () => window.clearTimeout(tiltTimer.current), [])

  const deal = () => {
    setHome(0)
    setAway(0)
    setHomeRem(11)
    setAwayRem(11)
    setTorn(false)
    setTilt(null)
    setDealtKey((k) => k + 1)
  }

  const goal = (side) => {
    if (torn) return
    const pts = 4 + Math.floor(Math.random() * 4)
    if (side === 'home') {
      setHome((v) => v + pts)
      setHomeRem((r) => Math.max(0, r - 1))
    } else {
      setAway((v) => v + pts)
      setAwayRem((r) => Math.max(0, r - 1))
    }
    flashTilt(side)
  }

  const fullTime = () => {
    setHomeRem(0)
    setAwayRem(0)
    setTorn(true)
  }

  return (
    <div className="ideas-stage">
      <div className="ideas-stage__canvas">
        <div
          key={dealtKey}
          className={
            'stub-ticket ideas-anim-deal' +
            (tilt ? ` is-tilt-${tilt}` : '') +
            (torn ? ' is-torn' : '')
          }
          data-winner={winner || undefined}
        >
          <span className="stub-ticket__wash" aria-hidden="true" />
          <div className="stub-ticket__band">
            <span>GW 24</span>
            <span className="stub-ticket__seed">3RD vs 6TH</span>
          </div>
          <div className="stub-ticket__body">
            <div className="stub-side">
              <Crest short="MO" />
              <span className="stub-side__name">Mordor SFG</span>
            </div>
            <div className="stub-score">
              <span className={'stub-score__half' + (winner === 'home' ? ' is-win' : '')}>
                {home}
              </span>
              <span className="stub-score__sep">–</span>
              <span className={'stub-score__half' + (winner === 'away' ? ' is-win' : '')}>
                {away}
              </span>
            </div>
            <div className="stub-side stub-side--away">
              <span className="stub-side__name">Hackney Rohirrim</span>
              <Crest short="HR" alt />
            </div>
          </div>
          <RemainingGauge homeRemaining={homeRem} awayRemaining={awayRem} />
          <div className="stub-ticket__perf" aria-hidden="true" />
          <div className="stub-ticket__stub">
            <span>#18279</span>
            <span>SECTION · H2H</span>
            <span>{torn ? 'FINAL' : 'SEAT 3RD'}</span>
          </div>
        </div>
      </div>
      <div className="ideas-controls">
        <button type="button" onClick={deal}>Deal in ↑</button>
        <button type="button" onClick={() => goal('home')} disabled={torn}>Goal · Mordor</button>
        <button type="button" onClick={() => goal('away')} disabled={torn}>Goal · Rohirrim</button>
        <button type="button" onClick={fullTime} disabled={torn}>Full time (tear)</button>
      </div>
      <p className="ideas-note">
        Deal-in slides the ticket up from the wallet. Each goal tilts the ticket
        ~1.4° toward the side that scored and washes that half. At full time the
        stub tears along the perforation and drops. Reuses the shipped
        players-remaining gauge, so it is a wrapper + choreography layer over
        the current scorecard, not a rebuild.
      </p>
    </div>
  )
}

/* ================================================================== */
/* 2. SEASON LIFECYCLE — when the cinematics fire                       */
/* ================================================================== */

const LIFECYCLE = [
  {
    key: 'opener',
    marker: 'Pre-GW1',
    label: 'Season Opener',
    trigger: 'First visit before GW1 kicks off (once per browser, then a static poster).',
    stage: 'hobbiton',
    caption: 'Hobbiton opener — the road goes ever on.',
  },
  {
    key: 'goh',
    marker: 'GW1',
    label: 'Guard of Honour',
    trigger: 'GW1 only, on the reigning champion\'s fixture. Auto-plays ≤3×/tab, Replay always available.',
    stage: 'pitch',
    caption: 'Champions form the guard; Higman walks the line.',
    shipped: true,
  },
  {
    key: 'eos',
    marker: 'Final GW',
    label: 'End of Season',
    trigger: 'Once the final GW is complete. Plays once per tab, then collapses to a strip.',
    stage: 'club',
    caption: 'Higman in VIP; the wooden spoon does the puzzle.',
  },
]

function MiniStage({ kind }) {
  return (
    <span className={`mini-stage mini-stage--${kind}`} aria-hidden="true">
      <span className="mini-stage__dot mini-stage__dot--hero" />
      <span className="mini-stage__dot mini-stage__dot--a" />
      <span className="mini-stage__dot mini-stage__dot--b" />
      <span className="mini-stage__dot mini-stage__dot--c" />
    </span>
  )
}

function SeasonLifecycleDemo() {
  const [active, setActive] = useState(null)
  const activeItem = LIFECYCLE.find((l) => l.key === active) || null

  return (
    <div className="ideas-stage">
      <div className="lifecycle">
        <span className="lifecycle__rail" aria-hidden="true" />
        {LIFECYCLE.map((l) => (
          <button
            key={l.key}
            type="button"
            className={'lifecycle__node' + (active === l.key ? ' is-active' : '')}
            onClick={() => setActive(l.key)}
          >
            <span className="lifecycle__marker">{l.marker}</span>
            <span className="lifecycle__pin" />
            <span className="lifecycle__label">
              {l.label}
              {l.shipped ? <span className="lifecycle__tag">live</span> : <span className="lifecycle__tag lifecycle__tag--todo">to wire</span>}
            </span>
          </button>
        ))}
      </div>

      {activeItem ? (
        <div className="lifecycle__preview" key={activeItem.key}>
          <MiniStage kind={activeItem.stage} />
          <div className="lifecycle__previewMeta">
            <strong>{activeItem.label}</strong>
            <span className="lifecycle__caption">{activeItem.caption}</span>
            <span className="lifecycle__trigger">Fires: {activeItem.trigger}</span>
          </div>
        </div>
      ) : (
        <p className="ideas-note ideas-note--center">Tap a milestone to see when its cinematic fires.</p>
      )}

      <p className="ideas-note">
        The full cinematics already exist (Guard of Honour is live; Season Opener
        and End of Season are built but unwired). The only work is a small
        lifecycle hook that decides which beat is due — GW number, whether the
        final GW is complete, and a per-tab session cap — then mounts the
        matching splash. The mini-stages here are stand-ins for the real 30–45s
        SVG sequences.
      </p>
    </div>
  )
}

/* ================================================================== */
/* 3. WAIVER TELEGRAPH                                                  */
/* ================================================================== */

const WAIVER_QUEUE = [
  { order: 1, team: 'MORDOR SFG', inName: 'Mateta', outName: 'Wissa' },
  { order: 2, team: 'SEOUL SHIRE', inName: 'Sarr', outName: 'Kluivert' },
  { order: 3, team: 'TORONTO GIMLI', inName: 'Rogers', outName: 'McNeil' },
  { order: null, team: 'ATLÉTICO BILBO', inName: 'Wood', outName: 'Evanilson' }, // FA
  { order: 4, team: 'REGORASU', inName: 'Tonali', outName: 'Gravenberch' },
]

function telegraphLine(m) {
  const tag = m.order == null ? 'FA ' : `#${m.order} `
  return `${tag}${m.team}  ↑ ${m.inName}  ↓ ${m.outName}`
}

function TelegraphRow({ text, live }) {
  const animate = live && !prefersReducedMotion()
  const [typed, setTyped] = useState(() => (animate ? '' : text))

  useEffect(() => {
    if (!animate) return undefined
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 34)
    return () => window.clearInterval(id)
  }, [animate, text])

  const shown = live ? typed : text
  const done = shown.length >= text.length

  return (
    <div className={'telegraph__row' + (done ? ' is-done' : '') + (live ? ' is-live' : '')}>
      <span className="telegraph__text">{shown}</span>
      {live && !done ? <span className="telegraph__caret" aria-hidden="true" /> : null}
    </div>
  )
}

function WaiverTelegraphDemo() {
  const [count, setCount] = useState(1)
  const rows = WAIVER_QUEUE.slice(0, count)
  const atEnd = count >= WAIVER_QUEUE.length

  return (
    <div className="ideas-stage">
      <div className="telegraph" role="log" aria-live="polite">
        <div className="telegraph__masthead">
          <span>TCLOT WAIVER WIRE</span>
          <span className="telegraph__gw">GW 24 · processed</span>
        </div>
        <div className="telegraph__feed">
          {rows.map((m, i) => (
            <TelegraphRow
              key={`${m.team}-${i}`}
              text={telegraphLine(m)}
              live={i === count - 1}
            />
          ))}
        </div>
      </div>
      <div className="ideas-controls">
        <button type="button" onClick={() => setCount((c) => Math.min(c + 1, WAIVER_QUEUE.length))} disabled={atEnd}>
          Process next ↦
        </button>
        <button type="button" onClick={() => setCount(1)}>Replay week</button>
      </div>
      <p className="ideas-note">
        Each processed move types in character-by-character on a mono cream-on-green
        strip, then settles with a soft highlight. Free-agency moves read <code>FA</code>
        instead of a waiver order number. It replaces the static waiver list on the
        Moves tab with a feed that feels like it is landing in real time.
      </p>
    </div>
  )
}

/* ================================================================== */
/* 4. STANDINGS FLIP (rows slide to new ranks)                          */
/* ================================================================== */

const INITIAL_TABLE = [
  { id: 1, name: 'Mordor SFG', short: 'MO', pts: 42 },
  { id: 2, name: 'Seoul Shire', short: 'SS', pts: 39 },
  { id: 3, name: 'Regorasu', short: 'RE', pts: 37 },
  { id: 4, name: 'Toronto Gimli', short: 'TG', pts: 34 },
  { id: 5, name: 'Atlético Bilbo', short: 'AB', pts: 30 },
  { id: 6, name: 'Hackney Rohirrim', short: 'HR', pts: 28 },
  { id: 7, name: 'Balrogs FC', short: 'BA', pts: 24 },
  { id: 8, name: 'Sméagol', short: 'SM', pts: 19 },
]

function StandingsFlipDemo() {
  const [rows, setRows] = useState(INITIAL_TABLE)
  const [gw, setGw] = useState(24)
  const nodeRefs = useRef(new Map())
  const prevRects = useRef(new Map())

  // Snapshot positions BEFORE paint, then transform-from-old and release.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const first = prevRects.current
    nodeRefs.current.forEach((node, id) => {
      if (!node) return
      const prev = first.get(id)
      const next = node.getBoundingClientRect().top
      if (prev != null) {
        const delta = prev - next
        if (delta) {
          node.style.transition = 'none'
          node.style.transform = `translateY(${delta}px)`
          // Force reflow so the release transition actually runs.
          void node.getBoundingClientRect()
          node.style.transition = 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)'
          node.style.transform = ''
        }
      }
    })
  }, [rows])

  const snapshot = () => {
    const map = new Map()
    nodeRefs.current.forEach((node, id) => {
      if (node) map.set(id, node.getBoundingClientRect().top)
    })
    prevRects.current = map
  }

  const advance = () => {
    snapshot()
    setRows((prev) => {
      const bumped = prev.map((r) => ({
        ...r,
        pts: r.pts + Math.floor(Math.random() * 7), // 0–6 pts this GW
      }))
      bumped.sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
      return bumped
    })
    setGw((g) => g + 1)
  }

  const reset = () => {
    snapshot()
    setRows(INITIAL_TABLE)
    setGw(24)
  }

  return (
    <div className="ideas-stage">
      <div className="flip-table">
        <div className="flip-table__head">
          <span>After GW {gw}</span>
          <span>PTS</span>
        </div>
        {rows.map((r, i) => {
          const rank = i + 1
          const zone = rank === 1 ? 'title' : rank === rows.length ? 'spoon' : null
          return (
            <div
              key={r.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(r.id, el)
                else nodeRefs.current.delete(r.id)
              }}
              className={'flip-row' + (zone ? ` flip-row--${zone}` : '')}
            >
              <span className="flip-row__rank">{rank}</span>
              <Crest short={r.short} alt={i % 2 === 1} />
              <span className="flip-row__name">{r.name}</span>
              {zone === 'title' ? <span className="flip-row__zone">TITLE</span> : null}
              {zone === 'spoon' ? <span className="flip-row__zone flip-row__zone--spoon">SPOON</span> : null}
              <span className="flip-row__pts">{r.pts}</span>
            </div>
          )
        })}
      </div>
      <div className="ideas-controls">
        <button type="button" onClick={advance}>Advance gameweek ↻</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
      <p className="ideas-note">
        Adds a random 0–6 points to each team, re-sorts, and lets the rows glide
        to their new positions with the FLIP technique (measure old top, translate
        from it, release the transform under a transition). The title and wooden-spoon
        rows keep a persistent zone tag so promotions/relegations read at a glance.
      </p>
    </div>
  )
}

/* ================================================================== */
/* 5. MECHANICAL SCOREBOARD FLIP                                        */
/* ================================================================== */

/** One split-flap digit. Animates only when its value actually changes.
 *  Uses the React-endorsed "adjust state during render" pattern to detect a
 *  changed prop (no ref reads in render, no synchronous setState in effects). */
function FlipDigit({ digit }) {
  const [committed, setCommitted] = useState(digit)
  const [flipping, setFlipping] = useState(false)

  if (digit !== committed && !flipping) {
    if (prefersReducedMotion()) setCommitted(digit)
    else setFlipping(true)
  }

  useEffect(() => {
    if (!flipping) return undefined
    const id = window.setTimeout(() => {
      setCommitted(digit)
      setFlipping(false)
    }, 260)
    return () => window.clearTimeout(id)
  }, [flipping, digit])

  return (
    <span className={'flap' + (flipping ? ' is-flipping' : '')}>
      <span className="flap__prev">{committed}</span>
      <span className="flap__next">{digit}</span>
    </span>
  )
}

function FlipNumber({ value }) {
  const chars = String(value).padStart(2, '0').split('')
  return (
    <span className="flap-num" aria-label={String(value)}>
      {chars.map((c, i) => (
        <FlipDigit key={i} digit={c} />
      ))}
    </span>
  )
}

function ScoreboardFlipDemo() {
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    const id = window.setInterval(() => {
      // Simulate a poll tick: usually nothing changes, occasionally a return.
      const roll = Math.random()
      if (roll < 0.45) setHome((v) => v + (1 + Math.floor(Math.random() * 6)))
      else if (roll < 0.9) setAway((v) => v + (1 + Math.floor(Math.random() * 6)))
      // ~10% of ticks: a bonus recalculation nudges a score DOWN.
      else setHome((v) => Math.max(0, v - 1))
    }, 1600)
    return () => window.clearInterval(id)
  }, [auto])

  return (
    <div className="ideas-stage">
      <div className="scoreboard">
        <div className="scoreboard__side">
          <Crest short="MO" />
          <span className="scoreboard__name">Mordor</span>
        </div>
        <div className="scoreboard__digits">
          <FlipNumber value={home} />
          <span className="scoreboard__colon">:</span>
          <FlipNumber value={away} />
        </div>
        <div className="scoreboard__side scoreboard__side--away">
          <span className="scoreboard__name">Rohirrim</span>
          <Crest short="HR" alt />
        </div>
      </div>
      <div className="ideas-controls">
        <button type="button" onClick={() => setHome((v) => v + 1)}>Mordor +1</button>
        <button type="button" onClick={() => setHome((v) => v + 3)}>Mordor +3</button>
        <button type="button" onClick={() => setAway((v) => v + 1)}>Rohirrim +1</button>
        <button
          type="button"
          className={auto ? 'is-on' : ''}
          onClick={() => setAuto((a) => !a)}
        >
          {auto ? '■ Stop poll sim' : '▶ Simulate live poll'}
        </button>
        <button type="button" onClick={() => { setHome(0); setAway(0) }}>Reset</button>
      </div>
      <div className="ideas-datacard">
        <h3>How the data has to work for this</h3>
        <p>
          A flap animation needs a <em>from</em> and a <em>to</em>. Today
          <code> useLiveScores</code> polls the FPL draft APIs on an interval and
          <strong> overwrites</strong> the score state each tick, and a full page
          reload re-fetches from zero. So the flip needs its own memory of the
          last value it showed.
        </p>
        <ul>
          <li><strong>In-session tick:</strong> keep the previous total in a ref; diff against the new poll; flip only the digits that changed.</li>
          <li><strong>Across reloads:</strong> persist last-seen totals in <code>sessionStorage</code> keyed by <code>gw:entryId</code>; seed the flap's <em>from</em> on mount so a reload does not slot-machine 0→current.</li>
          <li><strong>First ever load:</strong> no stored value → render static, no flip.</li>
          <li><strong>Scores can drop:</strong> provisional bonus / auto-sub reversals lower a total, so the flap handles down as well as up.</li>
          <li><strong>GW rollover:</strong> the <code>gw</code> in the key resets memory so GW24-final never flips into GW25-zero.</li>
          <li><strong>Reduced motion:</strong> snap to the value, no flap.</li>
        </ul>
      </div>
    </div>
  )
}

/* ================================================================== */

const SECTIONS = [
  {
    id: '1',
    title: 'Matchday Stub',
    desc: 'Each H2H fixture as a perforated programme ticket: deal-in slide, tilt-on-goal, tear-at-full-time.',
    render: () => <MatchdayStubDemo />,
  },
  {
    id: '2',
    title: 'Season lifecycle cinematics',
    desc: 'A map of WHEN each splash fires — and how little wiring the already-built Opener and End-of-Season need.',
    render: () => <SeasonLifecycleDemo />,
  },
  {
    id: '3',
    title: 'Waiver telegraph',
    desc: 'The weekly waiver feed types in like a stock ticker instead of appearing as a static list.',
    render: () => <WaiverTelegraphDemo />,
  },
  {
    id: '4',
    title: 'Live standings FLIP',
    desc: 'Table rows glide to their new rank as points land mid-gameweek, with title / wooden-spoon zones flagged.',
    render: () => <StandingsFlipDemo />,
  },
  {
    id: '5',
    title: 'Mechanical scoreboard flip',
    desc: 'Split-flap score digits that flip on real deltas — plus how the data layer has to store prior values.',
    render: () => <ScoreboardFlipDemo />,
  },
]

export function IdeasMockup() {
  return (
    <div className="ideas">
      <header className="ideas-top">
        <span className="ideas-kicker">TCLOT · motion &amp; moving-ticket concepts</span>
        <h1>Fun ideas — interactive review</h1>
        <p>
          Five concepts to make the app feel alive: the matchday ticket, the
          season cinematics timeline, the waiver telegraph, the live standings
          slide, and the mechanical scoreboard flip. Every demo has controls so
          you can trigger the motion yourself. Nothing here is wired into the
          real app — open via <code>?ideas=1</code>.
        </p>
        <a href="/">← Back to app</a>
      </header>

      <div className="ideas-grid">
        {SECTIONS.map((s) => (
          <section key={s.id} className="ideas-sec">
            <SectionHead id={s.id} title={s.title} desc={s.desc} />
            {s.render()}
          </section>
        ))}
      </div>

      <p className="ideas-foot">
        Local preview only · <code>?ideas=1</code> · respects{' '}
        <code>prefers-reduced-motion</code>.
      </p>
    </div>
  )
}
