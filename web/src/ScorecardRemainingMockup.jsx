import './ScorecardRemainingMockup.css'

/**
 * Local-only gallery (`?scorecard=1`) — "players remaining" visuals for the
 * Live Odds-sized scorecard.
 *
 * Locked pieces (same on every option): the card shell at Live Odds size,
 * the tinted banner strip with the seeding label left and the FAVOURITE'S
 * odds top-right, and the crest / fitted name / centred score header with
 * the winner glass pill.
 *
 * The variable piece is the quiet visual BELOW the score showing how many
 * of each side's 11 starters are still to play. Two sample fixtures per
 * option: one mid-gameweek (9 v 9) and one nearly settled (2 left vs FT) so
 * every treatment shows its countdown and its finished state.
 */

const XI = 11

const FIXTURES = [
  {
    key: 'early',
    seed: '1ST VS 5TH',
    fav: 'MORDOR SFG 92%',
    home: { name: 'Mordor SFG', short: 'MO', score: 9, remaining: 9, winner: true },
    away: { name: 'Atlético Bilbo', short: 'AB', score: 6, remaining: 9, winner: false },
  },
  {
    key: 'late',
    seed: '5TH VS 1ST',
    fav: 'SMÉAGOL 75%',
    home: { name: 'Toronto Gimli', short: 'TG', score: 15, remaining: 2, winner: false },
    away: { name: 'Sméagol', short: 'SM', score: 18, remaining: 0, winner: true },
  },
]

function Crest({ short, alt = false }) {
  return (
    <span className={'scm-crest' + (alt ? ' scm-crest--alt' : '')} aria-hidden="true">
      {short}
    </span>
  )
}

/** Locked card shell: banner strip + header row, then the variant visual. */
function Card({ fixture: f, children }) {
  return (
    <div className="scm-card">
      <div className="scm-meta">
        <span className="scm-meta__text">{f.seed}</span>
        <span className="scm-meta__text">{f.fav}</span>
      </div>
      <div className="scm-hdr">
        <div className="scm-hdr__side">
          <Crest short={f.home.short} />
          <span className="scm-hdr__name">{f.home.name}</span>
        </div>
        <div className="scm-hdr__score">
          <span className={'scm-hdr__half' + (f.home.winner ? ' scm-hdr__half--winner' : '')}>
            {f.home.score}
          </span>
          <span className="scm-hdr__sep">–</span>
          <span className={'scm-hdr__half' + (f.away.winner ? ' scm-hdr__half--winner' : '')}>
            {f.away.score}
          </span>
        </div>
        <div className="scm-hdr__side scm-hdr__side--away">
          <span className="scm-hdr__name">{f.away.name}</span>
          <Crest short={f.away.short} alt />
        </div>
      </div>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option A — twin rails, filling inward as players finish           */
/* ---------------------------------------------------------------- */

function RailHalf({ side, remaining }) {
  const done = remaining === 0
  const pct = Math.round(((XI - remaining) / XI) * 100)
  return (
    <span className={'scm-rail__half' + (side === 'away' ? ' scm-rail__half--away' : '')}>
      <span className={'scm-rail__label' + (done ? ' scm-rail__label--ft' : '')}>
        {done ? 'FT' : remaining}
      </span>
      <span className="scm-rail__track">
        <span
          className={'scm-rail__fill' + (done ? ' scm-rail__fill--ft' : '')}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}

function VariantRails({ fixture: f }) {
  return (
    <div className="scm-rail">
      <RailHalf side="home" remaining={f.home.remaining} />
      <RailHalf side="away" remaining={f.away.remaining} />
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option B — eleven pips per side, draining toward the centre       */
/* ---------------------------------------------------------------- */

function PipsSide({ side, remaining }) {
  const done = remaining === 0
  // Outer edge = first to drain: pips empty from the OUTER end inward so a
  // late-GW row reads as two short solid stubs hugging the centre.
  const pips = Array.from({ length: XI }, (_, i) => {
    const idxFromCentre = side === 'home' ? XI - 1 - i : i
    return idxFromCentre < remaining
  })
  return (
    <span className={'scm-pips__side' + (side === 'away' ? ' scm-pips__side--away' : '')}>
      {side === 'home' ? (
        <span className={'scm-pips__count' + (done ? ' scm-pips__count--ft' : '')}>
          {done ? 'FT' : remaining}
        </span>
      ) : null}
      <span className="scm-pips__row">
        {pips.map((on, i) => (
          <span key={i} className={'scm-pip' + (on ? ' scm-pip--on' : '')} />
        ))}
      </span>
      {side === 'away' ? (
        <span className={'scm-pips__count' + (done ? ' scm-pips__count--ft' : '')}>
          {done ? 'FT' : remaining}
        </span>
      ) : null}
    </span>
  )
}

function VariantPips({ fixture: f }) {
  return (
    <div className="scm-pips">
      <PipsSide side="home" remaining={f.home.remaining} />
      <PipsSide side="away" remaining={f.away.remaining} />
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option C — centre gauge: halves shrink to the middle at FT        */
/* ---------------------------------------------------------------- */

function VariantGauge({ fixture: f }) {
  const homeDone = f.home.remaining === 0
  const awayDone = f.away.remaining === 0
  return (
    <div className="scm-gauge">
      <span className={'scm-gauge__label' + (homeDone ? ' scm-gauge__label--ft' : '')}>
        {homeDone ? 'FT' : f.home.remaining}
      </span>
      <span className="scm-gauge__track">
        <span className="scm-gauge__side scm-gauge__side--home">
          <span
            className="scm-gauge__fill"
            style={{ width: `${(f.home.remaining / XI) * 100}%` }}
          />
        </span>
        <span className="scm-gauge__notch" />
        <span className="scm-gauge__side scm-gauge__side--away">
          <span
            className="scm-gauge__fill"
            style={{ width: `${(f.away.remaining / XI) * 100}%` }}
          />
        </span>
      </span>
      <span className={'scm-gauge__label' + (awayDone ? ' scm-gauge__label--ft' : '')}>
        {awayDone ? 'FT' : f.away.remaining}
      </span>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option D — ghost text only, no graphics                           */
/* ---------------------------------------------------------------- */

function VariantGhost({ fixture: f }) {
  const label = (r) => (r === 0 ? 'FT' : `${r} to play`)
  return (
    <div className="scm-ghost">
      <span className="scm-ghost__side">{label(f.home.remaining)}</span>
      <span className="scm-ghost__side">{label(f.away.remaining)}</span>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option E — countdown rings flanking the score                     */
/* ---------------------------------------------------------------- */

function Ring({ remaining }) {
  const done = remaining === 0
  const r = 8
  const c = 2 * Math.PI * r
  const frac = remaining / XI
  return (
    <span className={'scm-ring' + (done ? ' scm-ring--ft' : '')}>
      <svg viewBox="0 0 22 22" className="scm-ring__svg" aria-hidden="true">
        <circle className="scm-ring__bg" cx="11" cy="11" r={r} />
        <circle
          className="scm-ring__arc"
          cx="11"
          cy="11"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span className="scm-ring__n">{done ? '✓' : remaining}</span>
    </span>
  )
}

function VariantRings({ fixture: f }) {
  return (
    <div className="scm-rings">
      <Ring remaining={f.home.remaining} />
      <span className="scm-rings__caption">to play</span>
      <Ring remaining={f.away.remaining} />
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option F — micro-dots tucked under each team name                 */
/* ---------------------------------------------------------------- */

function DotsUnderName({ fixture: f }) {
  const dots = (remaining, mirror) => {
    const arr = Array.from({ length: XI }, (_, i) => {
      const idx = mirror ? XI - 1 - i : i
      return idx < remaining
    })
    return arr
  }
  return (
    <div className="scm-hdr scm-hdr--dots">
      <div className="scm-hdr__side">
        <Crest short={f.home.short} />
        <span className="scm-namewrap">
          <span className="scm-hdr__name">{f.home.name}</span>
          <span className="scm-dots">
            {dots(f.home.remaining, false).map((on, i) => (
              <span key={i} className={'scm-dot' + (on ? ' scm-dot--on' : '')} />
            ))}
            {f.home.remaining === 0 ? <span className="scm-dots__ft">FT</span> : null}
          </span>
        </span>
      </div>
      <div className="scm-hdr__score">
        <span className={'scm-hdr__half' + (f.home.winner ? ' scm-hdr__half--winner' : '')}>
          {f.home.score}
        </span>
        <span className="scm-hdr__sep">–</span>
        <span className={'scm-hdr__half' + (f.away.winner ? ' scm-hdr__half--winner' : '')}>
          {f.away.score}
        </span>
      </div>
      <div className="scm-hdr__side scm-hdr__side--away">
        <span className="scm-namewrap scm-namewrap--away">
          <span className="scm-hdr__name">{f.away.name}</span>
          <span className="scm-dots scm-dots--away">
            {f.away.remaining === 0 ? <span className="scm-dots__ft">FT</span> : null}
            {dots(f.away.remaining, true).map((on, i) => (
              <span key={i} className={'scm-dot' + (on ? ' scm-dot--on' : '')} />
            ))}
          </span>
        </span>
        <Crest short={f.away.short} alt />
      </div>
    </div>
  )
}

/** Option F swaps the header itself (dots live under the names), so it
 *  renders its own full card rather than the shared `Card` shell. */
function VariantDotsCard({ fixture: f }) {
  return (
    <div className="scm-card">
      <div className="scm-meta">
        <span className="scm-meta__text">{f.seed}</span>
        <span className="scm-meta__text">{f.fav}</span>
      </div>
      <DotsUnderName fixture={f} />
    </div>
  )
}

/* ---------------------------------------------------------------- */

const OPTIONS = [
  {
    id: 'A',
    title: 'Twin rails, filling inward',
    desc:
      'Two hairline tracks below the score, one per side. The green fill grows INWARD as starters finish, so a full bar = done. Count (or FT) sits at the outer end. Same model as the shipped face-off bars, restyled to the card.',
    render: (f) => (
      <Card fixture={f}>
        <VariantRails fixture={f} />
      </Card>
    ),
  },
  {
    id: 'B',
    title: 'Eleven pips per side',
    desc:
      'Each starter is one tiny tick — 11 per side, draining from the outer edge toward the centre as they finish. Literal (you can count them) but still quiet at 3px tall. Count at the outer ends.',
    render: (f) => (
      <Card fixture={f}>
        <VariantPips fixture={f} />
      </Card>
    ),
  },
  {
    id: 'C',
    title: 'Centre gauge',
    desc:
      'One shared strip split by a centre notch. Each half shows players still to play, anchored at the outer edge and shrinking toward the middle — the whole bar visibly empties as the matchup settles. Counts at the ends.',
    render: (f) => (
      <Card fixture={f}>
        <VariantGauge fixture={f} />
      </Card>
    ),
  },
  {
    id: 'D',
    title: 'Ghost text only',
    desc:
      'No graphics at all: the same faded mono treatment as the banner, one label per side under the score ("9 to play" / "FT"). Smallest possible visual budget.',
    render: (f) => (
      <Card fixture={f}>
        <VariantGhost fixture={f} />
      </Card>
    ),
  },
  {
    id: 'E',
    title: 'Countdown rings',
    desc:
      'A small ring per side flanking a shared "to play" caption. The arc drains as starters finish; at FT it flips to a quiet check. More decorative — sits centred rather than edge-to-edge.',
    render: (f) => (
      <Card fixture={f}>
        <VariantRings fixture={f} />
      </Card>
    ),
  },
  {
    id: 'F',
    title: 'Micro-dots under names',
    desc:
      'No extra row: 11 micro-dots tucked directly under each team name, draining toward the centre. Keeps the card at its exact current height — the visual reads on second glance only.',
    render: (f) => <VariantDotsCard fixture={f} />,
  },
]

export function ScorecardRemainingMockup() {
  return (
    <div className="scm">
      <header className="scm-top">
        <span className="scm-kicker">Scores · scorecard players-remaining visual</span>
        <h1>“Players to play” below the score</h1>
        <p>
          Locked: Live Odds card size, banner with seeding left + favourite’s
          odds right, crest/name/score header. Options below vary only the
          quiet players-remaining visual. Each option shows a mid-gameweek
          fixture (9 v 9 left) and a nearly settled one (2 left vs FT).
        </p>
        <a href="/">← Back to app</a>
      </header>

      <div className="scm-grid">
        {OPTIONS.map((opt) => (
          <article key={opt.id} className="scm-option">
            <div className="scm-option__head">
              <span className="scm-option__id">Option {opt.id}</span>
              <span className="scm-option__title">{opt.title}</span>
              <p className="scm-option__desc">{opt.desc}</p>
            </div>
            <div className="scm-option__preview">
              {FIXTURES.map((f) => (
                <div key={f.key}>{opt.render(f)}</div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="scm-note">
        Nothing here is wired into production — open via <code>?scorecard=1</code>.
      </p>
    </div>
  )
}
