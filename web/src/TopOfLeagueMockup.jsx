import './TopOfLeagueMockup.css'

/**
 * Local-only "Top of the League" treatment gallery (`?leader=1`).
 *
 * Feedback: the floating leader card feels disconnected from the standings
 * table — different tone, its own island, and because the leader lives
 * outside the rows it can't take part in table sorting (form, for, etc.).
 *
 * Six options below, each rendered in the same portrait-phone frame with
 * the same league state so they compare like-for-like. Options C, D and E
 * put the leader back into the table as a real row (sortable); B and F
 * keep a header treatment but dock it flush to the table.
 *
 * All frames also preview the bigger portrait-mobile form dots (8px, was
 * 5px) shipping alongside this gallery.
 */

const TEAMS = [
  { rank: 1, name: 'Rokesly Regorasu', short: 'RR', hue: 152, gf: 55, pts: 3, form: [null, null, null, null, 'W'], next: 'SE', played: 1 },
  { rank: 2, name: 'Suffolk Sméagol', short: 'SG', hue: 218, gf: 52, pts: 3, form: [null, null, null, null, 'W'], next: 'BB' },
  { rank: 3, name: 'Mordor SFG', short: 'MO', hue: 24, gf: 51, pts: 3, form: [null, null, null, null, 'W'], next: 'RO' },
  { rank: 4, name: 'Seoul Shire', short: 'SE', hue: 4, gf: 47, pts: 3, form: [null, null, null, null, 'W'], next: 'RR' },
  { rank: 5, name: 'Toronto Gimli', short: 'GI', hue: 205, gf: 39, pts: 0, form: [null, null, null, null, 'L'], next: 'AB' },
  { rank: 6, name: 'Brampton Balrogs', short: 'BB', hue: 268, gf: 38, pts: 0, form: [null, null, null, null, 'L'], next: 'SG' },
  { rank: 7, name: 'Hackney Rohirrim', short: 'RO', hue: 96, gf: 31, pts: 0, form: [null, null, null, null, 'L'], next: 'MO' },
  { rank: 8, name: 'Atlético Bilbo', short: 'AB', hue: 42, gf: 24, pts: 0, form: [null, null, null, null, 'L'], next: 'GI' },
]

const LEADER = TEAMS[0]
const BY_SHORT = Object.fromEntries(TEAMS.map((t) => [t.short, t]))

function Crest({ team, size = 'md' }) {
  return (
    <span
      className={`tolm-crest tolm-crest--${size}`}
      style={{ '--crest-hue': team.hue }}
      aria-hidden="true"
    >
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
 * Shared standings rows. `rows` decides which teams appear (with or
 * without the leader); `leaderMode` styles rank 1 when present:
 *   - 'jumbo'  — oversized leader row (option C)
 *   - 'banded' — normal-height leader row under an eyebrow band (option D)
 *   - 'rail'   — accent left rail + star only (option E)
 */
function Rows({ rows, leaderMode }) {
  return (
    <tbody>
      {rows.map((t) => {
        const isLeader = t.rank === 1
        const cls = [
          isLeader && leaderMode ? `tolm-row--leader-${leaderMode}` : '',
          t.rank === 5 ? 'tolm-row--divider-above' : '',
          t.rank === 8 ? 'tolm-row--last' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <Row key={t.short} t={t} className={cls} jumbo={isLeader && leaderMode === 'jumbo'} rail={isLeader && leaderMode === 'rail'} banded={isLeader && leaderMode === 'banded'} />
        )
      })}
    </tbody>
  )
}

function Row({ t, className, jumbo, rail, banded }) {
  const next = BY_SHORT[t.next]
  return (
    <>
      {t.rank === 5 ? (
        <tr className="tolm-divider" aria-hidden="true">
          <td colSpan={6}>
            <span>Minnows</span>
          </td>
        </tr>
      ) : null}
      <tr className={className || undefined}>
        <td className="tolm-col-rank">
          {t.rank === 8 ? <span className="tolm-rank-last">L</span> : rail ? (
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
            <Crest team={t} size={jumbo ? 'lg' : 'md'} />
            <span className="tolm-team-id">
              {jumbo || banded ? (
                <span className="tolm-team-eyebrow">
                  <i aria-hidden>★</i> Top of the league
                </span>
              ) : null}
              <span className={'tolm-team-name' + (jumbo ? ' tolm-team-name--jumbo' : '')}>{t.name}</span>
            </span>
          </span>
        </td>
        <td className="tolm-col-num">{t.gf}</td>
        <td className={'tolm-col-num tolm-col-pts' + (jumbo ? ' tolm-col-pts--jumbo' : '')}>
          <strong>{t.pts}</strong>
        </td>
        <td className="tolm-col-form">
          <Dots form={t.form} />
        </td>
        <td className="tolm-col-next">{next ? <Crest team={next} /> : '—'}</td>
      </tr>
    </>
  )
}

function Frame({ children }) {
  return <div className="tolm-frame">{children}</div>
}

function TableCard({ children, flushTop }) {
  return <div className={'tolm-tablecard' + (flushTop ? ' tolm-tablecard--flush-top' : '')}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* Option renderers                                                    */
/* ------------------------------------------------------------------ */

// A — current production: floating tinted card, gap, table shows ranks 2–8.
function OptionA() {
  return (
    <Frame>
      <div className="tolm-hero tolm-hero--floating">
        <span className="tolm-hero__eyebrow">
          <i aria-hidden>★</i> Top of the league
        </span>
        <div className="tolm-hero__row">
          <Crest team={LEADER} size="xl" />
          <div className="tolm-hero__name">{LEADER.name}</div>
          <div className="tolm-hero__pts">
            <span className="tolm-hero__pts-num">{LEADER.pts}</span>
            <span className="tolm-hero__pts-lbl">PTS</span>
          </div>
        </div>
        <div className="tolm-hero__sub">
          <Dots form={LEADER.form} size="lg" />
          <span className="tolm-hero__meta">
            <b>Played</b> {LEADER.played} <i>·</i> <b>For</b> {LEADER.gf}
          </span>
        </div>
      </div>
      <TableCard>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS.slice(1)} />
        </table>
      </TableCard>
    </Frame>
  )
}

// B — same hero content, but paper tone + docked flush onto the table.
function OptionB() {
  return (
    <Frame>
      <div className="tolm-hero tolm-hero--docked">
        <span className="tolm-hero__eyebrow tolm-hero__eyebrow--bare">
          <i aria-hidden>★</i> Top of the league
        </span>
        <div className="tolm-hero__row">
          <Crest team={LEADER} size="xl" />
          <div className="tolm-hero__name">{LEADER.name}</div>
          <div className="tolm-hero__pts">
            <span className="tolm-hero__pts-num">{LEADER.pts}</span>
            <span className="tolm-hero__pts-lbl">PTS</span>
          </div>
        </div>
        <div className="tolm-hero__sub">
          <Dots form={LEADER.form} size="lg" />
          <span className="tolm-hero__meta">
            <b>Played</b> {LEADER.played} <i>·</i> <b>For</b> {LEADER.gf}
          </span>
        </div>
      </div>
      <TableCard flushTop>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS.slice(1)} />
        </table>
      </TableCard>
    </Frame>
  )
}

// C — leader inside the table as an oversized row 1.
function OptionC() {
  return (
    <Frame>
      <TableCard>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS} leaderMode="jumbo" />
        </table>
      </TableCard>
    </Frame>
  )
}

// D — slim eyebrow band above a full table; leader is a normal row 1.
function OptionD() {
  return (
    <Frame>
      <TableCard>
        <div className="tolm-band">
          <i aria-hidden>★</i> Top of the league
        </div>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS} leaderMode="banded" />
        </table>
      </TableCard>
    </Frame>
  )
}

// E — flat table, leader gets a rail + star + tint only.
function OptionE() {
  return (
    <Frame>
      <TableCard>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS} leaderMode="rail" />
        </table>
      </TableCard>
    </Frame>
  )
}

// F — full-bleed racing-green hero band inside the table card.
function OptionF() {
  return (
    <Frame>
      <TableCard>
        <div className="tolm-greenhero">
          <span className="tolm-greenhero__eyebrow">
            <i aria-hidden>★</i> Top of the league
          </span>
          <div className="tolm-greenhero__row">
            <Crest team={LEADER} size="xl" />
            <div className="tolm-greenhero__name">{LEADER.name}</div>
            <div className="tolm-greenhero__pts">
              <span className="tolm-greenhero__pts-num">{LEADER.pts}</span>
              <span className="tolm-greenhero__pts-lbl">PTS</span>
            </div>
          </div>
          <div className="tolm-greenhero__sub">
            <Dots form={LEADER.form} size="lg" />
            <span className="tolm-greenhero__meta">
              <b>Played</b> {LEADER.played} <i>·</i> <b>For</b> {LEADER.gf}
            </span>
          </div>
        </div>
        <table className="tolm-table">
          <HeadRow />
          <Rows rows={TEAMS.slice(1)} />
        </table>
      </TableCard>
    </Frame>
  )
}

/* ------------------------------------------------------------------ */

const OPTIONS = [
  {
    id: 'A',
    title: 'Current — floating card',
    tag: 'Current',
    tagTone: 'loud',
    desc:
      'Production today: tinted card floating above the table with its own gap, radius and green wash. The feedback target — reads as a separate widget, and the leader is missing from the rows so it never takes part in sorting.',
    render: OptionA,
  },
  {
    id: 'B',
    title: 'Docked card, table tone',
    tag: 'User suggestion',
    tagTone: 'quiet',
    desc:
      'Same card, restyled: paper surface and hairline border matching the table, tint removed, docked flush so card + table read as one component. Still a header (leader stays out of the rows), so sorting by form still excludes the leader.',
    render: OptionB,
  },
  {
    id: 'C',
    title: 'Jumbo first row',
    tag: 'Sortable',
    tagTone: 'good',
    desc:
      'No card. The leader returns to the table as a real row 1, just bigger — 40px crest, "Top of the league" micro-eyebrow, heavier PTS, soft green tint. Every cell sits on the shared column grid, so form/for/pts sorting includes the leader.',
    render: OptionC,
  },
  {
    id: 'D',
    title: 'Eyebrow band + full table',
    tag: 'Sortable',
    tagTone: 'good',
    desc:
      'A slim green band caps the table ("★ Top of the league") and the leader sits directly beneath it as a lightly tinted, normal-height row. All 8 rows are real rows; the band is pure chrome bound to whoever is rank 1.',
    render: OptionD,
  },
  {
    id: 'E',
    title: 'Accent rail only',
    tag: 'Sortable · quietest',
    tagTone: 'good',
    desc:
      'Flat table, all rows equal height. Rank 1 is differentiated only by a green left rail, a gold star beside the rank and a faint tint. Smallest visual budget; the whole table stays uniform and sortable.',
    render: OptionE,
  },
  {
    id: 'F',
    title: 'Racing-green hero band',
    tag: 'Loud · connected',
    tagTone: 'loud',
    desc:
      'The opposite pole: a full-bleed deep-green leader band inside the table card (same tone as the app header), square-cornered and flush with the thead below. Maximum celebration while still physically part of the table — but like A/B the leader is out of the sortable rows.',
    render: OptionF,
  },
]

export function TopOfLeagueMockup() {
  return (
    <div className="tolm">
      <header className="tolm-top">
        <span className="tolm-kicker">Standings · top-of-the-league treatment</span>
        <h1>Connecting the leader to the table</h1>
        <p>
          The floating leader card reads as its own island — different tone,
          detached from the table, and the leader can&apos;t join table
          sorting. Six treatments below, like-for-like in a portrait phone
          frame. All previews use the bigger 8px mobile form dots (production
          bumps 5px → 8px in this same PR).
        </p>
        <a href="/">← Back to app</a>
      </header>

      <div className="tolm-grid">
        {OPTIONS.map((opt) => (
          <article key={opt.id} className={'tolm-option' + (opt.id === 'A' ? ' tolm-option--current' : '')}>
            <div className="tolm-option__head">
              <span className="tolm-option__id">Option {opt.id}</span>
              <span className="tolm-option__title">{opt.title}</span>
              <span className={'tolm-option__tag tolm-option__tag--' + opt.tagTone}>{opt.tag}</span>
              <p className="tolm-option__desc">{opt.desc}</p>
            </div>
            <div className="tolm-option__preview">{opt.render()}</div>
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
        Local preview only — open via <code>?leader=1</code>. Nothing here is
        wired into production; the winning option gets implemented on the real
        standings view in a follow-up.
      </p>
    </div>
  )
}
