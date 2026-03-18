# FPL Draft League Data Ingestion

Fetch and store all data from your [Fantasy Premier League Draft](https://draft.premierleague.com) league for analysis, dashboards, or custom tools.

## Quick Start

### 1. Find your League ID

- Open your league in a browser: `https://draft.premierleague.com/league`
- Your league ID is in the URL: `draft.premierleague.com/league/**12345**`
- Or open DevTools → Network tab while loading the league page and look for requests to `.../league/XXXXX/details`

### 2. Install

```bash
cd TCLOT
pip install -r requirements.txt
```

### 3. Ingest data

```bash
python ingest.py 12345
```

Or use an environment variable:

```bash
export LEAGUE_ID=12345
python ingest.py
```

### 4. Export to CSV (optional)

```bash
python export_csv.py
```

Exports will be in the `exports/` folder.

## What gets fetched

| File | Description |
|------|-------------|
| `details.json` | League info, teams, standings, H2H matches |
| `element_status.json` | Which players are owned by which teams |
| `transactions.json` | Draft picks, waiver moves, trades |
| `bootstrap_draft.json` | Draft player pool and settings |
| `bootstrap_fpl.json` | Full FPL player/team data (names, stats) |
| `fixtures.json` | Premier League fixture list |

All data is saved under `data/`.

## Data structure

- **Standings**: Rank, total points, gameweek points
- **League entries**: Team names, manager names, waiver order
- **Element status**: Player ID → owner (entry_id)
- **Transactions**: Transfers, draft picks, trades with timestamps

Merge `element_status` with `bootstrap_fpl.elements` to get player names and stats. Use `league_entries` to map `entry_id` to team names.

## Example: Load in Python

```python
from pathlib import Path
import json

with open("data/details.json") as f:
    details = json.load(f)

standings = details["standings"]
teams = {e["id"]: e["entry_name"] for e in details["league_entries"]}

for s in standings:
    print(f"#{s['rank']} {teams[s['league_entry']]}: {s['total']} pts")
```

## Website

A simple web dashboard to view standings and form:

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173.

**The site always uses your real league only after you run ingest.** It copies `data/details.json` (created by `ingest.py`) into `web/public/data/`. If that file is missing, the UI falls back to **demo sample data** and shows a yellow banner.

### Wrong teams / not your league?

Demo data was previously saved by mistake into `data/details.json` for some setups. **Fix:** from the repo root, re-fetch your league (your ID is in the URL `draft.premierleague.com/league/**THIS_NUMBER**`):

```bash
python3 ingest.py YOUR_LEAGUE_ID
cd web && npm run dev
```

Re-run `ingest.py` whenever you want fresh scores and fixtures.

### Dashboard data (waivers, player names)

`copy-data` also builds **`fpl-mini.json`** from `bootstrap_fpl.json` (player + team names for **Most waivered**). Ensure **`transactions.json`** and **`bootstrap_fpl.json`** exist (full `ingest.py`). Then `cd web && npm run dev`.

### Team logos (replace letter bubbles)

Copy images into **`web/public/team-logos/`**. Name each file **`{id}.png`** where `id` is the FPL `league_entries[].id` (see `web/public/team-logos/README.md`), or add a **`manifest.json`** mapping ids to filenames. No upload step — files on disk are served by the dev server and included in `npm run build`.

Build for production: `npm run build` (output in `web/dist/`).

## Notes

- No login required: league data is publicly accessible if you have the league ID.
- The FPL Draft API is unofficial; structure may change between seasons.
