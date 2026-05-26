import { Fragment, useMemo, useState } from 'react';
import { liveGwDisplayTotal } from './liveGwTotals.js';
import {
  dcThresholdReached,
  formatKickoffLabel,
  playerLiveState,
  playerXiPillKind,
  rowsByPointsContributed,
} from './liveScoresDerivations.js';
import { ClickablePlayerName } from './PlayerHistoryContext.jsx';

/**
 * Effective starters/bench (post-autosub when available) — mirror of the
 * helper in `LiveScores.jsx`. Kept inline so this component doesn't pull
 * an internal export from there.
 */
function effectiveStarters(squad) {
  if (!squad || squad.error) return [];
  const nBench = squad.bench?.length ?? 0;
  if (
    squad.displayStarters?.length === 11 &&
    squad.displayBench?.length === nBench
  ) {
    return squad.displayStarters;
  }
  return squad.starters ?? [];
}

function effectiveBench(squad) {
  if (!squad || squad.error) return [];
  const nBench = squad.bench?.length ?? 0;
  if (
    squad.displayStarters?.length === 11 &&
    squad.displayBench?.length === nBench
  ) {
    return squad.displayBench;
  }
  return squad.bench ?? [];
}

/**
 * Build `element id → kickoff_time` from the live context. We use the
 * element's team to find that team's earliest GW fixture and grab its
 * `kickoff_time` (single kickoff for a player without a fixture-explain
 * trail, which is fine for the pre-kickoff DNP label).
 */
function kickoffLabelByElementId(ctx) {
  const out = new Map();
  if (!ctx) return out;
  const elementById = ctx.elementById || {};
  const fixtures = Array.isArray(ctx.gwFixtures) ? ctx.gwFixtures : [];
  if (!fixtures.length) return out;
  const earliestByTeam = new Map();
  for (const f of fixtures) {
    const ko = typeof f?.kickoff_time === 'string' ? f.kickoff_time : null;
    if (!ko) continue;
    const t = new Date(ko).getTime();
    if (Number.isNaN(t)) continue;
    for (const tid of [Number(f.team_h), Number(f.team_a)]) {
      if (!Number.isFinite(tid)) continue;
      const prev = earliestByTeam.get(tid);
      if (prev == null || t < prev.t) earliestByTeam.set(tid, { t, ko });
    }
  }
  for (const [idStr, el] of Object.entries(elementById)) {
    const id = Number(idStr);
    if (!Number.isFinite(id) || !el) continue;
    const tid = Number(el.team);
    const slot = earliestByTeam.get(tid);
    if (slot) {
      const label = formatKickoffLabel(slot.ko);
      if (label) out.set(id, label);
    }
  }
  return out;
}

/**
 * Goals or assists indicator dots — small filled circles like the mockup
 * `mockup-expanded__stat-dot--goal/--assist`. Renders nothing for 0.
 */
function StatDots({ count, kind, ariaLabel }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return (
    <span className={`live-xp-stat live-xp-stat--${kind}`} aria-label={ariaLabel ?? `${n}`}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={`live-xp-stat__dot live-xp-stat__dot--${kind}`} />
      ))}
    </span>
  );
}

/**
 * Compute clean-sheet for GK/DEF in this GW: minutes ≥ 60 and the club's
 * fixtures this GW had 0 against. Without per-fixture conceded data
 * accessible from a row we fall back on the FPL live `clean_sheets` count
 * from the player's live stats row — same data the official site uses.
 */
function isCleanSheet(row, liveByEl) {
  const pos = String(row?.posSingular ?? '').toUpperCase();
  if (pos !== 'GK' && pos !== 'GKP' && pos !== 'DEF') return false;
  const mins = Number(row?.minutes) || 0;
  if (mins < 60) return false;
  if (!liveByEl) return false;
  const stats = liveByEl[row.element]?.stats ?? liveByEl[row.element] ?? {};
  const cs = Number(stats?.clean_sheets);
  return Number.isFinite(cs) && cs >= 1;
}

/**
 * One player row in the redesigned expanded view (mockup
 * `mockup-expanded__player`). Two-line grid:
 *   line 1: crest · status-pill(name) · pos · vs OPP · pts
 *   line 2: G dots · A dots · CS dot · DC · +Bonus · live-state
 *
 * @param {{
 *   row: object,
 *   bench?: boolean,
 *   kickoffByEl: Map<number, string>,
 *   liveByEl: Record<number, object>,
 *   onOpenPlayer?: (row: object) => void,
 *   autosubbed?: boolean,
 * }} props
 */
function LiveExpandedPlayerRow({
  row,
  bench = false,
  kickoffByEl,
  liveByEl,
  onOpenPlayer,
  autosubbed = false,
}) {
  const pillKind = playerXiPillKind(row);
  const kickoffLabel = kickoffByEl?.get(row.element) ?? null;
  const state = playerLiveState({ ...row, kickoffLabel });
  const dc = Number(row.dcCount) || 0;
  const dcOn = dcThresholdReached(row.posSingular, dc);
  const oppLabel = row.opponentShortLabel ?? '—';
  const pts = Number(row.total_points) || 0;
  const goals = Number(row.goalsScored) || 0;
  const assists = Number(row.assists) || 0;
  const bonus = Number(row.bonus) || 0;
  const showCs = isCleanSheet(row, liveByEl);
  const showStatsStrip = state.kind === 'live' || state.kind === 'ft';
  const displayName = row.displayName ?? row.web_name ?? `#${row.element}`;

  return (
    <div className={'live-xp-player' + (bench ? ' live-xp-player--bench' : '')}>
      <span className="live-xp-player__pl-crest" aria-hidden="true">
        {row.teamShort?.slice(0, 3) ?? '—'}
      </span>

      <span className="live-xp-player__name-wrap">
        {onOpenPlayer ? (
          <button
            type="button"
            className={`live-xp-player__pill live-xp-player__pill--${pillKind}`}
            onClick={() => onOpenPlayer(row)}
            title={`${displayName} — view season history`}
          >
            <span className="live-xp-player__name">{displayName}</span>
          </button>
        ) : (
          <span className={`live-xp-player__pill live-xp-player__pill--${pillKind}`}>
            <span className="live-xp-player__name">{displayName}</span>
          </span>
        )}
        {row.availabilityStatus === 'i' ? (
          <span
            className="live-xp-player__icon"
            title={row.availabilityNews?.trim() || 'Injured'}
            aria-label="Injured"
            role="img"
          >
            🚑
          </span>
        ) : null}
        {autosubbed ? (
          <span
            className="live-xp-player__icon"
            title="Autosubbed in from the bench"
            aria-label="Autosubbed in from the bench"
            role="img"
          >
            🔄
          </span>
        ) : null}
      </span>

      <span className="live-xp-player__pos">{row.posSingular}</span>

      <span className="live-xp-player__opp">
        <span className="live-xp-player__opp-vs">vs</span>
        <span className="live-xp-player__opp-crest">{oppLabel}</span>
      </span>

      <span
        className={
          'live-xp-player__pts tabular' +
          (pts === 0 ? ' live-xp-player__pts--zero' : '')
        }
      >
        {pts}
      </span>

      <div className="live-xp-player__stats">
        <StatDots count={goals} kind="goal" ariaLabel={`${goals} goals`} />
        <StatDots count={assists} kind="assist" ariaLabel={`${assists} assists`} />
        {showCs ? (
          <span className="live-xp-stat" aria-label="Clean sheet">
            <span className="live-xp-stat__dot live-xp-stat__dot--cs" />
          </span>
        ) : null}
        {showStatsStrip ? (
          <span className="live-xp-stat">
            <span className="live-xp-stat__label">DC</span>
            <span
              className={
                'live-xp-stat__num' +
                (dcOn ? ' live-xp-stat__num--on' : ' live-xp-stat__num--off')
              }
            >
              {dc}
            </span>
          </span>
        ) : null}
        {bonus > 0 ? (
          <span className="live-xp-stat">
            <span className="live-xp-stat__num live-xp-stat__num--bonus">
              +{bonus}
            </span>
          </span>
        ) : null}
        <span className={`live-xp-stat live-xp-stat--state live-xp-stat--state-${state.kind}`}>
          {state.text}
        </span>
      </div>
    </div>
  );
}

/**
 * The legend strip — small G / A / CS / DC · B reminders.
 */
function GroupLegend() {
  return (
    <span className="live-xp-legend" aria-hidden="true">
      <span className="live-xp-legend__item">
        <span className="live-xp-stat__dot live-xp-stat__dot--goal" /> G
      </span>
      <span className="live-xp-legend__item">
        <span className="live-xp-stat__dot live-xp-stat__dot--assist" /> A
      </span>
      <span className="live-xp-legend__item">DC · B</span>
    </span>
  );
}

/**
 * Single team's player list — Starting XI then Bench, both sorted by
 * points contributed (mockup spec). Auto-sub IDs are passed so the swap
 * emoji renders next to the player that came on.
 */
function LivePlayerList({
  squad,
  kickoffByEl,
  liveByEl,
  onOpenPlayer,
  autosubInIds,
}) {
  const startersSorted = useMemo(
    () => rowsByPointsContributed(effectiveStarters(squad)),
    [squad],
  );
  const benchSorted = useMemo(
    () => rowsByPointsContributed(effectiveBench(squad)),
    [squad],
  );

  if (!squad) {
    return <p className="muted muted--tight">No squad data for this team.</p>;
  }
  if (squad.error) {
    return <p className="muted">{squad.error}</p>;
  }

  return (
    <div className="live-xp-team">
      <div className="live-xp-group-h">
        <span>Starting XI</span>
        <GroupLegend />
      </div>
      {startersSorted.map((r) => (
        <LiveExpandedPlayerRow
          key={`s-${r.element}-${r.pickPosition}`}
          row={r}
          kickoffByEl={kickoffByEl}
          liveByEl={liveByEl}
          onOpenPlayer={onOpenPlayer}
          autosubbed={autosubInIds?.has(Number(r.element))}
        />
      ))}
      {benchSorted.length ? (
        <>
          <div className="live-xp-group-h live-xp-group-h--bench">
            <span>Bench</span>
          </div>
          {benchSorted.map((r) => (
            <LiveExpandedPlayerRow
              key={`b-${r.element}-${r.pickPosition}`}
              row={r}
              bench
              kickoffByEl={kickoffByEl}
              liveByEl={liveByEl}
              onOpenPlayer={onOpenPlayer}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

/**
 * The expanded fixture body — both teams' players visible in the new
 * column system. Renders the auto-sub strip at the top per squad (when
 * present), then the player list.
 *
 *  - `viewport === 'mobile'`: tabs at top (default home), one team at a time.
 *  - `viewport === 'desktop'`: both teams side-by-side (or stacked on narrow
 *                              desktop).
 *
 * @param {{
 *   homeSquad: object,
 *   awaySquad: object,
 *   homeName: string,
 *   awayName: string,
 *   contributionLiveContext: object | null,
 *   viewport?: 'desktop' | 'mobile',
 *   onOpenPlayer?: (row: object, squad: object) => void,
 * }} props
 */
export function LiveExpandedFixture({
  homeSquad,
  awaySquad,
  homeName,
  awayName,
  contributionLiveContext,
  viewport = 'desktop',
  onOpenPlayer,
}) {
  const kickoffByEl = useMemo(
    () => kickoffLabelByElementId(contributionLiveContext),
    [contributionLiveContext],
  );
  const liveByEl = contributionLiveContext?.liveFullByElementId ?? null;

  const homeAutoSubs = pickAutoSubs(homeSquad);
  const awayAutoSubs = pickAutoSubs(awaySquad);
  const homeAutoIn = new Set((homeAutoSubs?.subs || []).map((a) => Number(a.element_in)));
  const awayAutoIn = new Set((awayAutoSubs?.subs || []).map((a) => Number(a.element_in)));

  const [tab, setTab] = useState('home');

  const homeTotal = liveGwDisplayTotal(homeSquad);
  const awayTotal = liveGwDisplayTotal(awaySquad);

  const onPick = onOpenPlayer
    ? (row, squad) => onOpenPlayer(row, squad)
    : undefined;

  if (viewport === 'mobile') {
    return (
      <div className="live-xp live-xp--mobile">
        <div className="live-xp__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'home'}
            className={
              'live-xp__tab' + (tab === 'home' ? ' is-active' : '')
            }
            onClick={() => setTab('home')}
          >
            <span>{homeName}</span>
            <span className="live-xp__tab-pts tabular">
              {homeTotal != null ? `${homeTotal} pts` : '—'}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'away'}
            className={
              'live-xp__tab' + (tab === 'away' ? ' is-active' : '')
            }
            onClick={() => setTab('away')}
          >
            <span>{awayName}</span>
            <span className="live-xp__tab-pts tabular">
              {awayTotal != null ? `${awayTotal} pts` : '—'}
            </span>
          </button>
        </div>
        <AutoSubStrip squad={tab === 'home' ? homeSquad : awaySquad} />
        <LivePlayerList
          squad={tab === 'home' ? homeSquad : awaySquad}
          kickoffByEl={kickoffByEl}
          liveByEl={liveByEl}
          onOpenPlayer={
            onPick ? (r) => onPick(r, tab === 'home' ? homeSquad : awaySquad) : undefined
          }
          autosubInIds={tab === 'home' ? homeAutoIn : awayAutoIn}
        />
      </div>
    );
  }

  return (
    <div className="live-xp live-xp--desktop">
      <div className="live-xp__columns">
        <section className="live-xp__column">
          <header className="live-xp__column-h">
            <h4 className="live-xp__column-title">{homeName}</h4>
            <span className="live-xp__column-pts tabular">
              {homeTotal != null ? <strong>{homeTotal}</strong> : '—'} GW pts
            </span>
          </header>
          <AutoSubStrip squad={homeSquad} />
          <LivePlayerList
            squad={homeSquad}
            kickoffByEl={kickoffByEl}
            liveByEl={liveByEl}
            onOpenPlayer={onPick ? (r) => onPick(r, homeSquad) : undefined}
            autosubInIds={homeAutoIn}
          />
        </section>
        <section className="live-xp__column">
          <header className="live-xp__column-h">
            <h4 className="live-xp__column-title">{awayName}</h4>
            <span className="live-xp__column-pts tabular">
              {awayTotal != null ? <strong>{awayTotal}</strong> : '—'} GW pts
            </span>
          </header>
          <AutoSubStrip squad={awaySquad} />
          <LivePlayerList
            squad={awaySquad}
            kickoffByEl={kickoffByEl}
            liveByEl={liveByEl}
            onOpenPlayer={onPick ? (r) => onPick(r, awaySquad) : undefined}
            autosubInIds={awayAutoIn}
          />
        </section>
      </div>
    </div>
  );
}

/** Picks the active auto-sub list off a squad. */
function pickAutoSubs(squad) {
  if (!squad) return null;
  const subs =
    squad.autosubSource === 'official' && squad.autoSubs?.length
      ? squad.autoSubs
      : squad.autosubSource === 'projected' && squad.projectedAutoSubs?.length
        ? squad.projectedAutoSubs
        : [];
  if (!subs.length) return null;
  return { subs, source: squad.autosubSource };
}

function AutoSubStrip({ squad }) {
  const auto = pickAutoSubs(squad);
  if (!auto) return null;
  const allRows = [...(squad?.starters ?? []), ...(squad?.bench ?? [])];

  return (
    <div
      className={
        'live-xp__autosubs' +
        (auto.source === 'projected' ? ' live-xp__autosubs--projected' : '')
      }
      role="status"
    >
      <strong>
        {auto.source === 'official' ? 'Auto subs:' : 'Projected auto subs:'}
      </strong>{' '}
      {auto.subs.map((a, i) => {
        const rowIn = allRows.find((r) => r.element === Number(a.element_in));
        const rowOut = allRows.find((r) => r.element === Number(a.element_out));
        const nameIn = rowIn?.displayName ?? rowIn?.web_name ?? `#${a.element_in}`;
        const nameOut = rowOut?.displayName ?? rowOut?.web_name ?? `#${a.element_out}`;
        return (
          <Fragment key={`${a.element_in}-${a.element_out}`}>
            {i > 0 ? <span className="live-xp__autosubs-sep">, </span> : null}
            <span className="live-xp__autosub-pair">
              <ClickablePlayerName
                element={a.element_in}
                displayName={rowIn?.displayName}
                web_name={rowIn?.web_name ?? nameIn}
                teamShort={rowIn?.teamShort}
              >
                {nameIn}
              </ClickablePlayerName>{' '}
              ↔{' '}
              <ClickablePlayerName
                element={a.element_out}
                displayName={rowOut?.displayName}
                web_name={rowOut?.web_name ?? nameOut}
                teamShort={rowOut?.teamShort}
              >
                {nameOut}
              </ClickablePlayerName>
            </span>
          </Fragment>
        );
      })}
      {auto.source === 'projected' ? (
        <span className="live-xp__autosubs-note">
          {' '}
          Provisional until FPL posts official autosubs.
        </span>
      ) : null}
    </div>
  );
}
