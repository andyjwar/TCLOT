import { fplFixtureId, isValidPulseId } from './fplPulseId.js';

/**
 * Split a GW fixture list into cache hits vs fixtures that still need a
 * network fetch. Cache is keyed by real Pulselive ids only — placeholder
 * `pulse_id: 0` must not be treated as a shared cache key.
 *
 * @param {object[]} gwFixtures
 * @param {(pulseId: number) => object | null} getCached
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {{ cachedByFxId: Map<number, object>, uncachedFixtures: object[] }}
 */
export function partitionPremWindowCache(gwFixtures, getCached, opts = {}) {
  const forceRefresh = opts.forceRefresh === true;
  const cachedByFxId = new Map();
  const uncachedFixtures = [];
  for (const fx of gwFixtures || []) {
    const fxId = fplFixtureId(fx);
    const cached =
      !forceRefresh && isValidPulseId(fx?.pulse_id)
        ? getCached(Number(fx.pulse_id))
        : null;
    if (cached && fxId != null) {
      cachedByFxId.set(fxId, { ...cached, fplFixture: fx });
    } else {
      uncachedFixtures.push(fx);
    }
  }
  return { cachedByFxId, uncachedFixtures };
}

/**
 * Join cached + freshly fetched PremWindow rows onto the GW fixture list by
 * FPL fixture `id` (not `pulse_id`). Placeholder pulse ids would otherwise
 * overwrite every row with the last match of the week.
 *
 * @param {object[]} gwFixtures
 * @param {Map<number, object>} cachedByFxId
 * @param {object[]} freshRows
 */
export function joinPremWindowRows(gwFixtures, cachedByFxId, freshRows) {
  const byFxId = new Map(cachedByFxId);
  for (const row of freshRows || []) {
    const fxId = fplFixtureId(row?.fplFixture);
    if (fxId != null) byFxId.set(fxId, row);
  }
  return (gwFixtures || [])
    .map((fx) => byFxId.get(fplFixtureId(fx)))
    .filter(Boolean);
}
