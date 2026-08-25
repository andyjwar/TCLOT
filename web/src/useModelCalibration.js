import { useState, useEffect } from 'react';
import { leagueDataCacheKey, fetchLeagueData } from './leagueDataClient.js';

/**
 * Loads model-calibration.json (built by scripts/build-model-calibration.mjs):
 * the empirical variance-inflation factor for the H2H win bars. Degrades to a
 * neutral scale of 1 when the artifact is missing or not yet applied (too few
 * archived matches), so consumers can always pass the value straight into
 * h2hWinProbs as `sigmaScale`.
 */
export function useModelCalibration() {
  const [sigmaScale, setSigmaScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await leagueDataCacheKey();
        const calibration = await fetchLeagueData('model-calibration.json', v);
        if (cancelled) return;
        const s = Number(calibration?.sigmaInflation);
        if (calibration?.applied && Number.isFinite(s) && s > 0) setSigmaScale(s);
      } catch {
        // Missing artifact → keep the neutral scale.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return sigmaScale;
}
