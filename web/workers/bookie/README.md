# TCLOT bookie Worker

Fake-money betting backend for the TCLOT dashboard — a Cloudflare Worker with a
D1 (SQLite) database. Markets are priced by the site's own prediction model
(`web/scripts/build-bookie-markets.mjs` writes `league-data/bookie-markets.json`
on every deploy); this Worker ingests that sheet, takes bets, and settles them
against the official FPL Draft results.

## What it does

- **Weekly H2H markets** — home / draw / away for every league matchup in the
  next gameweek. Open until the FPL deadline; odds freeze when the market is
  first ingested.
- **Outright champion market** — priced from the Season Predictions title odds
  and repriced after every banked gameweek. Bets lock the odds they were
  placed at.
- **Settlement** — a gameweek counts as final once every Premier League fixture
  for it is finished or provisionally finished (same rule the site uses), so
  payouts land hours before FPL's own "data checked" flag.
- **Bankroll** — everyone starts a season with 1,000 coins; a 50-coin stipend
  lands after each settled gameweek so going bust is never terminal.
- **Identity** — each manager claims their team once with a 4–8 digit PIN
  (PBKDF2-hashed). Sessions are HMAC-signed bearer tokens.

## One-time setup

```bash
cd web/workers/bookie
npm install

# 1. Create the database, then paste the printed database_id into wrangler.toml
npx wrangler d1 create tclot-bookie

# 2. Create the tables
npm run db:migrate

# 3. Session-signing secret (any long random string, e.g. `openssl rand -hex 32`)
npx wrangler secret put SESSION_SECRET

# 4. Ship it
npm run deploy
```

Then set `VITE_BOOKIE_API_URL` to the deployed Worker URL (e.g.
`https://tclot-bookie.<your-subdomain>.workers.dev`) wherever the site is
built — Vercel project env vars and/or the GitHub Pages workflow — and
redeploy the site. The Bookie tab hides itself when the var is unset.

## Config (wrangler.toml)

| Key             | What                                                          |
| --------------- | ------------------------------------------------------------- |
| `SITE_BASE_URL` | Deployed site origin serving `league-data/bookie-markets.json` |
| `LEAGUE_ID`     | FPL Draft league id, used to settle from official results      |
| `ALLOW_ORIGIN`  | Optional CORS lock to the site origin                          |
| `SESSION_SECRET`| Secret (via `wrangler secret put`) signing session tokens      |

The cron trigger (every 30 min) ingests new markets and settles finished
gameweeks; the Worker also syncs lazily (throttled to 5 min) whenever someone
loads the Bookie tab, so the cron is belt-and-braces rather than load-bearing.

## Local development

```bash
npm run db:migrate:local
npx wrangler dev        # add --var SESSION_SECRET:dev-secret for local auth
```

Local dev reads markets from `SITE_BASE_URL` (the live site) but keeps all
bets/balances in the local D1 file, so you can play freely without touching
production.

## API

| Method | Path            | Body                              | Notes                       |
| ------ | --------------- | --------------------------------- | --------------------------- |
| GET    | `/api/health`   |                                   |                             |
| GET    | `/api/state`    |                                   | + `me` with `Authorization` |
| POST   | `/api/register` | `{ entryId, pin }`                | one claim per team          |
| POST   | `/api/login`    | `{ entryId, pin }`                |                             |
| POST   | `/api/bets`     | `{ marketId, selection, stake }`  | Bearer auth required        |
