import { useState, useEffect } from 'react';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;
const FORM_LAST_N = 7;

async function fetchJSON(path) {
  const res = await fetch(`${DATA_BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function fetchJSONOptional(path) {
  try {
    const res = await fetch(`${DATA_BASE}/${path}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** element_type 1 = GKP — excluded: cheap keeper churn dominates waivers but isn’t useful for this list */
const OUTFIELD_TYPES = new Set([2, 3, 4]);
/** FPL element IDs omitted from this list (e.g. suspected bad/misleading waiver attribution). */
const EXCLUDED_WAIVER_ELEMENT_IDS = new Set([667]);

function buildMostWaivered(transactionsPayload, fplMini) {
  if (!transactionsPayload?.transactions || !fplMini?.elements?.length) return [];
  const elemById = Object.fromEntries(fplMini.elements.map((e) => [e.id, e]));
  const teamById = Object.fromEntries((fplMini.teams || []).map((t) => [t.id, t]));
  const counts = {};
  for (const tx of transactionsPayload.transactions) {
    if (tx.kind !== 'w' || tx.result !== 'a') continue;
    const el = tx.element_in;
    if (el == null || EXCLUDED_WAIVER_ELEMENT_IDS.has(el)) continue;
    const meta = elemById[el];
    const et = meta?.element_type;
    if (et != null && !OUTFIELD_TYPES.has(et)) continue;
    counts[el] = (counts[el] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, claimCount]) => {
      const e = elemById[Number(id)];
      const tm = e ? teamById[e.team] : null;
      const teamId = e?.team;
      return {
        elementId: Number(id),
        web_name: e?.web_name ?? `Player #${id}`,
        teamShort: tm?.short_name ?? '—',
        teamCode: tm?.code,
        teamId,
        claims: claimCount,
        shirtUrl:
          teamId != null
            ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamId}-1.png`
            : null,
        badgeUrl:
          tm?.code != null
            ? `https://resources.premierleague.com/premierleague/badges/50/t${tm.code}.png`
            : null,
      };
    });
}

export function useLeagueData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const details = await fetchJSON('details.json');
        const [transactions, fplMini] = await Promise.all([
          fetchJSONOptional('transactions.json'),
          fetchJSONOptional('fpl-mini.json'),
        ]);
        let teamLogoMap = {};
        try {
          const r = await fetch(`${DATA_BASE}/team-logos/manifest.json`);
          if (r.ok) {
            const j = await r.json();
            if (j && typeof j === 'object' && !Array.isArray(j)) {
              teamLogoMap = j;
            }
          }
        } catch {
          /* optional file */
        }
        if (!cancelled)
          setData({
            ...processLeagueData(details, { transactions, fplMini }),
            teamLogoMap,
          });
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}

function opponentId(m, entryId) {
  return m.league_entry_1 === entryId ? m.league_entry_2 : m.league_entry_1;
}

function resultForEntry(m, entryId) {
  const p1 = m.league_entry_1_points;
  const p2 = m.league_entry_2_points;
  const e1 = m.league_entry_1;
  if (e1 === entryId) {
    if (p1 > p2) return 'W';
    if (p1 < p2) return 'L';
    return 'D';
  }
  if (p2 > p1) return 'W';
  if (p2 < p1) return 'L';
  return 'D';
}

/** Last N results oldest→newest for form circles */
function formSequence(entryId, finishedMatches, n) {
  const mine = finishedMatches.filter(
    (m) => m.league_entry_1 === entryId || m.league_entry_2 === entryId
  );
  mine.sort((a, b) => a.event - b.event || a.id - b.id);
  const last = mine.slice(-n);
  return last.map((m) => resultForEntry(m, entryId));
}

function nextOpponent(entryId, matches, teams) {
  const upcoming = matches
    .filter(
      (m) =>
        !m.finished &&
        (m.league_entry_1 === entryId || m.league_entry_2 === entryId)
    )
    .sort((a, b) => a.event - b.event);
  const m = upcoming[0];
  if (!m) return null;
  const oid = opponentId(m, entryId);
  return {
    id: oid,
    name: teams[oid]?.entry_name ?? 'TBC',
  };
}

function processLeagueData(raw, extras = {}) {
  const isSampleData = raw._tcMeta?.isSample === true;
  const details = { ...raw };
  delete details._tcMeta;

  const teams = Object.fromEntries(
    (details.league_entries || []).map((e) => [e.id, { ...e }])
  );

  const standings = (details.standings || []).map((s) => ({
    ...s,
    teamName: teams[s.league_entry]?.entry_name ?? 'Unknown',
    manager: `${teams[s.league_entry]?.player_first_name ?? ''} ${teams[s.league_entry]?.player_last_name ?? ''}`.trim(),
  }));

  const sortedByRank = [...standings].sort((a, b) => a.rank - b.rank);
  const matches = details.matches || [];
  const finished = matches.filter((m) => m.finished);

  const tableRows = sortedByRank.map((s) => {
    const eid = s.league_entry;
    const pl = s.matches_won + s.matches_drawn + s.matches_lost;
    const gf = s.points_for ?? 0;
    const ga = s.points_against ?? 0;
    const seq = formSequence(eid, finished, FORM_LAST_N);
    while (seq.length < FORM_LAST_N) seq.unshift(null);
    const next = nextOpponent(eid, matches, teams);
    return {
      ...s,
      pl,
      gf,
      ga,
      gd: gf - ga,
      form: seq.slice(-FORM_LAST_N),
      next,
    };
  });

  function buildFormStrip(entryId) {
    const mine = finished
      .filter(
        (m) =>
          m.league_entry_1 === entryId || m.league_entry_2 === entryId
      )
      .sort((a, b) => a.event - b.event || (a.id ?? 0) - (b.id ?? 0))
      .slice(-FORM_LAST_N);
    return mine.map((m) => {
      const oppId = opponentId(m, entryId);
      const myPts =
        m.league_entry_1 === entryId
          ? m.league_entry_1_points
          : m.league_entry_2_points;
      const oppPts =
        m.league_entry_1 === entryId
          ? m.league_entry_2_points
          : m.league_entry_1_points;
      const res = resultForEntry(m, entryId);
      return {
        scoreStr: `${myPts} - ${oppPts}`,
        result: res,
        opponentName: teams[oppId]?.entry_name ?? '?',
        opponentEntryId: oppId,
        event: m.event,
      };
    });
  }

  const teamFormStripByEntry = Object.fromEntries(
    sortedByRank.map((s) => [s.league_entry, buildFormStrip(s.league_entry)])
  );

  const teamsForFormSelect = sortedByRank.map((s) => ({
    id: s.league_entry,
    rank: s.rank,
    teamName: s.teamName,
  }));

  const finishedSorted = [...finished].sort((a, b) => {
    if (b.event !== a.event) return b.event - a.event;
    return (b.id ?? 0) - (a.id ?? 0);
  });

  const previousFixtures = finishedSorted.slice(0, 24).map((m) => ({
    event: m.event,
    homeId: m.league_entry_1,
    awayId: m.league_entry_2,
    homeName: teams[m.league_entry_1]?.entry_name ?? '?',
    awayName: teams[m.league_entry_2]?.entry_name ?? '?',
    homePts: m.league_entry_1_points,
    awayPts: m.league_entry_2_points,
  }));

  const upcoming = matches
    .filter((m) => !m.finished)
    .sort((a, b) => a.event - b.event || (a.id ?? 0) - (b.id ?? 0));

  const nextEvent = upcoming.length ? Math.min(...upcoming.map((m) => m.event)) : null;
  const nextFixtures = upcoming
    .filter((m) => m.event === nextEvent)
    .map((m) => ({
      event: m.event,
      homeId: m.league_entry_1,
      awayId: m.league_entry_2,
      homeName: teams[m.league_entry_1]?.entry_name ?? '?',
      awayName: teams[m.league_entry_2]?.entry_name ?? '?',
    }));

  const allUpcomingByGw = {};
  for (const m of upcoming) {
    if (!allUpcomingByGw[m.event]) allUpcomingByGw[m.event] = [];
    allUpcomingByGw[m.event].push({
      event: m.event,
      homeId: m.league_entry_1,
      awayId: m.league_entry_2,
      homeName: teams[m.league_entry_1]?.entry_name ?? '?',
      awayName: teams[m.league_entry_2]?.entry_name ?? '?',
    });
  }
  const upcomingRounds = Object.keys(allUpcomingByGw)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 3)
    .map((ev) => ({ gameweek: ev, fixtures: allUpcomingByGw[ev] }));

  const nextMatchHeadline =
    nextFixtures[0] &&
    `${nextFixtures[0].homeName} vs ${nextFixtures[0].awayName}`;

  const lastFinishedGw = finished.length
    ? Math.max(...finished.map((m) => m.event))
    : null;
  const previousGameweekFixtures =
    lastFinishedGw != null
      ? finished
          .filter((m) => m.event === lastFinishedGw)
          .map((m) => ({
            event: m.event,
            homeId: m.league_entry_1,
            awayId: m.league_entry_2,
            homeName: teams[m.league_entry_1]?.entry_name ?? '?',
            awayName: teams[m.league_entry_2]?.entry_name ?? '?',
            homePts: m.league_entry_1_points,
            awayPts: m.league_entry_2_points,
          }))
      : [];

  const mostWaiveredPlayers = buildMostWaivered(
    extras.transactions,
    extras.fplMini
  );

  return {
    league: details.league,
    standings: sortedByRank,
    tableRows,
    teamFormStripByEntry,
    teamsForFormSelect,
    previousFixtures,
    nextFixtures,
    nextEvent,
    nextGameweekFixtures: nextFixtures,
    previousGameweek: lastFinishedGw,
    previousGameweekFixtures,
    upcomingRounds,
    nextMatchHeadline,
    mostWaiveredPlayers,
    isSampleData,
  };
}

export { FORM_LAST_N };
