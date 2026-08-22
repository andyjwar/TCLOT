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
  const finished = XI - remaining
  // Pips turn GREEN as players finish, filling from the OUTER end inward —
  // grey = still to play, so a fully green row reads as FT.
  const pips = Array.from({ length: XI }, (_, i) => {
    const idxFromOuter = side === 'home' ? i : XI - 1 - i
    return idxFromOuter < finished
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
  // Fill = players FINISHED: grey at 11-to-play, green growing from the
  // outer edge toward the centre notch, so a fully green strip reads FT.
  const playedPct = (r) => ((XI - r) / XI) * 100
  return (
    <div className="scm-gauge">
      <span className={'scm-gauge__label' + (homeDone ? ' scm-gauge__label--ft' : '')}>
        {homeDone ? 'FT' : f.home.remaining}
      </span>
      <span className="scm-gauge__track">
        <span className="scm-gauge__side scm-gauge__side--home">
          <span
            className={'scm-gauge__fill' + (homeDone ? ' scm-gauge__fill--ft' : '')}
            style={{ width: `${playedPct(f.home.remaining)}%` }}
          />
        </span>
        <span className="scm-gauge__notch" />
        <span className="scm-gauge__side scm-gauge__side--away">
          <span
            className={'scm-gauge__fill' + (awayDone ? ' scm-gauge__fill--ft' : '')}
            style={{ width: `${playedPct(f.away.remaining)}%` }}
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
/* Option G — formation dots: a 1-4-4-2 micro-pitch per side          */
/* ---------------------------------------------------------------- */

const FORMATION = [1, 4, 4, 2]

function FormationSide({ side, remaining }) {
  const finished = XI - remaining
  // Dots dim as players finish, draining from the GK (outer) end so the
  // "attack" nearest the centre stays lit longest.
  let idx = 0
  const cols = FORMATION.map((n) =>
    Array.from({ length: n }, () => idx++ >= finished),
  )
  const ordered = side === 'away' ? [...cols].reverse() : cols
  return (
    <span className={'scm-form__pitch' + (remaining === 0 ? ' scm-form__pitch--ft' : '')}>
      {ordered.map((col, i) => (
        <span key={i} className="scm-form__col">
          {col.map((on, j) => (
            <span key={j} className={'scm-form__dot' + (on ? ' scm-form__dot--on' : '')} />
          ))}
        </span>
      ))}
    </span>
  )
}

function VariantFormation({ fixture: f }) {
  const label = (r) => (r === 0 ? 'FT' : r)
  return (
    <div className="scm-form">
      <span className={'scm-form__count' + (f.home.remaining === 0 ? ' scm-form__count--ft' : '')}>
        {label(f.home.remaining)}
      </span>
      <FormationSide side="home" remaining={f.home.remaining} />
      <span className="scm-form__caption">to play</span>
      <FormationSide side="away" remaining={f.away.remaining} />
      <span className={'scm-form__count' + (f.away.remaining === 0 ? ' scm-form__count--ft' : '')}>
        {label(f.away.remaining)}
      </span>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option H — quiet count chips at the outer edges                    */
/* ---------------------------------------------------------------- */

function Chip({ remaining }) {
  const done = remaining === 0
  return (
    <span className={'scm-chip' + (done ? ' scm-chip--ft' : '')}>
      {done ? 'FT' : `${remaining} left`}
    </span>
  )
}

function VariantChips({ fixture: f }) {
  return (
    <div className="scm-chips">
      <Chip remaining={f.home.remaining} />
      <span className="scm-chips__caption">to play</span>
      <Chip remaining={f.away.remaining} />
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Option I — pie timers draining like a match clock                  */
/* ---------------------------------------------------------------- */

function Pie({ remaining }) {
  const done = remaining === 0
  const pct = (remaining / XI) * 100
  if (done) {
    return (
      <span className="scm-pie scm-pie--ft" aria-hidden="true">
        ✓
      </span>
    )
  }
  return (
    <span
      className="scm-pie"
      style={{ background: `conic-gradient(var(--scm-green) ${pct}%, rgba(105, 100, 82, 0.16) 0)` }}
      aria-hidden="true"
    />
  )
}

function VariantPies({ fixture: f }) {
  const label = (r) => (r === 0 ? 'FT' : r)
  return (
    <div className="scm-pies">
      <span className={'scm-pies__count' + (f.home.remaining === 0 ? ' scm-pies__count--ft' : '')}>
        {label(f.home.remaining)}
      </span>
      <Pie remaining={f.home.remaining} />
      <span className="scm-pies__caption">to play</span>
      <Pie remaining={f.away.remaining} />
      <span className={'scm-pies__count' + (f.away.remaining === 0 ? ' scm-pies__count--ft' : '')}>
        {label(f.away.remaining)}
      </span>
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
      'Each starter is one tiny tick — 11 per side. Grey = still to play; ticks turn GREEN from the outer edge inward as players finish, so a fully green row reads as done. Count of players left at the outer ends.',
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
      'One shared strip split by a centre notch. Grey at 11-to-play; each half fills GREEN from the outer edge toward the middle as players finish, so a fully green bar reads FT. Counts of players left at the ends.',
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
  {
    id: 'G',
    title: 'Formation dots (micro-pitch)',
    desc:
      'Each side is a tiny 1-4-4-2 pitch — one dot per starter, dimming from the GK end as players finish, so the "attack" nearest the centre stays lit longest. Thematic without being a bar; counts at the outer ends.',
    render: (f) => (
      <Card fixture={f}>
        <VariantFormation fixture={f} />
      </Card>
    ),
  },
  {
    id: 'H',
    title: 'Count chips',
    desc:
      'One quiet pill per side ("9 left" → "FT") flanking a shared ghost caption. No graphic to interpret — just the number, one notch more visible than Option D\'s bare text.',
    render: (f) => (
      <Card fixture={f}>
        <VariantChips fixture={f} />
      </Card>
    ),
  },
  {
    id: 'I',
    title: 'Pie timers',
    desc:
      'A small solid wedge per side draining like a match clock — full disc = everyone still to play, sliver = nearly done, quiet check at FT. Count sits beside each pie.',
    render: (f) => (
      <Card fixture={f}>
        <VariantPies fixture={f} />
      </Card>
    ),
  },
]

/**
 * Stacked assessment strip — the chosen treatment repeated across a full
 * gameweek's four fixtures at phone width, to judge cumulative visual
 * noise (one card in isolation always reads quieter than four in a list).
 */
const STACK_FIXTURES = [
  {
    key: 's1',
    seed: '1ST VS 5TH',
    fav: 'MORDOR SFG 92%',
    home: { name: 'Mordor SFG', short: 'MO', score: 9, remaining: 9, winner: true },
    away: { name: 'Atlético Bilbo', short: 'AB', score: 6, remaining: 9, winner: false },
  },
  {
    key: 's2',
    seed: '2ND VS 6TH',
    fav: 'SEOUL SHIRE 80%',
    home: { name: 'Seoul Shire', short: 'SS', score: 15, remaining: 9, winner: true },
    away: { name: 'Rohirrim', short: 'RO', score: 7, remaining: 8, winner: false },
  },
  {
    key: 's3',
    seed: '7TH VS 3RD',
    fav: 'REGORASU 70%',
    home: { name: 'Balrogs', short: 'BA', score: 0, remaining: 11, winner: false },
    away: { name: 'Regorasu', short: 'RE', score: 16, remaining: 8, winner: true },
  },
  {
    key: 's4',
    seed: '5TH VS 1ST',
    fav: 'SMÉAGOL 75%',
    home: { name: 'Toronto Gimli', short: 'TG', score: 15, remaining: 8, winner: false },
    away: { name: 'Sméagol', short: 'SM', score: 18, remaining: 8, winner: true },
  },
]

function StackedPreview() {
  return (
    <section className="scm-stack-wrap">
      <div className="scm-option__head">
        <span className="scm-option__id">Stacked check</span>
        <span className="scm-option__title">Option C ×4 — a full gameweek at phone width</span>
        <p className="scm-option__desc">
          The four fixtures of one gameweek stacked as the Live Scores list
          would show them, to assess cumulative visual distraction.
        </p>
      </div>
      <div className="scm-stack">
        {STACK_FIXTURES.map((f) => (
          <Card key={f.key} fixture={f}>
            <VariantGauge fixture={f} />
          </Card>
        ))}
      </div>
    </section>
  )
}

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

      <StackedPreview />

      <p className="scm-note">
        Nothing here is wired into production — open via <code>?scorecard=1</code>.
      </p>
    </div>
  )
}
