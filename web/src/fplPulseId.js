/**
 * FPL's `pulse_id` is the Opta/Pulselive fixture id. Before those ids are
 * assigned for a new season (and on some placeholders) the classic fixtures
 * API ships `pulse_id: 0` on every row. Treat 0 / negative as unset so we
 * don't collapse a gameweek onto a single match.
 */
export function isValidPulseId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Stable FPL fixture id used to join PremWindow rows (unique per match). */
export function fplFixtureId(fx) {
  const n = Number(fx?.id);
  return Number.isFinite(n) && n > 0 ? n : null;
}
