import { useMemo } from 'react'
import { useLiveScores } from './useLiveScores'
import { LiveBannerConcept } from './LiveBannerConcept.jsx'

/**
 * Featured-fixture hero banner shown above the H2H ticker on the FPL Live
 * tab. PR #5 Phase 2 — replaces the old static Triple Threat promo PNG
 * with a generative single-fixture render (mockup `LiveBannerConcept`).
 *
 * Uses `useLiveScores` directly (same cached fetch layer as `FplLiveGwTickerBar`)
 * so we don't have to plumb props deep into `App.jsx`.
 */
export function FplLiveTripleThreatBanner({
  teams,
  matches = [],
  gameweek,
  onBootstrapLiveMeta,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const { squads, eventSnapshot, contributionLiveContext } = useLiveScores({
    teams,
    gameweek,
    enabled: true,
    onBootstrapLiveMeta,
    pollIntervalMs: 90_000,
  })

  const squadByLeagueEntry = useMemo(() => {
    const m = new Map()
    for (const s of squads) m.set(s.leagueEntryId, s)
    return m
  }, [squads])

  return (
    <div className="live-banner-hero-slot">
      <LiveBannerConcept
        teams={teams}
        matches={matches}
        gameweek={gameweek}
        squadByLeagueEntry={squadByLeagueEntry}
        eventSnapshot={eventSnapshot}
        gwFixtures={contributionLiveContext?.gwFixtures ?? null}
        teamLogoMap={teamLogoMap}
        kitIndexByEntry={kitIndexByEntry}
      />
    </div>
  )
}
