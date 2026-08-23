import { useMemo } from 'react';
import { TeamAvatar } from './TeamAvatar';

/**
 * All `matches` rows between two `league_entry` ids this season (tile home/away = banner sides).
 * Winner-first score in each chip (e.g. 34–21). For draws, home tile score first (same order as FPL row).
 * Uses live GW XI totals when this row is the active gameweek pairing.
 */
function seasonH2hBetween(
  matches,
  homeId,
  awayId,
  gameweek,
  liveHomePts,
  liveAwayPts,
  /** When false and this row uses live subs, a 0–0 score is omitted (unsettled GW, not a real draw). */
  selectedGwFinished,
) {
  const h = Number(homeId);
  const a = Number(awayId);
  const gwNum = Number(gameweek);
  const homeWins = [];
  const awayWins = [];
  const draws = [];
  for (const m of matches || []) {
    const e1 = Number(m.league_entry_1);
    const e2 = Number(m.league_entry_2);
    if (!Number.isFinite(e1) || !Number.isFinite(e2)) continue;
    if ((e1 !== h || e2 !== a) && (e1 !== a || e2 !== h)) continue;

    const ev = Number(m.event);
    let hp;
    let ap;
    if (Number.isFinite(ev) && ev === gwNum && liveHomePts != null && liveAwayPts != null) {
      hp = liveHomePts;
      ap = liveAwayPts;
      if (hp === 0 && ap === 0 && !selectedGwFinished) {
        continue;
      }
    } else {
      /** Future/unplayed rows ship `0-0` points in league data — without
       *  this guard every upcoming meeting rendered as a 0-0 "draw" chip.
       *  A genuine drawn match still counts: it has `finished: true`. */
      if (m.finished !== true) continue;
      const p1 = Number(m.league_entry_1_points);
      const p2 = Number(m.league_entry_2_points);
      if (!Number.isFinite(p1) || !Number.isFinite(p2)) continue;
      hp = e1 === h ? p1 : p2;
      ap = e1 === h ? p2 : p1;
    }

    if (hp > ap) {
      homeWins.push({ gw: ev, label: `${hp}-${ap}` });
    } else if (ap > hp) {
      awayWins.push({ gw: ev, label: `${ap}-${hp}` });
    } else {
      draws.push({ gw: ev, label: `${hp}-${ap}` });
    }
  }
  const byGw = (x, y) => x.gw - y.gw;
  homeWins.sort(byGw);
  awayWins.sort(byGw);
  draws.sort(byGw);
  return { homeWins, awayWins, draws };
}

/**
 * @param {{ homeId: number, awayId: number, homeName: string, awayName: string, matches: object[], gameweek: number, liveHomePts: number | null | undefined, liveAwayPts: number | null | undefined, selectedGwFinished: boolean, teamLogoMap: object, kitIndexByEntry?: object }} props
 */
export function LiveFixtureSeasonH2h({
  homeId,
  awayId,
  homeName,
  awayName,
  matches,
  gameweek,
  liveHomePts,
  liveAwayPts,
  selectedGwFinished,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const { homeWins, awayWins, draws } = useMemo(
    () =>
      seasonH2hBetween(
        matches,
        homeId,
        awayId,
        gameweek,
        liveHomePts,
        liveAwayPts,
        selectedGwFinished,
      ),
    [
      matches,
      homeId,
      awayId,
      gameweek,
      liveHomePts,
      liveAwayPts,
      selectedGwFinished,
    ],
  );
  const hasAny = homeWins.length + awayWins.length + draws.length > 0;

  return (
    <div className="live-fixture-season-h2h" aria-label="Season head-to-head">
      <h4 className="live-fixture-season-h2h__heading">Season H2H</h4>
      {!hasAny ? (
        <p className="muted muted--tight live-fixture-season-h2h__empty">
          No scored head-to-heads in league data for this pair yet.
        </p>
      ) : (
        <>
          <div className="live-fixture-season-h2h__row">
            <div className="live-fixture-season-h2h__side">
              <TeamAvatar
                entryId={homeId}
                name={homeName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <div className="live-fixture-season-h2h__chips">
                {homeWins.map((x) => (
                  <span
                    key={`h2h-h-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--win tabular"
                    title={`GW ${x.gw}: ${homeName} ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="live-fixture-season-h2h__side live-fixture-season-h2h__side--away">
              <TeamAvatar
                entryId={awayId}
                name={awayName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <div className="live-fixture-season-h2h__chips">
                {awayWins.map((x) => (
                  <span
                    key={`h2h-a-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--win tabular"
                    title={`GW ${x.gw}: ${awayName} ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {draws.length > 0 ? (
            <div className="live-fixture-season-h2h__draws">
              <span className="live-fixture-season-h2h__draws-label">Draws</span>
              <div className="live-fixture-season-h2h__chips">
                {draws.map((x) => (
                  <span
                    key={`h2h-d-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--draw tabular"
                    title={`GW ${x.gw}: draw ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
