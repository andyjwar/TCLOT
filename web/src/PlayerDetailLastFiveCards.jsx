/**
 * Last-5-GW cards row for the Player Detail Overview tab. Replaces the
 * earlier `MiniBars` chart — the chart was readable in mocks but cramped
 * under real layouts, and dropped the *who* dimension (which opponent the
 * GW was against). Each card shows the opponent club crest, final score
 * from the player's club POV (`2-1 W`), and the points the player earned
 * that GW with green/red tone vs season-average (or a greyed `DNP` chip
 * for any zero-minute GW).
 *
 * Production class prefix `pdetail-l5__*` (mirrors `pdetail-fixrow*`
 * naming for the upcoming-fixtures rows). Renders the same set of cards
 * for both desktop + portrait — outer container handles layout (5-col
 * grid in desktop; horizontal scroll in portrait via the same grid CSS).
 */

/**
 * Premier-League small (50px) crest URL — same path the in-page roster
 * fixture chips use; 50px is plenty for these 28-32px crest cards.
 */
function plOppCrestUrl(teamCode) {
  if (teamCode == null) return null
  const n = Number(teamCode)
  if (!Number.isFinite(n)) return null
  return `https://resources.premierleague.com/premierleague/badges/50/t${n}.png`
}

/**
 * @param {{
 *   cards: Array<{
 *     gw: number,
 *     opponentTeamId: number | null,
 *     home: boolean,
 *     score: string | null,
 *     result: 'W' | 'D' | 'L' | null,
 *     points: number | null,
 *     dnp: boolean,
 *     tone: 'pos' | 'neg' | 'neutral',
 *   }>,
 *   teamById: Map<number, object> | null | undefined,
 * }} props
 */
export function PlayerDetailLastFiveCards({ cards, teamById }) {
  if (!cards || cards.length === 0) return null
  return (
    <div className="pdetail-l5">
      {cards.map((c) => {
        const opp =
          c.opponentTeamId != null
            ? teamById?.get?.(c.opponentTeamId) ?? teamById?.[c.opponentTeamId] ?? null
            : null
        const oppShort = opp?.short_name ?? '???'
        const crestUrl = plOppCrestUrl(opp?.code)
        const haLabel = c.home ? 'H' : 'A'
        return (
          <div
            key={`${c.gw}-${c.opponentTeamId ?? 'na'}`}
            className={
              'pdetail-l5__card' +
              (c.dnp ? ' pdetail-l5__card--dnp' : '') +
              (!c.dnp && c.tone !== 'neutral' ? ` pdetail-l5__card--${c.tone}` : '')
            }
            title={
              c.dnp
                ? `GW${c.gw} · ${oppShort} (${haLabel}) · DNP`
                : `GW${c.gw} · ${oppShort} (${haLabel}) · ${c.score ?? '—'} ${c.result ?? ''} · ${c.points ?? 0} pts`
            }
          >
            <div className="pdetail-l5__gw">GW{c.gw}</div>
            <div className="pdetail-l5__crest" aria-hidden>
              {crestUrl ? (
                <img src={crestUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="pdetail-l5__crest-fallback">{oppShort.slice(0, 3)}</span>
              )}
            </div>
            <div className="pdetail-l5__opp">
              {oppShort} <span className="pdetail-l5__ha">{haLabel}</span>
            </div>
            {c.dnp ? (
              <div className="pdetail-l5__dnp">DNP</div>
            ) : (
              <>
                <div className="pdetail-l5__score">
                  <span className="pdetail-l5__score-num">{c.score ?? '—'}</span>
                  {c.result ? (
                    <span
                      className={`pdetail-l5__result pdetail-l5__result--${c.result.toLowerCase()}`}
                    >
                      {c.result}
                    </span>
                  ) : null}
                </div>
                <div
                  className={
                    'pdetail-l5__pts' +
                    (c.tone !== 'neutral' ? ` pdetail-l5__pts--${c.tone}` : '')
                  }
                >
                  {c.points ?? 0}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
