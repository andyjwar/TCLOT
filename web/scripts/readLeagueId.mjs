/**
 * Resolve the FPL Draft league id.
 *
 * The committed repo-root `league-id` file is the source of truth (the number in
 * draft.premierleague.com/league/THIS). It is not a secret — FPL recycles ids
 * each season, so pinning it in-repo is what stops a stale GitHub secret from
 * ingesting a stranger's league.
 *
 * Override order:
 *   1. ALLOW_LEAGUE_ID_OVERRIDE=1 + FPL_LEAGUE_ID/LEAGUE_ID env
 *   2. committed `league-id`
 *   3. local gitignored `.fpl-league-id`
 *   4. FPL_LEAGUE_ID / LEAGUE_ID env
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function fromFile(p) {
  if (!existsSync(p)) return null
  const t = readFileSync(p, 'utf8').trim().split(/\r?\n/)[0]?.trim()
  return t && /^\d+$/.test(t) ? t : null
}

export function readLeagueId(repoRoot) {
  const committed = fromFile(join(repoRoot, 'league-id'))
  const local = fromFile(join(repoRoot, '.fpl-league-id'))
  const env = (process.env.FPL_LEAGUE_ID || process.env.LEAGUE_ID || '').trim()
  const envId = env && /^\d+$/.test(env) ? env : null
  if (process.env.ALLOW_LEAGUE_ID_OVERRIDE === '1' && envId) return envId
  if (committed) {
    if (envId && envId !== committed) {
      console.warn(
        `readLeagueId: using committed league-id ${committed}; ignoring env ${envId}. Set ALLOW_LEAGUE_ID_OVERRIDE=1 to use the env value.`
      )
    }
    return committed
  }
  return local || envId || null
}
