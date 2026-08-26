import './TopOfLeagueMockup.css'

/**
 * Local-only "Top of the League" treatment gallery (`?leader=1`) — round 2.
 *
 * Round-1 feedback: no card at all. The leader should be a normal row in
 * the full 8-row table — same height, same column grid, sortable with
 * everything else — differentiated only by a flourish on the row itself.
 *
 * Six in-table flourishes below, loud → quiet, rendered like-for-like in
 * the same portrait phone frame. All previews use the bigger 8px mobile
 * form dots (production bumps 5px → 8px in this same PR).
 */

const TEAMS = [
  { rank: 1, name: 'Rokesly Regorasu', short: 'RR', hue: 152, gf: 55, pts: 3, form: [null, null, null, null, 'W'], next: 'SE' },
  { rank: 2, name: 'Suffolk Sméagol', short: 'SG', hue: 218, gf: 52, pts: 3, form: [null, null, null, null, 'W'], next: 'BB' },
  { rank: 3, name: 'Mordor SFG', short: 'MO', hue: 24, gf: 51, pts: 3, form: [null, null, null, null, 'W'], next: 'RO' },
  { rank: 4, name: 'Seoul Shire', short: 'SE', hue: 4, gf: 47, pts: 3, form: [null, null, null, null, 'W'], next: 'RR' },
  { rank: 5, name: 'Toronto Gimli', short: 'GI', hue: 205, gf: 39, pts: 0, form: [null, null, null, null, 'L'], next: 'AB' },
  { rank: 6, name: 'Brampton Balrogs', short: 'BB', hue: 268, gf: 38, pts: 0, form: [null, null, null, null, 'L'], next: 'SG' },
  { rank: 7, name: 'Hackney Rohirrim', short: 'RO', hue: 96, gf: 31, pts: 0, form: [null, null, null, null, 'L'], next: 'MO' },
  { rank: 8, name: 'Atlético Bilbo', short: 'AB', hue: 42, gf: 24, pts: 0, form: [null, null, null, null, 'L'], next: 'GI' },
]

const BY_SHORT = Object.fromEntries(TEAMS.map((t) => [t.short, t]))

function Crest({ team }) {
  return (
    <span className="tolm-crest" style={{ '--crest-hue': team.hue }} aria-hidden="true">
      {team.short}
    </span>
  )
}

function Dots({ form, size = 'md' }) {
  return (
    <span className={`tolm-dots tolm-dots--${size}`} aria-label="Last matches form">
      {form.map((r, i) => (
        <i
          key={i}
          className={
            'tolm-dot' +
            (r === 'W' ? ' tolm-dot--win' : r === 'L' ? ' tolm-dot--loss' : r === 'D' ? ' tolm-dot--draw' : ' tolm-dot--none')
          }
        />
      ))}
    </span>
  )
}

function HeadRow() {
  return (
    <thead>
      <tr>
        <th className="tolm-col-rank">#</th>
        <th className="tolm-col-team">Team</th>
        <th className="tolm-col-num">For</th>
        <th className="tolm-col-num">PTS</th>
        <th className="tolm-col-form">Form</th>
        <th className="tolm-col-next">Nxt</th>
      </tr>
    </thead>
  )
}

/**
 * One full 8-row standings table; `leaderMode` picks the rank-1 flourish:
 *   'solid' — full racing-green row, cream text
 *   'wash'  — soft green tint wash
 *   'rail'  — green left rail + faint tint
 *   'rule'  — gold star + double gold hairline under the row (no fill)
 *   'chip'  — rank digit inside a filled green chip
 *   'pts'   — PTS value inside a filled green pill
 */
function StandingsTable({ leaderMode }) {
  return (
    <div className="tolm-frame">
      <div className="tolm-tablecard">
        <table className="tolm-table">
          <HeadRow />
          <tbody>
            {TEAMS.map((t) => {
              const isLeader = t.rank === 1
              return (
                <Row
                  key={t.short}
                  t={t}
                  mode={isLeader ? leaderMode : null}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ t, mode }) {
  const next = BY_SHORT[t.next]
  const rowClass = [
    mode ? `tolm-row--leader-${mode}` : '',
    t.rank === 8 ? 'tolm-row--last' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const star = mode === 'rail' || mode === 'rule'
  const chip = mode === 'chip'

  return (
    <>
      {t.rank === 5 ? (
        <tr className="tolm-divider" aria-hidden="true">
          <td colSpan={6}>
            <span>Minnows</span>
          </td>
        </tr>
      ) : null}
      <tr className={rowClass || undefined}>
        <td className="tolm-col-rank">
          {t.rank === 8 ? (
            <span className="tolm-rank-last">L</span>
          ) : chip ? (
            <span className="tolm-rank-chip">{t.rank}</span>
          ) : star ? (
            <span className="tolm-rank-starred">
              {t.rank}
              <i aria-hidden>★</i>
            </span>
          ) : (
            t.rank
          )}
        </td>
        <td className="tolm-col-team">
          <span className="tolm-team-cell">
            <Crest team={t} />
            <span className="tolm-team-name">{t.name}</span>
          </span>
        </td>
        <td className="tolm-col-num">{t.gf}</td>
        <td className="tolm-col-num tolm-col-pts">
          {mode === 'pts' ? <span className="tolm-pts-pill">{t.pts}</span> : <strong>{t.pts}</strong>}
        </td>
        <td className="tolm-col-form">
          <Dots form={t.form} />
        </td>
        <td className="tolm-col-next">{next ? <Crest team={next} /> : '—'}</td>
      </tr>
    </>
  )
}

/* ------------------------------------------------------------------ */

const OPTIONS = [
  {
    id: 'A',
    mode: 'solid',
    title: 'Racing-green row',
    tag: 'Loudest',
    tagTone: 'loud',
    desc:
      'The suggested treatment: rank 1 painted in the app-header racing green with cream text and a gold star on the rank. Unmissable, still exactly one row tall and on the shared column grid.',
  },
  {
    id: 'B',
    mode: 'wash',
    title: 'Green wash',
    tag: 'Picked · shipped',
    tagTone: 'loud',
    desc:
      'SHIPPED: the row keeps normal ink but sits on a green tint wash, with the rank and name picked out in brand green, plus a dashed divider between 1 and 2 in the same style as the cut above 8th. Live as `.standings-row--leader`.',
  },
  {
    id: 'C',
    mode: 'rail',
    title: 'Left rail + tint',
    tag: 'Quiet',
    tagTone: 'good',
    desc:
      'A 3px green rail on the left edge, a faint tint and a small gold star beside the rank. The flourish lives on the table edge, so the row content stays visually identical to its neighbours.',
  },
  {
    id: 'D',
    mode: 'rule',
    title: 'Scorebook double rule',
    tag: 'Quiet · no fill',
    tagTone: 'good',
    desc:
      'No background at all. A gold star beside the rank and a double gold hairline under the row — the printed-ledger flourish: the leader is literally "above the line". Cheapest visual budget after E/F.',
  },
  {
    id: 'E',
    mode: 'chip',
    title: 'Green rank chip',
    tag: 'Quietest · scoped',
    tagTone: 'good',
    desc:
      'The flourish is scoped to a single cell: the rank digit sits in a filled racing-green chip (cream "1"). Everything else is a completely standard row. Scales naturally if you ever mark other zones.',
  },
  {
    id: 'F',
    mode: 'pts',
    title: 'Green PTS pill',
    tag: 'Quietest · scoped',
    tagTone: 'good',
    desc:
      'Same single-cell idea, but celebrating the number that makes them leader: the PTS value sits in a green pill. Draws the eye to the points column, where the leading margin actually lives.',
  },
]

export function TopOfLeagueMockup() {
  return (
    <div className="tolm">
      <header className="tolm-top">
        <span className="tolm-kicker">Standings · top-of-the-league treatment · round 2</span>
        <h1>Leader as a normal row, with a flourish</h1>
        <p>
          No card this time. In every option the leader is an ordinary row in
          the full 8-team table — same height, same columns, sorts and
          filters with everything else. The only thing that changes is the
          flourish on the row, loudest to quietest. All previews use the
          bigger 8px mobile form dots (production bumps 5px → 8px in this
          same PR).
        </p>
        <a href="/">← Back to app</a>
      </header>

      <div className="tolm-grid">
        {OPTIONS.map((opt) => (
          <article key={opt.id} className="tolm-option">
            <div className="tolm-option__head">
              <span className="tolm-option__id">Option {opt.id}</span>
              <span className="tolm-option__title">{opt.title}</span>
              <span className={'tolm-option__tag tolm-option__tag--' + opt.tagTone}>{opt.tag}</span>
              <p className="tolm-option__desc">{opt.desc}</p>
            </div>
            <div className="tolm-option__preview">
              <StandingsTable leaderMode={opt.mode} />
            </div>
          </article>
        ))}
      </div>

      <section className="tolm-dotscompare">
        <h2>Portrait-mobile form dots</h2>
        <p>
          Shipping regardless of the option picked: table form dots on
          portrait mobile grow from 5px / 1px gap to 8px / 2px gap so the
          W-L colour actually reads on a phone.
        </p>
        <div className="tolm-dotscompare__row">
          <div className="tolm-dotscompare__cell">
            <span className="tolm-dotscompare__lbl">Before — 5px</span>
            <Dots form={[null, null, 'W', 'L', 'W']} size="old" />
          </div>
          <div className="tolm-dotscompare__cell">
            <span className="tolm-dotscompare__lbl">After — 8px</span>
            <Dots form={[null, null, 'W', 'L', 'W']} size="md" />
          </div>
          <div className="tolm-dotscompare__cell">
            <span className="tolm-dotscompare__lbl">Hero card — 16px (unchanged)</span>
            <Dots form={[null, null, 'W', 'L', 'W']} size="lg" />
          </div>
        </div>
      </section>

      <p className="tolm-note">
        <strong>Locked:</strong> Option B shipped to production
        (<code>.standings-row--leader</code> + a dashed
        <code>standings-row--divider-below</code> cut between 1 and 2, same
        style as above 8th). Gallery kept for reference — open via{' '}
        <code>?leader=1</code>.
      </p>
    </div>
  )
}
