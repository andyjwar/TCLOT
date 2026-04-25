/**
 * FPL-style automatic substitution for live scores.
 * When `automatic_subs` is empty (GW still live), project swaps from minutes + bench order.
 * Covers: (1) 0 min + club’s GW finished (DNP) — bench must have played; (2) 0 min + no PL
 * fixture for the player’s club this GW — first eligible bench in order (GK for GK) who
 * has a fixture and is playing or not yet started, keeping a valid formation (≥3 DEF, etc.).
 */

/** @param {{ minutes: number, clubGwFixturesFinished?: boolean, hasGwFixture?: boolean, pickPosition?: number }} r */
function isDnpAfterFinished(r) {
  if ((Number(r.minutes) || 0) > 0) return false;
  if (r.clubGwFixturesFinished === true) return true;
  return false;
}

/** @param {{ minutes: number, hasGwFixture?: boolean, pickPosition?: number }} r */
function isNoFixtureInXi(r) {
  if (r == null || r.pickPosition == null || r.pickPosition > 11) return false;
  if ((Number(r.minutes) || 0) > 0) return false;
  if (r.hasGwFixture === false) return true;
  return false;
}

/** @param {{ minutes: number, clubGwFixturesFinished?: boolean, hasGwFixture?: boolean, pickPosition?: number }} r */
function needsXiAutosubFromBench(r) {
  if (r == null || r.pickPosition == null || r.pickPosition > 11) return false;
  if ((Number(r.minutes) || 0) > 0) return false;
  if (isDnpAfterFinished(r)) return true;
  if (isNoFixtureInXi(r)) return true;
  return false;
}

/** @param {{ minutes: number }} r */
function playedOnBench(r) {
  return (Number(r.minutes) || 0) > 0;
}

/**
 * @param {object} cand
 * @param {boolean} outIsNoFix — starter was subbed out because the club has no GW fixture
 */
function benchPlayerEligibleForOut(cand, outIsNoFix) {
  if (cand == null) return false;
  if (cand.hasGwFixture === false) return false;
  if (playedOnBench(cand)) return true;
  if (outIsNoFix && cand.stillYetToPlayPl === true) return true;
  return false;
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
export function projectAutosubFromLive(starters, bench) {
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
    const outIsNoFix = isNoFixtureInXi(out);

    if (isGkRow(out)) {
      for (const r of ordered) {
        if (!isGkRow(r)) continue;
        if (!benchPlayerEligibleForOut(r, outIsNoFix)) continue;
        const idx = xiLocal.indexOf(out);
        if (idx < 0) continue;
        const trial = xiLocal.slice();
        trial[idx] = r;
        if (!formationOk(trial)) continue;
        return r;
      }
      return null;
    }

    const defCountInXi = xiLocal.filter((r) => r.posSingular === 'DEF').length;
    const needBenchDef = out.posSingular === 'DEF' && defCountInXi === 3;

    for (const r of ordered) {
      if (isGkRow(r)) continue;
      if (outIsNoFix) {
        if (!benchPlayerEligibleForOut(r, true)) continue;
      } else {
        if (!playedOnBench(r)) continue;
      }
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
    const subNeed = xi.filter(needsXiAutosubFromBench);
    if (!subNeed.length) break;

    const gkDnp = subNeed.find((r) => isGkRow(r));
    const ordered = gkDnp
      ? [gkDnp, ...subNeed.filter((r) => r !== gkDnp).sort((a, b) => a.pickPosition - b.pickPosition)]
      : subNeed.slice().sort((a, b) => a.pickPosition - b.pickPosition);

    /** @type {object | null} */
    let out = null;
    /** @type {object | null} */
    let cand = null;
    for (const o of ordered) {
      const c = findReplacement(o, xi, benchPool);
      if (c) {
        out = o;
        cand = c;
        break;
      }
    }
    if (!out || !cand) break;

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
