/**
 * Twelve default kits for shirt avatars (no uploaded logo). Assigned by standings order
 * (1st → 0, …) with wrap `(rank - 1) % 12` when a league has more than 12 teams.
 *
 * Modes: solid | stripes-v (vertical) | stripes-h (horizontal bands).
 */
export const TEAM_KIT_COUNT = 12

export const TEAM_KITS = [
  {
    mode: 'solid',
    fill: '#7dd3fc',
    text: '#0c4a6e',
    outline: 'dark',
  },
  {
    mode: 'stripes-v',
    a: '#e0f2fe',
    b: '#1d4ed8',
    text: '#ffffff',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#9f1b2e',
    text: '#fff5f5',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#14532d',
    text: '#ecfdf3',
    outline: 'dark',
  },
  {
    mode: 'stripes-v',
    a: '#fafafa',
    b: '#171717',
    text: '#ffffff',
    outline: 'dark',
  },
  {
    mode: 'stripes-v',
    a: '#eab308',
    b: '#166534',
    text: '#ffffff',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#f8fafc',
    text: '#0f172a',
    outline: 'light',
  },
  {
    mode: 'stripes-h',
    a: '#ffffff',
    b: '#c41e1e',
    text: '#ffffff',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#1e3a8a',
    text: '#eff6ff',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#facc15',
    text: '#422006',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#ec4899',
    text: '#fdf2f8',
    outline: 'dark',
  },
  {
    mode: 'solid',
    fill: '#ea580c',
    text: '#fff7ed',
    outline: 'dark',
  },
]
