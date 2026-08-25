#!/usr/bin/env node
/**
 * Reinstate pre-match xPts / win % on an existing projections-history snapshot
 * from a locked `predictions.json` (the Live Odds source), without re-rolling
 * the Monte Carlo model.
 *
 * Used for GW1 2026-27 after a post-close rebuild crushed archive xPts to ~7
 * and flipped favorites. Restore from the Live Odds artifact, e.g.:
 *
 *   git show 13c11a7:web/public/league-data/predictions.json > /tmp/prematch.json
 *   PREDICTIONS_JSON=/tmp/prematch.json REPAIR_GW=1 \
 *     node scripts/reinstate-prematch-from-predictions.mjs
 *   node scripts/build-season-predictions.mjs
 *   node scripts/build-weekly-recaps.mjs
 *
 *   PREDICTIONS_JSON=/path/to/predictions.json \
 *   REPAIR_GW=1 \
 *   node scripts/reinstate-prematch-from-predictions.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  predictionsById,
  h2hWinProbs,
  teamForecastDistribution,
  sumTeamForecastXp,
  teamOddsTotals,
} from '../src/forecastHelpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leagueDataDir = join(__dirname, '../public/league-data');
const gw = Number(process.env.REPAIR_GW || 1);
const predPath =
  process.env.PREDICTIONS_JSON || join(leagueDataDir, 'predictions.json');
const histPath = join(
  leagueDataDir,
  'projections-history',
  `gw-${String(gw).padStart(2, '0')}.json`,
);

if (!existsSync(predPath) || !existsSync(histPath)) {
  console.error('reinstate-prematch: missing predictions.json or gw snapshot');
  process.exit(1);
}

const pred = JSON.parse(readFileSync(predPath, 'utf8'));
const snap = JSON.parse(readFileSync(histPath, 'utf8'));
if (Number(pred.gameweek) !== gw) {
  console.warn(
    `reinstate-prematch: predictions.json is GW${pred.gameweek}, snapshot is GW${gw} — continuing anyway`,
  );
}

const byId = predictionsById(pred);
const r1 = (n) => Math.round(n * 10) / 10;

for (const row of snap.h2h || []) {
  const hIds = (row.xi1 || []).map((p) => Number(p.id));
  const aIds = (row.xi2 || []).map((p) => Number(p.id));
  if (hIds.length !== 11 || aIds.length !== 11) {
    console.warn('skip row without full XI', row.teamName1, row.teamName2);
    continue;
  }
  const sumH = sumTeamForecastXp(byId, hIds);
  const sumA = sumTeamForecastXp(byId, aIds);
  const probs = h2hWinProbs(
    teamForecastDistribution(byId, hIds),
    teamForecastDistribution(byId, aIds),
  );
  const statsH = teamOddsTotals(byId, hIds);
  const statsA = teamOddsTotals(byId, aIds);
  const defcon = (ids) => {
    let s = 0;
    for (const id of ids) {
      s += Number(byId.get(id)?.forecast?.breakdown?.defensiveContribution) || 0;
    }
    return r1(s);
  };

  row.xPtsXi1 = sumH.xp;
  row.xPtsXi2 = sumA.xp;
  row.xPtsFavorite = sumH.xp > sumA.xp ? 'home' : sumH.xp < sumA.xp ? 'away' : 'draw';
  row.xPtsMc = {
    homeWinPct: Math.round(probs.homeWinPct),
    drawPct: Math.round(probs.drawPct),
    awayWinPct: Math.round(probs.awayWinPct),
  };
  row.xGoals1 = statsH.expGoals;
  row.xGoals2 = statsA.expGoals;
  row.xAssists1 = statsH.expAssists;
  row.xAssists2 = statsA.expAssists;
  row.xCs1 = statsH.expCs;
  row.xCs2 = statsA.expCs;
  row.xDefcon1 = defcon(hIds);
  row.xDefcon2 = defcon(aIds);
  row.xi1 = row.xi1.map((p) => {
    const xp = byId.get(Number(p.id))?.forecast?.totalPoints;
    return { ...p, xp: Number.isFinite(xp) ? r1(xp) : null };
  });
  row.xi2 = row.xi2.map((p) => {
    const xp = byId.get(Number(p.id))?.forecast?.totalPoints;
    return { ...p, xp: Number.isFinite(xp) ? r1(xp) : null };
  });

  console.log(
    `${row.teamName1} ${row.xPtsXi1} vs ${row.teamName2} ${row.xPtsXi2} ` +
      `fav=${row.xPtsFavorite} mc=${JSON.stringify(row.xPtsMc)} ` +
      `missing=${sumH.missing}/${sumA.missing}`,
  );
}

snap.generatedAt = new Date().toISOString();
snap.disclaimer =
  'Pre-match xPts/odds reinstated from predictions.json (Live Odds source). Actuals unchanged.';
snap.model = {
  ...(snap.model || {}),
  preMatchSource: {
    kind: 'predictions.json',
    predictionsGeneratedAt: pred.generatedAt ?? null,
    predictionsPath: predPath,
    reinstatedAt: snap.generatedAt,
  },
};

writeFileSync(histPath, JSON.stringify(snap, null, 2));
console.log(`reinstate-prematch: wrote ${histPath}`);
