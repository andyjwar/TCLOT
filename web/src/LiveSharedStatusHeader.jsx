import { useMemo } from 'react';
import { liveGroupStatus } from './liveScoresDerivations.js';
import { deriveLiveSummary } from './useFplFixtureLiveSummary.js';

/**
 * Shared status header above the four H2H face-off rows (mockup
 * `LiveHeaderStrip`). PR #5 Phase 2 — all four TCLOT fixtures are always
 * in the same state, so the chip + GW window + progress live here once
 * instead of repeating per card.
 *
 * @param {{
 *   eventSnapshot?: object | null,
 *   gwFixtures?: object[] | null,
 * }} props
 */
export function LiveSharedStatusHeader({ eventSnapshot, gwFixtures }) {
  const summary = useMemo(
    () => deriveLiveSummary(gwFixtures ?? []),
    [gwFixtures],
  );
  const status = useMemo(
    () =>
      liveGroupStatus({
        eventSnapshot,
        gwFixtures,
        liveFixtureCount: summary.liveFixtureCount,
        minute: summary.minute,
      }),
    [eventSnapshot, gwFixtures, summary.liveFixtureCount, summary.minute],
  );

  return (
    <div className={`live-banner-group__header live-banner-group__header--${status.kind}`}>
      <span
        className={`live-banner-group__chip live-banner-group__chip--${status.kind}`}
        aria-label={status.chipLabel}
      >
        {status.kind === 'live' ? (
          <span className="live-banner-group__chip-dot" aria-hidden="true" />
        ) : null}
        <span className="live-banner-group__chip-label">{status.chipLabel}</span>
      </span>
      {status.meta ? (
        <span className="live-banner-group__meta">{status.meta}</span>
      ) : null}
      {status.progress ? (
        <span className="live-banner-group__progress tabular">{status.progress}</span>
      ) : null}
    </div>
  );
}
