import { teamInitials } from './liveScoresDerivations.js';

/**
 * Mobile fixture switcher — variant D: small inline text chips on the
 * back-chevron row. Each chip is home abbr + score + away abbr (no crests).
 * The currently open fixture is omitted (it already fills the scorehead
 * below), leaving just the other games to switch to.
 */
export function LiveFixtureChipStrip({
  fixtures,
  activeIndex,
  onSelectFixture,
}) {
  if (!Array.isArray(fixtures) || fixtures.length <= 1) return null;

  const others = fixtures
    .map((fx, i) => ({ fx, i }))
    .filter(({ i }) => i !== activeIndex);

  if (others.length === 0) return null;

  return (
    <div
      className="lfc-fixstrip"
      role="tablist"
      aria-label="Switch fixture"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {others.map(({ fx, i }) => {
        const toPlay =
          (Number(fx.homeRemaining) || 0) + (Number(fx.awayRemaining) || 0);
        const live = toPlay > 0;
        return (
          <button
            key={fx.key ?? `${fx.homeId}-${fx.awayId}-${i}`}
            type="button"
            role="tab"
            aria-selected="false"
            className="lfc-fixstrip__chip"
            onClick={() => onSelectFixture(i)}
            title={`${fx.homeName} vs ${fx.awayName}`}
          >
            <span className="lfc-fixstrip__ab">{teamInitials(fx.homeName)}</span>
            <span className="lfc-fixstrip__score tabular">
              {fx.homeLive ?? '—'}–{fx.awayLive ?? '—'}
            </span>
            <span className="lfc-fixstrip__ab">{teamInitials(fx.awayName)}</span>
            {live ? (
              <span className="lfc-fixstrip__live" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
