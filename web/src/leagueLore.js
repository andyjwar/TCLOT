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
  'Civil war in the Titanic Duo, the sort of fixture where both skippers insist they spotted the iceberg first.',
  'The Titanic Duo are on the same card again, which historically ends with someone pointing at an iceberg and calling it a tactic.',
  'Historic titans, present-day listing: the Titanic Duo play, and the band has started packing.',
]

/** Always-on Mottershead vegan asides. Rotated so it is not the same sentence every week. */
export const VEGAN_LINES = [
  'Mottershead is still treating oat milk as a set-piece routine, which is a lot of conviction for a plant-based beverage.',
  'Somewhere a tofu scramble has been named captain, and Mottershead is giving the vegan team talk as if it were a team meeting.',
  'The vegan sermon arrived before the team sheet, as it does every week Mottershead is involved.',
  'If there is meat in the XI, Mottershead has already filed a dissenting footnote about tofu and the moral arc of the midfield.',
  'Plant-based certainty from Mottershead, who talks as if the Food Standards Agency reports directly to him on veganism.',
]

/**
 * Per-manager running jokes. `tags` let the picker prefer a line that fits
 * what actually happened (waiver, bench, last place) without cramming every
 * trait into one recap. Keep each `text` one short sentence.
 */
export const MANAGER_LORE = {
  'eddy webster': {
    facts: [
      { tags: ['generic'], text: `Eddy will have a 3,000-word thesis for this, and the match will still have been decided by a defender on nobody's list.` },
      { tags: ['generic', 'overthink'], text: `Eddy talked himself out of the sensible option in committee, then blamed the minutes for being too long to reread.` },
      { tags: ['waiver'], text: `Classic Eddy waiver: he claimed the wrong one and is already explaining, with slides, that he meant somebody else.` },
      { tags: ['waiver'], text: `Eddy opened the post-waiver debrief before the player had a shirt on, which is usually how you know the claim was a mistake.` },
      { tags: ['last'], text: `The people's favourite to finish last has the look of a man who has seen this film and still bought a ticket.` },
      { tags: ['generic'], text: `Eddy blamed the children, then the timezone, then a puzzle brain that has not clocked off since 2019.` },
      { tags: ['generic'], text: `British, lives in Canada, sounds Canadian: Eddy's accent has gone native, and the league position is still waiting for its passport.` },
      { tags: ['generic'], text: `Eddy once spent twenty hours on a puzzle and got about 5%; this selection took longer and scored about the same.` },
    ],
  },
  'nick goodacre': {
    facts: [
      { tags: ['generic', 'conservative'], text: `Nick Goodacre's plan remains undefeated: do not finish last, and do not do anything rash enough to require a second slide.` },
      { tags: ['conservative', 'bench'], text: `Nick Goodacre ran the numbers twice, then started the safest available human, as if adventure were a booking offence.` },
      { tags: ['generic'], text: `Somewhere a spreadsheet cleared its throat, and Nick Goodacre still made the conservative call as if it had tenure.` },
      { tags: ['generic'], text: `The lampshade era continues: movement is theoretically possible, in the way a parked bus theoretically has an engine.` },
      { tags: ['trade'], text: `A trade from Nick Goodacre would lead the bulletin, and this week produced no bulletin.` },
      { tags: ['generic'], text: `Northern caution in full, which is to say a lot of frowning at the spreadsheet and very little leaping.` },
    ],
  },
  'david higman': {
    facts: [
      { tags: ['generic'], text: `David could not let a group chat agree in peace; somebody had to play devil's advocate, and it was never going to be anyone else.` },
      { tags: ['generic'], text: `David would like it minuted that the BBC already had this angle, and better lighting.` },
      { tags: ['generic'], text: `Filed from the licence-fee desk: David, still covering the league as if it were a Today programme two-way.` },
      { tags: ['generic'], text: `David is treating the gameweek like Glastonbury, which is to say he arrived early, stayed late, and has notes on the sound.` },
      { tags: ['generic'], text: `The people's champion, cheerfully ruining the consensus because somebody had to, and the BBC were not going to do it for him.` },
    ],
  },
  'nick mottershead': {
    facts: [
      { tags: ['generic'], text: `Swagger first, evidence in the post: Mottershead remains extremely sure, which is both a personality and a formation.` },
      { tags: ['trade'], text: `Nick Mottershead is on another big-move kick, the kind that fills the wire and the group chat in the same hour.` },
      { tags: ['generic', 'titanic'], text: `The Titanic Duo energy is still there; only the iceberg has started answering emails.` },
      { tags: ['generic'], text: `Nick Mottershead is running this from a girls' arts school, a sentence that has not become less improbable with repetition.` },
      { tags: ['generic'], text: `Fallen-empire Mottershead: the old swagger, a newer set of bruises, and no interest in a quiet week.` },
      { tags: ['trade'], text: `Another Mottershead trade flurry, historic-titan energy applied to whoever was still on the wire at midnight.` },
    ],
  },
  'andy ward': {
    facts: [
      { tags: ['generic'], text: `Andy has declared this the week the comeback becomes official, and as ever the comeback remains imminent.` },
      { tags: ['generic'], text: `Andy talks a big game, and the league table has taken to highlighting in the margins.` },
      { tags: ['trade'], text: `Andy is in full battle mode, which means if it can be traded it will be discussed at a volume the neighbours can follow.` },
      { tags: ['last'], text: `Andy is not taking this lying down, even when the week offered a perfectly good sofa.` },
      { tags: ['generic', 'titanic'], text: `Titanic Duo confidence from Andy: the ship has hit something, but he is still rearranging the deckchairs into a 3-4-3.` },
      { tags: ['generic'], text: `Andy Ward, British in Canada, still at war with a fixture list that did not read the manifesto.` },
    ],
  },
  'luke butcher': {
    facts: [
      { tags: ['generic'], text: `Luke has notes on everyone else's manifesto, and a draft of his own that is now on its fourth working title.` },
      { tags: ['generic'], text: `Luke Butcher for Prime Minister, just as soon as he lands on an opinion he is prepared to defend after lunch.` },
      { tags: ['generic'], text: `The league's man in Seoul is in; Samsung would like a word about the XI, and possibly the Wi-Fi.` },
      { tags: ['generic'], text: `Norfolk to Seoul: Luke remains the nicest man ever to mark your politics homework in public.` },
      { tags: ['generic'], text: `Luke would like harmony, and also for you to be more left-wing about the left-back.` },
    ],
  },
  'mike sutton': {
    facts: [
      { tags: ['generic'], text: `Mike posted this on whatever sleep the twins were prepared to grant, which was not a lot and apparently enough.` },
      { tags: ['generic'], text: `Twins at home, a wildcard in the XI, and still no spreadsheet anyone has actually seen.` },
      { tags: ['waiver'], text: `Mike has claimed someone nobody else had on a list, which remains the entire method and most of the charm.` },
      { tags: ['generic'], text: `While everyone else theorised, Mike simply existed, made a cup of tea, and somehow posted a number.` },
      { tags: ['generic'], text: `Mike's selection process remains classified, possibly because there isn't one and the twins ate the notes.` },
    ],
  },
  'jon ward': {
    facts: [
      { tags: ['generic'], text: `Jon has notes on everyone else's management, and his own table position continues to file a dissenting report.` },
      { tags: ['generic'], text: `Jon poked the bear, then poked it again in case the first poke had been taken as a compliment.` },
      { tags: ['last'], text: `Jon is down the bottom again, which has never once been treated as a reason to lower the commentary.` },
      { tags: ['generic'], text: `Brother Ward, league provocateur, still available for unsolicited strategy reviews at volume.` },
      { tags: ['waiver'], text: `Jon will have a take on this claim, and it will not be complimentary, or short.` },
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
