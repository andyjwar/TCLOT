import { useEffect, useMemo, useState } from 'react'
import { fetchLeagueDataJsonOptional } from './leagueDataFetch.js'
import { forbiddenIdSetFromPayload } from './forbiddenWaivers.js'

let cachedPayload = undefined
let inflight = null

function loadForbiddenWaiversPayload() {
  if (cachedPayload !== undefined) return Promise.resolve(cachedPayload)
  if (inflight) return inflight
  inflight = fetchLeagueDataJsonOptional('forbidden-waivers.json').then((json) => {
    cachedPayload = json
    inflight = null
    return json
  })
  return inflight
}

/**
 * Shared fetch of `forbidden-waivers.json` (one network trip per page load).
 * `ids` is a Set of element ids that cannot be claimed during the window.
 */
export function useForbiddenWaivers() {
  const [data, setData] = useState(cachedPayload === undefined ? null : cachedPayload)

  useEffect(() => {
    let alive = true
    loadForbiddenWaiversPayload().then((json) => {
      if (alive) setData(json)
    })
    return () => {
      alive = false
    }
  }, [])

  const ids = useMemo(() => forbiddenIdSetFromPayload(data), [data])
  const players = data?.players ?? []

  return { data, ids, players }
}
