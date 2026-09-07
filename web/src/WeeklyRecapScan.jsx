import { TeamAvatar } from './TeamAvatar'
import { namedFixtureFor, derbyChipLabel } from './leagueLore.js'
import {
  glanceFixture,
  glanceTiles,
  matchupChips,
  matchupScanLines,
  polaroidFacts,
  shortTeam,
  wrapBanner,
} from './weeklyRecapScan.js'
import './WeeklyRecapScan.css'

export function RecapLayoutSwitch({ layout, onChange }) {
  return (
    <div className="recap-scan__layouts" role="group" aria-label="Recap layout">
      {[
        ['glance', 'Glance'],
        ['polaroid', 'Polaroid'],
        ['combo', 'Combo'],
        ['classic', 'Classic'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={
            'recap-scan__layout-btn' +
            (layout === id ? ' recap-scan__layout-btn--on' : '')
          }
          aria-pressed={layout === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function DerbyLine({ matchup: m }) {
  const name = m?.derby || namedFixtureFor(m?.home?.manager, m?.away?.manager)
  if (!name) return null
  return <p className="recap-scan__derby">{derbyChipLabel(name)}</p>
}

function ChipRow({ chips }) {
  if (!chips?.length) return null
  return (
    <div className="recap-scan__chips">
      {chips.map((c) => (
        <span
          key={c.label}
          className={'recap-scan__chip recap-scan__chip--' + (c.tone || 'neutral')}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}

function Tile({ tile: t }) {
  return (
    <div className={'recap-scan__tile recap-scan__tile--' + t.tone}>
      <i>{t.label}</i>
      <b>{t.value}</b>
      {t.sub ? <em>{t.sub}</em> : null}
    </div>
  )
}

function GlanceTiles({ tiles, compact }) {
  if (!tiles.length) return null
  return (
    <div
      className={
        'recap-scan__tiles' + (compact ? ' recap-scan__tiles--fixture' : '')
      }
    >
      {tiles.map((t) => (
        <Tile key={t.label} tile={t} />
      ))}
    </div>
  )
}

function PolaroidStrip({ facts }) {
  if (!facts.length) return null
  return (
    <div className="recap-scan__polo-wrap">
      <div className="recap-scan__polo-row" role="list">
        {facts.map((f) => (
          <figure key={f.label} className="recap-scan__polo" role="listitem">
            <div
              className={'recap-scan__polo-shot recap-scan__polo-shot--' + f.tone}
            >
              {f.value}
            </div>
            <figcaption>
              <i>{f.label}</i>
              {f.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function Scoreline({ matchup: m, preview, teamLogoMap, kitIndexByEntry }) {
  const homeOn = preview
    ? m.odds?.favoriteSide === 'home'
    : m.winner === m.home.entryId
  const awayOn = preview
    ? m.odds?.favoriteSide === 'away'
    : m.winner === m.away.entryId
  return (
    <div className="recap-scan__scoreline">
      <span
        className={
          'recap-scan__side recap-scan__side--home' +
          (homeOn ? ' recap-scan__side--on' : '')
        }
      >
        <span className="recap-scan__nm">{shortTeam(m.home.name)}</span>
        <TeamAvatar
          entryId={m.home.entryId}
          name={m.home.name}
          size="md"
          logoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      </span>
      {preview ? (
        <span className="recap-scan__odds" aria-label="Win odds">
          <b className={homeOn ? 'on' : ''}>
            {m.odds?.home ?? '–'}
            <small>%</small>
          </b>
          <i>{m.odds?.draw ?? '–'}</i>
          <b className={awayOn ? 'on' : ''}>
            {m.odds?.away ?? '–'}
            <small>%</small>
          </b>
        </span>
      ) : (
        <span className="recap-scan__score tabular">
          {m.home.points}–{m.away.points}
        </span>
      )}
      <span
        className={
          'recap-scan__side' + (awayOn ? ' recap-scan__side--on' : '')
        }
      >
        <TeamAvatar
          entryId={m.away.entryId}
          name={m.away.name}
          size="md"
          logoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
        <span className="recap-scan__nm">{shortTeam(m.away.name)}</span>
      </span>
    </div>
  )
}

function GlanceCard({ matchup: m, preview, teamLogoMap, kitIndexByEntry }) {
  const { stats, bullets, recap } = glanceFixture(m, { preview })
  return (
    <section
      className="tile tile--compact recap-scan-card"
      aria-label={`${m.home.name} v ${m.away.name}${preview ? ' preview' : ''}`}
    >
      <DerbyLine matchup={m} />
      <Scoreline
        matchup={m}
        preview={preview}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />
      <div className="recap-scan__boxes">
        {stats.length ? (
          <div className="recap-scan__box recap-scan__box--stats">
            <i>Key</i>
            <GlanceTiles tiles={stats} compact />
          </div>
        ) : null}
        {bullets.length ? (
          <div className="recap-scan__box">
            <i>Notes</i>
            <ul className="recap-scan__bullets">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="recap-scan__box recap-scan__box--recap">
          <i>{preview ? 'Preview' : 'Recap'}</i>
          <p className="recap-scan__quip-copy">{recap.join(' ')}</p>
        </div>
      </div>
    </section>
  )
}

function PolaroidCard({ matchup: m, preview, teamLogoMap, kitIndexByEntry }) {
  const { quip, bullets } = matchupScanLines(m, { preview })
  const chips = matchupChips(m, { preview })
  const caption = quip || bullets[0] || null
  return (
    <section
      className="tile tile--compact recap-scan-card recap-scan-card--polo"
      aria-label={`${m.home.name} v ${m.away.name}${preview ? ' preview' : ''}`}
    >
      <DerbyLine matchup={m} />
      <Scoreline
        matchup={m}
        preview={preview}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />
      {caption ? <p className="recap-scan__quip recap-scan__quip--hero">{caption}</p> : null}
      <ChipRow chips={chips} />
    </section>
  )
}

export function ScanHeader({
  layout,
  recapGw,
  previewGw,
  preview,
  decided,
}) {
  const facts = polaroidFacts({ recapGw, previewGw, preview, decided })
  const tiles = glanceTiles({ recapGw, previewGw, preview, decided })
  const banner = wrapBanner(preview ? previewGw?.wrap : recapGw?.wrap)

  if (layout === 'polaroid' || layout === 'combo') {
    return (
      <>
        <PolaroidStrip facts={facts} />
        {banner && layout === 'combo' ? (
          <p className="recap-scan__banner">{banner}</p>
        ) : null}
      </>
    )
  }

  return (
    <>
      <GlanceTiles tiles={tiles} />
      {banner ? <p className="recap-scan__banner">{banner}</p> : null}
    </>
  )
}

export function ScanMatchups({
  layout,
  matchups,
  preview,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const Card = layout === 'polaroid' ? PolaroidCard : GlanceCard
  return matchups.map((m) => (
    <Card
      key={`${m.home.entryId}-${m.away.entryId}`}
      matchup={m}
      preview={preview}
      teamLogoMap={teamLogoMap}
      kitIndexByEntry={kitIndexByEntry}
    />
  ))
}
