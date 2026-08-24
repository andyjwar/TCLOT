/**
 * League lore — the human colour the model can't infer: named-fixture rivalries
 * and per-manager running jokes. Keyed off the manager's full name (as it comes
 * from details.json `player_first_name` + `player_last_name`), so it survives
 * team renames and doesn't touch any of the deterministic match maths.
 *
 * Everything here is optional flavour: unknown managers / pairings just fall
 * back to the standard recap prose. Add a manager to MANAGER_LORE or a pairing
 * to NAMED_FIXTURES and it starts showing up automatically.
 */

/** Normalise a manager name for matching: trim, collapse spaces, lowercase. */
export function normManager(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * Named grudge matches. `managers` is an unordered pair of full names; when
 * those two meet — every single time — the recap leads with `name`.
 */
export const NAMED_FIXTURES = [
  { managers: ['Jon Ward', 'Andy Ward'], name: 'the Battle of Warderloo' },
  { managers: ['Luke Butcher', 'David Higman'], name: 'the East Asian derby' },
  { managers: ['Nick Mottershead', 'Nick Goodacre'], name: 'the Battle of the Nicks' },
  { managers: ['Eddy Webster', 'Andy Ward'], name: 'the Battle of Ontario' },
]

const NAMED_FIXTURE_INDEX = new Map(
  NAMED_FIXTURES.map((f) => [
    f.managers.map(normManager).sort().join('|'),
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
  const a = normManager(managerA)
  const b = normManager(managerB)
  if (!a || !b) return null
  return NAMED_FIXTURE_INDEX.get([a, b].sort().join('|')) ?? null
}

/**
 * Per-manager running jokes. Each `facts` entry is a self-contained sentence
 * that reads fine whether that manager won or lost (orientation-agnostic), so
 * it can be dropped in anywhere. Keep them affectionate.
 */
export const MANAGER_LORE = {
  'mike sutton': {
    facts: [
      `Mike did all this on whatever sleep newborn twins were prepared to grant him.`,
      `Somewhere, Mike's twins are being raised on tactical substitutions and little else.`,
      `Spare a thought for Mike — twins at home and a lineup to babysit too.`,
    ],
  },
  'nick mottershead': {
    facts: [
      `Nick Mottershead celebrated the only way a vegan knows how: aggressively, over a lentil.`,
      `No meat in this result, which suits Nick Mottershead — the man runs on tofu and spite.`,
      `Nick Mottershead insists it was all plant-powered; nobody asked, but he told us anyway.`,
      `Even Nick Mottershead's oat milk has more bite than some of these benches.`,
    ],
  },
  'luke butcher': {
    facts: [
      `They don't call Luke "Boxhead" for nothing.`,
      `Boxhead — as Luke is better known — will file that one away.`,
      `Another week in the life of Luke, aka Boxhead.`,
    ],
  },
}

/**
 * A running-joke sentence for one manager, chosen deterministically from `key`,
 * or null when we've no lore for them.
 * @param {string|null|undefined} manager
 * @param {(arr: string[], key: string) => string} pick  deterministic picker
 * @param {string} key
 * @returns {string|null}
 */
export function managerFunFact(manager, pick, key) {
  const lore = MANAGER_LORE[normManager(manager)]
  if (!lore || !lore.facts || lore.facts.length === 0) return null
  return pick(lore.facts, key)
}

/** True when we have at least one running joke for this manager. */
export function hasManagerLore(manager) {
  const lore = MANAGER_LORE[normManager(manager)]
  return Boolean(lore && lore.facts && lore.facts.length > 0)
}
