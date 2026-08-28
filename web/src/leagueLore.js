/**
 * League lore — named derbies and per-manager personality notes.
 *
 * Source of truth for the group-chat humour in previews, recaps, and similar
 * generated copy. Keyed off the manager's full name from details.json
 * (`player_first_name` + `player_last_name`), with aliases so "Andrew Ward"
 * matches "Andy Ward" and so on.
 *
 * Statistical story always leads. These lines are seasoning: short, affectionate,
 * mates taking the piss. Named fixtures ALWAYS fire. Preview lore is sprinkled,
 * not a per-manager checklist. Mottershead always gets a vegan joke, plus one
 * more line when the week actually gives him a hook.
 */

/** Normalise a manager name for matching: trim, collapse spaces, lowercase. */
export function normManager(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Site names (details.json) vs the names people actually use in the notes. */
const MANAGER_ALIASES = {
  'eddie webster': 'eddy webster',
  'edward webster': 'eddy webster',
  'andrew ward': 'andy ward',
  'john ward': 'jon ward',
}

export function canonicalManager(name) {
  const n = normManager(name)
  return MANAGER_ALIASES[n] ?? n
}

/**
 * Named grudge matches. Unordered pair; when those two meet — every time —
 * the preview/recap leads with `name`.
 */
export const NAMED_FIXTURES = [
  { managers: ['Jon Ward', 'Andy Ward'], name: 'the Battle of Warderloo' },
  { managers: ['Andy Ward', 'Nick Goodacre'], name: 'the Bad Blood Derby' },
  { managers: ['David Higman', 'Mike Sutton'], name: 'the Respect Derby' },
  { managers: ['Luke Butcher', 'David Higman'], name: 'the East Asian Derby' },
]

const NAMED_FIXTURE_INDEX = new Map(
  NAMED_FIXTURES.map((f) => [
    f.managers.map(canonicalManager).sort().join('|'),
    f.name,
  ]),
)

/**
 * The nickname for a fixture between two managers, or null. Order-independent.
 * @param {string|null|undefined} managerA
 * @param {string|null|undefined} managerB
 * @returns {string|null}
 */
export function namedFixtureFor(managerA, managerB) {
  const a = canonicalManager(managerA)
  const b = canonicalManager(managerB)
  if (!a || !b) return null
  return NAMED_FIXTURE_INDEX.get([a, b].sort().join('|')) ?? null
}

const TITANIC = new Set(['andy ward', 'nick mottershead'])

export function isTitanicPair(managerA, managerB) {
  return TITANIC.has(canonicalManager(managerA)) && TITANIC.has(canonicalManager(managerB))
}

const TITANIC_LINES = [
  'Civil war in the Titanic Duo.',
  'The Titanic Duo go at each other; the iceberg can wait.',
  'Historic titans, present-day collision: the Duo play themselves.',
]

/** Always-on Mottershead vegan asides. Rotated so it is not the same sentence every week. */
export const VEGAN_LINES = [
  'Nick Mottershead presents as if he invented veganism. He did not, but try telling him.',
  'Plant-based and extremely sure: Mottershead is still talking like he invented veganism.',
  'Somewhere a tofu scramble is being treated as a tactical innovation. That is Mottershead.',
  'The XI may have meat in it. Mottershead is giving the vegan lecture anyway.',
  'Mottershead has a take. It is about veganism. It always is.',
]

/**
 * Per-manager running jokes. `tags` let the picker prefer a line that fits
 * what actually happened (waiver, bench, last place) without cramming every
 * trait into one recap. Keep each `text` one short sentence.
 */
export const MANAGER_LORE = {
  'eddy webster': {
    facts: [
      { tags: ['generic'], text: `Eddy will have a thesis for this. It will not be the obvious one.` },
      { tags: ['generic', 'overthink'], text: `Eddy talked himself out of the sensible option again; the minutes of the meeting were longer than the decision.` },
      { tags: ['waiver'], text: `Classic Eddy waiver: pick the wrong one, then explain he was actually going for somebody else.` },
      { tags: ['waiver'], text: `Eddy has already started the post-waiver debrief, which is usually how you know the claim was a mistake.` },
      { tags: ['last'], text: `The people's favourite to finish last is at it again. Surely he hasn't done it again.` },
      { tags: ['generic'], text: `Eddy blamed the children, the timezone, and the puzzle brain — in that order.` },
      { tags: ['generic'], text: `British, lives in Canada, sounds Canadian. Eddy's accent has gone native; his league position has not.` },
      { tags: ['generic'], text: `Eddy once spent twenty hours on a puzzle and got about 5%. This was quicker.` },
    ],
  },
  'nick goodacre': {
    facts: [
      { tags: ['generic', 'conservative'], text: `Nick Goodacre's plan remains undefeated: do not finish last, do not do anything rash.` },
      { tags: ['conservative', 'bench'], text: `Nick G. ran the numbers, then picked the safest available human.` },
      { tags: ['generic'], text: `Somewhere a spreadsheet nodded, and Nick Goodacre made the conservative call anyway.` },
      { tags: ['generic'], text: `The lampshade era continues: movement is theoretically possible, just not this week.` },
      { tags: ['trade'], text: `A trade from Nick Goodacre would be news. This was not news.` },
      { tags: ['generic'], text: `Northern caution in full: lots of analysis, very little leaping.` },
    ],
  },
  'david higman': {
    facts: [
      { tags: ['generic'], text: `David could not let the group simply agree. Somebody had to play devil's advocate.` },
      { tags: ['generic'], text: `David would like it noted that the BBC has this one covered.` },
      { tags: ['generic'], text: `Filed with the licence-fee ambassador: David, unofficial BBC fantasy correspondent.` },
      { tags: ['generic'], text: `David is treating this like Glastonbury: a pilgrimage, a crowd, and a very long set.` },
      { tags: ['generic'], text: `The people's champion, cheerfully refusing to sit with the consensus.` },
    ],
  },
  'nick mottershead': {
    facts: [
      { tags: ['generic'], text: `Swagger first, evidence later: Mottershead remains extremely sure.` },
      { tags: ['trade'], text: `Nick Mottershead is on another big-move kick.` },
      { tags: ['generic', 'titanic'], text: `The Titanic Duo energy is still there. The iceberg evidence is mounting.` },
      { tags: ['generic'], text: `Nick Mottershead is doing this from a girls' arts school, which remains a deeply improbable sentence.` },
      { tags: ['generic'], text: `Fallen-empire energy from Mottershead: the old swagger, a newer set of results.` },
      { tags: ['trade'], text: `Another Mottershead trade flurry. Historic titans, present-day volume.` },
    ],
  },
  'andy ward': {
    facts: [
      { tags: ['generic'], text: `Andy has declared this fixture essential to the comeback. The comeback remains imminent.` },
      { tags: ['generic'], text: `Andy talks a big game. The league table is taking notes.` },
      { tags: ['trade'], text: `Andy is in full battle mode: if it can be traded, it will be discussed at volume.` },
      { tags: ['last'], text: `Andy is not taking this lying down, which is the emotional register even on a quiet week.` },
      { tags: ['generic', 'titanic'], text: `Titanic Duo confidence from Andy; the ship has hit something, but the band is still playing.` },
      { tags: ['generic'], text: `Andy Ward, British in Canada, at war with the fixture list again.` },
    ],
  },
  'luke butcher': {
    facts: [
      { tags: ['generic'], text: `Luke has notes on everyone else's manifesto. His own remains in draft.` },
      { tags: ['generic'], text: `Luke Butcher for Prime Minister — just as soon as he publishes a definite opinion.` },
      { tags: ['generic'], text: `The league's South Korean ambassador is in. Samsung would like a word about the XI.` },
      { tags: ['generic'], text: `Norfolk to Seoul: Luke remains the nicest man ever to judge your politics.` },
      { tags: ['generic'], text: `Luke would like harmony, and also for you to be more left-wing about it.` },
    ],
  },
  'mike sutton': {
    facts: [
      { tags: ['generic'], text: `Mike did all this on whatever sleep the twins were prepared to grant him.` },
      { tags: ['generic'], text: `Twins at home, a wildcard in the XI, and no visible spreadsheet.` },
      { tags: ['waiver'], text: `Mike has claimed someone nobody else had on a list. That is the whole method.` },
      { tags: ['generic'], text: `While everyone else theorised, Mike simply existed, and somehow posted a score.` },
      { tags: ['generic'], text: `Mike's selection process remains classified. Possibly there isn't one.` },
    ],
  },
  'jon ward': {
    facts: [
      { tags: ['generic'], text: `Jon has notes on everyone else's management. His own table position is the obvious reply.` },
      { tags: ['generic'], text: `Jon poked the bear, then poked it again in case the first poke had healed.` },
      { tags: ['last'], text: `Jon is down the bottom again, which has never once slowed the commentary.` },
      { tags: ['generic'], text: `Brother Ward, league provocateur, available for unsolicited strategy reviews.` },
      { tags: ['waiver'], text: `Jon will have a take on this claim. It will not be complimentary.` },
    ],
  },
}

function factText(f) {
  return typeof f === 'string' ? f : f?.text
}

function factTags(f) {
  return Array.isArray(f?.tags) ? f.tags : []
}

/**
 * Context tags from a preview/recap side, so jokes can follow the week.
 * @param {object | null | undefined} side
 * @returns {string[]}
 */
export function loreTagsFromSide(side) {
  const tags = []
  const pickups = Array.isArray(side?.recentPickups) ? side.recentPickups : []
  if (pickups.length || side?.pickup) tags.push('waiver')
  if (pickups.length >= 2) tags.push('trade')
  if (side?.benchCall) tags.push('bench', 'conservative')
  const rank = Number(side?.rank)
  if (Number.isFinite(rank) && rank >= 7) tags.push('last')
  const rec = side?.record
  if (rec && Number(rec.w) === 0 && Number(rec.l) >= 1) tags.push('last')
  return tags
}

/**
 * A running-joke sentence for one manager, chosen deterministically from `key`,
 * preferring facts whose tags overlap `tags`. Null when we've no lore for them.
 *
 * Week-hooks (waiver, last, bench) win most of the time, but not always, so a
 * tagged week does not loop the same two jokes forever.
 *
 * @param {string|null|undefined} manager
 * @param {(arr: string[], key: string) => string} pick
 * @param {string} key
 * @param {string[]} [tags]
 * @returns {string|null}
 */
export function managerFunFact(manager, pick, key, tags = [], { excludeTags = [] } = {}) {
  const lore = MANAGER_LORE[canonicalManager(manager)]
  if (!lore || !lore.facts || lore.facts.length === 0) return null
  const skip = new Set((excludeTags || []).filter(Boolean))
  const facts = lore.facts.filter((f) => !factTags(f).some((t) => skip.has(t)))
  const want = new Set((tags || []).filter(Boolean))
  const tagged = facts.filter((f) => factTags(f).some((t) => want.has(t)))
  const hookOnly =
    tagged.length > 0 &&
    tagged.length < facts.length &&
    pick(['hook', 'hook', 'any'], `${key}-pool`) !== 'any'
  const pool = (hookOnly ? tagged : facts).map(factText).filter(Boolean)
  if (!pool.length) return null
  return pick(pool, key)
}

export function isMottershead(manager) {
  return canonicalManager(manager) === 'nick mottershead'
}

export function mottersheadSideOf(m) {
  if (isMottershead(m?.home?.manager)) return m.home
  if (isMottershead(m?.away?.manager)) return m.away
  return null
}

export function mottersheadVeganLine(pick, key) {
  return pick(VEGAN_LINES, key)
}

function mottExtraFits(side, homeMgr, awayMgr) {
  if (isTitanicPair(homeMgr, awayMgr)) return true
  const tags = loreTagsFromSide(side)
  return tags.some((t) => t === 'waiver' || t === 'trade' || t === 'bench' || t === 'last' || t === 'conservative')
}

/** Chip / heading form: drop a leading "the ". */
export function derbyChipLabel(name) {
  return String(name || '').replace(/^the\s+/i, '')
}

/**
 * Unique named fixtures on a GW's matchup list, in card order.
 * @param {Array<{ home?: { manager?: string }, away?: { manager?: string } }>} matchups
 * @returns {string[]}
 */
export function uniqueDerbies(matchups) {
  const seen = new Set()
  const out = []
  for (const m of matchups || []) {
    const name = namedFixtureFor(m?.home?.manager, m?.away?.manager)
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

export function titanicAside(pick, key) {
  return pick(TITANIC_LINES, key)
}

/**
 * Drop asides into the paragraph instead of stacking them at the end.
 * Never inserts before the lead sentence (named derby / result).
 */
export function sprinkleInto(sentences, extras, variantIndex, key) {
  if (!extras?.length) return sentences
  const out = [...sentences]
  extras.forEach((line, i) => {
    const lo = Math.min(1, out.length)
    const span = Math.max(1, out.length - lo + 1)
    const idx = lo + variantIndex(`${key}-spr-${i}`, span)
    out.splice(Math.min(idx, out.length), 0, line)
  })
  return out
}

/** True when we have at least one running joke for this manager. */
export function hasManagerLore(manager) {
  const lore = MANAGER_LORE[canonicalManager(manager)]
  return Boolean(lore && lore.facts && lore.facts.length > 0)
}

/**
 * Personality asides for a matchup.
 *
 * Named derbies live elsewhere and always fire. Mottershead always gets a
 * vegan joke when `veganAlways` is set, plus one extra non-vegan line when
 * the week has a hook (waiver, trade, bench, last, Titanic pairing).
 * Everyone else: at most one sprinkle, never a line-per-manager checklist.
 *
 * @param {{ home?: object, away?: object }} m
 * @param {(arr: string[], key: string) => string} pick
 * @param {string} key
 * @param {(key: string, n: number) => number} variantIndex
 * @param {{ gate?: number, both?: boolean, veganAlways?: boolean }} [opts]
 * @returns {string[]}
 */
export function matchupPersonalitySentences(
  m,
  pick,
  key,
  variantIndex,
  { gate = 2, both = false, veganAlways = false } = {},
) {
  const home = m?.home?.manager
  const away = m?.away?.manager
  const out = []
  const mott = mottersheadSideOf(m)

  if (veganAlways && mott) {
    const vegan = mottersheadVeganLine(pick, `${key}-vegan`)
    if (vegan) out.push(vegan)
    if (mottExtraFits(mott, home, away)) {
      if (isTitanicPair(home, away) && variantIndex(`${key}-titanic`, 2) === 0) {
        out.push(pick(TITANIC_LINES, `${key}-titanic-line`))
      } else {
        const extra = managerFunFact(
          mott.manager,
          pick,
          `${key}-mott-extra`,
          loreTagsFromSide(mott),
          { excludeTags: ['vegan'] },
        )
        if (extra) out.push(extra)
      }
    }
  } else if (isTitanicPair(home, away) && variantIndex(`${key}-titanic`, 3) === 0) {
    out.push(pick(TITANIC_LINES, `${key}-titanic-line`))
  }

  const others = []
  if (hasManagerLore(home) && !isMottershead(home)) {
    others.push({ manager: home, side: m.home, which: 'home' })
  }
  if (hasManagerLore(away) && !isMottershead(away)) {
    others.push({ manager: away, side: m.away, which: 'away' })
  }

  if (veganAlways && mott) {
    // Mottershead card already has vegan (+ extra). Do not also checklist the opponent.
    return out.filter(Boolean)
  }

  if (!others.length) return out.filter(Boolean)
  if (gate > 1 && variantIndex(`${key}-gate`, gate) !== 0) return out.filter(Boolean)

  const chosen =
    both || others.length === 1
      ? others
      : [others[variantIndex(`${key}-side`, others.length)]]

  for (const s of chosen) {
    const line = managerFunFact(
      s.manager,
      pick,
      `${key}-${s.which}`,
      loreTagsFromSide(s.side),
    )
    if (line) out.push(line)
  }
  return out.filter(Boolean)
}

/**
 * One personality aside for a matchup, or null.
 * Recaps use this (gated). Previews use `matchupPersonalitySentences`.
 */
export function matchupPersonalitySentence(m, pick, key, variantIndex, opts) {
  return matchupPersonalitySentences(m, pick, key, variantIndex, opts)[0] ?? null
}
