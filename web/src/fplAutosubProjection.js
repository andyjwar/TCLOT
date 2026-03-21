/**
 * FPL-style automatic substitution for live scores.
 * When `automatic_subs` is empty (GW still live), project swaps from minutes + bench order.
 */

/** @param {{ minutes: number, clubGwFixturesFinished?: boolean }} r */
function isDnpStarter(r) {
  return (Number(r.minutes) || 0) === 0 && r.clubGwFixturesFinished === true;
}

/** @param {{ minutes: number }} r */
function playedOnBench(r) {
  return (Number(r.minutes) || 0) > 0;
}

/** @param {{ posSingular: string }} r */
function isGkRow(r) {
  return r.posSingular === 'GKP';
}

/**
 * @param {Array<{ posSingular: string }>} xiRows
 * @returns {boolean}
 */
function formationOk(xiRows) {
  if (!Array.isArray(xiRows) || xiRows.length !== 11) return false;
  let gkp = 0;
  let def = 0;
  let mid = 0;
  let fwd = 0;
  for (const r of xiRows) {
    switch (r.posSingular) {
      case 'GKP':
        gkp++;
        break;
      case 'DEF':
        def++;
        break;
      case 'MID':
        mid++;
        break;
      case 'FWD':
        fwd++;
        break;
      default:
        return false;
    }
  }
  return gkp >= 1 && def >= 3 && mid >= 2 && fwd >= 1;
}

/**
 * @param {Array<object>} starters
 * @param {Array<object>} bench
 * @returns {{ displayStarters: object[], displayBench: object[], projectedAutoSubs: { element_in: number, element_out: number }[] }}
 */
function projectAutosubFromLive(starters, bench) {
  const xi = starters
    .slice()
    .sort((a, b) => a.pickPosition - b.pickPosition);
  const benchPool = bench
    .slice()
    .sort((a, b) => a.pickPosition - b.pickPosition);
  /** @type {{ element_in: number, element_out: number }[]} */
  const projectedAutoSubs = [];

  /**
   * @param {object} out
   * @param {object[]} xiLocal
   * @param {object[]} pool
   * @returns {object | null}
   */
  function findReplacement(out, xiLocal, pool) {
    const ordered = pool.slice().sort((a, b) => a.pickPosition - b.pickPosition);

    if (isGkRow(out)) {
      for (const r of ordered) {
        if (isGkRow(r) && playedOnBench(r)) return r;
      }
      return null;
    }

    const defCountInXi = xiLocal.filter((r) => r.posSingular === 'DEF').length;
    const needBenchDef =
      out.posSingular === 'DEF' && defCountInXi === 3;

    for (const r of ordered) {
      if (isGkRow(r)) continue;
      if (!playedOnBench(r)) continue;
      if (needBenchDef && r.posSingular !== 'DEF') continue;
      const idx = xiLocal.indexOf(out);
      if (idx < 0) continue;
      const trial = xiLocal.slice();
      trial[idx] = r;
      if (!formationOk(trial)) continue;
      return r;
    }
    return null;
  }

  for (let guard = 0; guard < 16; guard++) {
    const dnpList = xi.filter(isDnpStarter);
    if (!dnpList.length) break;

    const out =
      dnpList.find((r) => isGkRow(r)) ??
      dnpList.slice().sort((a, b) => a.pickPosition - b.pickPosition)[0];

    const cand = findReplacement(out, xi, benchPool);
    if (!cand) break;

    const xiIdx = xi.indexOf(out);
    const benchIdx = benchPool.indexOf(cand);
    if (xiIdx < 0 || benchIdx < 0) break;

    projectedAutoSubs.push({
      element_in: cand.element,
      element_out: out.element,
    });
    xi[xiIdx] = cand;
    benchPool[benchIdx] = out;
    benchPool.sort((a, b) => a.pickPosition - b.pickPosition);
  }

  const displayStarters = xi;
  const displayBench = benchPool
    .slice()
    .sort((a, b) => a.pickPosition - b.pickPosition);

  return { displayStarters, displayBench, projectedAutoSubs };
}

/**
 * @param {object[]} starters
 * @param {object[]} bench
 * @param {Array<{ element_in?: number, element_out?: number }>} autoSubs
 */
function applyOfficialAutosub(starters, bench, autoSubs) {
  const rowByEl = new Map();
  for (const r of [...starters, ...bench]) {
    rowByEl.set(r.element, r);
  }
  const xi = starters
    .slice()
    .sort((a, b) => a.pickPosition - b.pickPosition);
  let xiIds = xi.map((r) => r.element);
  for (const s of autoSubs) {
    const o = Number(s.element_out);
    const inn = Number(s.element_in);
    if (!Number.isFinite(o) || !Number.isFinite(inn)) continue;
    const idx = xiIds.indexOf(o);
    if (idx !== -1) xiIds[idx] = inn;
  }
  const displayStarters = xiIds
    .map((id) => rowByEl.get(id))
    .filter(Boolean);
  const effSet = new Set(xiIds);
  const displayBench = [...starters, ...bench]
    .filter((r) => !effSet.has(r.element))
    .sort((a, b) => a.pickPosition - b.pickPosition);
  return { displayStarters, displayBench };
}

/**
 * @param {{ starters: object[], bench: object[], autoSubs?: Array<{ element_in?: number, element_out?: number }> }} p
 * @returns {{
 *   displayStarters: object[],
 *   displayBench: object[],
 *   autosubSource: 'official' | 'projected' | 'none',
 *   projectedAutoSubs: Array<{ element_in: number, element_out: number }>,
 * }}
 */
export function buildEffectiveLineup({ starters, bench, autoSubs }) {
  const subs = Array.isArray(autoSubs) ? autoSubs : [];
  if (subs.length > 0) {
    const { displayStarters, displayBench } = applyOfficialAutosub(
      starters,
      bench,
      subs
    );
    return {
      displayStarters,
      displayBench,
      autosubSource: 'official',
      projectedAutoSubs: [],
    };
  }

  const { displayStarters, displayBench, projectedAutoSubs } =
    projectAutosubFromLive(starters, bench);
  return {
    displayStarters,
    displayBench,
    autosubSource: projectedAutoSubs.length ? 'projected' : 'none',
    projectedAutoSubs,
  };
}
