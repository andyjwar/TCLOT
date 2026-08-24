import { useEffect, useRef } from 'react';
import { TeamAvatar } from './TeamAvatar';

/**
 * Mobile fixture switcher — overlapping crest pair + score chips (variant B).
 * Sits under the back chevron on the live fixture sheet; tapping a chip
 * pages the deck to that fixture.
 */
export function LiveFixtureChipStrip({
  fixtures,
  activeIndex,
  onSelectFixture,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeIndex]);

  if (!Array.isArray(fixtures) || fixtures.length <= 1) return null;

  return (
    <div
      className="lfc-fixstrip"
      role="tablist"
      aria-label="Gameweek fixtures"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {fixtures.map((fx, i) => {
        const toPlay =
          (Number(fx.homeRemaining) || 0) + (Number(fx.awayRemaining) || 0);
        const live = toPlay > 0;
        const isActive = i === activeIndex;
        return (
          <button
            key={fx.key ?? `${fx.homeId}-${fx.awayId}-${i}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            ref={isActive ? activeRef : null}
            className={'lfc-fixstrip__chip' + (isActive ? ' is-active' : '')}
            onClick={() => onSelectFixture(i)}
            title={`${fx.homeName} vs ${fx.awayName}`}
          >
            <span className="lfc-fixstrip__crests">
              <TeamAvatar
                entryId={fx.homeId}
                name={fx.homeName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <TeamAvatar
                entryId={fx.awayId}
                name={fx.awayName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            </span>
            <span className="lfc-fixstrip__score tabular">
              {fx.homeLive ?? '—'}–{fx.awayLive ?? '—'}
            </span>
            {live ? (
              <span className="lfc-fixstrip__live" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
