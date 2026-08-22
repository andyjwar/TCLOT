import { viteSameOriginProxyHost } from './viteSameOriginProxyHost.js'

/** ESPN soccer API (eng.1 = Premier League) — same-origin via Worker or Vite dev proxy. */
const ESPN_DIRECT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';

/**
 * Base URL for ESPN fetches — dev / loopback preview use `/__espn`, everything else
 * goes to ESPN directly.
 *
 * Unlike FPL, ESPN must NOT route through the Cloudflare Worker: ESPN's edge (Akamai)
 * 403s requests from Worker egress IPs ("Access Denied" HTML), while the API itself is
 * CORS-open (`access-control-allow-origin: *`), so browsers can and should call it
 * directly. Routing via `VITE_FPL_PROXY_URL/espn` silently broke every ESPN timeline
 * fetch in production.
 */
export function espnApiBase() {
  // `import.meta.env` is defined by Vite at build time; outside Vite (unit tests, pure Node)
  // it's undefined, so read defensively.
  const env =
    (typeof import.meta !== 'undefined' && import.meta.env) || {};
  if (env.DEV || viteSameOriginProxyHost()) return '/__espn';
  return ESPN_DIRECT;
}

/**
 * @param {string} pathAndQuery — e.g. `summary?event=740928` (no leading slash)
 */
export function espnResourceUrl(pathAndQuery) {
  const pq = String(pathAndQuery).replace(/^\/+/, '');
  return `${espnApiBase().replace(/\/$/, '')}/${pq}`;
}

export { ESPN_DIRECT };
