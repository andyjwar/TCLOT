#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  normalizeMatchesFinished,
  deriveStandingsFromFinishedMatches,
  finishedEventIdsFromEvents,
} from '../src/h2hEffectiveFinished.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
/** Not named `data/` — root .gitignore has `data/` and would exclude `public/data` from Pages deploys */
const dest = join(__dirname, '../public/league-data');
const ingestedDetails = join(dataDir, 'details.json');
const sampleDetails = join(__dirname, '../sample-details.json');

mkdirSync(dest, { recursive: true });
const destDetails = join(dest, 'details.json');

if (existsSync(ingestedDetails)) {
  for (const f of readdirSync(dataDir)) {
    if (f.endsWith('.json')) {
      copyFileSync(join(dataDir, f), join(dest, f));
    }
  }
  try {
    const d = JSON.parse(readFileSync(join(dest, 'details.json'), 'utf8'));
    const n = d.league?.name ?? '?';
    const nTeams = d.league_entries?.length ?? 0;
    console.log(
      `League data → public/league-data/ (“${n}”, ${nTeams} teams).`
    );
  } catch {
    console.log('League data copied from data/ → public/league-data/.');
  }
} else if (existsSync(destDetails)) {
  try {
    const d = JSON.parse(readFileSync(destDetails, 'utf8'));
    console.log(
      `Using committed league-data (“${d.league?.name ?? '?'}”) — no data/ folder. Add .fpl-league-id for local auto-fetch.`
    );
  } catch {
    console.log(
      'Using committed web/public/league-data/details.json (CI/GitHub Pages).'
    );
  }
} else if (existsSync(sampleDetails)) {
  copyFileSync(sampleDetails, destDetails);
  console.warn(
    '\n⚠ No data/details.json — using DEMO sample data for the UI.\n' +
      '  To show your Tri Continental League of Titans data, from the repo root run:\n' +
      '    python3 ingest.py YOUR_LEAGUE_ID\n' +
      '  (League ID is in the URL: draft.premierleague.com/league/YOUR_LEAGUE_ID)\n' +
      '  Then: cd web && npm run dev\n'
  );
} else {
  console.warn('No data/details.json and no sample-details.json.');
}

/**
 * FPL Draft only flips `matches[].finished` after its lagging "data checked"
 * step. Promote finished as soon as that GW's PL football is complete so
 * standings / recaps / form update when the gameweek closes — not a day later.
 * See web/src/h2hEffectiveFinished.js.
 */
function readFinishedEventIds() {
  const candidates = [
    join(dataDir, 'bootstrap_draft.json'),
    join(dest, 'bootstrap_draft.json'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      return finishedEventIdsFromEvents(JSON.parse(readFileSync(p, 'utf8')));
    } catch {
      /* try next */
    }
  }
  return new Set();
}

function promoteFinishedMatches() {
  const detailsPath = join(dest, 'details.json');
  const fixturesPath = join(dest, 'fixtures.json');
  if (!existsSync(detailsPath)) return;
  try {
    const details = JSON.parse(readFileSync(detailsPath, 'utf8'));
    const fixtures = existsSync(fixturesPath)
      ? JSON.parse(readFileSync(fixturesPath, 'utf8'))
      : [];
    const finishedEvents = readFinishedEventIds();
    const before = (details.matches || []).filter((m) => m?.finished === true).length;
    const matches = normalizeMatchesFinished(
      details.matches || [],
      fixtures,
      finishedEvents,
    );
    const after = matches.filter((m) => m?.finished === true).length;
    let changed = after !== before;
    if (changed) {
      details.matches = matches;
    }
    // FPL's standings array often stays all-zero until "data checked". Once we
    // have finished H2H rows, rewrite standings so schedule / raw consumers see
    // real W-L-T without waiting on the client-side derive.
    if (after > 0) {
      const derived = deriveStandingsFromFinishedMatches(
        details.league_entries || [],
        matches,
      );
      if (derived.length) {
        details.standings = derived;
        changed = true;
      }
    }
    if (!changed) return;
    writeFileSync(detailsPath, JSON.stringify(details, null, 2));
    if (after !== before) {
      console.log(
        `Promoted ${after - before} H2H match(es) to finished (PL football complete; FPL finished flag still lagging).`,
      );
    }
    if (after > 0) {
      console.log(`Rewrote standings from ${after} finished H2H match(es).`);
    }
  } catch (e) {
    console.warn('promoteFinishedMatches skip:', e.message);
  }
}
promoteFinishedMatches();

/** Draft bootstrap only — element ids match draft transactions, trades, and Live tab. */
const bootstrapDraftData = join(dataDir, 'bootstrap_draft.json');
const bootstrapDraftPublic = join(dest, 'bootstrap_draft.json');

const bootstrapDraftPath = existsSync(bootstrapDraftData)
  ? bootstrapDraftData
  : existsSync(bootstrapDraftPublic)
    ? bootstrapDraftPublic
    : null;

if (bootstrapDraftPath) {
  try {
    const b = JSON.parse(readFileSync(bootstrapDraftPath, 'utf8'));
    const classicCandidates = [
      join(dataDir, 'bootstrap_fpl.json'),
      join(dest, 'bootstrap_fpl.json'),
    ];
    const classicPath = classicCandidates.find((p) => existsSync(p));
    if (classicPath) {
      const classic = JSON.parse(readFileSync(classicPath, 'utf8'));
      const knownById = new Map(
        (classic.elements || [])
          .map((el) => [Number(el.id), el.known_name?.trim()])
          .filter(([id, kn]) => Number.isFinite(id) && kn),
      );
      for (const el of b.elements || []) {
        const kn = knownById.get(Number(el.id));
        if (kn) el.known_name = kn;
      }
      writeFileSync(join(dest, 'bootstrap_draft.json'), JSON.stringify(b, null, 2));
    }
    const mini = {
      teams: (b.teams || []).map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        short_name: t.short_name,
      })),
      elements: (b.elements || []).map((e) => ({
        id: e.id,
        web_name: e.web_name,
        known_name: e.known_name ?? null,
        team: e.team,
        element_type: e.element_type,
      })),
    };
    writeFileSync(join(dest, 'fpl-mini.json'), JSON.stringify(mini));
    console.log(
      'fpl-mini.json written from bootstrap_draft.json (draft element IDs).'
    );
  } catch (e) {
    console.warn('fpl-mini.json skip:', e.message);
  }
} else {
  console.warn(
    'fpl-mini.json not built: no bootstrap_draft.json in data/ or public/league-data/. Run ingest.py or fetch-league-if-needed.'
  );
}
