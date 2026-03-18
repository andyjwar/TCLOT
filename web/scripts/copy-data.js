#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
const dest = join(__dirname, '../public/data');
const ingestedDetails = join(dataDir, 'details.json');
const sampleDetails = join(__dirname, '../sample-details.json');
const bootstrapFpl = join(dataDir, 'bootstrap_fpl.json');

mkdirSync(dest, { recursive: true });

if (existsSync(ingestedDetails)) {
  for (const f of readdirSync(dataDir)) {
    if (f.endsWith('.json')) {
      copyFileSync(join(dataDir, f), join(dest, f));
    }
  }
  console.log('League data copied from data/ → public/data/ (from ingest.py).');
} else if (existsSync(sampleDetails)) {
  copyFileSync(sampleDetails, join(dest, 'details.json'));
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

if (existsSync(bootstrapFpl)) {
  try {
    const b = JSON.parse(readFileSync(bootstrapFpl, 'utf8'));
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
        team: e.team,
        element_type: e.element_type,
      })),
    };
    writeFileSync(join(dest, 'fpl-mini.json'), JSON.stringify(mini));
    console.log('fpl-mini.json written (player + team names for waivers).');
  } catch (e) {
    console.warn('fpl-mini.json skip:', e.message);
  }
}
