#!/usr/bin/env node
/**
 * Ensures `player-contributions-gw.json` exists for the Live tab archive merge.
 * CI / local builds can later append `byGw` entries from captured FPL snapshots.
 */
import { existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../public/league-data/player-contributions-gw.json');

const template = {
  generated: new Date().toISOString(),
  note: 'Optional archive for Player contributions (Live tab). Keys under byGw are gameweek numbers. Events match playerContributionEvents stableId shape.',
  byGw: {},
};

if (!existsSync(out)) {
  writeFileSync(out, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  console.log('build-player-contributions-archive: wrote empty', out);
} else {
  console.log('build-player-contributions-archive: exists, skip', out);
}
